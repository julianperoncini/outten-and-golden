import { gsap } from 'gsap'
import { evt, ev, utils, store } from '@/core'

const { qs, qsa } = utils
const scroll = ev.scroll()

export default function casesFilter(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filterButtons = qsa('[data-filter]', elements.section)
    const gridContainer = qs('.js-all-posts-container', elements.section)
    const allItems = qsa('.js-all-posts-item', elements.section)
    
    let ct = null
    let isInitialLoad = true

    function animateTransition(callback) {
        if (ct) ct.kill()
        
        ct = gsap.to(gridContainer, {
            autoAlpha: 0.3,
            duration: 0.5,
            ease: "power3",
            onComplete: () => {
                callback()
                
                ct = gsap.to(gridContainer, {
                    autoAlpha: 1,
                    duration: 0.5,
                    ease: "power3",
                    onComplete: () => {
                        ct = null
                    }
                })
            }
        })
    }

    function updateURL(filterValue, pushState = true) {
        const url = new URL(window.location)
        
        if (filterValue === 'all') {
            url.searchParams.delete('filter')
        } else {
            url.searchParams.set('filter', filterValue)
        }
        
        if (pushState) {
            window.history.pushState({ filter: filterValue }, '', url.toString())
        } else {
            window.history.replaceState({ filter: filterValue }, '', url.toString())
        }
    }

    function getURLFilter() {
        const urlParams = new URLSearchParams(window.location.search)
        return urlParams.get('filter') || 'all'
    }

    function scrollToSection() {
        // Scroll to the section with smooth behavior
        scroll.scrollTo(elements.section, {
            offset: 0,
            duration: 0.8, // Reduced from 0.5
            ease: "power3"
        })
    }

    function showAllItems(updateUrl = true, scroll = false) {
        // Scroll immediately if requested
        if (scroll && !isInitialLoad) {
            scrollToSection()
        }
        
        const callback = () => {
            allItems.forEach(item => {
                item.style.display = 'block'
            })

            evt.emit('blogs:filtered', { filter: 'all', items: allItems })
            
            if (updateUrl) {
                updateURL('all', !isInitialLoad)
            }
        }

        if (isInitialLoad) {
            callback()
        } else {
            animateTransition(callback)
        }
    }

    function filterByCategory(filterValue, updateUrl = true, scroll = false) {
        // Scroll immediately if requested
        if (scroll && !isInitialLoad) {
            scrollToSection()
        }
        
        const callback = () => {
            const visibleItems = []
            
            allItems.forEach(item => {
                const categories = item.getAttribute('data-filter-category') || ''
                const categoryList = categories.split(',').map(cat => cat.trim())
                
                if (categoryList.includes(filterValue)) {
                    item.style.display = 'block'
                    visibleItems.push(item)
                } else {
                    item.style.display = 'none'
                }
            })

            evt.emit('blogs:filtered', { 
                filter: filterValue, 
                items: visibleItems,
                count: visibleItems.length 
            })
            
            if (updateUrl) {
                updateURL(filterValue, !isInitialLoad)
            }
        }

        if (isInitialLoad) {
            callback()
        } else {
            animateTransition(callback)
        }
    }

    function updateActiveButton(activeButton) {
        filterButtons.forEach(btn => {
            btn.classList.remove('bg-white-smoke', 'pointer-events-none', 'select-none')
            btn.classList.remove('border-green')
        })
        
        activeButton.classList.add('bg-white-smoke', 'pointer-events-none', 'select-none')
    }

    function applyFilter(filterValue, updateUrl = true, scroll = false) {
        // Find and update the active button
        const targetButton = qs(`[data-filter="${filterValue}"]`, elements.section)
        if (targetButton) {
            updateActiveButton(targetButton)
        }
        
        // Apply the filter
        if (filterValue === 'all') {
            showAllItems(updateUrl, scroll)
        } else {
            filterByCategory(filterValue, updateUrl, scroll)
        }
    }

    function handlePopState(event) {
        const filterValue = event.state?.filter || getURLFilter()
        applyFilter(filterValue, false, false) // Don't update URL or scroll on back/forward
    }

    function addEvents() {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filterValue = button.getAttribute('data-filter')
                applyFilter(filterValue, true, true) // Update URL and scroll on click
            })
        })

        // Handle browser back/forward buttons
        window.addEventListener('popstate', handlePopState)
    }

    function initializeFromURL() {
        const filterValue = getURLFilter()
        
        // Validate that the filter exists as a button
        const validButton = qs(`[data-filter="${filterValue}"]`, elements.section)
        const finalFilter = validButton ? filterValue : 'all'
        
        applyFilter(finalFilter, true, false) // Update URL if invalid, don't scroll on init
        
        // Scroll to section if there's a filter parameter in URL (with immediate scroll)
        if (filterValue !== 'all' && window.location.search.includes('filter=')) {
            scroll.scrollTo(elements.section, {
                offset: 0,
                duration: 0.8, // Reduced from 1
                ease: "power3.out"
            })
        }
        
        isInitialLoad = false
    }

    function mount() {
        addEvents()
        initializeFromURL()
    }

    function destroy() {
        if (ct) ct.kill()
        
        allItems.forEach(item => {
            item.style.display = 'block'
        })
        
        filterButtons.forEach(button => {
            button.removeEventListener('click', () => {})
        })
        
        window.removeEventListener('popstate', handlePopState)
    }

    mount()

    return {
        destroy,
        showAll: showAllItems,
        filterBy: filterByCategory,
        applyFilter // Expose for external use
    }
}