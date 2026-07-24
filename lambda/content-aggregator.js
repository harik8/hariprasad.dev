// AWS Lambda function for content aggregation
// This function fetches content from multiple sources and caches it
// Deploy this to AWS Lambda and set up API Gateway or CloudFront Function URL

const https = require('https');

// Configuration
const CONFIG = {
    devToUsername: 'harik8',
    youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID || '',
    youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
    cacheDuration: 3600 // 1 hour in seconds
};

// Helper function to make HTTPS requests
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Fetch dev.to articles
async function fetchDevToArticles() {
    try {
        const url = `https://dev.to/api/articles?username=${CONFIG.devToUsername}&per_page=20`;
        const articles = await httpsGet(url);
        
        return articles.map(article => ({
            id: article.id,
            title: article.title,
            description: article.description,
            url: article.url,
            publishedAt: article.published_at,
            reactions: article.public_reactions_count,
            comments: article.comments_count,
            views: article.page_views_count || 0,
            coverImage: article.cover_image,
            tags: article.tag_list,
            type: 'article',
            source: 'dev.to'
        }));
    } catch (error) {
        console.error('Error fetching dev.to articles:', error);
        return [];
    }
}

// Fetch YouTube videos
async function fetchYouTubeVideos() {
    if (!CONFIG.youtubeApiKey || !CONFIG.youtubeChannelId) {
        return [];
    }

    try {
        // Get channel uploads playlist
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CONFIG.youtubeChannelId}&key=${CONFIG.youtubeApiKey}`;
        const channelData = await httpsGet(channelUrl);
        
        if (!channelData.items || channelData.items.length === 0) {
            return [];
        }

        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        // Get videos from uploads playlist
        const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=20&key=${CONFIG.youtubeApiKey}`;
        const videosData = await httpsGet(videosUrl);

        if (!videosData.items) {
            return [];
        }

        // Get video statistics
        const videoIds = videosData.items.map(item => item.snippet.resourceId.videoId).join(',');
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${CONFIG.youtubeApiKey}`;
        const statsData = await httpsGet(statsUrl);

        return videosData.items.map((item, index) => {
            const stats = statsData.items[index]?.statistics || {};
            return {
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                description: item.snippet.description.substring(0, 150) + '...',
                url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                publishedAt: item.snippet.publishedAt,
                views: parseInt(stats.viewCount || 0),
                likes: parseInt(stats.likeCount || 0),
                comments: parseInt(stats.commentCount || 0),
                thumbnail: item.snippet.thumbnails.medium.url,
                type: 'video',
                source: 'youtube'
            };
        });
    } catch (error) {
        console.error('Error fetching YouTube videos:', error);
        return [];
    }
}

// Calculate engagement score
function calculateEngagementScore(item) {
    if (item.type === 'article') {
        return (item.reactions * 2) + (item.comments * 3) + (item.views * 0.1);
    } else if (item.type === 'video') {
        return (item.views * 0.5) + (item.likes * 5) + (item.comments * 10);
    }
    return 0;
}

// Main Lambda handler
exports.handler = async (event) => {
    try {
        // Fetch content from all sources
        const [articles, videos] = await Promise.all([
            fetchDevToArticles(),
            fetchYouTubeVideos()
        ]);

        // Combine and sort by date
        const allContent = [...articles, ...videos]
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        // Calculate popular content
        const popularContent = allContent
            .map(item => ({
                ...item,
                engagementScore: calculateEngagementScore(item)
            }))
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 6);

        // Prepare response
        const response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': `public, max-age=${CONFIG.cacheDuration}`
            },
            body: JSON.stringify({
                success: true,
                data: {
                    all: allContent,
                    popular: popularContent,
                    stats: {
                        totalArticles: articles.length,
                        totalVideos: videos.length,
                        lastUpdated: new Date().toISOString()
                    }
                }
            })
        };

        return response;
    } catch (error) {
        console.error('Error in Lambda handler:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to fetch content'
            })
        };
    }
};
