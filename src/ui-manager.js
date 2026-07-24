// UI Manager - Handles rendering and UI interactions
class UIManager {
    constructor(contentManager) {
        this.contentManager = contentManager;
        this.currentFilter = 'all';
        this.currentSearchQuery = '';
        this.allContent = [];
    }

    // Create loading skeleton
    createLoadingSkeleton(count = 6) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="col-md-6 col-lg-4 mb-5">
                    <div class="card h-100 shadow border-0">
                        <div class="card-body d-flex flex-column">
                            <div class="skeleton skeleton-title"></div>
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-button mt-auto"></div>
                        </div>
                    </div>
                </div>`;
        }
        return html;
    }

    // Create content card
    createContentCard(item) {
        const typeLabel = item.type === 'article' ? 'ARTICLE' : 'VIDEO';
        const typeBadge = item.type === 'article' ? 'badge-primary' : 'badge-danger';
        
        let metaInfo = '';
        if (item.type === 'article') {
            metaInfo = `
                <div class="content-meta">
                    <span><i class="fas fa-heart"></i> ${item.reactions}</span>
                    <span><i class="fas fa-comment"></i> ${item.comments}</span>
                    ${item.views > 0 ? `<span><i class="fas fa-eye"></i> ${this.formatNumber(item.views)}</span>` : ''}
                </div>`;
        } else if (item.type === 'video') {
            metaInfo = `
                <div class="content-meta">
                    <span><i class="fas fa-eye"></i> ${this.formatNumber(item.views)}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${this.formatNumber(item.likes)}</span>
                    <span><i class="fas fa-comment"></i> ${item.comments}</span>
                </div>`;
        }

        const thumbnail = item.type === 'video' && item.thumbnail 
            ? `<img src="${item.thumbnail}" class="card-img-top" alt="${item.title}" loading="lazy">` 
            : item.coverImage 
            ? `<img src="${item.coverImage}" class="card-img-top" alt="${item.title}" loading="lazy">`
            : '';

        return `
            <div class="col-md-6 col-lg-4 mb-5 content-card" data-type="${item.type}">
                <div class="card h-100 shadow border-0 content-card-inner">
                    ${thumbnail}
                    <div class="card-body d-flex flex-column">
                        <div class="mb-2">
                            <span class="badge ${typeBadge}">${typeLabel}</span>
                        </div>
                        <h5 class="card-title">${item.title}</h5>
                        <p class="card-text">${item.description}</p>
                        ${metaInfo}
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary mt-auto">
                            View ${item.type === 'video' ? '<i class="fas fa-play ml-1"></i>' : '<i class="fas fa-arrow-right ml-1"></i>'}
                        </a>
                    </div>
                </div>
            </div>`;
    }

    // Format numbers (1000 -> 1K)
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Render popular content
    async renderPopularContent() {
        const container = document.getElementById('popular-posts');
        if (!container) return;

        container.innerHTML = this.createLoadingSkeleton(3);

        try {
            const popularContent = await this.contentManager.getPopularContent(3);
            
            if (popularContent.length === 0) {
                container.innerHTML = '<div class="col-12"><p class="text-center">No popular content found.</p></div>';
                return;
            }

            container.innerHTML = popularContent.map(item => this.createContentCard(item)).join('');
        } catch (error) {
            console.error('Error rendering popular content:', error);
            container.innerHTML = '<div class="col-12"><p class="text-center text-danger">Failed to load popular content.</p></div>';
        }
    }

    // Render recent content
    async renderRecentContent() {
        const container = document.getElementById('recent-posts');
        if (!container) return;

        container.innerHTML = this.createLoadingSkeleton(6);

        try {
            this.allContent = await this.contentManager.getAllContent();
            this.applyFiltersAndRender();
        } catch (error) {
            console.error('Error rendering recent content:', error);
            container.innerHTML = '<div class="col-12"><p class="text-center text-danger">Failed to load recent content.</p></div>';
        }
    }

    // Apply filters and search, then render
    applyFiltersAndRender() {
        let filteredContent = this.contentManager.filterContent(this.allContent, this.currentFilter);
        
        if (this.currentSearchQuery) {
            filteredContent = this.contentManager.searchContent(filteredContent, this.currentSearchQuery);
        }

        const container = document.getElementById('recent-posts');
        if (filteredContent.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-center">No content found.</p></div>';
            return;
        }

        container.innerHTML = filteredContent.map(item => this.createContentCard(item)).join('');
    }

    // Setup filter buttons
    setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.applyFiltersAndRender();
            });
        });
    }

    // Setup search
    setupSearch() {
        const searchInput = document.getElementById('content-search');
        if (!searchInput) return;

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.currentSearchQuery = e.target.value;
                this.applyFiltersAndRender();
            }, 300);
        });
    }

    // Initialize all UI components
    async init() {
        await Promise.all([
            this.renderPopularContent(),
            this.renderRecentContent()
        ]);
        
        this.setupFilters();
        this.setupSearch();
    }
}

// Export for use in main script
window.UIManager = UIManager;
