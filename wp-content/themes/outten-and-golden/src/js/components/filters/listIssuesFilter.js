import { gsap } from 'gsap'
import { evt, utils, store } from '@/core'

const { qs, qsa } = utils

export default function listIssuesFilter(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filterButtons = qsa('[data-filter]', elements.section)
    const gridLayouts = qsa('.js-issues-layout', elements.section)
    const gridContainer = qs('.js-list-grid', elements.section)
    
    let ct = null

    function showAllLayouts() {
        if (ct) ct.kill()
        
        ct = gsap.to(gridContainer, {
            autoAlpha: 0,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                gridLayouts.forEach(layout => {
                    layout.style.display = 'block'
                })
                
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

    function filterByCategory(filterValue) {
        if (ct) ct.kill()
        
        ct = gsap.to(gridContainer, {
            autoAlpha: 0,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                gridLayouts.forEach(layout => {
                    const layoutFilter = layout.getAttribute('data-layout-filter')
                    
                    if (layoutFilter === filterValue) {
                        layout.style.display = 'block'
                    } else {
                        layout.style.display = 'none'
                    }
                })
                
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
                    showAllLayouts()
                } else {
                    filterByCategory(filterValue)
                }
            })
        })
    }

    function mount() {
        addEvents()
        gridLayouts.forEach(layout => {
            layout.style.display = 'block'
        })
        
        const allButton = qs('[data-filter="all"]', elements.section)
        if (allButton) {
            updateActiveButton(allButton)
        }
    }

    mount()
}