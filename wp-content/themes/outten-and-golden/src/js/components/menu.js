/**
 * Enhanced Menu Animation Module
 * Performance optimized with improved structure and memory management
 */
import { evt, utils, store } from '@/core'
import { animate, press, clamp, stagger, cubicBezier } from 'motion'

const { qs, qsa } = utils
const { device, dom } = store

// Constants
const ANIMATION_EASING = [0.19, 1, 0.22, 1]
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

  elements.animateIn.forEach((item) => {
    item.style.opacity = '0'
  })
  
  // State
  const state = {
    isOpen: false,
    previousNavState: '',
    isAnimating: false,  // Add an animation state flag
    clickStartedInsideTrigger: false // Track where click started
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

    animate(dom.overlay, {
      opacity: [0, 0.5]
    }, {
      duration: 0.3,
      ease: cubicBezier(0.19, 1, 0.22, 1)
    })

    animate(span[0], {
      transform: ['translateX(0.5rem) translateY(-0.35rem) rotate(45deg)'],
    }, {
      duration: 0.3,
      ease: cubicBezier(0.19, 1, 0.22, 1)
    })
    
    animate(span[1], {
      transform: ['translateX(0.4rem) translateY(0.35rem) rotate(-45deg)'],
    }, {
      duration: 0.3,
      ease: cubicBezier(0.19, 1, 0.22, 1)
    })

    animate(el, {
      clipPath: ['inset(0% 0% 100% 0%)', 'inset(0% 0% 0% 0%)']
    }, {
      duration: 1,
      ease: cubicBezier(0.19, 1, 0.22, 1),
    })
  
    animate(elements.animateIn, {
      transform: ['translateY(-20%)', 'none'],
      opacity: [0, 1]
    }, {
      duration: 1,
      delay: stagger(0.04),
      ease: cubicBezier(0.19, 1, 0.22, 1)
    })
    
    animate(elements.boxes, {
      opacity: [0, 1]
    }, {
      duration: 1,
      delay: stagger(-0.1),
      ease: cubicBezier(0.19, 1, 0.22, 1)
    })
    
    // Use setTimeout to prevent the document click from immediately closing the menu
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }
  
  /**
   * Closes the menu
   */
  const closeMenu = () => {
    if (!state.isOpen) return
    
    state.isOpen = false
    
    // Remove the document click handler immediately
    document.removeEventListener('click', handleClickOutside);
    
    dom.body.dataset.nav = state.previousNavState
    dom.body.classList.remove('overflow-hidden')
    el.classList.remove('is-open')

    animate(dom.overlay, {
      opacity: 0
    }, {
      duration: 0.3,
      ease: cubicBezier(0.19, 1, 0.22, 1)
    })

    animate(span[0], {
      transform: 'none',
    }, {
      duration: 0.3,
      ease: cubicBezier(0.19, 1, 0.22, 1)
    })
    
    animate(span[1], {
      transform: 'none',
    }, {
      duration: 0.3,
      ease: cubicBezier(0.19, 1, 0.22, 1)
    })
    
    animate(el, {
      clipPath: 'inset(0 0 100% 0)'
    }, {
      duration: 1,
      ease: cubicBezier(0.19, 1, 0.22, 1),
    })
  }

  /**
   * Handle clicks outside the menu
   */
  const handleClickOutside = (e) => {
    if (!state.isOpen) return;
    
    if (!el.contains(e.target) && !elements.trigger.contains(e.target) && !elements.header.contains(e.target)) {
      closeMenu()
    }
  }
  
  /**
   * Toggles menu state
   */
  const toggleMenu = (e) => {
    // Prevent the click from propagating to the document
    e.stopPropagation();
    
    state.isOpen ? closeMenu() : openMenu();
  }
  
  /**
   * Event handlers
   */
  const handlers = {
    resize: () => {
      if (state.isOpen) closeMenu();
    },
    
    keydown: (e) => {
      if (e.key === 'Escape' && state.isOpen) closeMenu();
    }
  }
  
  // Add event listeners - but NOT document click yet (we'll add that after menu opens)
  evt.on('click', elements.trigger, toggleMenu);
  evt.on('menu:close', closeMenu);
  evt.on('resize', handlers.resize);
  document.addEventListener('keydown', handlers.keydown);
  
  // Return cleanup function
  return () => {
    // Remove document click handler if it exists
    document.removeEventListener('click', handleClickOutside);
    
    evt.off('click', elements.trigger, toggleMenu);
    evt.off('menu:close', closeMenu);
    evt.off('resize', handlers.resize);
    document.removeEventListener('keydown', handlers.keydown);
    
    // Clean references
    animations.open = null;
    animations.close = null;
  }
}