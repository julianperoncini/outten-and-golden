/**
 * Outten Search - Basic Version
 * Simple, clean search functionality without animations
 * Fixed: HTML entity decoding for proper display of special characters
 */

class OuttenSearchBasic {
    constructor(options = {}) {
        // Get config from WordPress
        const wpConfig = this.getWordPressConfig();
        
        this.config = {
            apiUrl: '/wp-json/outten/v1/search',
            tagSearchUrl: '/wp-json/outten/v1/tag-search',
            analyticsUrl: '/wp-json/outten/v1/analytics',
            minQueryLength: 2,
            debounceDelay: 300,
            maxResults: 15,
            postTypes: 'issues,cases,posts',
            enableAnalytics: true,
            cacheSize: 25,
            ...wpConfig,
            ...options
        };
        
        // DOM Elements
        this.elements = {};
        
        // State
        this.state = {
            currentQuery: '',
            isLoading: false,
            isOpen: false,
            selectedIndex: -1,
            cache: new Map(),
            debounceTimer: null,
            requestController: null
        };
        
        this.init();
    }
    
    init() {
        this.findElements();
        this.bindEvents();
        console.log('🔍 Outten Search Basic initialized');
    }
    
    getWordPressConfig() {
        // Try multiple ways to get WordPress config
        let config = {};
        
        // Method 1: JSON script tag
        const configScript = document.getElementById('outten-search-config');
        if (configScript) {
            try {
                config = JSON.parse(configScript.textContent);
                console.log('📄 Config loaded from script tag:', config);
            } catch (e) {
                console.warn('Failed to parse config script:', e);
            }
        }
        
        // Method 2: WordPress localized script
        if (typeof outtenSearchConfig !== 'undefined') {
            config = { ...config, ...outtenSearchConfig };
            console.log('📄 Config loaded from WordPress:', outtenSearchConfig);
        }
        
        // Method 3: Global window object
        if (window.outtenSearchConfig) {
            config = { ...config, ...window.outtenSearchConfig };
            console.log('📄 Config loaded from window:', window.outtenSearchConfig);
        }
        
        // Ensure we have the essential URLs
        if (!config.apiUrl) {
            const baseUrl = window.location.origin;
            config.apiUrl = `${baseUrl}/wp-json/outten/v1/search`;
            config.tagSearchUrl = `${baseUrl}/wp-json/outten/v1/tag-search`;
            config.analyticsUrl = `${baseUrl}/wp-json/outten/v1/analytics`;
            console.log('📄 Using fallback URLs:', config);
        }
        
        return config;
    }
    
    findElements() {
        this.elements = {
            searchInput: document.querySelector('#predictive-search, .search-input, input[name="s"]'),
            searchForm: document.querySelector('.search-form, .predictive-search-form'),
            
            // Your existing tag structure
            scrollBoostContainer: document.querySelector('.js-scrollboost'),
            scrollBoostContent: document.querySelector('.js-scrollboost-content'),
            tagsList: document.querySelector('.js-scrollboost-length'),
            existingTags: document.querySelectorAll('.predictive-search-results-item'),
            
            // Fallback to generic results container
            resultsContainer: document.querySelector('.search-results, .predictive-search-results'),
            loadingIndicator: document.querySelector('.search-loading'),
            noResults: document.querySelector('.search-no-results'),
            submitButton: document.querySelector('.search-submit'),
            closeButton: document.querySelector('.search-close')
        };
        
        // Store original tags for filtering - decode HTML entities
        this.originalTags = Array.from(this.elements.existingTags).map(item => ({
            element: item,
            text: this.decodeHtmlEntities(item.querySelector('span')?.textContent?.trim() || ''),
            link: item.querySelector('a')?.href || '#'
        }));
        
        // Create missing elements if needed (fallback)
        this.createMissingElements();
    }
    
