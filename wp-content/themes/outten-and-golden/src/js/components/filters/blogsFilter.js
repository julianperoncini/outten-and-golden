import { utils, ev } from '@/core'
import { gsap } from 'gsap'

const { qs, qsa } = utils

const scroll = ev.scroll()

export default function blogsFilter(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    // Configuration with defaults
    const options = {
        filterParam: elements.section.getAttribute('data-filter-param') || config.filterParam || 'blog_category',
        defaultFilter: config.defaultFilter || null // null means no default filter
    }

    console.log("Blog filter initialized with param:", options.filterParam);

    const filterButtons = qsa('[data-filter-button]', elements.section)
    const categoryGroups = qsa('[data-category]', elements.section)
    const scrollButton = qs('[data-scroll-filters]', elements.section)
    const filterContainer = qs('[data-filter-container]', elements.section)
    const postsContainer = qs('[data-posts-container]', elements.section)

    let activeCategory = null
    let isDestroyed = false
    let initializing = true

    // Simplified updateURL function for blogsFilter - no page path handling
    function updateURL(category) {
        if (isDestroyed) return
        
        // Create URL object to work with current URL
        const url = new URL(window.location)
        
        // Preserve all existing parameters except our filter parameter
        const currentParams = new URLSearchParams(window.location.search)
        const params = new URLSearchParams()
        
        // Copy all params except our filter param
        currentParams.forEach((value, key) => {
            if (key !== options.filterParam) {
                params.set(key, value)
            }
        })
        
        // Add our filter parameter if it's not the default
        if (category !== options.defaultFilter) {
            params.set(options.filterParam, category)
        }
        
        // Construct the new URL
        let newUrl = window.location.origin + window.location.pathname
        if (params.toString()) {
            newUrl += '?' + params.toString()
        }
        
        // Create state object with our category
        const stateObj = { category }
        
        // Update the browser history
        window.history.pushState(stateObj, '', newUrl)
    }

    // Simplified getURLParams function - just gets our category
    function getURLParams() {
        const urlParams = new URLSearchParams(window.location.search)
        const category = urlParams.get(options.filterParam) || options.defaultFilter
        
        return { category }
    }

    const init = () => {
        // Get category from URL using the simplified getURLParams function
        const { category } = getURLParams()
        
        console.log("URL params on init:", { category });
        
        // Find matching category button
        const paramCategory = category ? Array.from(filterButtons).find(
            button => button.getAttribute('data-filter-button') === category
        ) : null
        
        if (paramCategory) {
            console.log("Found matching button for category:", category);
            
            // Set the category from URL parameter
            activeCategory = category
            updateActiveButton(paramCategory)
            showCategory(activeCategory, false)
        } else if (filterButtons.length > 0) {
            // Default to first category if no param or invalid param
            const firstButton = filterButtons[0]
            activeCategory = firstButton.getAttribute('data-filter-button')
            updateActiveButton(firstButton)
            showCategory(activeCategory, false)
        }

        bindEvents()
        initializing = false
    }

    const bindEvents = () => {
        // Add click event to filter buttons
        filterButtons.forEach(button => {
            button.addEventListener('click', handleFilterClick)
        })

        // Add click event to scroll button (mobile)
        if (scrollButton) {
            scrollButton.addEventListener('click', handleScrollClick)
        }
        
        // Listen for popstate to handle browser navigation
        window.addEventListener('popstate', handlePopState)
    }

    const scrollToSection = () => {
        // Only scroll if explicitly requested and not during initialization
        if (elements.section && !isDestroyed && !initializing) {
            scroll.scrollTo(elements.section, {
                offset: 0,
                duration: 0.8,
                ease: "power3"
            })
        }
    }

    const handleFilterClick = (e) => {
        const button = e.currentTarget
        const category = button.getAttribute('data-filter-button')
        
        if (category === activeCategory || isDestroyed) return
        
        // Update URL using the simplified updateURL function
        updateURL(category)
        
        // Update active button state
        updateActiveButton(button)
        
        // Show the selected category with animation
        showCategory(category, true)
        
        // Update active category
        activeCategory = category

        // Don't scroll automatically when clicking filters
    }
    
    // Handle popstate event (browser back/forward)
    const handlePopState = (e) => {
        if (isDestroyed) return
        
        // Get category from URL
        const { category } = getURLParams()
        
        // Try to get category from state if available
        const stateCategory = e.state && e.state.category ? e.state.category : null
        
        // Use either state or URL parameter, prefer state if available
        const finalCategory = stateCategory || category
        
        console.log("PopState detected, category:", finalCategory);
        
        // If category exists and is different from current active category
        if (finalCategory && finalCategory !== activeCategory) {
            const button = Array.from(filterButtons).find(
                btn => btn.getAttribute('data-filter-button') === finalCategory
            )
            
            if (button) {
                updateActiveButton(button)
                showCategory(finalCategory, true)
                activeCategory = finalCategory
            }
        } 
        // If no category but we have an active one, reset to first button
        else if (!finalCategory && activeCategory) {
            const firstButton = filterButtons[0]
            if (firstButton) {
                const firstCategory = firstButton.getAttribute('data-filter-button')
                updateActiveButton(firstButton)
                showCategory(firstCategory, true)
                activeCategory = firstCategory
            }
        }
    }

    const updateActiveButton = (activeButton) => {
        // Update ARIA states and visual states
        filterButtons.forEach(button => {
            const isActive = button === activeButton
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
            
            // Add/remove active class for styling
            if (isActive) {
                button.classList.add('bg-white-smoke')
            } else {
                button.classList.remove('bg-white-smoke')
            }
        })
    }

    const showCategory = (categorySlug, animate = true) => {
        // Find the target category group
        const targetGroup = Array.from(categoryGroups).find(
            group => group.getAttribute('data-category') === categorySlug
        )
        
        if (!targetGroup || isDestroyed) return
        
        // Kill any ongoing animations to prevent conflicts
        categoryGroups.forEach(group => {
            gsap.killTweensOf(group)
        })
        
        if (animate) {
            // Fade out current visible category
            const visibleGroup = Array.from(categoryGroups).find(
                group => group.getAttribute('aria-hidden') === 'false'
            )
            
            if (visibleGroup) {
                // Timeline for coordinated animation
                const tl = gsap.timeline()
                
                // Fade out current category to 0.5 opacity
                tl.to(visibleGroup, {
                    opacity: 0.5,
                    duration: 0.25,
                    ease: 'power2.out'
                })
                
                // Update ARIA attributes and completely hide current group
                .call(() => {
                    visibleGroup.setAttribute('aria-hidden', 'true')
                    targetGroup.setAttribute('aria-hidden', 'false')
                    gsap.set(visibleGroup, { autoAlpha: 0 })
                })
                
                // Fade in target category
                .to(targetGroup, {
                    autoAlpha: 1,
                    duration: 0.25,
                    ease: 'power2.in'
                })
            } else {
                // If no visible group, just show the target
                targetGroup.setAttribute('aria-hidden', 'false')
                gsap.to(targetGroup, {
                    autoAlpha: 1,
                    duration: 0.25,
                    ease: 'power2.in'
                })
            }
        } else {
            // Initial setup without animation
            categoryGroups.forEach(group => {
                const isTarget = group.getAttribute('data-category') === categorySlug
                gsap.set(group, { autoAlpha: isTarget ? 1 : 0 })
                group.setAttribute('aria-hidden', isTarget ? 'false' : 'true')
            })
        }
    }

    const handleScrollClick = () => {
        if (isDestroyed) return
        
        // Kill any ongoing animations on the filter container
        gsap.killTweensOf(filterContainer)
        
        // Scroll the filter container horizontally
        if (filterContainer) {
            const currentScroll = filterContainer.scrollLeft
            const scrollAmount = 150 // Adjust as needed
            
            gsap.to(filterContainer, {
                scrollLeft: currentScroll + scrollAmount,
                duration: 0.3,
                ease: 'power2.out'
            })
        }
    }

    const destroy = () => {
        isDestroyed = true
        
        // Remove event listeners
        filterButtons.forEach(button => {
            button.removeEventListener('click', handleFilterClick)
        })
        
        if (scrollButton) {
            scrollButton.removeEventListener('click', handleScrollClick)
        }
        
        window.removeEventListener('popstate', handlePopState)
        
        // Kill any ongoing animations
        categoryGroups.forEach(group => {
            gsap.killTweensOf(group)
        })
        
        if (filterContainer) {
            gsap.killTweensOf(filterContainer)
        }
    }

    // Initialize the component
    init()

    // Return public methods
    return {
        filterByCategory: (category) => {
            if (isDestroyed) return
            
            const button = Array.from(filterButtons).find(
                btn => btn.getAttribute('data-filter-button') === category
            )
            
            if (button) {
                updateActiveButton(button)
                showCategory(category, true)
                activeCategory = category
                updateURL(category)
            }
        },
        scrollToSection: scrollToSection,
        destroy: destroy,
        getActiveCategory: () => activeCategory
    }
}