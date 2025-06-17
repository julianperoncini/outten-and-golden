// import { gsap } from 'gsap'
// import { evt, utils, store } from '@/core'

// const { qs, qsa } = utils

// export default function listGrid(config) {
//     const elements = {
//         section: config.section || config,
//         container: config.elements || config
//     }

//     const filter = qs('.js-list-filter', elements.section)
//     const filterButtons = qs('.js-list-filter-bg', elements.section)
//     const gridItems = qsa('.js-list-grid-item', elements.section)
//     const gridItemsImage = qsa('.js-list-grid-item-image', elements.section)
//     const gridItemsContent = qsa('.js-list-grid-item-content', elements.section)
//     const gridLayouts = qsa('.js-list-grid-layout', elements.section)

//     let isListed = gridLayouts[0]?.classList.contains('is-listed') || false
//     let tl = null

//     const press = () => {
//         tl && tl.kill()
        
//         isListed = !isListed

//         tl = gsap.timeline()

//         tl.to(gridItems, {
//             opacity: 0,
//             y: 20,
//             duration: 0.25,
//             ease: 'power2.out'
//         }, 0)

//         .call(() => {
//             if (isListed) {
//                 gridLayouts.forEach(layout => layout.classList.add('is-listed'))
//                 gsap.set(gridItemsImage, { display: 'none' })
//                 gsap.set(gridItemsContent, {
//                     position: 'relative',
//                     padding: 0
//                 })
//                 gridItemsContent.forEach(content => {
//                     content.classList.add('space-y-24')
//                 })
                
//             } else {
//                 gridLayouts.forEach(layout => layout.classList.remove('is-listed'))
//                 gsap.set(gridItemsImage, { display: 'block' })
//                 gsap.set(gridItemsContent, {
//                     position: '',
//                     padding: ''
//                 })
//                 gridItemsContent.forEach(content => {
//                     content.classList.remove('space-y-24')
//                 })
//             }
//         })

//         .to(filterButtons, {
//             x: isListed ? '100%' : 0,
//             duration: 0.25,
//             ease: 'power2.out'
//         }, 0)

//         .to(gridItems, {
//             opacity: 1,
//             y: 0,
//             duration: 0.4,
//             ease: 'power2.out'
//         }, '0.65')
//     }

//     evt.on('click', filter, press)
// }

import { gsap } from 'gsap'
import { evt, utils, store } from '@/core'

const { qs, qsa } = utils

export default function listGrid(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filter = qs('.js-list-filter', elements.section)
    const filterButtons = qs('.js-list-filter-bg', elements.section)
    const gridItems = qsa('.js-list-grid-item', elements.section)
    const gridItemsImage = qsa('.js-list-grid-item-image', elements.section)
    const gridItemsContent = qsa('.js-list-grid-item-content', elements.section)
    const gridLayouts = qsa('.js-list-grid-layout', elements.section)
    
    // Nuevos elementos para el filtro móvil
    const mobileFilterToggle = qs('.js-mobile-filter-toggle', elements.section)
    const mobileFilterDropdown = qs('.js-mobile-filter-dropdown', elements.section)
    const mobileFilterOptions = qsa('.js-mobile-filter-option', elements.section)
    const mobileFilterArrow = qs('.js-mobile-filter-arrow', elements.section)

    let isListed = gridLayouts[0]?.classList.contains('is-listed') || false
    let isFilterOpen = false
    let activeFilter = 'all'
    let tl = null
    let filterTl = null

    const press = () => {
        tl && tl.kill()
        
        isListed = !isListed

        tl = gsap.timeline()

        tl.to(gridItems, {
            opacity: 0,
            y: 20,
            duration: 0.25,
            ease: 'power2.out'
        }, 0)

        .call(() => {
            if (isListed) {
                gridLayouts.forEach(layout => layout.classList.add('is-listed'))
                gsap.set(gridItemsImage, { display: 'none' })
                gsap.set(gridItemsContent, {
                    position: 'relative',
                    padding: 0
                })
                gridItemsContent.forEach(content => {
                    content.classList.add('space-y-24')
                })
                
            } else {
                gridLayouts.forEach(layout => layout.classList.remove('is-listed'))
                gsap.set(gridItemsImage, { display: 'block' })
                gsap.set(gridItemsContent, {
                    position: '',
                    padding: ''
                })
                gridItemsContent.forEach(content => {
                    content.classList.remove('space-y-24')
                })
            }
        })

        .to(filterButtons, {
            x: isListed ? '100%' : 0,
            duration: 0.25,
            ease: 'power2.out'
        }, 0)

        .to(gridItems, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: 'power2.out'
        }, '0.65')
    }

    // Toggle del filtro móvil
    const toggleMobileFilter = () => {
        filterTl && filterTl.kill()
        
        isFilterOpen = !isFilterOpen
        
        filterTl = gsap.timeline()

        if (isFilterOpen) {
            gsap.set(mobileFilterDropdown, { display: 'block' })
            filterTl
                .to(mobileFilterDropdown, {
                    opacity: 1,
                    y: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                })
                .to(mobileFilterArrow, {
                    rotation: 180,
                    duration: 0.3,
                    ease: 'power2.out'
                }, 0)
        } else {
            filterTl
                .to(mobileFilterDropdown, {
                    opacity: 0,
                    y: -10,
                    duration: 0.25,
                    ease: 'power2.out'
                })
                .to(mobileFilterArrow, {
                    rotation: 0,
                    duration: 0.25,
                    ease: 'power2.out'
                }, 0)
                .call(() => {
                    gsap.set(mobileFilterDropdown, { display: 'none' })
                })
        }
    }

    // Seleccionar filtro
    const selectFilter = (filterButton) => {
        const filterValue = filterButton.dataset.filter
        
        // Remover clase activa de todos los botones
        mobileFilterOptions.forEach(option => {
            option.classList.remove('is-active')
        })
        
        // Agregar clase activa al botón seleccionado
        filterButton.classList.add('is-active')
        
        // Guardar filtro activo
        activeFilter = filterValue
        
        // Cerrar dropdown
        isFilterOpen = true // Forzar el estado para que se cierre
        toggleMobileFilter()
        
        // Aquí puedes agregar la lógica de filtrado
        console.log('Filter selected:', filterValue)
    }

    // Inicializar estado del dropdown
    const initMobileFilter = () => {
        if (mobileFilterDropdown) {
            gsap.set(mobileFilterDropdown, {
                opacity: 0,
                y: -10,
                display: 'none'
            })
        }
    }

    // Event listeners
    if (filter) {
        evt.on('click', filter, press)
    }
    
    if (mobileFilterToggle) {
        evt.on('click', mobileFilterToggle, toggleMobileFilter)
    }
    
    if (mobileFilterOptions.length) {
        mobileFilterOptions.forEach(option => {
            evt.on('click', option, () => selectFilter(option))
        })
    }

    // Cerrar dropdown al hacer click fuera
    evt.on('click', document, (e) => {
        if (isFilterOpen && 
            !mobileFilterToggle?.contains(e.target) && 
            !mobileFilterDropdown?.contains(e.target)) {
            isFilterOpen = true // Forzar el estado para que se cierre
            toggleMobileFilter()
        }
    })

    // Inicializar
    initMobileFilter()
}