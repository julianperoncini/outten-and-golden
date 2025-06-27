import { gsap } from 'gsap'
import { evt, utils, store } from '@/core'

const { qs, qsa } = utils

export default function teamFilter(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const categoryButtons = qsa('[data-filter]', elements.section)
    const locationDropdown = qs('.js-all-team-members-select-location', elements.section)?.parentElement
    const locationItems = qsa('[data-filter-location]', elements.section)
    const locationButton = qs('.js-all-team-members-select-location', elements.section)
    const locationButtonText = qs('.js-all-team-members-location-button-text', elements.section)
    const locationContainer = qs('.js-all-team-members-locations-container', elements.section)
    const locationList = qs('.js-all-team-members-locations', elements.section)
    const locationArrow = qs('.js-all-team-members-select-location-arrow', elements.section)
    const gridContainer = qs('.js-all-team-members-container', elements.section)
    const allItems = qsa('.js-all-team-members-item', elements.section)
    
    let ct = null
    let dropdownTween = null
    let currentCategoryFilter = 'all'
    let currentLocationFilter = 'all'
    let isLocationDropdownOpen = false

    // Store handler references for proper cleanup
    const handlers = {
        categoryHandlers: new Map(),
        locationHandlers: new Map(),
        locationButtonHandler: null,
        documentClick: null,
        documentKeydown: null
    }

    function animateTransition(callback) {
        if (ct) ct.kill()
        
        ct = gsap.to(gridContainer, {
            autoAlpha: 0,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                callback()
                
                ct = gsap.to(gridContainer, {
                    autoAlpha: 1,
                    duration: 0.4,
                    ease: "power2.out",
                    onComplete: () => {
                        ct = null
                    }
                })
            }
        })
    }

    let isFilteringAllowed = true

    function filterItems(skipAnimation = false) {
        // Block filtering if it's not allowed (e.g., when clicking on cards)
        if (!isFilteringAllowed) {
            console.log('Filtering blocked - card click detected')
            return
        }
        
        console.log('filterItems called', { categoryFilter: currentCategoryFilter, locationFilter: currentLocationFilter, skipAnimation })
        
        const doFilter = () => {
            const visibleItems = []
            
            allItems.forEach(item => {
                const categories = item.getAttribute('data-filter-category') || 'all'
                const locations = item.getAttribute('data-filter-location') || 'all'
                
                const categoryList = categories.split(',').map(cat => cat.trim())
                const locationList = locations.split(',').map(loc => loc.trim())
                
                const categoryMatch = currentCategoryFilter === 'all' || categoryList.includes(currentCategoryFilter)
                const locationMatch = currentLocationFilter === 'all' || locationList.includes(currentLocationFilter)
                
                if (categoryMatch && locationMatch) {
                    item.style.display = 'block'
                    visibleItems.push(item)
                } else {
                    item.style.display = 'none'
                }
            })

            evt.emit('team:filtered', { 
                categoryFilter: currentCategoryFilter,
                locationFilter: currentLocationFilter,
                items: visibleItems,
                count: visibleItems.length 
            })
        }

        if (skipAnimation) {
            doFilter()
        } else {
            animateTransition(doFilter)
        }
    }

    function updateActiveCategoryButton(activeButton) {
        categoryButtons.forEach(btn => {
            btn.classList.remove('bg-white-smoke', 'pointer-events-none', 'select-none', 'border-green')
        })
        
        activeButton.classList.add('bg-white-smoke', 'pointer-events-none', 'select-none')
    }

    function updateLocationButtonText(locationName = 'Select a location') {
        // locationButtonText && (locationButtonText.textContent = locationName)
    }



    function findAllLocationItem() {
        return Array.from(locationItems).find(item => 
            item.getAttribute('data-filter-location') === 'all'
        )
    }

    function toggleLocationDropdown() {
        if (!locationContainer) return
        
        if (dropdownTween) dropdownTween.kill()
        
        isLocationDropdownOpen = !isLocationDropdownOpen
        
        if (isLocationDropdownOpen) {            
            dropdownTween = gsap.to(locationContainer, {
                autoAlpha: 1,
                duration: 0.3,
                ease: "power2.out",
                onStart: () => {
                    gsap.to(locationArrow, { 
                        rotate: 180,
                        duration: 0.5,
                        ease: "power2.out"
                    })
                },
                onComplete: () => {
                    dropdownTween = null
                },
            })
        } else {
            dropdownTween = gsap.to(locationContainer, {
                autoAlpha: 0,
                duration: 0.2,
                ease: "power2.in",
                onStart: () => {
                    gsap.to(locationArrow, { 
                        rotate: 0,
                        duration: 0.5,
                        ease: "power2.out"
                    })
                },
                onComplete: () => {
                    gsap.set(locationContainer, { autoAlpha: 0 })
                    dropdownTween = null
                }
            })
        }
    }

    function closeLocationDropdown() {
        if (!locationContainer || !isLocationDropdownOpen) return
        
        if (dropdownTween) dropdownTween.kill()
        
        isLocationDropdownOpen = false
        
        dropdownTween = gsap.to(locationContainer, {
            autoAlpha: 0,
            duration: 0.2,
            ease: "power2.in",
            onStart: () => {
                gsap.to(locationArrow, { 
                    rotate: 0,
                    duration: 0.5,
                    ease: "power2.out"
                })
            },
            onComplete: () => {
                gsap.set(locationContainer, { autoAlpha: 0 })
                dropdownTween = null
            }
        })
    }

    function resetFilters() {
        currentCategoryFilter = 'all'
        currentLocationFilter = 'all'
        
        const allButton = qs('[data-filter="all"]', elements.section)
        if (allButton) {
            updateActiveCategoryButton(allButton)
        }
        
        updateLocationButtonText()
        const allLocationItem = findAllLocationItem()
        closeLocationDropdown()
        filterItems(true) // Skip animation on initial load
    }

    function addEvents() {
        // Add click protection for team member cards
        allItems.forEach(card => {
            const cardProtectionHandler = (e) => {
                console.log('Card clicked - blocking filtering')
                // Temporarily disable filtering when clicking on cards
                isFilteringAllowed = false
                
                // Re-enable filtering after a short delay
                setTimeout(() => {
                    isFilteringAllowed = true
                }, 100)
            }
            
            card.addEventListener('click', cardProtectionHandler, true) // Use capture phase
            handlers.cardProtectionHandlers = handlers.cardProtectionHandlers || []
            handlers.cardProtectionHandlers.push({ card, handler: cardProtectionHandler })
        })

        // Category button handlers
        categoryButtons.forEach(button => {
            const handler = (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                console.log('Filter button clicked')
                const filterValue = button.getAttribute('data-filter')
                currentCategoryFilter = filterValue
                
                updateActiveCategoryButton(button)
                filterItems()
            }
            
            button.addEventListener('click', handler)
            handlers.categoryHandlers.set(button, handler)
        })

        // Location button handler
        if (locationButton) {
            handlers.locationButtonHandler = (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Location button clicked')
                toggleLocationDropdown()
            }
            
            locationButton.addEventListener('click', handlers.locationButtonHandler)
        }

        // Location item handlers
        locationItems.forEach(item => {
            const handler = (e) => {
                // Don't handle location clicks if the click is on a team member card
                if (e.target.closest('.js-all-team-members-item')) {
                    console.log('Click on card inside location item - ignoring location filter')
                    return
                }
                
                e.preventDefault()
                e.stopPropagation()
                
                console.log('Location item clicked')
                const filterValue = item.getAttribute('data-filter-location')
                const locationName = item.textContent.trim()
                
                currentLocationFilter = filterValue
                updateLocationButtonText(filterValue === 'all' ? 'Select a location' : locationName)
                closeLocationDropdown()
                filterItems()
            }
            
            item.addEventListener('click', handler)
            handlers.locationHandlers.set(item, handler)
        })

        // Document click handler (for closing dropdown) - but exclude team member cards
        handlers.documentClick = (e) => {
            // Don't close dropdown if clicking on team member cards
            if (e.target.closest('.js-all-team-members-item')) {
                return
            }
            
            if (locationDropdown && !locationDropdown.contains(e.target)) {
                closeLocationDropdown()
            }
        }

        // Document keydown handler (for ESC key)
        handlers.documentKeydown = (e) => {
            if (e.key === 'Escape' && isLocationDropdownOpen) {
                closeLocationDropdown()
            }
        }

        document.addEventListener('click', handlers.documentClick)
        document.addEventListener('keydown', handlers.documentKeydown)
    }

    function mount() {
        const allButton = qs('[data-filter="all"]', elements.section)
        if (allButton) {
            updateActiveCategoryButton(allButton)
        }
        
        const allLocationItem = findAllLocationItem()
        
        if (locationContainer) {
            gsap.set(locationContainer, { 
                autoAlpha: 0,
            })
        }
        
        addEvents()
    }

    function unmount() {
        // Kill all GSAP animations immediately
        if (ct) {
            ct.kill()
            ct = null
        }
        if (dropdownTween) {
            dropdownTween.kill()
            dropdownTween = null
        }
        
        // Kill any other GSAP tweens on these elements
        gsap.killTweensOf([gridContainer, locationContainer, locationArrow])
        
        // Reset all items to visible state
        allItems.forEach(item => {
            item.style.display = 'block'
        })
        
        // Reset dropdown state
        isLocationDropdownOpen = false
        if (locationContainer) {
            gsap.set(locationContainer, { autoAlpha: 0 })
        }
        if (locationArrow) {
            gsap.set(locationArrow, { rotate: 0 })
        }
        
        // Remove card protection handlers
        if (handlers.cardProtectionHandlers) {
            handlers.cardProtectionHandlers.forEach(({ card, handler }) => {
                card.removeEventListener('click', handler, true)
            })
            handlers.cardProtectionHandlers = []
        }
        categoryButtons.forEach(button => {
            const handler = handlers.categoryHandlers.get(button)
            if (handler) {
                button.removeEventListener('click', handler)
            }
        })
        handlers.categoryHandlers.clear()
        
        // Remove location item event listeners
        locationItems.forEach(item => {
            const handler = handlers.locationHandlers.get(item)
            if (handler) {
                item.removeEventListener('click', handler)
            }
        })
        handlers.locationHandlers.clear()
        
        // Remove location button event listener
        if (locationButton && handlers.locationButtonHandler) {
            locationButton.removeEventListener('click', handlers.locationButtonHandler)
            handlers.locationButtonHandler = null
        }
        
        // Remove document event listeners
        if (handlers.documentClick) {
            document.removeEventListener('click', handlers.documentClick)
            handlers.documentClick = null
        }
        
        if (handlers.documentKeydown) {
            document.removeEventListener('keydown', handlers.documentKeydown)
            handlers.documentKeydown = null
        }
    }

    mount()

    return {
        unmount,
        resetFilters,
        filterByCategory: (category) => {
            currentCategoryFilter = category
            filterItems(true) // Skip animation for external calls
        },
        filterByLocation: (location) => {
            currentLocationFilter = location
            filterItems(true) // Skip animation for external calls
        },
        getCurrentFilters: () => ({
            category: currentCategoryFilter,
            location: currentLocationFilter
        })
    }
}