// Configuration file for the portfolio
// Update these values with your actual credentials and IDs

const CONFIG = {
    // Content sources
    devTo: {
        username: 'harik8',
        apiUrl: 'https://dev.to/api/articles'
    },
    
    youtube: {
        // Get your channel ID from: https://www.youtube.com/account_advanced
        channelId: '', // e.g., 'UCxYourChannelId'
        
        // Get API key from: https://console.cloud.google.com/apis/credentials
        apiKey: '', // e.g., 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        
        // Alternative: Use your channel handle (e.g., '@harikarthigasu')
        channelHandle: '@harikarthigasu'
    },
    
    // Analytics (optional)
    analytics: {
        // Google Analytics 4
        googleAnalyticsId: '', // e.g., 'G-XXXXXXXXXX'
        
        // Plausible Analytics (privacy-friendly alternative)
        plausibleDomain: '', // e.g., 'hariprasad.dev'
    },
    
    // Cache settings
    cache: {
        duration: 3600000, // 1 hour in milliseconds
        enabled: true
    },
    
    // Content settings
    content: {
        popularContentLimit: 3,
        recentContentLimit: 20,
        
        // Engagement score weights
        engagementWeights: {
            article: {
                reactions: 2,
                comments: 3,
                views: 0.1
            },
            video: {
                views: 0.5,
                likes: 5,
                comments: 10
            }
        }
    },
    
    // Feature flags
    features: {
        darkMode: true,
        search: true,
        filters: true,
        analytics: false, // Set to true when you add analytics IDs
        youtubeIntegration: false // Set to true when you add YouTube API key
    }
};

// Export configuration
window.CONFIG = CONFIG;
