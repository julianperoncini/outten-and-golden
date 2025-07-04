import gsap from 'gsap'

import { evt, utils, store } from '../core'

const { qs, qsa, rect } = utils
const { dom, features, bounds } = store

export default function carouselIssueText() {

    const state = {
        last: -1,
        current: 0,
        d: 5,
        cache: null,
        isAnimating: false
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
        const pElement = item.querySelector('p')

        const tl = gsap.timeline({ 
            paused: true,
            defaults: {
                duration: 0.8,
                ease: 'power2'
            }
        })

        const height = pElement ? pElement.offsetHeight : 0

        return {
            items, tl, item, height, pElement
        }
    })

    const updateFirstItemHeight = (index) => {
        const currentPHeight = cache[index].height
        const firstItemP = elements.items[0].querySelector('p')
        
        if (firstItemP) {
            gsap.to(firstItemP, {
                height: currentPHeight,
                duration: 0.6,
                ease: 'power2.out'
            })
        }
    }

    const mount = () => {
        if (!elements.el || !elements.items.length) {
            console.warn('Required carousel elements not found')
            return
        }

        if (cache[0]) {
            gsap.set(cache[0].item, { autoAlpha: 1 })
            gsap.set(cache[0].items, { y: 0, autoAlpha: 1 })
            
            const firstItemP = elements.items[0].querySelector('p')
            if (firstItemP) {
                firstItemP.style.height = cache[0].height + 'px'
            }
        }
        
        cache.slice(1).forEach(item => {
            gsap.set(item.item, { autoAlpha: 0 })
        })

        updateIndexDisplay()

        evt.on('click', elements.next, next)
        evt.on('click', elements.prev, prev)
        
        evt.on('resize', window, recalculateHeights)
    }

    const unmount = () => {
        console.log('unmount')
        
        cache.forEach(item => item.tl.kill())
        
        evt.off('click', elements.next, next)
        evt.off('click', elements.prev, prev)
        evt.off('resize', window, recalculateHeights)
    }

    const recalculateHeights = () => {
        cache.forEach((item, i) => {
            if (i === state.current && item.pElement) {
                item.height = item.pElement.offsetHeight
            } else {
                item.height = 0
            }
        })
        
        updateFirstItemHeight(state.current)
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
        if (state.isAnimating) return
        
        state.last = state.current
        state.current = gsap.utils.wrap(0, cache.length, state.current + 1)

        animate()
        updateIndexDisplay()
    }
    
    const prev = () => {
        if (state.isAnimating) return
        
        state.last = state.current
        state.current = gsap.utils.wrap(0, cache.length, state.current - 1)
        
        animate()
        updateIndexDisplay()
    }

    const animate = () => { 
        if (state.isAnimating) return
        
        state.isAnimating = true
        
        const l = cache[state.last]
        const c = cache[state.current]

        if (c && c.pElement && c.height === 0) {
            c.height = c.pElement.offsetHeight
        }

        updateFirstItemHeight(state.current)

        const masterTl = gsap.timeline({
            onComplete: () => {
                state.isAnimating = false
            }
        })

        if (l && state.last !== -1) {
            l.tl.clear()
            .to(l.items, {
                y: '-1.5rem',
                opacity: 0,
                duration: 0.6,
                stagger: 0.03,
                ease: 'power2'
            }, 0)
            .set([l.item], { autoAlpha: 0 }, 0.4)

            masterTl.add(l.tl.restart(), 0)
        }

        if (c) {
            c.tl.clear()
            .set([c.item], { autoAlpha: 1 }, 0)
            .fromTo(c.items, {
                y: '3rem',
                autoAlpha: 0,
            }, {
                y: 0,
                autoAlpha: 1,
                duration: 0.7,
                stagger: 0.05,
                ease: 'power2'
            }, 0.3)

            masterTl.add(c.tl.restart(), 0.1)
        }

        if (state.last === -1) {
            state.isAnimating = false
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
        unmount,
        recalculateHeights
    }
}