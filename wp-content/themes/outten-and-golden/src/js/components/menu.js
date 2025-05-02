/**
 * Enhanced Menu Animation Module
 * Performance optimized with improved structure and memory management
 */
import { evt, utils, store } from '@/core'
import { animate, stagger, cubicBezier } from 'motion'

const { qs, qsa } = utils
const { device, dom } = store

// Constants
const ANIMATION_EASING = [cubicBezier(0.19, 1, 0.22, 1), cubicBezier(0.19, 1, 0.22, 1)]
const ANIMATION_CONFIG = {
  menu: {
    duration: 1,
    ease: ANIMATION_EASING
  },
  items: {
    duration: 1,
    ease: ANIMATION_EASING
  },
  boxes: {
    duration: 1,
    ease: ANIMATION_EASING
  }
}

/**
 * Menu Animation Controller
 * @param {HTMLElement} el - Menu container element
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export default function menuController(el, options = {}) {
  if (!el) return () => {}
  
  // Cache DOM elements
  const elements = {
    trigger: qs('.js-menu-trigger'),
    boxes: qsa('.js-menu-box', el),
    animateIn: qsa('[data-animate-in]', el)
  }
  
  // State
  const state = {
    isOpen: false,
    previousNavState: ''
  }
  
  /**
   * Animation sequences
   */
  const animations = {
    open: [
      [el, {
        transform: 'translateY(0%)'
      }, ANIMATION_CONFIG.menu],
      
      [elements.animateIn, {
        transform: ['translateY(-1rem)', 'none'],
        opacity: [0, 1]
      }, {
        ...ANIMATION_CONFIG.items,
        delay: stagger(0.04),
        at: '-0.75'
      }],
      
      [elements.boxes, {
        transform: ['translateY(-20%)', 'none'],
      }, {
        ...ANIMATION_CONFIG.boxes,
        delay: stagger(-0.1),
        at: '-1.5'
      }]
    ],
    
    close: [
      [el, {
        transform: 'translateY(-100%)'
      }, ANIMATION_CONFIG.menu]
    ]
  }
  
  /**
   * Opens the menu
   */
  const openMenu = () => {
    if (state.isOpen) return
    
    state.isOpen = true
    state.previousNavState = dom.body.dataset.nav || ''
    
    dom.body.classList.add('overflow-hidden')
    dom.body.dataset.nav = 'white'
    el.classList.add('is-open')
    
    animate(animations.open)
  }
  
  /**
   * Closes the menu
   */
  const closeMenu = () => {
    if (!state.isOpen) return
    
    state.isOpen = false
    
    dom.body.dataset.nav = state.previousNavState
    dom.body.classList.remove('overflow-hidden')
    el.classList.remove('is-open')
    
    animate(animations.close)
  }
  
  /**
   * Toggles menu state
   */
  const toggleMenu = () => state.isOpen ? closeMenu() : openMenu()
  
  /**
   * Event handlers
   */
  const handlers = {
    resize: () => {
      if (state.isOpen) closeMenu()
    },
    
    keydown: (e) => {
      if (e.key === 'Escape' && state.isOpen) closeMenu()
    }
  }
  
  // Add event listeners
  evt.on('click', elements.trigger, toggleMenu)
  evt.on('menu:close', closeMenu)
  evt.on('resize', handlers.resize)
  document.addEventListener('keydown', handlers.keydown)
  
  // Return cleanup function
  return () => {
    evt.off('click', elements.trigger, toggleMenu)
    evt.off('menu:close', closeMenu)
    evt.off('resize', handlers.resize)
    document.removeEventListener('keydown', handlers.keydown)
    
    // Clean references
    animations.open = null
    animations.close = null
  }
}