    createMissingElements() {
        // Create results container if missing
        if (this.elements.searchInput && !this.elements.resultsContainer) {
            this.elements.resultsContainer = document.createElement('div');
            this.elements.resultsContainer.className = 'search-results';
            this.elements.resultsContainer.style.display = 'none';
            this.elements.searchInput.parentNode.appendChild(this.elements.resultsContainer);
        }
        
        // Create loading indicator if missing
        if (this.elements.searchInput && !this.elements.loadingIndicator) {
            this.elements.loadingIndicator = document.createElement('div');
            this.elements.loadingIndicator.className = 'search-loading';
            this.elements.loadingIndicator.style.display = 'none';
            this.elements.loadingIndicator.textContent = 'Searching...';
            this.elements.searchInput.parentNode.appendChild(this.elements.loadingIndicator);
        }
    }
    
    bindEvents() {
        if (!this.elements.searchInput) {
            console.warn('Search input not found');
            return;
        }
        
        // Input events
        this.elements.searchInput.addEventListener('input', (e) => this.handleInput(e));
        this.elements.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.elements.searchInput.addEventListener('focus', () => this.handleFocus());
        this.elements.searchInput.addEventListener('blur', () => this.handleBlur());
        
        // Form submission
        if (this.elements.searchForm) {
            this.elements.searchForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Results container
        if (this.elements.resultsContainer) {
            this.elements.resultsContainer.addEventListener('click', (e) => this.handleResultClick(e));
        }
        
        // Close button
        if (this.elements.closeButton) {
            this.elements.closeButton.addEventListener('click', () => this.closeSearch());
        }
        
        // Global events
        document.addEventListener('click', (e) => this.handleClickOutside(e));
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
    }
    
    handleInput(e) {
        const query = e.target.value.trim();
        this.state.currentQuery = query;
        this.state.selectedIndex = -1;
        
        // Clear previous timer
        if (this.state.debounceTimer) {
            clearTimeout(this.state.debounceTimer);
        }
        
        if (query.length === 0) {
            this.resetToOriginalTags();
            this.hideResults();
            return;
        }
        
        if (query.length < this.config.minQueryLength) {
            return;
        }
        
        // Debounce search
        this.state.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.config.debounceDelay);
    }
    
    resetToOriginalTags() {
        // Show all original tags
        this.originalTags.forEach(tag => {
            tag.element.style.display = '';
            tag.element.style.opacity = '1';
            // Reset highlight
            const span = tag.element.querySelector('span');
            if (span) {
                span.innerHTML = this.escapeHtml(tag.text);
            }
        });
        
        // Remove any new tags we added
        const newTags = document.querySelectorAll('.search-result-new');
        newTags.forEach(tag => tag.remove());
    }
    
    handleKeydown(e) {
        const results = this.elements.resultsContainer?.querySelectorAll('.search-result-item') || [];
        
        if (results.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.state.selectedIndex = Math.min(this.state.selectedIndex + 1, results.length - 1);
                this.updateSelection(results);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, -1);
                this.updateSelection(results);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.state.selectedIndex >= 0) {
                    this.selectResult(results[this.state.selectedIndex]);
                }
                break;
                
