import { animate, inView, spring, wrap, timeline } from 'motion'
import { evt, utils, store } from '../core'
import lerp from '@14islands/lerp'

const { qs, qsa, rect } = utils
const { dom, features, bounds } = store

export default function Carousel(element, options = {}) {
  const config = {
    toggle: options.toggle || false
  }

  const carousel = qs('.js-carousel')

  const state = {
    speed: 2,
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
    events: {}
  }

  const elements = {
    el: element.section,
    pb: null
  }

  let snaps = []
  let observer = null
  let crect = null
  let animationFrame = null

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
    
    // Get container rect for alignment
    const containerRect = rect(elements.el)
    
    if (state.cache) {
      state.cache.forEach((c, i) => {
        c.el.style.transform = `translate3d(0, 0, 0)`
        const { left, right, width } = rect(c.el)
        c.start = left - window.innerWidth
        c.end = right
        c.left = left
        c.width = width
        c.out = true
        
        // Calculate snap position relative to container
        const snapPosition = left - containerRect.left
        snaps.push(snapPosition)

        if (i === total) calcMax(c.el, c.end, offset)
      })
    } else {
      state.cache = slide.map((elem, i) => {
        elem.style.transform = `translate3d(0, 0, 0)`
        const { left, right, width } = rect(elem)
        const start = left - window.innerWidth
        const end = right
        
        // Calculate snap position relative to container
        const snapPosition = left - containerRect.left
        snaps.push(snapPosition)

        if (i === total) calcMax(elem, end, offset)

        return { el: elem, start, end, left, width, out: true }
      })
    }

    transforms()

    requestAnimationFrame(() => (state.resizing = false))
  }

  const calcMax = (elem, right, offset) => {
    state.margin = parseInt(
      getComputedStyle(elem).getPropertyValue("margin-right")
    )
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
    if (Math.abs(x - state.cx) > Math.abs(y - state.cy) && e.cancelable) {
      e.preventDefault()
      e.stopPropagation()
    }
    const newT = state.ox - x * state.speed
    state.t = clamp(0, state.max, newT)
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
    const sliderRect = rect(carousel).x
    const clampedT = clamp(0, state.max, state.t)
    const snapValue = findNearestSnap(snaps, clampedT)
    const diff = snapValue - clampedT - sliderRect
    
    state.t = clamp(0, state.max, clampedT + diff)
    
    state.idx = snaps.indexOf(snapValue)
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

  const clamp = (min, max, value) => {
    return Math.min(Math.max(value, min), max)
  }

  const tick = () => {
    if (config.toggle && !state.run) return
    
    const ratio = 1
    state.tc = lerp(state.tc, state.t, 0.1 * ratio)
    state.tc = Math.round(state.tc * 100) / 100
    
    if (!state.resizing) {
      transforms()
    }
    
    animationFrame = requestAnimationFrame(tick)
  }

  const transforms = () => {
    if (!state.cache) return
    
    state.cache.forEach((c) => {
      const { start, end, left, width, el } = c
      const t = clamp(0, state.max, state.tc)
      const v = visible(start, end, left, width, t)

      if (v.visible || state.resizing) {
        c.out && (c.out = false)
        transformElement(el, t)
      } else if (!c.out) {
        c.out = true
        transformElement(el, t)
      }
    })
  }

  const transformElement = (el, transform) => {
    animate(el, { 
      x: -transform
    }, { 
      duration: 0,
      easing: [0.17, 0.67, 0.83, 0.67]
    })
  }

  const visible = (start, end, left, width, t) => {
    const visible = t > start && t < end
    return { visible }
  }

  const setEvents = () => {
    const isMobile = 'ontouchstart' in window
    console.log("isMobile:", isMobile)

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
    if (!state.cache) return
    if (state.idx >= state.cache.length - 1) return
    const c = state.cache[state.idx]
    if (!c) return
    const left = c.width
    const newT = state.t + left + state.margin
    
    const value = { t: state.t }
    animate(value, { 
      t: clamp(0, state.max, newT) 
    }, {
      duration: 0.5,
      easing: spring(),
      onUpdate: ({ t }) => {
        state.t = t
      }
    })
    
    state.idx += 1
  }

  const previous = () => {
    if (!state.cache) return
    if (state.idx <= 0) return
    const c = state.cache[state.idx]
    if (!c) return
    const left = c.width
    const newT = state.t - (left + state.margin)
    
    const value = { t: state.t }
    animate(value, { 
      t: clamp(0, state.max, newT) 
    }, {
      duration: 0.5,
      easing: spring(),
      onUpdate: ({ t }) => {
        state.t = t
      }
    })
    
    state.idx -= 1
  }

  const bindEvents = () => {
    setEvents()

    elements.el.addEventListener(state.events.down, down)
    elements.el.addEventListener(state.events.move, move)
    window.addEventListener(state.events.up, up)
    
    window.addEventListener('resize', resize)
    
    if (config.toggle) {
      observer = inView(elements.el, () => {
        state.run = true
        return () => {
          state.run = false
        }
      })
    }
    
    animationFrame = requestAnimationFrame(tick)
  }

  const unbindEvents = () => {
    elements.el.removeEventListener(state.events.down, down)
    elements.el.removeEventListener(state.events.move, move)
    window.removeEventListener(state.events.up, up)
    
    window.removeEventListener('resize', resize)
    
    if (observer) {
      observer.disconnect()
    }
    
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  }

  const init = async () => {
    bindEvents()
    resize()
  }

  const destroy = () => {
    unbindEvents()
    state.cache = null
  }

  init()

  return {
    init,
    destroy,
    next,
    previous,
    get index() {
      return state.idx
    },
    get cache() {
      return state.cache
    }
  }
}