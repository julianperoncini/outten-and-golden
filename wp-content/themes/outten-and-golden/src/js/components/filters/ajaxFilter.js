import { gsap } from 'gsap'
import { evt, utils, ev } from '@/core'

const scroll = ev.scroll()
const { qs, qsa } = utils

export default function ajaxFilter(config) {
    // Configuration with defaults
    const options = {
        ajaxAction: config.ajaxAction || 'filter_newsroom_posts',
        postsContainer: config.postsContainer || '.js-posts',
        paginationContainer: config.paginationContainer || '.js-pagination',
        filterParam: config.filterParam || 'category',
        defaultFilter: config.defaultFilter || 'all',
        defaultPerPage: config.defaultPerPage || 12,
        scrollOffset: config.scrollOffset || -150,
        eventPrefix: config.eventPrefix || 'posts',
        ...config
    }
    
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filterButtons = qsa('[data-filter]', elements.section)
    const postsContainer = qs(options.postsContainer, elements.section)
    const paginationContainer = qs(options.paginationContainer, elements.section)
    
    // Results per page elements
    const resultsPerPageButton = qs('.results-per-page-button', elements.section)
    const resultsPerPageDropdown = qs('.results-per-page-dropdown', elements.section)
    const resultsPerPageOptions = qsa('.results-per-page-option', elements.section)
    const resultsPerPageDisplay = qs('.results-per-page-display', elements.section)
    
    let currentFilter = options.defaultFilter
    let currentPage = 1
    let currentResultsPerPage = options.defaultPerPage
    let isLoading = false
    let ct = null

    function animateTransition(callback) {
        if (ct) ct.kill()
        
        if (!postsContainer) {
            callback()
            return
        }
        
        gsap.set(postsContainer, { autoAlpha: 1 })
        
        ct = gsap.to(postsContainer, {
            autoAlpha: 0.3,
            duration: 0.2,
            ease: "power3",
            onComplete: () => {
                callback()
                
                ct = gsap.to(postsContainer, {
                    autoAlpha: 1,
                    duration: 0.3,
                    ease: "power3",
                    onComplete: () => {
                        ct = null
                    }
                })
            }
        })
    }

    function updateURL(filter, page = 1, resultsPerPage = null) {
        resultsPerPage = resultsPerPage || options.defaultPerPage
        
        let newPath = window.location.pathname
        newPath = newPath.replace(/\/page\/\d+/, '')
        newPath = newPath.replace(/\/$/, '')
        
        if (page > 1) {
            newPath = newPath + '/page/' + page
        }
        
        const params = new URLSearchParams()
        
        if (filter !== options.defaultFilter) {
            params.set(options.filterParam, filter)
        }
        
        if (resultsPerPage !== options.defaultPerPage) {
            params.set('per_page', resultsPerPage)
        }
        
        let newUrl = window.location.origin + newPath
        if (params.toString()) {
            newUrl += '?' + params.toString()
        }
        
        window.history.pushState({ filter, page, resultsPerPage }, '', newUrl)
    }

    function getURLParams() {
        const urlParams = new URLSearchParams(window.location.search)
        
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
            filter: urlParams.get(options.filterParam) || options.defaultFilter,
            page: page,
            resultsPerPage: parseInt(urlParams.get('per_page')) || options.defaultPerPage
        }
    }

    function scrollToSection() {
        if (typeof scroll !== 'undefined' && scroll.scrollTo) {
            scroll.scrollTo(elements.section, {
                offset: options.scrollOffset,
                duration: 0.8,
                ease: "power3"
            })
        } else {
            elements.section.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            })
        }
    }

    function getNonce() {
        if (window.ajaxurl_data?.nonce) {
            return window.ajaxurl_data.nonce
        }
        if (window.main?.ajaxurl_data?.nonce) {
            return window.main.ajaxurl_data.nonce
        }
        return ''
    }

    async function loadPosts(filter, page = 1, animate = true, shouldScroll = false, resultsPerPage = null) {
        if (isLoading) return
        
        // Check if posts container exists
        if (!postsContainer) {
            console.error('Posts container not found:', options.postsContainer)
            return
        }
        
        const postsPerPage = resultsPerPage || currentResultsPerPage
        
        const ajaxUrl = window.ajaxurl_data?.url || window.main?.ajaxurl_data?.url || window.ajaxurl
        
        if (!ajaxUrl) {
            console.error('AJAX URL not defined')
            return
        }
        
        isLoading = true
        
        if (shouldScroll) {
            //scrollToSection()
        }
        
        let animationComplete = false
        let fetchComplete = false
        let fetchedData = null
        
        const updateContent = () => {
            if (!fetchedData) return
            
            const responseData = fetchedData.data
            
            if (postsContainer) {
                postsContainer.innerHTML = responseData.posts_html || ''
            }
            
            if (paginationContainer) {
                paginationContainer.innerHTML = responseData.pagination_html || ''
            }
            
            const updatedResultsPerPageDisplay = qs('.results-per-page-display', elements.section)
            if (updatedResultsPerPageDisplay) {
                updatedResultsPerPageDisplay.textContent = postsPerPage
            }
            
            attachPaginationEvents()
            attachResultsPerPageEvents()
            
            currentFilter = filter
            currentPage = page
            currentResultsPerPage = postsPerPage
            
            updateURL(filter, page, postsPerPage)
            updateActiveButton(filter)
            
            evt.emit(`${options.eventPrefix}:filtered`, { 
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
            formData.append('action', options.ajaxAction)
            formData.append(options.filterParam, filter)
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
                    if (postsContainer) {
                        postsContainer.innerHTML = `<div class="error-message text-center py-8"><p class="text-red-600">${errorMsg}</p></div>`
                    } else {
                        console.error('Posts container not found:', errorMsg)
                    }
                }
                
                if (animate && !animationComplete) {
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
                if (postsContainer) {
                    postsContainer.innerHTML = '<div class="error-message text-center py-8"><p class="text-red-600">Network error. Please check your connection and try again.</p></div>'
                } else {
                    console.error('Posts container not found. Network error:', error)
                }
            }
            
            if (animate && !animationComplete) {
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
        
        const paginationLinks = qsa('.pagination a[href]', paginationContainer)
        
        paginationLinks.forEach(link => {
            link.removeEventListener('click', handlePaginationClick)
            link.addEventListener('click', handlePaginationClick)
        })
        
        attachResultsPerPageEvents()
    }
    
    function attachResultsPerPageEvents() {
        const newResultsPerPageButton = qs('.results-per-page-button', elements.section)
        const newResultsPerPageDropdown = qs('.results-per-page-dropdown', elements.section)
        const newResultsPerPageOptions = qsa('.results-per-page-option', elements.section)
        
        if (!newResultsPerPageButton || !newResultsPerPageDropdown) {
            const paginationResultsButton = qs('.results-per-page-button', paginationContainer)
            const paginationResultsDropdown = qs('.results-per-page-dropdown', paginationContainer)
            const paginationResultsOptions = qsa('.results-per-page-option', paginationContainer)
            
            if (paginationResultsButton && paginationResultsDropdown) {
                attachResultsPerPageHandlers(paginationResultsButton, paginationResultsDropdown, paginationResultsOptions)
            }
            return
        }
        
        attachResultsPerPageHandlers(newResultsPerPageButton, newResultsPerPageDropdown, newResultsPerPageOptions)
    }
    
    function attachResultsPerPageHandlers(button, dropdown, options) {
        button.removeEventListener('click', handleResultsPerPageToggle)
        button.addEventListener('click', handleResultsPerPageToggle)
        
        options.forEach(option => {
            option.removeEventListener('click', handleResultsPerPageSelect)
            option.addEventListener('click', handleResultsPerPageSelect)
        })
        
        if (!document.documentElement.hasAttribute('data-results-dropdown-listener')) {
            document.documentElement.setAttribute('data-results-dropdown-listener', 'true')
            document.addEventListener('click', handleOutsideClick)
        }
    }
    
    function handleResultsPerPageToggle(e) {
        e.preventDefault()
        e.stopPropagation()
        
        let dropdown = qs('.results-per-page-dropdown', elements.section)
        if (!dropdown) {
            dropdown = qs('.results-per-page-dropdown', paginationContainer)
        }
        
        if (dropdown) {
            dropdown.classList.toggle('invisible')
        }
    }
    
    function handleResultsPerPageSelect(e) {
        e.preventDefault()
        e.stopPropagation()
        
        const newResultsPerPage = parseInt(e.target.textContent.trim())
        
        if (newResultsPerPage && newResultsPerPage !== currentResultsPerPage && !isLoading) {
            let dropdown = qs('.results-per-page-dropdown', elements.section)
            if (!dropdown) {
                dropdown = qs('.results-per-page-dropdown', paginationContainer)
            }
            
            if (dropdown) {
                dropdown.classList.add('invisible')
            }
            
            loadPosts(currentFilter, 1, true, true, newResultsPerPage)
        }
    }
    
    function handlePaginationClick(e) {
        e.preventDefault()
        
        const link = e.target.closest('a')
        if (!link || !link.href) return
        
        const url = new URL(link.href)
        let page = 1
        let filter = options.defaultFilter
        let resultsPerPage = options.defaultPerPage
        
        const pageParam = url.searchParams.get('page')
        if (pageParam) {
            page = parseInt(pageParam)
        } else {
            const pathMatch = url.pathname.match(/\/page\/(\d+)/)
            if (pathMatch) {
                page = parseInt(pathMatch[1])
            } else {
                const cleanPath = url.pathname.replace(/\/$/, '')
                const basePath = window.location.pathname.replace(/\/page\/\d+/, '').replace(/\/$/, '')
                
                if (cleanPath === basePath) {
                    page = 1
                } else {
                    page = 1
                }
            }
        }
        
        const filterParam = url.searchParams.get(options.filterParam)
        if (filterParam) {
            filter = filterParam
        } else {
            filter = currentFilter
        }
        
        const perPageParam = url.searchParams.get('per_page')
        if (perPageParam) {
            resultsPerPage = parseInt(perPageParam)
        } else {
            resultsPerPage = currentResultsPerPage
        }
        
        if (page && page !== currentPage && !isLoading) {
            updateURL(filter, page, resultsPerPage)
            loadPosts(filter, page, true, true, resultsPerPage)
        }
    }
    
    function handleOutsideClick(e) {
        let dropdown = qs('.results-per-page-dropdown', elements.section)
        let button = qs('.results-per-page-button', elements.section)
        
        if (!dropdown || !button) {
            dropdown = qs('.results-per-page-dropdown', paginationContainer)
            button = qs('.results-per-page-button', paginationContainer)
        }
        
        if (dropdown && button && !button.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('invisible')
        }
    }

    function addFilterEvents() {
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault()
                const filter = button.getAttribute('data-filter')
                
                if (filter !== currentFilter && !isLoading) {
                    updateURL(filter, 1, currentResultsPerPage)
                    loadPosts(filter, 1, true, true, currentResultsPerPage)
                }
            })
        })
    }

    function handlePopState(event) {
        const { filter, page, resultsPerPage } = event.state || getURLParams()
        
        if (filter !== currentFilter || page !== currentPage || resultsPerPage !== currentResultsPerPage) {
            loadPosts(filter, page, false, false, resultsPerPage)
        }
    }

    function initializeFromURL() {
        const { filter, page, resultsPerPage } = getURLParams()
        
        const validButton = qs(`[data-filter="${filter}"]`, elements.section)
        const finalFilter = validButton ? filter : options.defaultFilter
        
        const existingPosts = postsContainer && postsContainer.children.length > 0
        
        currentResultsPerPage = resultsPerPage
        
        const initialResultsPerPageDisplay = qs('.results-per-page-display', elements.section)
        if (initialResultsPerPageDisplay) {
            initialResultsPerPageDisplay.textContent = resultsPerPage
        }
        
        const isDefaultState = finalFilter === options.defaultFilter && page === 1 && resultsPerPage === options.defaultPerPage && !window.location.search
        
        // Check if we should scroll on load (when there's a filter or page in URL)
        const shouldScrollOnLoad = filter !== options.defaultFilter || page > 1
        
        if (existingPosts && isDefaultState) {
            updateActiveButton(options.defaultFilter)
            currentFilter = options.defaultFilter
            currentPage = 1
            attachPaginationEvents()
            attachResultsPerPageEvents()
        } else {
            loadPosts(finalFilter, page, false, false, resultsPerPage)
        }
        
        // Scroll to section if there's a filter or page parameter
        if (shouldScrollOnLoad) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                //scrollToSection()
            }, 100)
        }
    }

    function mount() {
        const ajaxUrl = window.ajaxurl_data?.url || window.main?.ajaxurl_data?.url || window.ajaxurl
        
        if (!ajaxUrl) {
            return
        }
        
        if (postsContainer) {
            gsap.set(postsContainer, { 
                autoAlpha: 1,
                clearProps: "transform"
            })
        }
        
        addFilterEvents()
        attachPaginationEvents()
        
        window.addEventListener('popstate', handlePopState)
        
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
        document.removeEventListener('click', handleOutsideClick)
        document.documentElement.removeAttribute('data-results-dropdown-listener')
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