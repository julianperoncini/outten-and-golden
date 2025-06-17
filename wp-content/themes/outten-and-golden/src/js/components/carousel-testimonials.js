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

    const mount = () => {
        evt.on('click', elements.next, next)
        evt.on('click', elements.prev, prev)
        evt.on('click', elements.dots, click)
        
        updateDots()

        if (elements.el) {
            this.st = ScrollTrigger.create({
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
                }
            })
        }

        if (elements.el) {
            elements.el.addEventListener('mouseenter', stopAutoplay)
            elements.el.addEventListener('mouseleave', () => {
                if (state.isVisible) startAutoplay()
            })
        }
    }

    const unmount = () => {
        this.st?.kill()
        stopAutoplay()

        evt.off('click', elements.next, next)
        evt.off('click', elements.prev, prev)
        evt.off('click', elements.dots, click)

        if (elements.el) {
            elements.el.removeEventListener('mouseenter', stopAutoplay)
            elements.el.removeEventListener('mouseleave', () => {
                if (state.isVisible) startAutoplay()
            })
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

        l && l.tl.clear()
        .to(l.items, {
            y: '-1.5rem',
            opacity: 0,
            duration: 1,
            stagger: .05,
            ease: 'expo.inOut'
        }, 0)
        .set([l.item], { alpha: 0 })
        .restart()

        c && c.tl.clear()
        .set([c.item], { autoAlpha: 1 })
        .fromTo(c.items, {
            y: '3rem',
            alpha: 0,
        }, {
            y: 0,
            alpha: 1,
            stagger: .1,
        }, 1)
        .restart()
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
        unmount
    }
}