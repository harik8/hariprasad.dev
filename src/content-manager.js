// Content Manager - Handles fetching and caching content from multiple sources
class ContentManager {
    constructor() {
        this.config = window.CONFIG || {};
        this.CACHE_DURATION = this.config.cache?.duration || 3600000;
        this.DEV_TO_USERNAME = this.config.devTo?.username || 'harik8';
        this.YOUTUBE_CHANNEL_ID = this.config.youtube?.channelId || '';
        this.YOUTUBE_API_KEY = this.config.youtube?.apiKey || '';
        this.LAMBDA_URL = this.config.lambda?.url || '';
        this.USE_LAMBDA = this.config.lambda?.enabled || false;
    }

    // Cache management
    getCachedData(key) {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > this.CACHE_DURATION) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    }

    setCachedData(key, data) {
        localStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    }

    // Fetch dev.to articles
    async fetchDevToArticles() {
        const cacheKey = 'devto_articles';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`https://dev.to/api/articles?username=${this.DEV_TO_USERNAME}&per_page=20`);
            const articles = await response.json();
            
            const processedArticles = articles.map(article => ({
                id: article.id,
                title: article.title,
                description: article.description,
                url: article.url,
                publishedAt: new Date(article.published_at),
                reactions: article.public_reactions_count,
                comments: article.comments_count,
                views: article.page_views_count || 0,
                coverImage: article.cover_image,
                tags: article.tag_list,
                type: 'article',
                source: 'dev.to'
            }));

            this.setCachedData(cacheKey, processedArticles);
            return processedArticles;
        } catch (error) {
            console.error('Error fetching dev.to articles:', error);
            return [];
        }
    }

    // Fetch YouTube videos
    async fetchYouTubeVideos() {
        const cacheKey = 'youtube_videos';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        // If no API key, return empty array
        if (!this.YOUTUBE_API_KEY) {
            console.warn('YouTube API key not configured');
            return [];
        }

        try {
            // Fetch channel uploads
            const channelResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${this.YOUTUBE_CHANNEL_ID}&key=${this.YOUTUBE_API_KEY}`
            );
            const channelData = await channelResponse.json();
            
            if (!channelData.items || channelData.items.length === 0) {
                return [];
            }

            const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            // Fetch videos from uploads playlist
            const videosResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=20&key=${this.YOUTUBE_API_KEY}`
            );
            const videosData = await videosResponse.json();

            if (!videosData.items) {
                return [];
            }

            // Get video statistics
            const videoIds = videosData.items.map(item => item.snippet.resourceId.videoId).join(',');
            const statsResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${this.YOUTUBE_API_KEY}`
            );
            const statsData = await statsResponse.json();

            const processedVideos = videosData.items.map((item, index) => {
                const stats = statsData.items[index]?.statistics || {};
                return {
                    id: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description.substring(0, 150) + '...',
                    url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                    publishedAt: new Date(item.snippet.publishedAt),
                    views: parseInt(stats.viewCount || 0),
                    likes: parseInt(stats.likeCount || 0),
                    comments: parseInt(stats.commentCount || 0),
                    thumbnail: item.snippet.thumbnails.medium.url,
                    type: 'video',
                    source: 'youtube'
                };
            });

            this.setCachedData(cacheKey, processedVideos);
            return processedVideos;
        } catch (error) {
            console.error('Error fetching YouTube videos:', error);
            return [];
        }
    }

    // Fetch from Lambda (if configured)
    async fetchFromLambda() {
        if (!this.LAMBDA_URL) return null;

        const cacheKey = 'lambda_content';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(this.LAMBDA_URL);
            const result = await response.json();
            
            if (result.success) {
                this.setCachedData(cacheKey, result.data);
                return result.data;
            }
        } catch (error) {
            console.error('Error fetching from Lambda:', error);
        }
        
        return null;
    }

    // Get all content combined
    async getAllContent() {
        // Try Lambda first if enabled
        if (this.USE_LAMBDA) {
            const lambdaData = await this.fetchFromLambda();
            if (lambdaData && lambdaData.all) {
                return lambdaData.all;
            }
        }

        // Fallback to direct API calls
        const [articles, videos] = await Promise.all([
            this.fetchDevToArticles(),
            this.config.features?.youtubeIntegration ? this.fetchYouTubeVideos() : Promise.resolve([])
        ]);

        return [...articles, ...videos].sort((a, b) => b.publishedAt - a.publishedAt);
    }

    // Get popular content based on engagement
    async getPopularContent(limit = 3) {
        // Try Lambda first if enabled
        if (this.USE_LAMBDA) {
            const lambdaData = await this.fetchFromLambda();
            if (lambdaData && lambdaData.popular) {
                return lambdaData.popular.slice(0, limit);
            }
        }

        // Fallback to calculating locally
        const allContent = await this.getAllContent();
        const weights = this.config.content?.engagementWeights || {
            article: { reactions: 2, comments: 3, views: 0.1 },
            video: { views: 0.5, likes: 5, comments: 10 }
        };
        
        // Calculate engagement score
        const scoredContent = allContent.map(item => {
            let score = 0;
            
            if (item.type === 'article') {
                const w = weights.article;
                score = (item.reactions * w.reactions) + (item.comments * w.comments) + (item.views * w.views);
            } else if (item.type === 'video') {
                const w = weights.video;
                score = (item.views * w.views) + (item.likes * w.likes) + (item.comments * w.comments);
            }
            
            return { ...item, engagementScore: score };
        });

        return scoredContent
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, limit);
    }

    // Filter content by type
    filterContent(content, type) {
        if (type === 'all') return content;
        return content.filter(item => item.type === type);
    }

    // Search content
    searchContent(content, query) {
        const lowerQuery = query.toLowerCase();
        return content.filter(item => 
            item.title.toLowerCase().includes(lowerQuery) ||
            item.description.toLowerCase().includes(lowerQuery) ||
            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
        );
    }
}

// Export for use in main script
window.ContentManager = ContentManager;
