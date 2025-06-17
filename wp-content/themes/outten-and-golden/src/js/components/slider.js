import gsap from 'gsap'
import lerp from '@14islands/lerp'
import { evt, utils, store } from '@/core'
import ScrollTrigger from 'gsap/ScrollTrigger'

const { qs, qsa, rect } = utils
const { device, bounds } = store

const isMobile = device.isMobile

gsap.registerPlugin(ScrollTrigger)

export default function slider(container) {
    const state = {
        speed: 2,
        ox: 0,
        cx: 0,
        cy: 0,
        dx: 0,
        t: 0,
        tc: 0,
        diff: 0,
        max: 0,
        margin: 0,
        idx: 0,
        active: false,
        resizing: false,
        run: false,
        cache: null,
        events: {},
        isMobile: isMobile
    }

    const elements = {
        container: container.section,
        slides: null,
        slide: null,
        prev: qs('.js-slider-prev', container.section),
        next: qs('.js-slider-next', container.section),
    }

    let snaps = []
    let st = null
    let crect = null

    
    const resize = () => {
        state.resizing = true
        
        
        elements.slide = qsa('.js-slide', elements.container)
        if (!elements.slide.length) return
        
        elements.slides = qs('.js-slides', elements.container)
        
        const srect = rect(elements.slides)
        crect = rect(elements.container)

        const total = elements.slide.length - 1
        const offset = srect.left - crect.left

        state.speed = state.isMobile ? 3.5 : 2

        snaps = []
        state.cache = []
        
        state.cache = elements.slide.map((elem, i) => {
            elem.style.transform = `translate3d(0, 0, 0)`
        
            const { left, right, width } = rect(elem)
            const start = left - crect.width
            const end = right
        
            snaps.push(left - srect.left)
        
            if (i === total) {
                calcMax(elem, end, offset)
            }
        
            return { el: elem, start, width, end, out: true }
        })

        transforms()
        
        setTimeout(() => {
            state.resizing = false
        }, 0)
    }

    const calcMax = (elem, right, offset) => {
        state.margin = parseInt(getComputedStyle(elem).getPropertyValue('margin-right'))
        state.max = Math.max(0, right + state.margin - offset)
    }

    const pos = (e) => {
        const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
        const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY

        return { x, y }
    }

    const down = (e) => {
        const { x, y } = pos(e)

        state.active = true
        state.cx = x
        state.cy = y
        state.dx = x
        state.ox = state.t + x * state.speed
    }

    const move = (e) => {
        if (!state.active) return

        const { x, y } = pos(e)

        if (
            Math.abs(x - state.cx) > Math.abs(y - state.cy) &&
            e.cancelable
        ) {
            e.preventDefault()
            e.stopPropagation()
        }

        state.t = state.ox - x * state.speed
    }

    const up = (e) => {
        if (!state.active) return
        state.active = false

        const { x } = pos(e)
        if (Math.abs(x - state.dx) < 10) {
            const el = e.target.closest('[data-url]')
            if (el && el.dataset.url) {
                // Handle navigation - you can customize this
                window.location.href = el.dataset.url
            }
        } else {
            snap()
        }
    }

    const snap = () => {
        const target = gsap.utils.wrap(0, state.max, state.t)
        const snapValue = gsap.utils.snap(snaps, target)
        const diff = snapValue - target

        state.t += diff
        state.idx = snaps.indexOf(snapValue)
    }

    const tick = ({ ratio = gsap.ticker.deltaRatio() }) => {
        if (!state.run) return
        
        state.tc = lerp(state.tc, state.t, 0.1 * ratio)
        state.tc = Math.round(state.tc * 100) / 100

        state.diff = state.tc - state.t
        state.diff = Math.round(state.diff * 1000) / 1000

        if (!state.resizing) {
            transforms()
        }
    }

    const transforms = () => {
        state.cache?.forEach(c => {
            const { start, end, el } = c
            const t = gsap.utils.wrap(-(state.max - end), end, state.tc)
            const v = visible(start, end, t)

            if (v || state.resizing) {
                if (c.out) {
                    c.out = false
                }
                transform(el, t)
            } else if (!c.out) {
                c.out = true
                transform(el, t)
            }
        })
    }

    const transform = (el, transformValue) => {
        el.style.transform = `translate3d(${-transformValue}px, 0, 0)`
    }

    const visible = (start, end, t) => {
        return t > start && t < end
    }

    const setEvents = () => {
        state.events = {
            move: state.isMobile ? 'touchmove' : 'mousemove',
            down: state.isMobile ? 'touchstart' : 'mousedown',
            up: state.isMobile ? 'touchend' : 'mouseup',
        }
    }

    const next = () => {
        console.log('CAROUSEL: NEXT')
        
        if (!state.cache) return

        const c = state.cache[state.idx]
        if (!c) return

        const left = c.width || 0

        state.t += left + state.margin
        state.idx = gsap.utils.wrap(0, state.cache.length, state.idx + 1)
    }

    const previous = () => {
        console.log('CAROUSEL: PREVIOUS')

        if (!state.cache) return

        const c = state.cache[state.idx]
        if (!c) return

        const left = c.width || 0

        state.t -= left + state.margin
        state.idx = gsap.utils.wrap(0, state.cache.length, state.idx - 1)
    }

    const bindEvents = () => {
        setEvents()

        elements.container?.addEventListener(state.events.down, down)
        elements.container?.addEventListener(state.events.move, move)
        window.addEventListener(state.events.up, up)
        elements.prev?.addEventListener('click', previous)
        elements.next?.addEventListener('click', next)

        console.log(elements.prev)
        console.log(elements.next)

        window.addEventListener('resize', resize)
        
        gsap.ticker.add(tick)

        console.log('carousel: bindEvents')
    }

    const unbindEvents = () => {
        elements.container?.removeEventListener(state.events.down, down)
        elements.container?.removeEventListener(state.events.move, move)
        window.removeEventListener(state.events.up, up)
        window.removeEventListener('resize', resize)
        elements.prev?.removeEventListener('click', previous)
        elements.next?.removeEventListener('click', next)

        console.log('carousel: unbindEvents')
    }

    const init = () => {
        bindEvents()
        resize()

        ScrollTrigger.create({
            trigger: elements.container,
            onToggle: ({ isActive }) => state.run = isActive
        })
    }

    const destroy = () => {
        unbindEvents()
        st?.kill()
        state.cache = null
    }

    const mount = () => {
        init()
    }

    const unmount = () => {
        destroy()
    }

    // Auto-mount
    mount()

    return {
        init,
        destroy,
        mount,
        unmount,
        next,
        previous,
        snap,
        resize,
        get state() {
            return state
        },
        get elements() {
            return elements
        },
        get idx() {
            return state.idx
        },
        get diff() {
            return state.diff
        },
        get cache() {
            return state.cache
        }
    }
}