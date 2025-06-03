import gsap from 'gsap'
import lerp from '@14islands/lerp'
import { evt, utils, store } from '@/core'

const { qs, qsa, rect } = utils
const { device, bounds } = store

const isMobile = device.isMobile

export default function sliderScale(element, options = {}) {
    const state = {
        on: 0,
        cancelX: 0,
        cancelY: 0,
        t: 0,
        tc: 0,
        dx: 0,
        speed: 2,
        offset: 0,
        active: false,
        max: 0,
        so: 0,
        resizing: false,
        cache: null,
        elems: [],
        events: {},
        cx: 0,
        cy: 0,
        doSnap: null
    }

    const elements = {
        el: element,
        carousel: qs('.js-slider-container', element.elements.el),
        slide: qsa('.js-slider-item', element.elements.carousel),
        prev: qs('.js-slider-prev', element.elements.el),
        next: qs('.js-slider-next', element.elements.el),
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
        state.on = state.t + x * state.speed
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

        state.t = state.on - x * state.speed
        clamp()
    }

    const up = (e) => {
        if (!state.active) return
        state.active = false

        const { x } = pos(e)

        if (Math.abs(x - state.dx) < 10) {
            const el = e.target.closest('[data-to]')
            // Handle click/tap functionality here if needed
        }

        snap()
        clamp()
    }

    const clamp = () => {
        state.t = gsap.utils.clamp(0, state.max, state.t)
    }

    const calcMax = (el, right, width, offset) => {
        const margin = parseInt(getComputedStyle(el).getPropertyValue('margin-right'))

        state.max = Math.max(0, right - (bounds.ww - offset))
        state.so = width + margin
        state.doSnap = gsap.utils.snap(state.so)
    }

    const resize = () => {
        state.resizing = true

        const total = elements.slide?.length - 1
        const offset = rect(elements.carousel).left

        if (state.cache) {
            state.cache.forEach((c, i) => {
                c.xSet(0)

                const { left, right, width } = rect(c.el)

                c.start = left - bounds.ww
                c.end = right
                c.out = true

                if (i === total) {
                    calcMax(c.el, right, width, offset)
                }
            })
        } else {
            state.elems = []
            state.cache = elements.slide.map((el, i) => {
                el.style.transform = 'none'

                const { left, right, width } = rect(el)
                const start = left - bounds.ww
                const end = right
                const xSet = gsap.quickSetter(el, 'x', 'px')

                if (i === total) {
                    calcMax(el, right, width, offset)
                }

                return { el, xSet, start, end, out: true }
            })
        }

        transform()
        clamp()
        
        setTimeout(() => {
            state.resizing = false
        })
    }

    const previous = () => {
        state.t = state.doSnap(state.t - state.so)
        clamp()
    }

    const next = () => {
        state.t = state.doSnap(state.t + state.so)
        clamp()
    }

    const snap = () => {
        state.t = state.doSnap(state.t)
    }

    const tick = ({ ratio }) => {
        state.tc = lerp(state.tc, state.t, 0.1 * ratio)
        state.tc = Math.round(state.tc * 100) / 100

        const still = Math.abs(state.t - state.tc) <= 0.1
        if (!still) {
            transform()
        }
    }

    const transform = () => {
        state.cache?.forEach((c) => {
            const { start, end, xSet } = c

            if (visible(start, end, state.tc) || state.resizing) {
                if (c.out) {
                    c.out = false
                }
                xSet(-state.tc)
            } else if (!c.out) {
                c.out = true
                xSet(-state.tc)
            }
        })
    }

    const visible = (start, end, t) => {
        return t > start && t < end
    }

    const setEvents = () => {
        state.events = {
            move: isMobile ? 'touchmove' : 'mousemove',
            down: isMobile ? 'touchstart' : 'mousedown',
            up: isMobile ? 'touchend' : 'mouseup',
        }
    }

    const bindEvents = () => {
        setEvents()

        window.addEventListener(state.events.up, up)
        elements.carousel.addEventListener(state.events.down, down)
        elements.carousel.addEventListener(state.events.move, move)
        elements.prev && elements.prev.addEventListener('click', previous)
        elements.next && elements.next.addEventListener('click', next)

        evt.on('resize', resize)
        evt.on('tick', tick)
    }

    const unbindEvents = () => {
        window.removeEventListener(state.events.up, up)
        elements.carousel.removeEventListener(state.events.down, down)
        elements.carousel.removeEventListener(state.events.move, move)
        elements.prev && elements.prev.removeEventListener('click', previous)
        elements.next && elements.next.removeEventListener('click', next)

        evt.off('resize', resize)
        evt.off('tick', tick)
    }

    const init = () => {
        bindEvents()
        resize()
    }

    const destroy = () => {
        unbindEvents()
        state.cache = null
    }

    const mount = () => {
        init()
    }

    const unmount = () => {
        destroy()
    }

    mount()

    return {
        init,
        destroy,
        mount,
        unmount,
        previous,
        next,
        snap,
        resize,
        get state() {
            return state
        },
        get elements() {
            return elements
        }
    }
}