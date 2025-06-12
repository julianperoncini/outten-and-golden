import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

import { evt, utils, store } from '../core'

const { qs, qsa, rect } = utils
const { dom, features, bounds } = store

export default function carouselStories() {

    const state = {
        last: -1,
        current: 0,
        d: 5,
        cache: null,
    }

    const elements = {
        el: qs('.js-carousel-story'),
        items: qsa('.js-carousel-story-item'),
        prev: qsa('.js-carousel-story-prev'),
        next: qsa('.js-carousel-story-next'),
    }

    const cache = elements.items.map((item, i) => {
        const fig = qs('.js-carousel-story-fig', item)
        const img = qs('.js-carousel-story-img', item)
        const tags = qs('.js-carousel-story-tags', item)
        const fades = qsa('.js-carousel-story-fade', item)

        const tl = gsap.timeline({ 
            paused: true,
            defaults: {
                duration: 1.25,
                ease: 'expo'
            }
        })

        return {
            fig, img, tags, fades, tl, item
        }
    })

    const mount = () => {
        elements.prev.forEach(el => {
            evt.on('click', el, prev)
        })

        elements.next.forEach(el => {
            evt.on('click', el, next)
        })
    }

    const unmount = () => {
        evt.off('click', elements.dots, click)
    }

    const click = ({ currentTarget }) => {
        state.last = state.current
        state.current = elements.dots.indexOf(currentTarget)
        
        animate()
    }

    const next = () => {
        state.last = state.current
        state.current = gsap.utils.wrap(0, cache.length, state.current + 1)
        
        animate()
    }

    const prev = () => {
        state.last = state.current
        state.current = gsap.utils.wrap(0, cache.length, state.current - 1)
        
        animate()
    }

    const animate = () => { 
        const l = cache[state.last]
        const c = cache[state.current]

        l && l.tl.clear()
        .to(l.fig, {
            clipPath: 'inset(0% 0% 100% 0%)',
            duration: 1,
            ease: 'expo.inOut'
        }, 0)
        .to(l.tags, {
            y: '-1.5rem',
            autoAlpha: 0,
            duration: 1,
            ease: 'expo.inOut'
        }, 0)
        .to(l.fades, {
            y: '-1.5rem',
            autoAlpha: 0,
            duration: 1,
            stagger: .05,
            ease: 'expo.inOut'
        }, 0)
        .set([l.item], { autoAlpha: 0 })
        .restart()

        c && c.tl.clear()
        .set([c.item], { autoAlpha: 1 })
        .fromTo(c.fig, {
            clipPath: 'inset(100% 0% 0% 0%)',
        }, {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1,
            ease: 'expo.inOut'
        }, 0)
        .fromTo(c.img, {
            scale: 1.2,
        }, {
            scale: 1,
            duration: 1.2,
            ease: 'expo.inOut'
        }, 0)   
        .fromTo(c.tags, {
            y: '3rem',
            autoAlpha: 0,
        }, {
            y: 0,
            autoAlpha: 1,
        }, 0.75)
        .fromTo(c.fades, {
            y: '3rem',
            autoAlpha: 0,
        }, {
            y: 0,
            autoAlpha: 1,
            stagger: .1,
        }, 0.75)
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
        mount,
        unmount,
    }
}