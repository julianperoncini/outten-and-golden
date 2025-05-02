import { evt, utils, store } from '@/core'
import split from './split'
import { motion, animate, stagger, transform, scroll, cubicBezier } from 'motion'

const { qs, qsa } = utils
const { device, dom } = store

const easeOut = cubicBezier(0.19, 1, 0.22, 1)

export default function (el, options = {}) {
  if (!el) return

  const trigger = qs('.js-menu-trigger')
  const boxes = qsa('.js-menu-box img', el)
  const animateIn = qsa('[data-animate-in]', el)

  let isMenuOpen = false
  let previousNavState = ''

  const openMenu = () => {
    if (isMenuOpen) return

    isMenuOpen = true

    dom.body.classList.add('overflow-hidden')
    previousNavState = dom.body.dataset.nav || ''
    dom.body.dataset.nav = 'white'

    el.classList.add('is-open')

    const sequence = [
      [el, {
        transform: 'translateY(0%)',
      }, {
        duration: 1,
        ease: easeOut
      }],
      [animateIn, {
        transform: ['translateY(-2rem)', 'none'],
        opacity: [0, 1],
      }, {
        duration: 1,
        delay: stagger(0.04),
        at: '-0.75',
        ease: easeOut
      }],
      [boxes, {
        scale: [1.025, 1],
        opacity: [0, 1],
      }, {
        duration: 2,
        delay: stagger(0.04),
        at: '-1.5',
        ease: easeOut
      }]
    ]

    animate(sequence)
  }

  const closeMenu = () => {
    if (!isMenuOpen) return

    isMenuOpen = false

    dom.body.dataset.nav = previousNavState
    dom.body.classList.remove('overflow-hidden')

    el.classList.remove('is-open')
    const sequence = [
      [el, {
        transform: 'translateY(-100%)',
      }, {
        duration: 1,
        ease: easeOut
      }]
    ]

    animate(sequence)
  }

  const toggleMenu = () => {
    if (isMenuOpen) {
      closeMenu()
    } else {
      openMenu()
    }
  }

  const onResize = () => {
    if (isMenuOpen) {
      closeMenu()
    }
  }

  // Handle ESC key to close menu
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      closeMenu()
    }
  }

  evt.on('click', trigger, toggleMenu)
  evt.on('menu:close', closeMenu)
  evt.on('resize', onResize)
  document.addEventListener('keydown', onKeyDown)

  return () => {
    evt.off('click', trigger, toggleMenu)
    evt.off('menu:close', closeMenu)
    evt.off('resize', onResize)
    document.removeEventListener('keydown', onKeyDown)
  }
}