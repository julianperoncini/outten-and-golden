import { gsap } from 'gsap'
import { evt, utils, ev } from '@/core'

const scroll = ev.scroll()

const { qs, qsa } = utils

export default function newsroomFilter(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filterButtons = qsa('[data-filter]', elements.section)
    const postsContainer = qs('.js-newsroom-posts', elements.section)
    const paginationContainer = qs('.js-newsroom-pagination', elements.section)
    
    // Results per page elements
    const resultsPerPageButton = qs('.results-per-page-button', elements.section)
    const resultsPerPageDropdown = qs('.results-per-page-dropdown', elements.section)
    const resultsPerPageOptions = qsa('.results-per-page-option', elements.section)
    const resultsPerPageDisplay = qs('.results-per-page-display', elements.section)
    
    let currentFilter = 'all'
    let currentPage = 1
    let currentResultsPerPage = 12
    let isLoading = false
    let ct = null

    function animateTransition(callback) {
        if (ct) ct.kill()
        
        // Make sure the container exists and is visible
        if (!postsContainer) {
            callback()
            return
        }
        
        // Set initial state if not already set
        gsap.set(postsContainer, { autoAlpha: 1 })
        
        // Start the fade out immediately
        ct = gsap.to(postsContainer, {
            autoAlpha: 0.3,
            duration: 0.5, // Reduced from 0.3
            ease: "power3",
            onComplete: () => {
                // Execute callback to update content
                callback()
                
                // Immediately start fade in without delay
                ct = gsap.to(postsContainer, {
                    autoAlpha: 1,
                    duration: 0.5, // Reduced from 0.4
                    ease: "power3",
                    onComplete: () => {
                        ct = null
                    }
                })
            }
        })
    }

    function updateURL(filter, page = 1, resultsPerPage = 12) {
        // Build URL in WordPress permalink style to match server-side pagination
        let newPath = window.location.pathname
        
        // Remove any existing /page/X from the path
        newPath = newPath.replace(/\/page\/\d+/, '')
        
        // Ensure we have a clean base path (remove trailing slash if it exists)
        newPath = newPath.replace(/\/$/, '')
        
        // Add page to path if > 1
        if (page > 1) {
            newPath = newPath + '/page/' + page
        }
        
        // Build query parameters
        const params = new URLSearchParams()
        
        if (filter !== 'all') {
            params.set('category', filter)
        }
        
        if (resultsPerPage !== 12) {
            params.set('per_page', resultsPerPage)
        }
        
        // Construct final URL
        let newUrl = window.location.origin + newPath
        if (params.toString()) {
            newUrl += '?' + params.toString()
        }
        
        window.history.pushState({ filter, page, resultsPerPage }, '', newUrl)
    }

    function getURLParams() {
        const urlParams = new URLSearchParams(window.location.search)
        
        // Extract page from path (/page/2) or query (?page=2)
        let page = 1
        const pageFromQuery = urlParams.get('page')
        if (pageFromQuery) {
            page = parseInt(pageFromQuery)
        } else {
            const pathMatch = window.location.pathname.match(/\/page\/(\d+)/)
            if (pathMatch) {
                page = parseInt(pathMatch[1])
            }
        }
        
        return {
            filter: urlParams.get('category') || 'all',
            page: page,
            resultsPerPage: parseInt(urlParams.get('per_page')) || 12
        }
    }

    function scrollToSection() {
        if (typeof scroll !== 'undefined' && scroll.scrollTo) {
            scroll.scrollTo(elements.section, {
                offset: -150,
                duration: 0.8, // Reduced from 1
                ease: "power3"
            })
        } else {
            elements.section.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            })
        }
    }

    // Get nonce from WordPress localized script data
    function getNonce() {
        // Try to get nonce from various possible locations
        if (window.ajaxurl_data?.nonce) {
            return window.ajaxurl_data.nonce
        }
        if (window.main?.ajaxurl_data?.nonce) {
            return window.main.ajaxurl_data.nonce
        }
        // Fallback: create a simple nonce (not secure, but for development)
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    async function loadPosts(filter, page = 1, animate = true, shouldScroll = false, resultsPerPage = null) {
        if (isLoading) return
        
        // Use provided resultsPerPage or current value
        const postsPerPage = resultsPerPage || currentResultsPerPage
        
        // Check if AJAX URL is available
        const ajaxUrl = window.ajaxurl_data?.url || window.main?.ajaxurl_data?.url || window.ajaxurl
        
        if (!ajaxUrl) {
            return
        }
        
        isLoading = true
        
        // Scroll immediately if requested
        if (shouldScroll) {
            scrollToSection()
        }
        
        // Start animation immediately before fetch
        let animationComplete = false
        let fetchComplete = false
        let fetchedData = null
        
        const updateContent = () => {
            if (!fetchedData) return
            
            const responseData = fetchedData.data
            
            // Update content
            postsContainer.innerHTML = responseData.posts_html || ''
            
            if (paginationContainer) {
                paginationContainer.innerHTML = responseData.pagination_html || ''
            }
            
            // Update results per page display
            const updatedResultsPerPageDisplay = qs('.results-per-page-display', elements.section)
            if (updatedResultsPerPageDisplay) {
                updatedResultsPerPageDisplay.textContent = postsPerPage
            }
            
            // Re-attach pagination event listeners
            attachPaginationEvents()
            
            // Update current state
            currentFilter = filter
            currentPage = page
            currentResultsPerPage = postsPerPage
            
            updateURL(filter, page, postsPerPage)
            updateActiveButton(filter)
            
            evt.emit('newsroom:filtered', { 
                filter, 
                page, 
                postsPerPage,
                totalPages: responseData.total_pages || 1,
                totalPosts: responseData.total_posts || 0
            })
        }
        
        const processUpdate = () => {
            if (animationComplete && fetchComplete) {
                updateContent()
            }
        }
        
        if (animate) {
            animateTransition(() => {
                animationComplete = true
                processUpdate()
            })
        } else {
            animationComplete = true
        }
        
        try {
            const formData = new FormData()
            formData.append('action', 'filter_newsroom_posts')
            formData.append('category', filter)
            formData.append('page', page)
            formData.append('posts_per_page', postsPerPage)
            formData.append('nonce', getNonce())

            const response = await fetch(ajaxUrl, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (data.success) {
                fetchedData = data
                fetchComplete = true
                processUpdate()
            } else {
                const errorMsg = data.data?.message || data.message || 'Failed to load posts'
                const showError = () => {
                    postsContainer.innerHTML = `<div class="error-message text-center py-8"><p class="text-red-600">${errorMsg}</p></div>`
                }
                
                if (animate && !animationComplete) {
                    // Wait for animation to complete
                    const checkAnimation = setInterval(() => {
                        if (animationComplete) {
                            clearInterval(checkAnimation)
                            showError()
                        }
                    }, 10)
                } else {
                    showError()
                }
            }
        } catch (error) {
            const showError = () => {
                postsContainer.innerHTML = '<div class="error-message text-center py-8"><p class="text-red-600">Network error. Please check your connection and try again.</p></div>'
            }
            
            if (animate && !animationComplete) {
                // Wait for animation to complete
                const checkAnimation = setInterval(() => {
                    if (animationComplete) {
                        clearInterval(checkAnimation)
                        showError()
                    }
                }, 10)
            } else {
                showError()
            }
        } finally {
            isLoading = false
        }
    }

    function updateActiveButton(activeFilter) {
        filterButtons.forEach(btn => {
            const btnFilter = btn.getAttribute('data-filter')
            if (btnFilter === activeFilter) {
                btn.classList.add('bg-white-smoke', 'pointer-events-none', 'select-none')
                btn.classList.remove('hover:bg-smoke')
            } else {
                btn.classList.remove('bg-white-smoke', 'pointer-events-none', 'select-none')
                btn.classList.add('hover:bg-smoke')
            }
        })
    }

    function attachPaginationEvents() {
        if (!paginationContainer) return
        
        // Your pagination template uses <a> tags within <li> elements
        // Select all pagination links: prev/next buttons and page numbers
        const paginationLinks = qsa('.pagination a[href]', paginationContainer)
        
        paginationLinks.forEach(link => {
            // Remove existing event listeners to prevent duplicates
            link.removeEventListener('click', handlePaginationClick)
            link.addEventListener('click', handlePaginationClick)
        })
        
        // Re-attach results per page events after pagination updates
        attachResultsPerPageEvents()
    }
    
    function attachResultsPerPageEvents() {
        // Re-query elements since pagination might have been updated via AJAX
        const newResultsPerPageButton = qs('.results-per-page-button', elements.section)
        const newResultsPerPageDropdown = qs('.results-per-page-dropdown', elements.section)
        const newResultsPerPageOptions = qsa('.results-per-page-option', elements.section)
        
        if (!newResultsPerPageButton || !newResultsPerPageDropdown) {
            return
        }
        
        // Remove existing listeners to prevent duplicates
        newResultsPerPageButton.removeEventListener('click', handleResultsPerPageToggle)
        newResultsPerPageButton.addEventListener('click', handleResultsPerPageToggle)
        
        newResultsPerPageOptions.forEach(option => {
            option.removeEventListener('click', handleResultsPerPageSelect)
            option.addEventListener('click', handleResultsPerPageSelect)
        })
    }
    
    function handleResultsPerPageToggle(e) {
        e.preventDefault()
        e.stopPropagation()
        
        const dropdown = qs('.results-per-page-dropdown', elements.section)
        if (dropdown) {
            dropdown.classList.toggle('invisible')
        }
    }
    
    function handleResultsPerPageSelect(e) {
        e.preventDefault()
        e.stopPropagation()
        
        const newResultsPerPage = parseInt(e.target.textContent.trim())
        
        if (newResultsPerPage && newResultsPerPage !== currentResultsPerPage && !isLoading) {
            // Hide dropdown
            const dropdown = qs('.results-per-page-dropdown', elements.section)
            if (dropdown) {
                dropdown.classList.add('invisible')
            }
            
            // Load posts with new per page count (reset to page 1)
            loadPosts(currentFilter, 1, true, true, newResultsPerPage)
        }
    }
    
    // Separate function for pagination click to avoid closure issues
    function handlePaginationClick(e) {
        e.preventDefault()
        
        const link = e.target.closest('a')
        if (!link || !link.href) return
        
        // Extract page number from the URL - handle both formats
        const url = new URL(link.href)
        let page = 1
        let category = 'all'
        let resultsPerPage = 12
        
        // Method 1: Check query parameters (?page=2)
        const pageParam = url.searchParams.get('page')
        if (pageParam) {
            page = parseInt(pageParam)
        } else {
            // Method 2: Check WordPress permalink format (/page/2)
            const pathMatch = url.pathname.match(/\/page\/(\d+)/)
            if (pathMatch) {
                page = parseInt(pathMatch[1])
            } else {
                // Method 3: Check if this is an explicit page 1 link or base URL
                // If the pathname ends with just '/newsroom' or '/newsroom/', it's page 1
                const cleanPath = url.pathname.replace(/\/$/, '')
                const basePath = window.location.pathname.replace(/\/page\/\d+/, '').replace(/\/$/, '')
                
                if (cleanPath === basePath) {
                    page = 1
                } else {
                    // Fallback: default to page 1
                    page = 1
                }
            }
        }
        
        // Extract category from URL
        const categoryParam = url.searchParams.get('category')
        if (categoryParam) {
            category = categoryParam
        } else {
            // Use current filter if no category in URL
            category = currentFilter
        }
        
        // Extract results per page from URL
        const perPageParam = url.searchParams.get('per_page')
        if (perPageParam) {
            resultsPerPage = parseInt(perPageParam)
        } else {
            // Use current results per page if not in URL
            resultsPerPage = currentResultsPerPage
        }
        
        if (page && page !== currentPage && !isLoading) {
            // Update URL first (for proper back/forward support)
            updateURL(category, page, resultsPerPage)
            
            // Load posts with animation and scroll
            loadPosts(category, page, true, true, resultsPerPage)
        }
    }

    function addFilterEvents() {
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault()
                const filter = button.getAttribute('data-filter')
                
                if (filter !== currentFilter && !isLoading) {
                    // Update URL first (reset to page 1 for new filter)
                    updateURL(filter, 1, currentResultsPerPage)
                    
                    // Load posts with animation and scroll
                    loadPosts(filter, 1, true, true, currentResultsPerPage)
                }
            })
        })
    }

    function addResultsPerPageEvents() {
        if (!resultsPerPageButton || !resultsPerPageDropdown) {
            return
        }
        
        // Toggle dropdown visibility
        resultsPerPageButton.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            
            resultsPerPageDropdown.classList.toggle('invisible')
        })
        
        // Handle option selection
        resultsPerPageOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                const newResultsPerPage = parseInt(option.textContent.trim())
                
                if (newResultsPerPage && newResultsPerPage !== currentResultsPerPage && !isLoading) {
                    // Hide dropdown
                    resultsPerPageDropdown.classList.add('invisible')
                    
                    // Load posts with new per page count (reset to page 1)
                    loadPosts(currentFilter, 1, true, true, newResultsPerPage)
                }
            })
        })
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!resultsPerPageButton.contains(e.target) && !resultsPerPageDropdown.contains(e.target)) {
                resultsPerPageDropdown.classList.add('invisible')
            }
        })
    }

    function handlePopState(event) {
        const { filter, page, resultsPerPage } = event.state || getURLParams()
        
        if (filter !== currentFilter || page !== currentPage || resultsPerPage !== currentResultsPerPage) {
            loadPosts(filter, page, false, false, resultsPerPage) // Don't animate or scroll on back/forward
        }
    }

    function initializeFromURL() {
        const { filter, page, resultsPerPage } = getURLParams()
        
        // Validate that the filter exists as a button
        const validButton = qs(`[data-filter="${filter}"]`, elements.section)
        const finalFilter = validButton ? filter : 'all'
        
        // Check if posts are already loaded server-side
        const existingPosts = postsContainer && postsContainer.querySelector('.news-grid-blog-page')
        const hasServerPosts = existingPosts && existingPosts.children.length > 0
        
        // Set current results per page from URL
        currentResultsPerPage = resultsPerPage
        
        // Update results per page display if it exists
        const initialResultsPerPageDisplay = qs('.results-per-page-display', elements.section)
        if (initialResultsPerPageDisplay) {
            initialResultsPerPageDisplay.textContent = resultsPerPage
        }
        
        // Check if this is the true default state (no URL params at all)
        const isDefaultState = finalFilter === 'all' && page === 1 && resultsPerPage === 12 && !window.location.search
        
        if (hasServerPosts && isDefaultState) {
            // Use server-side posts for true default state only
            updateActiveButton('all')
            currentFilter = 'all'
            currentPage = 1
            attachPaginationEvents()
        } else {
            // Load posts via AJAX for any non-default state OR if no server posts
            loadPosts(finalFilter, page, false, false, resultsPerPage)
        }
    }

    function mount() {
        // Check if AJAX URL is properly set up
        const ajaxUrl = window.ajaxurl_data?.url || window.main?.ajaxurl_data?.url || window.ajaxurl
        
        if (!ajaxUrl) {
            return
        }
        
        // Initialize GSAP state for the posts container
        if (postsContainer) {
            gsap.set(postsContainer, { 
                autoAlpha: 1,
                clearProps: "transform" // Clear any unwanted transforms
            })
        }
        
        addFilterEvents()
        addResultsPerPageEvents()
        attachPaginationEvents()
        
        // Handle browser back/forward
        window.addEventListener('popstate', handlePopState)
        
        // Initialize from URL parameters
        initializeFromURL()
    }

    function destroy() {
        if (ct) ct.kill()
        
        filterButtons.forEach(button => {
            button.removeEventListener('click', () => {})
        })
        
        if (paginationContainer) {
            const paginationLinks = qsa('.pagination a[href]', paginationContainer)
            paginationLinks.forEach(link => {
                link.removeEventListener('click', handlePaginationClick)
            })
        }
        
        window.removeEventListener('popstate', handlePopState)
    }

    mount()

    return {
        destroy,
        loadPosts,
        getCurrentFilter: () => currentFilter,
        getCurrentPage: () => currentPage,
        isLoading: () => isLoading
    }
}