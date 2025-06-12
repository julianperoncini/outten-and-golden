import { gsap } from 'gsap'
import { evt, utils, store } from '@/core'

const { qs, qsa } = utils

export default function blogsFilter(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filterButtons = qsa('[data-filter]', elements.section)
    const gridContainer = qs('.js-all-posts-container', elements.section)
    const originalGridItems = qsa('.news-grid-blog-page__column', elements.section)
    
    const allItems = Array.from(originalGridItems).map(item => ({
        element: item.cloneNode(true),
        categories: item.getAttribute('data-filter-category') || '',
        originalParent: item.parentNode
    }))
    
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

    function clearCurrentItems() {
        const currentItems = qsa('.news-grid-blog-page__column', gridContainer)
        currentItems.forEach(item => {
            item.remove()
        })
    }

    function addItemsToDOM(itemsToAdd) {
        const gridElement = qs('.news-grid-blog-page', gridContainer)
        
        if (!gridElement) {
            const newGrid = document.createElement('div')
            newGrid.className = 'news-grid-blog-page js-all-posts-item'
            gridContainer.appendChild(newGrid)
        }
        
        const targetGrid = qs('.news-grid-blog-page', gridContainer)
        
        itemsToAdd.forEach(itemData => {
            const newElement = itemData.element.cloneNode(true)
            targetGrid.appendChild(newElement)
        })
    }

    function showAllItems() {
        animateTransition(() => {
            clearCurrentItems()
            addItemsToDOM(allItems)

            evt.emit('blogs:filtered', { filter: 'all', items: allItems })
        })
    }

    function filterByCategory(filterValue) {
        animateTransition(() => {
            clearCurrentItems()
            
            const filteredItems = allItems.filter(itemData => {
                const categories = itemData.categories.split(',')
                return categories.includes(filterValue)
            })
            
            addItemsToDOM(filteredItems)

            evt.emit('blogs:filtered', { 
                filter: filterValue, 
                items: filteredItems,
                count: filteredItems.length 
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