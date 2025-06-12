import { gsap } from 'gsap'
import { evt, utils, store } from '@/core'

const { qs, qsa } = utils

export default function casesFilter(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filterButtons = qsa('[data-filter]', elements.section)
    const gridContainer = qs('.js-all-posts-container', elements.section)
    const allItems = qsa('.js-all-posts-item', elements.section)
    
    let ct = null

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

    function showAllItems() {
        animateTransition(() => {
            allItems.forEach(item => {
                item.style.display = 'block'
            })

            evt.emit('blogs:filtered', { filter: 'all', items: allItems })
        })
    }

    function filterByCategory(filterValue) {
        animateTransition(() => {
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
        })
    }

    function updateActiveButton(activeButton) {
        filterButtons.forEach(btn => {
            btn.classList.remove('bg-white-smoke', 'pointer-events-none', 'select-none')
            btn.classList.remove('border-green')
        })
        
        activeButton.classList.add('bg-white-smoke', 'pointer-events-none', 'select-none')
    }

    function addEvents() {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filterValue = button.getAttribute('data-filter')
                
                updateActiveButton(button)
                
                if (filterValue === 'all') {
                    showAllItems()
                } else {
                    filterByCategory(filterValue)
                }
            })
        })
    }

    function mount() {
        const allButton = qs('[data-filter="all"]', elements.section)
        if (allButton) {
            updateActiveButton(allButton)
        }
        
        addEvents()
    }

    function destroy() {
        if (ct) ct.kill()
        
        allItems.forEach(item => {
            item.style.display = 'block'
        })
        
        filterButtons.forEach(button => {
            button.removeEventListener('click', () => {})
        })
    }

    mount()

    return {
        destroy,
        showAll: showAllItems,
        filterBy: filterByCategory
    }
}