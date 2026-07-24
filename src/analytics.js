// Analytics Manager - Simple analytics tracking
class AnalyticsManager {
    constructor() {
        this.GA_MEASUREMENT_ID = ''; // Add your Google Analytics ID here (e.g., 'G-XXXXXXXXXX')
        this.PLAUSIBLE_DOMAIN = ''; // Or use Plausible domain
        this.init();
    }

    init() {
        // Initialize Google Analytics if ID is provided
        if (this.GA_MEASUREMENT_ID) {
            this.initGoogleAnalytics();
        }
        
        // Initialize Plausible if domain is provided
        if (this.PLAUSIBLE_DOMAIN) {
            this.initPlausible();
        }

        // Track custom events
        this.setupEventTracking();
    }

    initGoogleAnalytics() {
        // Load Google Analytics script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA_MEASUREMENT_ID}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', this.GA_MEASUREMENT_ID);
        
        window.gtag = gtag;
    }

    initPlausible() {
        // Load Plausible script
        const script = document.createElement('script');
        script.defer = true;
        script.setAttribute('data-domain', this.PLAUSIBLE_DOMAIN);
        script.src = 'https://plausible.io/js/script.js';
        document.head.appendChild(script);
    }

    // Track custom events
    trackEvent(eventName, eventParams = {}) {
        // Google Analytics
        if (window.gtag) {
            window.gtag('event', eventName, eventParams);
        }

        // Plausible
        if (window.plausible) {
            window.plausible(eventName, { props: eventParams });
        }

        // Console log for debugging
        console.log('Analytics Event:', eventName, eventParams);
    }

    setupEventTracking() {
        // Track content clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href*="dev.to"], a[href*="youtube.com"], a[href*="medium.com"]');
            if (link) {
                const url = link.getAttribute('href');
                const type = url.includes('youtube') ? 'video' : 'article';
                this.trackEvent('content_click', {
                    content_type: type,
                    url: url
                });
            }
        });

        // Track filter usage
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.trackEvent('filter_used', {
                    filter_type: e.target.dataset.filter
                });
            }
        });

        // Track search usage
        const searchInput = document.getElementById('content-search');
        if (searchInput) {
            let searchTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    if (e.target.value.length > 2) {
                        this.trackEvent('search_performed', {
                            query_length: e.target.value.length
                        });
                    }
                }, 1000);
            });
        }

        // Track theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                this.trackEvent('theme_changed', {
                    theme: currentTheme === 'light' ? 'dark' : 'light'
                });
            });
        }
    }
}

// Export for use in main script
window.AnalyticsManager = AnalyticsManager;
