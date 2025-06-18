import gsap from 'gsap'

import { evt, utils, store } from '../core'

const { qs, qsa, rect } = utils
const { dom, features, bounds } = store

export default function carouselIssueText() {

    const state = {
        last: -1,
        current: 0,
        d: 5,
        cache: null
    }

    const elements = {
        el: qs('.js-carousel-issue-text'),
        items: qsa('.js-carousel-issue-text-item'),
        prev: qs('.js-carousel-issue-text-prev'),
        next: qs('.js-carousel-issue-text-next'),
        currentIndex: qs('.js-carousel-current-index'),
        totalItems: qs('.js-carousel-total-items')
    }

    const cache = elements.items.map((item, i) => {
        const items = qsa('.js-ct-fade', item)

        const tl = gsap.timeline({ 
            paused: true,
            defaults: {
                duration: 1.25,
                ease: 'expo'
            }
        })

        return {
            items, tl, item
        }
    })

    const mount = () => {
        // Check if required elements exist
        if (!elements.el || !elements.items.length) {
            console.warn('Required carousel elements not found')
            return
        }

        evt.on('click', elements.next, next)
        evt.on('click', elements.prev, prev)
    }

    const unmount = () => {
        console.log('unmount')
        
        // Remove event listeners
        evt.off('click', elements.next, next)
        evt.off('click', elements.prev, prev)
    }

    const updateIndexDisplay = () => {
        if (elements.currentIndex) {
            elements.currentIndex.textContent = state.current + 1
        }
        if (elements.totalItems) {
            elements.totalItems.textContent = cache.length
        }
    }

    const next = () => {
        state.last = state.current
        state.current = gsap.utils.wrap(0, cache.length, state.current + 1)

        animate()
        updateIndexDisplay()
    }
    
    const prev = () => {
        state.last = state.current
        state.current = gsap.utils.wrap(0, cache.length, state.current - 1)
        
        animate()
        updateIndexDisplay()
    }

    const animate = () => { 
        const l = cache[state.last]
        const c = cache[state.current]

        if (l) {
            l.tl.clear()
            .to(l.items, {
                y: '-1.5rem',
                opacity: 0,
                duration: 1,
                stagger: .05,
                ease: 'expo.inOut'
            }, 0)
            .set([l.item], { autoAlpha: 0 })
            .restart()
        }

        if (c) {
            c.tl.clear()
            .set([c.item], { autoAlpha: 1 })
            .fromTo(c.items, {
                y: '3rem',
                autoAlpha: 0,
            }, {
                y: 0,
                autoAlpha: 1,
                stagger: .1,
            }, 0.75)
            .restart()
        }
    }

    mount()

    return {
        get state() {
            return state
        },
        get elements() {
            return elements
        },
        unmount
    }
}