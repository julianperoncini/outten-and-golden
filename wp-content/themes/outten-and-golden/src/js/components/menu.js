import gsap from 'gsap'
import { evt, utils, store } from '@/core'
import split from './split'

const { qs, qsa } = utils
const { device, dom } = store

export default function (el, options = {}) {
  if (!el) return

  const trigger = qs('.js-menu-trigger')

  let isMenuOpen = false
  let previousNavState = ''

  gsap.set(el, { yPercent: -100 })

  const openMenu = () => {
    if (isMenuOpen) return

    isMenuOpen = true

    dom.body.classList.add('overflow-hidden')
    previousNavState = dom.body.dataset.nav || ''
    dom.body.dataset.nav = 'white'

    el.classList.add('is-open')
    gsap.set(el, { autoAlpha: 1 })
    gsap.to(el, {
      yPercent: 0,
      duration: 1,
      ease: 'expo',
    })
  }

  const closeMenu = () => {
    if (!isMenuOpen) return

    isMenuOpen = false

    dom.body.dataset.nav = previousNavState
    dom.body.classList.remove('overflow-hidden')

    el.classList.remove('is-open')
    gsap.to(el, {
      yPercent: -100,
      duration: 1,
      ease: 'expo',
    })
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