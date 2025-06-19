import { evt, utils, store } from '@/core'
import { animate } from 'motion'
const { qs, qsa } = utils

export default function accordion(el) {
    if (!el) return

    const elements = qsa('[data-accordion-css-init]')

    const mount = () => {
        elements.forEach((accordion) => {
            const closeSiblings = accordion.getAttribute('data-accordion-close-siblings') === 'true'
    
            evt.on('click', accordion, (event) => {
                const toggle = event.target.closest('[data-accordion-toggle]')
                if (!toggle) return
    
                const singleAccordion = toggle.closest('[data-accordion-status]')
                if (!singleAccordion) return
    
                const isActive = singleAccordion.getAttribute('data-accordion-status') === 'active'
                singleAccordion.setAttribute('data-accordion-status', isActive ? 'not-active' : 'active')
                
                if (closeSiblings && !isActive) {
                    accordion.querySelectorAll('[data-accordion-status="active"]').forEach((sibling) => {
                        if (sibling !== singleAccordion) sibling.setAttribute('data-accordion-status', 'not-active')
                    })
                }
            })
        })
    }

    mount()

    const unmount = () => {
        elements.forEach((accordion) => {
            evt.off('click', accordion)
        })
    }

    return {
        mount,
        unmount
    }
}