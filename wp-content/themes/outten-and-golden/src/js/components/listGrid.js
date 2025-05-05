import { motion, animate,  press } from 'motion'
import { evt, utils, store } from '@/core'

const { qs, qsa } = utils

export default function listGrid(config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filter = qs('.js-list-filter', elements.section)
    const filterButtons = qs('.js-list-filter-bg', elements.section)

    let isListed = elements.container[0].classList.contains('is-listed')

    press(filter, () => {
        
        return () => {
            isListed = !isListed
     
            if (isListed) {
                elements.container[0].classList.add('is-listed')
                animate(filterButtons, {
                    transform: 'translateX(100%)'
                }, {
                    duration: 0.25,
                })
            } else {
                elements.container[0].classList.remove('is-listed')
                animate(filterButtons, {
                    transform: 'none'
                }, {
                    duration: 0.25,
                })
            }
        }
    })
}