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

    let isListed = gridLayouts[0]?.classList.contains('is-listed') || false
    let tl = null

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

    evt.on('click', filter, press)
}