            case 'Escape':
                this.hideResults();
                this.elements.searchInput.blur();
                break;
        }
    }
    
    handleFocus() {
        if (this.state.currentQuery.length >= this.config.minQueryLength) {
            this.showResults();
        }
    }
    
    handleBlur() {
        // Delay to allow clicking on results
        setTimeout(() => {
            if (!this.elements.resultsContainer?.matches(':hover')) {
                this.hideResults();
            }
        }, 150);
    }
    
    handleSubmit(e) {
        e.preventDefault();
        
        if (this.state.currentQuery.length >= this.config.minQueryLength) {
            // Regular search - redirect to search results page
            const searchUrl = `${window.location.origin}/?s=${encodeURIComponent(this.state.currentQuery)}`;
            window.location.href = searchUrl;
        }
    }
    
    handleResultClick(e) {
        const resultItem = e.target.closest('.predictive-search-results-item');
        const link = e.target.closest('a[data-search-result]');
        
        if (link || resultItem) {
            e.preventDefault();
            
            // Get the tag text
            let tagText = '';
            if (link) {
                tagText = link.querySelector('span')?.textContent?.trim() || '';
            } else if (resultItem) {
                tagText = resultItem.querySelector('span')?.textContent?.trim() || '';
            }
            
            // Put the tag text in the search input
            if (tagText && this.elements.searchInput) {
                this.elements.searchInput.value = tagText;
                this.state.currentQuery = tagText;
                this.elements.searchInput.focus();
                
                // Optional: trigger search immediately
                // this.performSearch(tagText);
                
                // Or just let the user click the search button
                console.log('🏷️ Tag selected:', tagText);
            }
        }
    }
    
    handleClickOutside(e) {
        if (this.state.isOpen && 
            this.elements.resultsContainer && 
            !this.elements.resultsContainer.contains(e.target) &&
            !this.elements.searchInput.contains(e.target)) {
            this.hideResults();
        }
    }
    
    handleGlobalKeydown(e) {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.elements.searchInput?.focus();
        }
    }
    
    async performSearch(query) {
        if (this.state.isLoading) return;
        
        console.log('🔍 Performing search for:', query);
        
        // Check cache
        const cacheKey = this.getCacheKey(query);
        if (this.state.cache.has(cacheKey)) {
            console.log('📦 Using cached results');
            this.displayResults(this.state.cache.get(cacheKey));
            return;
        }
        
        this.setLoading(true);
        
        // Cancel previous request
        if (this.state.requestController) {
            this.state.requestController.abort();
        }
        this.state.requestController = new AbortController();
        
        try {
            const url = this.buildSearchUrl(query);
            console.log('📡 Fetching from:', url);
            
            const response = await fetch(url, {
                signal: this.state.requestController.signal,
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                // Try to get error details
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // Fallback to status text
                    errorMessage = `${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('✅ Search results received:', data);
            
            // Only process if query hasn't changed
            if (query === this.state.currentQuery) {
                this.cacheResult(cacheKey, data);
                this.displayResults(data);
            }
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('❌ Search error:', error);
                this.displayError(error.message);
            }
        } finally {
            this.setLoading(false);
            this.state.requestController = null;
        }
    }
    
    async performTagSearch() {
        try {
            const searchData = {
                tags: this.state.activeTags.map(tag => ({
                    text: tag.text,
                    id: tag.data?.id,
                    type: tag.data?.type,
                    url: tag.data?.url
                })),
                query: this.state.currentQuery
            };
            
            const response = await fetch(this.config.tagSearchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.redirect_url) {
                    window.location.href = result.redirect_url;
                }
            }
        } catch (error) {
            console.error('Tag search error:', error);
        }
    }
    
    displayResults(data) {
        // If we have the scroll boost tag structure, use that
        if (this.elements.tagsList && this.originalTags.length > 0) {
            this.filterExistingTags(data);
        } else if (this.elements.resultsContainer) {
            // Fallback to generic results container
            this.displayGenericResults(data);
        }
        
        // Track analytics
        if (this.config.enableAnalytics) {
            this.trackSearch(this.state.currentQuery, data.posts ? data.posts.length : 0);
        }
    }
    
    filterExistingTags(data) {
        const query = this.state.currentQuery.toLowerCase();
        const searchResults = data.posts || [];
        
        // Get all available tags from search results and original tags
        const availableTags = new Set();
        
        // Add tags from search results - decode them first
        searchResults.forEach(post => {
            if (post.tags) {
                post.tags.forEach(tag => availableTags.add(this.decodeHtmlEntities(tag)));
            }
            if (post.categories) {
                post.categories.forEach(cat => availableTags.add(this.decodeHtmlEntities(cat)));
            }
        });
        
        // Add original tags that match the query
        this.originalTags.forEach(tag => {
            if (tag.text.toLowerCase().includes(query)) {
                availableTags.add(tag.text);
            }
        });
        
        // Filter and show/hide existing tags
        this.originalTags.forEach(tag => {
            const isMatch = tag.text.toLowerCase().includes(query) || 
                           availableTags.has(tag.text);
            
            if (isMatch) {
                tag.element.style.display = '';
                tag.element.style.opacity = '1';
                // Highlight the matching text
                const span = tag.element.querySelector('span');
                if (span) {
                    span.innerHTML = this.highlightQuery(tag.text);
                }
            } else {
                tag.element.style.opacity = '0.3';
                tag.element.style.display = 'none';
            }
        });
        
        // Add new tags from search results that aren't in original tags
        this.addNewTagsFromResults(searchResults, availableTags);
        
        this.showResults();
    }
    
    addNewTagsFromResults(searchResults, availableTags) {
        const existingTagTexts = new Set(this.originalTags.map(tag => tag.text));
        const newTags = [];
        
        searchResults.forEach(post => {
            // Add tags that aren't already in the original list
            if (post.tags) {
                post.tags.forEach(tag => {
                    const decodedTag = this.decodeHtmlEntities(tag);
                    if (!existingTagTexts.has(decodedTag) && !newTags.some(t => t.text === decodedTag)) {
                        newTags.push({
                            text: decodedTag,
                            url: post.url,
                            type: 'tag',
                            post: post
                        });
                    }
                });
            }
            
            // Add categories too
            if (post.categories) {
                post.categories.forEach(cat => {
                    const decodedCat = this.decodeHtmlEntities(cat);
                    if (!existingTagTexts.has(decodedCat) && !newTags.some(t => t.text === decodedCat)) {
                        newTags.push({
                            text: decodedCat,
                            url: post.url,
                            type: 'category',
                            post: post
                        });
                    }
                });
            }
        });
        
        // Add new tag elements to the DOM
        newTags.slice(0, 5).forEach(tag => { // Limit to 5 new tags
            const newTagElement = this.createTagElement(tag);
            if (newTagElement && this.elements.tagsList) {
                this.elements.tagsList.appendChild(newTagElement);
            }
        });
    }
    
    createTagElement(tag) {
        const li = document.createElement('li');
        li.className = 'inline-block will-change-transform predictive-search-results-item search-result-new';
        li.style.opacity = '1';
        li.style.transform = 'none';
        
        const link = document.createElement('a');
        link.href = tag.url || '#';
        link.className = 'px-12 py-[0.70rem] bg-white-smoke block leading-[1.4] rounded-[0.4rem] transition-colors hover:bg-grey-taupe';
        link.dataset.searchResult = 'true';
        link.dataset.postId = tag.post?.id || '';
        link.dataset.postUrl = tag.post?.url || '';
        
        const span = document.createElement('span');
        span.innerHTML = this.highlightQuery(tag.text);
        
        link.appendChild(span);
        li.appendChild(link);
        
        // Add click handler
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (tag.post?.url) {
                window.location.href = tag.post.url;
            }
        });
        
        return li;
    }
    
    displayGenericResults(data) {
        if (!this.elements.resultsContainer) return;
        
        if (!data.posts || data.posts.length === 0) {
            this.displayNoResults();
            return;
        }
        
        // Group results by post type
        const groupedResults = this.groupResultsByType(data.posts);
        
        let html = '<div class="search-results-wrapper relative space-y-[6rem] s:space-y-[16rem]">';
        
        // Display each group
        for (const [postType, posts] of Object.entries(groupedResults)) {
            html += this.createResultsSection(postType, posts);
        }
        
        html += '</div>';
        
        this.elements.resultsContainer.innerHTML = html;
        this.showResults();
    }
    
    groupResultsByType(posts) {
        const grouped = {};
        posts.forEach(post => {
            const type = post.type || 'posts';
            if (!grouped[type]) {
                grouped[type] = [];
            }
            grouped[type].push(post);
        });
        return grouped;
    }
    
    createResultsSection(postType, posts) {
        const sectionTitle = this.getPostTypeSectionTitle(postType);
        
        // For "All Employees" style grid layout
        if (postType === 'posts' || postType === 'employees') {
            return `
                <div class="relative">
                    <div class="site-max pb-32 s:pb-50">
                        <h3 class="text-32 s:text-40 text-green font-normal leading-[1.32]">${sectionTitle}</h3>
                    </div>
                    <div class="site-max site-grid items-start gap-y-20 grid-layout js-list-grid">
                        ${posts.map(post => this.createGridResultHTML(post)).join('')}
                    </div>
                </div>
            `;
        }
        
        // For "Executives & Professionals" and "Whistleblowers" style layouts
        const bgClass = postType === 'executives' ? 'py-60 s:py-120 bg-white-smoke' : '';
        
        return `
            <div class="relative ${bgClass}">
                <div class="site-max pb-32 s:pb-50">
                    <h3 class="font-disp text-32 s:text-40 text-green font-normal leading-[1.16] s:leading-[1.32] tracking-[-0.032rem]">${sectionTitle}</h3>
                </div>
                <div class="site-max site-grid gap-24">
                    ${posts.map(post => this.createLargeResultHTML(post)).join('')}
                </div>
            </div>
        `;
    }
    
    createGridResultHTML(post) {
        const hasImage = !!post.thumbnail;
        const bgColor = post.background_color || '';
        const textColor = (bgColor === 'green' || hasImage) ? 'text-white' : 'text-green';
        const bgClass = bgColor ? `bg-${bgColor.toLowerCase()}` : '';
        
        return `
            <div class="column w-full relative group overflow-hidden search-result-item" data-id="${post.id}" data-url="${post.url}">
                <a href="${post.url}" data-transition="child" class="column-inner overflow-hidden block w-full relative ${bgClass} ${textColor}">
                    ${hasImage ? `
                        <div class="column-image w-full overflow-hidden">
                            <img src="${post.thumbnail}" alt="${this.escapeHtml(post.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-[1s]">
                        </div>
                    ` : ''}
                    
                    <div class="column-category absolute top-0 left-0 w-full p-16 l:p-24">
                        <span class="text-12 font-medium leading-none tracking-[0.12rem] uppercase">${this.getPostTypeLabel(post.type)}</span>
                    </div>
                    
                    <div class="column-title absolute z-1 bottom-0 left-0 w-full p-16 l:p-24 leading-none flex justify-between items-end">
                        <p class="column-title text-24 s:text-32 font-normal leading-[1.04] tracking-[-0.032rem] max-w-[25rem] s:max-w-[31rem]">
                            ${this.highlightQuery(this.decodeHtmlEntities(post.title))}
                        </p>
                        <p class="column-link text-12 font-medium leading-none tracking-[0.12rem] uppercase flex gap-x-5 items-center whitespace-nowrap">
                            <span class="column-link-text hidden">See more</span>
                            <span class="inline-flex">
                                <svg class="w-6 h-10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 0.999999L4.5 4.5L1 8" stroke="currentColor" stroke-width="1.01111" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                        </p>
                    </div>
                </a>
            </div>
        `;
    }
    
    createLargeResultHTML(post) {
        const hasImage = !!post.thumbnail;
        const textColor = hasImage ? 'text-white' : 'text-green';
        const bgClass = hasImage ? '' : 'bg-green text-white';
        const postDate = post.date ? new Date(post.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
        
        return `
            <div class="w-full h-[46rem] relative col-span-full s:col-span-8 overflow-hidden search-result-item" data-id="${post.id}" data-url="${post.url}">
                <a href="${post.url}" class="overflow-hidden block w-full h-full relative ${bgClass} ${textColor}">
                    ${hasImage ? `
                        <div class="column-image w-full overflow-hidden">
                            <img src="${post.thumbnail}" alt="${this.escapeHtml(post.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-[1s]">
                        </div>
                    ` : ''}
                    
                    <div class="column-category absolute top-0 left-0 w-full p-16 l:p-24 flex items-center justify-between">
                        <span class="text-12 font-medium leading-none tracking-[0.12rem] uppercase">${this.getPostTypeLabel(post.type)}</span>
                        ${postDate ? `<span class="text-12 font-medium leading-none tracking-[0.12rem] uppercase">${postDate}</span>` : ''}
                    </div>
                    
                    <div class="absolute z-1 bottom-0 left-0 w-full p-16 l:p-24 leading-none flex flex-col s:flex-row s:justify-between items-start s:items-end space-y-[2.4rem] s:space-y-0">
                        <p class="relative text-24 s:text-32 font-normal leading-[1.04] tracking-[-0.032rem] max-w-[30rem] s:max-w-[35rem]">
                            ${this.highlightQuery(this.decodeHtmlEntities(post.title))}
                        </p>
                        
                        <p class="text-12 font-medium leading-none tracking-[0.12rem] uppercase flex gap-x-5 items-center whitespace-nowrap">
                            <span class="inline-flex">See more</span>
                            <span class="inline-flex relative top-[0.1rem]">
                                <svg class="w-6 h-10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 0.999999L4.5 4.5L1 8" stroke="currentColor" stroke-width="1.01111" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                        </p>
                    </div>
                </a>
            </div>
        `;
    }
    
    groupResultsByType(posts) {
        const grouped = {};
        posts.forEach(post => {
            const type = post.type || 'posts';
            if (!grouped[type]) {
                grouped[type] = [];
            }
            grouped[type].push(post);
        });
        return grouped;
    }
    
    createResultsSection(postType, posts) {
        const sectionTitle = this.getPostTypeSectionTitle(postType);
        
        // For "All Employees" style grid layout
        if (postType === 'posts' || postType === 'employees') {
            return `
                <div class="relative">
                    <div class="site-max pb-32 s:pb-50">
                        <h3 class="text-32 s:text-40 text-green font-normal leading-[1.32]">${sectionTitle}</h3>
                    </div>
                    <div class="site-max site-grid items-start gap-y-20 grid-layout js-list-grid">
                        ${posts.map(post => this.createGridResultHTML(post)).join('')}
                    </div>
                </div>
            `;
        }
        
        // For "Executives & Professionals" and "Whistleblowers" style layouts
        const bgClass = postType === 'executives' ? 'py-60 s:py-120 bg-white-smoke' : '';
        
        return `
            <div class="relative ${bgClass}">
                <div class="site-max pb-32 s:pb-50">
                    <h3 class="font-disp text-32 s:text-40 text-green font-normal leading-[1.16] s:leading-[1.32] tracking-[-0.032rem]">${sectionTitle}</h3>
                </div>
                <div class="site-max site-grid gap-24">
                    ${posts.map(post => this.createLargeResultHTML(post)).join('')}
                </div>
            </div>
        `;
    }
    
    createGridResultHTML(post) {
        const hasImage = !!post.thumbnail;
        const bgColor = post.background_color || '';
        const textColor = (bgColor === 'green' || hasImage) ? 'text-white' : 'text-green';
        const bgClass = bgColor ? `bg-${bgColor.toLowerCase()}` : '';
        
        return `
            <div class="column w-full relative group overflow-hidden search-result-item" data-id="${post.id}" data-url="${post.url}">
                <a href="${post.url}" data-transition="child" class="column-inner overflow-hidden block w-full relative ${bgClass} ${textColor}">
                    ${hasImage ? `
                        <div class="column-image w-full overflow-hidden">
                            <img src="${post.thumbnail}" alt="${this.escapeHtml(post.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-[1s]">
                        </div>
                    ` : ''}
                    
                    <div class="column-category absolute top-0 left-0 w-full p-16 l:p-24">
                        <span class="text-12 font-medium leading-none tracking-[0.12rem] uppercase">${this.getPostTypeLabel(post.type)}</span>
                    </div>
                    
                    <div class="column-title absolute z-1 bottom-0 left-0 w-full p-16 l:p-24 leading-none flex justify-between items-end">
                        <p class="column-title text-24 s:text-32 font-normal leading-[1.04] tracking-[-0.032rem] max-w-[25rem] s:max-w-[31rem]">
                            ${this.highlightQuery(this.decodeHtmlEntities(post.title))}
                        </p>
                        <p class="column-link text-12 font-medium leading-none tracking-[0.12rem] uppercase flex gap-x-5 items-center whitespace-nowrap">
                            <span class="column-link-text hidden">See more</span>
                            <span class="inline-flex">
                                <svg class="w-6 h-10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 0.999999L4.5 4.5L1 8" stroke="currentColor" stroke-width="1.01111" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                        </p>
                    </div>
                </a>
            </div>
        `;
    }
    
    createLargeResultHTML(post) {
        const hasImage = !!post.thumbnail;
        const textColor = hasImage ? 'text-white' : 'text-green';
        const bgClass = hasImage ? '' : 'bg-green text-white';
        const postDate = post.date ? new Date(post.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
        
        return `
            <div class="w-full h-[46rem] relative col-span-full s:col-span-8 overflow-hidden search-result-item" data-id="${post.id}" data-url="${post.url}">
                <a href="${post.url}" class="overflow-hidden block w-full h-full relative ${bgClass} ${textColor}">
                    ${hasImage ? `
                        <div class="column-image w-full overflow-hidden">
                            <img src="${post.thumbnail}" alt="${this.escapeHtml(post.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-[1s]">
                        </div>
                    ` : ''}
                    
                    <div class="column-category absolute top-0 left-0 w-full p-16 l:p-24 flex items-center justify-between">
                        <span class="text-12 font-medium leading-none tracking-[0.12rem] uppercase">${this.getPostTypeLabel(post.type)}</span>
                        ${postDate ? `<span class="text-12 font-medium leading-none tracking-[0.12rem] uppercase">${postDate}</span>` : ''}
                    </div>
                    
                    <div class="absolute z-1 bottom-0 left-0 w-full p-16 l:p-24 leading-none flex flex-col s:flex-row s:justify-between items-start s:items-end space-y-[2.4rem] s:space-y-0">
                        <p class="relative text-24 s:text-32 font-normal leading-[1.04] tracking-[-0.032rem] max-w-[30rem] s:max-w-[35rem]">
                            ${this.highlightQuery(this.decodeHtmlEntities(post.title))}
                        </p>
                        
                        <p class="text-12 font-medium leading-none tracking-[0.12rem] uppercase flex gap-x-5 items-center whitespace-nowrap">
                            <span class="inline-flex">See more</span>
                            <span class="inline-flex relative top-[0.1rem]">
                                <svg class="w-6 h-10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 0.999999L4.5 4.5L1 8" stroke="currentColor" stroke-width="1.01111" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                        </p>
                    </div>
                </a>
            </div>
        `;
    }
    
    createResultHTML(post, index) {
        // Fallback simple result for compatibility
        return this.createGridResultHTML(post);
    }
    
    getPostTypeSectionTitle(postType) {
        const titles = {
            'issues': 'Issues',
            'cases': 'Cases', 
            'posts': 'All Posts',
            'employees': 'All Employees',
            'executives': 'Executives & Professionals',
            'whistleblowers': 'Whistleblowers'
        };
        return titles[postType] || postType.charAt(0).toUpperCase() + postType.slice(1) + 's';
    }
    
    selectResult(resultItem) {
        // Get the tag/result text
        const tagText = resultItem.querySelector('span')?.textContent?.trim() || '';
        
        if (tagText && this.elements.searchInput) {
            // Put the text in the search input
            this.elements.searchInput.value = tagText;
            this.state.currentQuery = tagText;
            this.elements.searchInput.focus();
            
            // Hide results after selection
            this.hideResults();
            
            console.log('🏷️ Tag selected:', tagText);
        }
    }
    
    addResultAsTag(resultItem) {
        const title = this.decodeHtmlEntities(resultItem.querySelector('.result-title')?.textContent?.trim());
        const data = {
            id: resultItem.dataset.id,
            url: resultItem.dataset.url,
            type: resultItem.querySelector('.result-type')?.textContent?.trim()
        };
        
        if (title && !this.state.activeTags.some(tag => tag.text === title)) {
            const tag = { text: title, data, element: resultItem };
            this.state.activeTags.push(tag);
            this.createTagElement(tag);
            this.hideResultItem(resultItem);
            
            // Clear search input
            this.elements.searchInput.value = '';
            this.state.currentQuery = '';
            this.elements.searchInput.focus();
        }
    }
    
    createTagElement(tag) {
        if (!this.elements.tagContainer) return;
        
        const tagEl = document.createElement('div');
        tagEl.className = 'predictive-search-tag';
        tagEl.innerHTML = `
            <span class="tag-text">${this.escapeHtml(tag.text)}</span>
            <button type="button" class="tag-remove" title="Remove tag">&times;</button>
        `;
        
        // Store reference to the tag element
        tag.tagElement = tagEl;
        
        tagEl.querySelector('.tag-remove').addEventListener('click', () => {
            this.removeTag(tag.text);
        });
        
        this.elements.tagContainer.appendChild(tagEl);
    }
    
    removeTag(tagText) {
        const tagIndex = this.state.activeTags.findIndex(tag => tag.text === tagText);
        if (tagIndex === -1) return;
        
        const tag = this.state.activeTags[tagIndex];
        this.state.activeTags.splice(tagIndex, 1);
        
        // Remove tag element using the stored reference
        if (tag.tagElement && tag.tagElement.parentNode) {
            tag.tagElement.remove();
        }
        
        // Show result item again
        if (tag.element) {
            this.showResultItem(tag.element);
        }
    }
    
    hideResultItem(item) {
        item.style.display = 'none';
    }
    
    showResultItem(item) {
        item.style.display = '';
    }
    
    updateSelection(results) {
        results.forEach((item, index) => {
            item.classList.toggle('selected', index === this.state.selectedIndex);
        });
        
        if (this.state.selectedIndex >= 0) {
            results[this.state.selectedIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }
    
    showResults() {
        // For the scroll boost structure, we don't hide/show the container
        // The tags are always visible, we just filter them
        if (this.elements.scrollBoostContainer) {
            this.state.isOpen = true;
            // Maybe add a visual indication that we're in search mode
            this.elements.scrollBoostContainer.classList.add('search-active');
        } else if (this.elements.resultsContainer) {
            // Fallback for generic results container
            this.elements.resultsContainer.style.display = 'block';
            this.state.isOpen = true;
        }
    }
    
    hideResults() {
        if (this.elements.scrollBoostContainer) {
            this.elements.scrollBoostContainer.classList.remove('search-active');
            this.state.isOpen = false;
        } else if (this.elements.resultsContainer) {
            this.elements.resultsContainer.style.display = 'none';
            this.state.isOpen = false;
        }
        this.state.selectedIndex = -1;
    }
    
    closeSearch() {
        this.hideResults();
        if (this.elements.searchInput) {
            this.elements.searchInput.blur();
        }
    }
    
    setLoading(loading) {
        this.state.isLoading = loading;
        
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = loading ? 'block' : 'none';
        }
        
        if (this.elements.resultsContainer) {
            this.elements.resultsContainer.style.opacity = loading ? '0.5' : '1';
        }
    }
    
    // Utility methods
    buildSearchUrl(query) {
        const params = new URLSearchParams({
            query: query,
            post_types: this.config.postTypes,
            limit: this.config.maxResults,
            include_taxonomies: 'true'
        });
        
        return `${this.config.apiUrl}?${params}`;
    }
    
    getCacheKey(query) {
        return `search_${query}_${this.config.postTypes}_${this.config.maxResults}`;
    }
    
    cacheResult(key, data) {
        if (this.state.cache.size >= this.config.cacheSize) {
            const firstKey = this.state.cache.keys().next().value;
            this.state.cache.delete(firstKey);
        }
        this.state.cache.set(key, data);
    }
    
    highlightQuery(text) {
        if (!this.state.currentQuery || !text) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(this.state.currentQuery)})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    getPostTypeLabel(postType) {
        const labels = {
            'issues': 'Issue',
            'cases': 'Case',
            'posts': 'Post'
        };
        return labels[postType] || postType.charAt(0).toUpperCase() + postType.slice(1);
    }
    
    async trackSearch(query, resultsCount) {
        if (!this.config.enableAnalytics) return;
        
        try {
            await fetch(this.config.analyticsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    results_count: resultsCount
                })
            });
        } catch (error) {
            console.warn('Analytics tracking failed:', error);
        }
    }
    
    async trackResultClick(resultId) {
        if (!this.config.enableAnalytics) return;
        
        try {
            await fetch(this.config.analyticsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: this.state.currentQuery,
                    selected_result_id: parseInt(resultId)
                })
            });
        } catch (error) {
            console.warn('Click tracking failed:', error);
        }
    }
    
    // Public API
    search(query) {
        this.state.currentQuery = query;
        this.elements.searchInput.value = query;
        if (query.length >= this.config.minQueryLength) {
            this.performSearch(query);
        }
    }
    
    clearCache() {
        this.state.cache.clear();
    }
    
    destroy() {
        if (this.state.debounceTimer) {
            clearTimeout(this.state.debounceTimer);
        }
        if (this.state.requestController) {
            this.state.requestController.abort();
        }
        this.state.cache.clear();
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if search input exists
    if (document.querySelector('#predictive-search, .search-input, input[name="s"]')) {
        window.outtenSearch = new OuttenSearchBasic();
        console.log('🔍 Outten Search Basic auto-initialized');
    }
});

// Global access
window.OuttenSearchBasic = OuttenSearchBasic;