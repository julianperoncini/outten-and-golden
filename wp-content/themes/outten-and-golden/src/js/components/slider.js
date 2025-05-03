import { animate, clamp, inView, spring, wrap, timeline } from 'motion'
import { evt, utils, store } from '../core'
import lerp from '@14islands/lerp'

const { qs, qsa, rect } = utils
const { dom, features, bounds } = store

export default function Carousel(element, options = {}) {
  const config = {
    toggle: options.toggle || false
  }

  const carousel = qs('.js-carousel')
  const fakeSlider = qs('.js-fake-slider')
  const fakeSlides = qsa('.js-fake-slide', fakeSlider)

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
    el: element.section,
    pb: null
  }

  let snaps = []
  let observer = null
  let crect = null
  let animationFrame = null

  // Function to reset everything
  const resetCarousel = () => {
    // Clear current state
    state.t = 0
    state.tc = 0
    state.max = 0
    state.margin = 0
    state.idx = 0
    state.cache = null
    
    // Clear snaps array
    snaps = []
    
    // Reinitialize
    resize()
    
    // Reset active slide to first slide
    requestAnimationFrame(() => {
      if (state.cache && state.cache.length > 0) {
        updateActiveSlide(0)
      }
    })
  }

  const getFakeSlidePositions = () => {
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
    const currentIdx = state.idx || 0;
    
    const fakePositions = getFakeSlidePositions()
    
    if (state.cache) {
      state.cache.forEach((c, i) => {
        c.el.style.transform = `translate3d(0, 0, 0)`

        const position = fakePositions[i] || rect(c.el)
        const { left, right, width } = position
        
        c.start = left - window.innerWidth
        c.end = right || left + width
        
        const snapPosition = left - containerRect.left
        snaps.push(snapPosition)

        if (i === total) calcMax(c.el, c.end, offset)
      })
    } else {
      state.cache = slide.map((elem, i) => {
        elem.style.transform = `translate3d(0, 0, 0)`

        const position = fakePositions[i] || rect(elem)
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

      animate(item.el, {
        maxWidth: '41rem',
        minWidth: '41rem',
      }, { 
        duration: 0.35,
      })
    })
    
    if (state.cache[activeIndex]) {
      const activeSlide = state.cache[activeIndex].el
      activeSlide.classList.add('active')
      
      animate(activeSlide, {
        maxWidth: '67rem',
        minWidth: '67rem',
      }, {
        duration: 0.35,
      })
    }
    
    state.idx = activeIndex
  }

  const calcMax = (elem, right, offset) => {
    state.margin = parseInt(
      getComputedStyle(elem).getPropertyValue("margin-right")
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
    state.t = clamp(0, state.max, newT)
    
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
  
    const sliderRect = rect(carousel).x;
    const clampedT = clamp(0, state.max, state.t);
    const snapValue = findNearestSnap(snaps, clampedT);
    const diff = snapValue - clampedT - state.margin;
  
    state.t = clamp(0, state.max, clampedT + diff);
    
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
      const t = clamp(0, state.max, state.tc)
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
    const animationOptions = {
      x: -transform,
    }
    
    animate(el, animationOptions, { 
      duration: 0,
      preserve: true
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
      onUpdate: ({ t }) => {
        state.t = t
      },
      onComplete: () => {
        updateActiveSlide(state.idx);
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
      onUpdate: ({ t }) => {
        state.t = t
      },
      onComplete: () => {
        updateActiveSlide(state.idx);
      }
    })
    
    state.idx -= 1
  }

  const bindEvents = () => {
    setEvents()

    elements.el.addEventListener(state.events.down, down)
    elements.el.addEventListener(state.events.move, move)
    window.addEventListener(state.events.up, up)
    
    evt.on('resize', () => {
      resetCarousel()
    })
    
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
    
    evt.off('resize', resetCarousel)
    
    if (observer) {
      observer.disconnect()
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
    }
  }
}