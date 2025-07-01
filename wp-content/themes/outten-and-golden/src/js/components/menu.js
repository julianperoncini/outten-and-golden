/**
 * Enhanced Menu Animation Module
 * Simple GSAP implementation with separate open/close functions
 */
import { evt, utils, store } from '@/core'
import { gsap } from 'gsap'

const { qs, qsa } = utils
const { device, dom } = store

// Animation settings
const DURATION = 0.45
const EASE = 'power2'

export default function menuController(el, options = {}) {
  if (!el) return () => {}
  
  // Cache DOM elements
  const elements = {
    trigger: qs('.js-menu-trigger'),
    boxes: qsa('.js-menu-box', el),
    animateIn: qsa('[data-animate-in]', el),
    header: qs('header')
  }

  const span = qsa('span', elements.trigger)

  // Set initial states
  gsap.set(el, { clipPath: 'inset(0 0 100% 0)' })
  
  // State
  const state = {
    isOpen: false,
    previousNavState: ''
  }
  
  /**
   * Opens the menu with GSAP animations
   */
  function openMenu() {
    if (state.isOpen) return
    
    state.isOpen = true
    state.previousNavState = dom.body.dataset.nav || ''

    // Update DOM states
    dom.body.classList.add('overflow-hidden')
    dom.body.dataset.nav = 'white'
    el.classList.add('is-open')

    // Kill any running animations
    gsap.killTweensOf([ el, elements.animateIn, elements.boxes, dom.overlay ])

    // Animate overlay
    gsap.to(dom.overlay, {
      opacity: 0.5,
      duration: 0.3,
      ease: EASE
    })

    // Animate menu reveal
    gsap.to(el, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: DURATION,
      ease: EASE
    })
  
    // Animate menu items with stagger
    gsap.fromTo(elements.animateIn, {
      y: 40,
      alpha: 0,
    }, {
      y: 0,
      alpha: 1,
      duration: DURATION,
      stagger: 0.04,
      ease: EASE,
    })
    
    // Animate boxes with stagger
    gsap.fromTo(elements.boxes, {
      y: 20,
      alpha: 0,
    }, {
      y: 0,
      alpha: 1,
      duration: DURATION,
      stagger: 0.1,
      ease: EASE,
    })
    
    // Add click outside listener after a short delay
    document.addEventListener('click', handleClickOutside)
  }
  
  /**
   * Closes the menu with GSAP animations
   */
  function closeMenu() {
    if (!state.isOpen) return
    
    state.isOpen = false
    
    // Remove click outside listener
    document.removeEventListener('click', handleClickOutside)
    
    // Update DOM states
    dom.body.dataset.nav = state.previousNavState
    dom.body.classList.remove('overflow-hidden')
    el.classList.remove('is-open')

    // Kill any running animations
    gsap.killTweensOf([ el, elements.animateIn, elements.boxes, dom.overlay ])

    // Animate overlay
    gsap.to(dom.overlay, {
      opacity: 0,
      duration: 0.3,
      ease: EASE
    })
    
    // Animate menu hide
    gsap.to(el, {
      clipPath: 'inset(0 0 100% 0)',
      duration: DURATION,
      ease: EASE
    })
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
    e.stopPropagation()
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
  
  // Optional resize handler
  function handleResize() {
    // Uncomment if needed
    // if (state.isOpen) closeMenu()
  }
  evt.on('resize', handleResize)
  
  // Return cleanup function
  return () => {
    // Kill any running animations
    gsap.killTweensOf([el, elements.animateIn, elements.boxes, span, dom.overlay])
    
    // Remove event listeners
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
    evt.off('click', elements.trigger, toggleMenu)
    evt.off('menu:close', closeMenu)
    evt.off('resize', handleResize)
  }
}