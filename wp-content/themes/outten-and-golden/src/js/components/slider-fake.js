import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { evt, utils, store } from '../core'
import lerp from '@14islands/lerp'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const { qs, qsa, rect } = utils
const { dom, features, bounds, device } = store

export default function Carousel(element, options = {}) {
    const sliderAttribute = element.section.getAttribute('data-slider') || 'normal'
    const sliderPrev = qs('[data-slider-prev]', element.section) || null
    const sliderNext = qs('[data-slider-next]', element.section) || null
    const dragTarget = qs('[data-slider]', element.section)

    const config = {
        toggle: options.toggle || false,
        sliderType: dragTarget.getAttribute('data-slider') || 'normal',
        sliderPrev: sliderPrev,
        sliderNext: sliderNext
    }

    const fakeSlider = config.sliderType === 'fake' ? qs('.js-fake-slider') : null
    const fakeSlides = fakeSlider ? qsa('.js-fake-slide', fakeSlider) : []

    const state = {
        speed: 2.5,
        ox: 0,
        cx: 0,
        cy: 0,
        dx: 0,
        t: 0,
        tc: 0,
        max: 0,
        margin: 0,
        idx: 0,
        active: false,
        resizing: false,
        run: true,
        cache: null,
        events: {},
        lastActiveUpdate: 0,
        currentIdx: 0
    }

    const elements = {
        el: dragTarget ? dragTarget : element.section,
        pb: null,
        prev: sliderPrev,
        next: sliderNext
    }

    let snaps = []
    let observer = null
    let crect = null
    let animationFrame = null

    const resetCarousel = () => {
        state.t = 0
        state.tc = 0
        state.max = 0
        state.margin = 0
        state.idx = 0
        state.cache = null

        snaps = []

        resize()

        requestAnimationFrame(() => {
            if (state.cache && state.cache.length > 0) {
                updateActiveSlide(0)

                setTimeout(() => {
                    resize()
                }, 500)
            }
        })
    }

    const getFakeSlidePositions = () => {
        if (config.sliderType !== 'fake' || !fakeSlider || fakeSlides.length === 0) {
            return []
        }

        const fakePositions = []
        fakeSlides.forEach((fakeSlide, i) => {
            const { left, width } = rect(fakeSlide)
            const right = left + width
            fakePositions.push({ left, right, width })
        })
        return fakePositions
    }

    const resize = () => {
        state.resizing = true

        const slide = qsa(".js-slide", elements.el)

        if (!slide.length) return

        const slides = elements.el
        const srect = rect(slides)
        crect = rect(elements.el)
        const total = slide.length - 1
        const offset = srect.left

        const isSmall = bounds.ww < 768
        state.speed = isSmall ? 3.5 : 2

        snaps = []

        const containerRect = rect(elements.el)
        const currentIdx = state.idx || 0

        const fakePositions = getFakeSlidePositions()

        if (state.cache) {
            state.cache.forEach((c, i) => {
                gsap.set(c.el, { x: 0, y: 0, z: 0 })

                const position = (config.sliderType === 'fake' && fakePositions[i]) ? fakePositions[i] : rect(c.el)
                const { left, right, width } = position
                
                c.start = left - window.innerWidth
                c.end = right || left + width
                
                const snapPosition = left - containerRect.left
                snaps.push(snapPosition)

                if (i === total) calcMax(c.el, c.end, offset)
            })
        } else {
            state.cache = slide.map((elem, i) => {
                gsap.set(elem, { x: 0, y: 0, z: 0 })

                const position = (config.sliderType === 'fake' && fakePositions[i]) ? fakePositions[i] : rect(elem)
                const { left, width } = position
                const right = left + width
                
                const start = left - window.innerWidth
                const end = right
                
                const snapPosition = left - containerRect.left
                snaps.push(snapPosition)

                if (i === total) calcMax(elem, end, offset)

                return { el: elem, start, end, left, width, out: true }
            })
        }

        requestAnimationFrame(() => {
            state.resizing = false
            snap()
        })
    }

    const updateActiveSlide = (activeIndex) => {
        if (!state.cache || state.resizing) return

        state.cache.forEach((item, i) => {
            item.el.classList.remove('active')

            if (config.sliderType === 'fake') {
                gsap.to(item.el, {
                    maxWidth: device.isSmall ? '100%' : '41rem',
                    minWidth: device.isSmall ? '100%' : '41rem',
                    duration: 0.35,
                    overwrite: true
                })
            }
        })

        if (state.cache[activeIndex]) {
            const activeSlide = state.cache[activeIndex].el
            activeSlide.classList.add('active')
            
            if (config.sliderType === 'fake') {
                gsap.to(activeSlide, {
                    maxWidth: device.isSmall ? '100%' : '67rem',
                    minWidth: device.isSmall ? '100%' : '67rem',
                    duration: 0.35,
                    overwrite: true
                })
            }
        }

        state.idx = activeIndex
    }

    const calcMax = (elem, right, offset) => {
        state.margin = parseInt(
            getComputedStyle(elem).getPropertyValue('margin-right')
        )

        const containerWidth = rect(elem).width
        const lastSlidePosition = right - offset - containerWidth
        state.max = Math.max(0, lastSlidePosition - state.margin)
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

        if (Math.abs(x - state.cx) > Math.abs(y - state.cy) && e.cancelable) {
            e.preventDefault()
            e.stopPropagation()
        }

        const newT = state.ox - x * state.speed
        state.t = gsap.utils.clamp(0, state.max, newT)

        const now = Date.now()

        if (now - state.lastActiveUpdate > 100) {
            const nearestSnap = findNearestSnap(snaps, state.t)
            const currentIdx = snaps.indexOf(nearestSnap)
            
            if (currentIdx !== state.idx) {
                updateActiveSlide(currentIdx)
            }
            
            state.lastActiveUpdate = now
        }
    }

    const up = (e) => {
        if (!state.active) return

        state.active = false

        const { x } = pos(e)

        if (Math.abs(x - state.dx) < 10) {
            const target = e.target.closest("[data-url], [data-modal]")
            if (!target || !element.contains(target)) return

            if (target.dataset.url) {
                window.location.href = target.dataset.url
                const event = new CustomEvent('slide:click')
                window.dispatchEvent(event)
            }
        } else {
            snap()
        }
    }

    const snap = () => {
        if (state.resizing) return;

        const clampedT = gsap.utils.clamp(0, state.max, state.t);
        const snapValue = findNearestSnap(snaps, clampedT);
        const diff = snapValue - clampedT - state.margin;

        state.t = gsap.utils.clamp(0, state.max, clampedT + diff);

        const newIdx = snaps.indexOf(snapValue);

        updateActiveSlide(newIdx)
        transforms()
    }

    const findNearestSnap = (snapPoints, value) => {
        let closest = snapPoints[0]
        let closestDistance = Math.abs(snapPoints[0] - value)

        for (let i = 1; i < snapPoints.length; i++) {
            const distance = Math.abs(snapPoints[i] - value)
            if (distance < closestDistance) {
                closest = snapPoints[i]
                closestDistance = distance
            }
        }

        return closest
    }

    const tick = () => {
        if (config.toggle && !state.run) return

        const ratio = 1
        state.tc = lerp(state.tc, state.t, 0.125 * ratio)
        state.tc = Math.round(state.tc * 100) / 100

        if (!state.resizing) {
            transforms()
        }

        animationFrame = requestAnimationFrame(tick)
    }

    const transforms = () => {
        if (!state.cache) return

        state.cache.forEach((c, i) => {
            const { start, end, left, width, el } = c
            const t = gsap.utils.clamp(0, state.max, state.tc)
            const v = visible(start, end, left, width, t)
            const isActive = i === state.idx

            if (v.visible || state.resizing) {
                c.out && (c.out = false)
                transformElement(el, t, isActive)
            } else if (!c.out) {
                c.out = true
                transformElement(el, t, false)
            }
        })
    }

    const transformElement = (el, transform, isActive = false) => {
        gsap.set(el, {
            x: -transform,
            overwrite: "auto"
        })
    }

    const visible = (start, end, left, width, t) => {
        const visible = t > start && t < end
        return { visible }
    }

    const setEvents = () => {
        const isMobile = 'ontouchstart' in window

        state.events = {
            move: isMobile ? "touchmove" : "mousemove",
            down: isMobile ? "touchstart" : "mousedown",
            up: isMobile ? "touchend" : "mouseup",
        }
    }

    /**
     * Next & Previous slide
     */
    const next = () => {
        if (!state.cache || state.cache.length === 0) return
        if (state.idx >= state.cache.length - 1) return

        const nextIdx = state.idx + 1

        if (nextIdx >= state.cache.length) return

        const nextSnapPosition = snaps[nextIdx]

        state.t = nextSnapPosition

        // Update active slide
        updateActiveSlide(nextIdx)
        transforms()

        snap()
    }

    const previous = () => {
        if (!state.cache || state.cache.length === 0) return
        if (state.idx <= 0) return

        const prevIdx = state.idx - 1

        if (prevIdx < 0) return

        const prevSnapPosition = snaps[prevIdx]
        state.t = prevSnapPosition

        // Update active slide
        updateActiveSlide(prevIdx)
        transforms()

        snap()
    }

    const bindEvents = () => {
        setEvents()

        elements.el.addEventListener(state.events.down, down)
        elements.el.addEventListener(state.events.move, move)
        window.addEventListener(state.events.up, up)

        elements.prev && elements.prev.addEventListener('click', previous)
        elements.next && elements.next.addEventListener('click', next)
        
        evt.on('resize', () => {
            resetCarousel()
        })
        
        if (config.toggle) {
            const scrollTrigger = ScrollTrigger.create({
                trigger: elements.el,
                start: "top bottom",
                end: "bottom top",
                onEnter: () => { state.run = true },
                onLeave: () => { state.run = false },
                onEnterBack: () => { state.run = true },
                onLeaveBack: () => { state.run = false }
            })
            
            observer = scrollTrigger
        }
        
        animationFrame = requestAnimationFrame(tick)
    }

    const unbindEvents = () => {
        elements.el.removeEventListener(state.events.down, down)
        elements.el.removeEventListener(state.events.move, move)
        window.removeEventListener(state.events.up, up)

        elements.prev && elements.prev.removeEventListener('click', previous)
        elements.next && elements.next.removeEventListener('click', next)

        evt.off('resize', resetCarousel)
        
        if (observer) {
            // Kill the ScrollTrigger instance instead of disconnecting an IntersectionObserver
            observer.kill()
        }
        
        if (animationFrame) {
            cancelAnimationFrame(animationFrame)
        }
    }

    const init = async () => {
        bindEvents()
        resetCarousel()
    }

    const destroy = () => {
        unbindEvents()
        state.cache = null
        elements.prev = null
        elements.next = null
    }

    init()

    return {
        init,
        destroy,
        reset: resetCarousel,
        next,
        previous,
        get index() {
            return state.idx
        },
        get cache() {
            return state.cache
        },
        get prev() {
            return elements.prev
        },
        get next() {
            return elements.next
        }
    }
}