import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

import { evt, utils, store } from '../core'

const { qs, qsa, rect } = utils
const { dom, features, bounds } = store

gsap.registerPlugin(ScrollTrigger)

export default function carouselTestimonials() {

    const state = {
        last: -1,
        current: 0,
        d: 5,
        cache: null,
        autoplayInterval: null,
        autoplayDelay: 2800,
        isVisible: false
    }

    const elements = {
        el: qs('.js-carousel-testimonials'),
        items: qsa('.js-carousel-testimonials-item'),
        prev: qs('.js-carousel-testimonials-prev'),
        next: qs('.js-carousel-testimonials-next'),
        dots: qsa('.js-carousel-testimonials-dots'),
    }

    let st = null

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

    const updateDots = () => {
        elements.dots.forEach((dot, index) => {
            if (index === state.current) {
                dot.classList.add('active')
            } else {
                dot.classList.remove('active')
            }
        })
    }

    const startAutoplay = () => {
        if (state.autoplayInterval) return
        
        state.autoplayInterval = setInterval(() => {
            if (state.isVisible) {
                next()
            }
        }, state.autoplayDelay)
    }

    const stopAutoplay = () => {
        if (state.autoplayInterval) {
            clearInterval(state.autoplayInterval)
            state.autoplayInterval = null
        }
    }

    const resetAutoplay = () => {
        stopAutoplay()
        if (state.isVisible) {
            startAutoplay()
        }
    }

    const createScrollTrigger = () => {
        // Kill existing ScrollTrigger first
        if (st) {
            st.kill()
            st = null
        }

        // Only create if element exists
        if (!elements.el) {
            console.warn('Carousel element not found')
            return
        }

        st = ScrollTrigger.create({
            trigger: elements.el,
            start: "top bottom-=100px",
            end: "bottom top+=100px",
            onEnter: () => {
                state.isVisible = true
                startAutoplay()
            },
            onLeave: () => {
                state.isVisible = false
                stopAutoplay()
            },
            onEnterBack: () => {
                state.isVisible = true
                startAutoplay()
            },
            onLeaveBack: () => {
                state.isVisible = false
                stopAutoplay()
            },
            // Add these for better debugging
            onUpdate: (self) => {
                // Optional: add debug logging
                // console.log('ScrollTrigger progress:', self.progress)
            }
        })

        // Refresh ScrollTrigger after creation
        ScrollTrigger.refresh()
    }

    const mount = () => {
        // Check if required elements exist
        if (!elements.el || !elements.items.length) {
            console.warn('Required carousel elements not found')
            return
        }

        evt.on('click', elements.next, next)
        evt.on('click', elements.prev, prev)
        evt.on('click', elements.dots, click)
        
        updateDots()

        // Add mouse event listeners with proper cleanup
        const handleMouseEnter = () => stopAutoplay()
        const handleMouseLeave = () => {
            if (state.isVisible) startAutoplay()
        }

        elements.el.addEventListener('mouseenter', handleMouseEnter)
        elements.el.addEventListener('mouseleave', handleMouseLeave)

        // Store references for cleanup
        elements.el._handleMouseEnter = handleMouseEnter
        elements.el._handleMouseLeave = handleMouseLeave

        // Create ScrollTrigger with a slight delay to ensure DOM is ready
        requestAnimationFrame(() => {
            createScrollTrigger()
        })
    }

    const unmount = () => {
        // Kill ScrollTrigger
        if (st) {
            st.kill()
            st = null
        }
        console.log('unmount')
        
        stopAutoplay()

        // Remove event listeners
        evt.off('click', elements.next, next)
        evt.off('click', elements.prev, prev)
        evt.off('click', elements.dots, click)

        // Clean up mouse event listeners
        if (elements.el) {
            if (elements.el._handleMouseEnter) {
                elements.el.removeEventListener('mouseenter', elements.el._handleMouseEnter)
            }
            if (elements.el._handleMouseLeave) {
                elements.el.removeEventListener('mouseleave', elements.el._handleMouseLeave)
            }
        }
    }

    const click = ({ currentTarget }) => {
        state.last = state.current
        state.current = elements.dots.indexOf(currentTarget)
        
        animate()
        updateDots()
        resetAutoplay()
    }

    const next = () => {
        state.last = state.current
        state.current = gsap.utils.wrap(0, cache.length, state.current + 1)
        
        animate()
        updateDots()
        resetAutoplay() // Added resetAutoplay for consistency
    }

    const prev = () => {
        state.last = state.current
        state.current = gsap.utils.wrap(0, cache.length, state.current - 1)
        
        animate()
        updateDots()
        resetAutoplay()
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
            .set([l.item], { autoAlpha: 0 }) // Changed from alpha to autoAlpha for consistency
            .restart()
        }

        if (c) {
            c.tl.clear()
            .set([c.item], { autoAlpha: 1 })
            .fromTo(c.items, {
                y: '3rem',
                autoAlpha: 0, // Changed from alpha to autoAlpha for consistency
            }, {
                y: 0,
                autoAlpha: 1,
                stagger: .1,
            }, 1)
            .restart()
        }
    }

    // Add a method to refresh ScrollTrigger manually
    const refresh = () => {
        if (st) {
            ScrollTrigger.refresh()
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
        startAutoplay,
        stopAutoplay,
        refresh, // Add refresh method
        unmount
    }
}