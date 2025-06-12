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

    function filterItems() {
        animateTransition(() => {
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
        })
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

    function updateActiveLocationItem(activeItem) {
        locationItems.forEach(item => {
            item.style.backgroundColor = ''
            item.style.color = ''
        })
        
        if (activeItem) {
            activeItem.style.backgroundColor = '#1E383E'
            activeItem.style.color = 'white'
        }
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
        updateActiveLocationItem(allLocationItem)
        closeLocationDropdown()
        filterItems()
    }

    function addEvents() {
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filterValue = button.getAttribute('data-filter')
                currentCategoryFilter = filterValue
                
                updateActiveCategoryButton(button)
                filterItems()
            })
        })

        if (locationButton) {
            locationButton.addEventListener('click', (e) => {
                e.stopPropagation()
                toggleLocationDropdown()
            })
        }

        locationItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation()
                
                const filterValue = item.getAttribute('data-filter-location')
                const locationName = item.textContent.trim()
                
                currentLocationFilter = filterValue
                updateLocationButtonText(filterValue === 'all' ? 'Select a location' : locationName)
                updateActiveLocationItem(item)
                closeLocationDropdown()
                filterItems()
            })
        })

        document.addEventListener('click', (e) => {
            if (locationDropdown && !locationDropdown.contains(e.target)) {
                closeLocationDropdown()
            }
        })

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isLocationDropdownOpen) {
                closeLocationDropdown()
            }
        })
    }

    function mount() {
        const allButton = qs('[data-filter="all"]', elements.section)
        if (allButton) {
            updateActiveCategoryButton(allButton)
        }
        
        const allLocationItem = findAllLocationItem()
        if (allLocationItem) {
            updateActiveLocationItem(allLocationItem)
        }
        
        if (locationContainer) {
            gsap.set(locationContainer, { 
                autoAlpha: 0,
            })
        }
        
        addEvents()
    }

    function unmount() {
        if (ct) ct.kill()
        if (dropdownTween) dropdownTween.kill()
        
        allItems.forEach(item => {
            item.style.display = 'block'
        })
        
        categoryButtons.forEach(button => {
            button.removeEventListener('click', () => {})
        })
        
        locationItems.forEach(item => {
            item.removeEventListener('click', () => {})
        })
        
        if (locationButton) {
            locationButton.removeEventListener('click', () => {})
        }
        
        document.removeEventListener('click', () => {})
        document.removeEventListener('keydown', () => {})
    }

    mount()

    return {
        unmount,
        resetFilters,
        filterByCategory: (category) => {
            currentCategoryFilter = category
            filterItems()
        },
        filterByLocation: (location) => {
            currentLocationFilter = location
            filterItems()
        },
        getCurrentFilters: () => ({
            category: currentCategoryFilter,
            location: currentLocationFilter
        })
    }
}