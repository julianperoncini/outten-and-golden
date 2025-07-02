import { evt, utils, store } from '@/core'
import { gsap } from 'gsap'

const { qs, qsa } = utils
const { device, dom } = store

export default function (el, options = {}) {
  if (!el) return () => {}
  
  const elements = {
    trigger: qs('.js-menu-trigger'),
    boxes: qsa('.js-menu-box', el),
    animateIn: qsa('[data-animate-in]', el),
    header: qs('header')
  }

  const span = qsa('span', elements.trigger)

  const DURATION = 0.45
  const EASE = 'power2'
  
  let tl = null;
  
  const state = {
    isOpen: false,
    previousNavState: ''
  }

  gsap.set(el, { clipPath: 'inset(0 0 100% 0)' })
  

  function openMenu() {
    if (state.isOpen) return
    
    state.isOpen = true
    state.previousNavState = dom.body.dataset.nav || ''

    dom.body.classList.add('overflow-hidden')
    dom.body.classList.add('menu-is-open')
    dom.body.dataset.nav = 'white'
    el.classList.add('is-open')

    el.scrollTo({ top: 0 })

    if (tl) tl.kill()
    
    tl = gsap.timeline()
    
    tl.to(dom.overlay, {
      opacity: 0.5,
      duration: 0.3,
      ease: EASE
    }, 0)

    tl.to(el, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: DURATION,
      ease: EASE
    }, 0)

    tl.fromTo(elements.animateIn, {
      y: 30,
      alpha: 0,
    }, {
      y: 0,
      alpha: 1,
      duration: DURATION,
      stagger: 0.04,
      ease: EASE,
    }, 0.1)
    
    tl.fromTo(elements.boxes, {
      y: 60,
      alpha: 0,
    }, {
      y: 0,
      alpha: 1,
      duration: DURATION,
      stagger: 0.04,
      ease: EASE,
    },0)

    document.addEventListener('click', handleClickOutside)
  }
  
  /**
   * Closes the menu with GSAP animations
   */
  function closeMenu() {
    if (!state.isOpen) return

    dom.body.dataset.nav = state.previousNavState
    dom.body.classList.remove('overflow-hidden')
    dom.body.classList.remove('menu-is-open')
    el.classList.remove('is-open')
    
    state.isOpen = false
    
    document.removeEventListener('click', handleClickOutside)
    
    if (tl) tl.kill()
    
    tl = gsap.timeline()
    
    tl.to(dom.overlay, {
      opacity: 0,
      duration: 0.3,
      ease: EASE
    }, 0)
    
    tl.to(el, {
      clipPath: 'inset(0 0 100% 0)',
      duration: DURATION,
      ease: EASE
    }, 0)
  }

  /**
   * Handle clicks outside the menu
   */
  function handleClickOutside(e) {
    if (!state.isOpen) return
    
    if (!el.contains(e.target) && !elements.trigger.contains(e.target) && !elements.header.contains(e.target)) {
      closeMenu()
    }
  }
  
  /**
   * Toggles menu state
   */
  function toggleMenu(e) {
    if (e) e.stopPropagation()
    state.isOpen ? closeMenu() : openMenu()
  }
  
  // Event listeners
  evt.on('click', elements.trigger, toggleMenu)
  evt.on('menu:close', closeMenu)
  
  // Keyboard escape handler
  function handleKeydown(e) {
    if (e.key === 'Escape' && state.isOpen) closeMenu()
  }
  document.addEventListener('keydown', handleKeydown)
  
  // Return cleanup function
  return () => {
    // Kill any running animations
    if (tl) tl.kill()
    
    // Remove event listeners
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
    evt.off('click', elements.trigger, toggleMenu)
    evt.off('menu:close', closeMenu)
    evt.off('resize', handleResize)
  }
}