import gsap from 'gsap'
import { evt, utils, store } from '@/core'
import ScrollTrigger from 'gsap/ScrollTrigger'
const { qs, qsa, rect } = utils
const { dom, device } = store

// Configuration constants
const CONFIG = {
  animation: {
    duration: 0.8,
    timeline: 2
  },
  splitText: {
    rotation: {
      initial: 15,
      hover: 5,
      final: 0
    },
    stagger: 0.1,
    sequentialDelay: 0.15
  }
}

/**
 * Creates and manages preloader animations
 * @param {HTMLElement} preloader - The preloader element
 * @returns {Object} Public API for animation control
 */
export default function (preloader = null) {
  // State variables
  let splitController = null
  let splitElements = null
  let splitIntro = null
  let tl = null

  // Cache DOM elements
  const elements = {
    preloader,
    preloaderImage: qs('.js-preloader-image', preloader),
    preloaderContainer: qs('.js-preloader-container', preloader),
    preloaderText: qs('.js-preloader-text', preloader),
    preloaderMenu: qs('header'),
    text1: qs('.js-preloader-text-1', preloader),
    text2: qs('.js-preloader-text-2', preloader),
    textIntro: qsa('.js-preloader-text-intro', preloader),
    handler: qs('.js-preloader-handler', preloader),
    handlerInner: qs('.js-preloader-handler-inner', preloader),
    reel: qsa('.js-preloader-reel', preloader),
    globalText: qsa('.js-preloader-global-text', preloader),
    stickyVideo: qs('.js-scale', preloader),
    stickyTarget: qs('.js-scale-target', preloader)
  }


  splitElements = qsa('.js-split', elements.preloader)
  splitIntro = qsa('.js-preloader-text-intro', elements.preloader)

  /**
   * Calculates clip path values based on handler position
   * @returns {Object} CSS clip-path values for different animation states
   */
  const calculateClipPaths = () => {
    const handlerRect = rect(elements.handlerInner)
    const containerRect = rect(elements.preloaderContainer)
    const textRect = rect(elements.text1) || containerRect

    // Calculate relative positions as percentages
    const centerX = ((handlerRect.left + handlerRect.width / 2 - containerRect.left) / containerRect.width) * 100
    const centerY = ((handlerRect.top + handlerRect.height / 2 - containerRect.top) / containerRect.height) * 100

    const top = Math.max(0, ((handlerRect.top - containerRect.top) / containerRect.height) * 100)
    const right = Math.max(0, ((containerRect.right - handlerRect.right) / containerRect.width) * 100)
    const bottom = Math.max(0, ((containerRect.bottom - handlerRect.bottom) / containerRect.height) * 100)
    const left = Math.max(0, ((handlerRect.left - containerRect.left) / containerRect.width) * 100)

    const textY = ((textRect.bottom - containerRect.top) / containerRect.height) * 100
    const startX = 51

    return {
      start: `inset(${centerY}% ${100 - centerX}% ${100 - centerY}% ${centerX}%)`,
      handlerSize: `inset(${top}% ${right}% ${bottom}% ${left}%)`,
      textPosition: `inset(${textY}% ${100 - startX}% ${100 - textY}% ${startX}%)`,
      end: `inset(0% 0% 0% 0%)`
    }
  }

  /**
   * Initialize text marquee animation
   * @param {Object} controller - Split text controller
   */
  const initSplitMarquee = (controller) => {
    if (!controller) return

    splitController = controller
    splitElements = qsa('.js-split', elements.preloader)

    if (splitElements?.length > 0) {
      splitController.animate.out(splitElements, { y: '150%' })
    }
  }

  /**
   * Initialize text splitting functionality
   * @param {Object} controller - Split text controller
   */
  const initSplit = (controller) => {
    if (!controller) {
      console.warn('Split controller not provided')
      return
    }

    splitController = controller

    // Handle regular split elements
    if (splitElements?.length > 0) {
      splitController.prepare(splitElements)
    }

    if (splitIntro?.length > 0) {
      splitController.prepare(splitIntro)
    }
  }

  /**
   * Setup and play normal page transition animation
   */
  const normalAnimation = () => {
    const overlay = qs('.js-transition-overlay')
    const mask = qs('.js-transition-mask')

    if (!overlay || !mask) {
      return
    }

    // Create a fresh timeline
    tl = gsap.timeline({
      paused: true,
      onComplete: cleanupTimeline
    })

    // Update page state
    dom.body.classList.remove('is-loading')

    // Build animation sequence
    tl.from(overlay, {
      opacity: 0.3,
      delay: 0.3,
      duration: 0.8,
      ease: 'power3.inOut',
    })
      .fromTo(mask,
        { clipPath: 'inset(0% 0% 0% 0%)' },
        {
          clipPath: 'inset(0 0 100% 0)',
          duration: 1,
          ease: 'power3.inOut'
        },
        0
      )
      .add(() => {
        evt.emit('scroll:reset')

        if (splitElements?.length > 0) {
          splitController.forceRotation(splitElements, 10)
          splitController.animate.in(splitElements, {
            delay: 0.3,
            sequentialStagger: true
          })
        }

        evt.emit('speed:boost')
      }, '-=1')
  }

  /**
   * Setup and play home page intro animation
   */
  const homeAnimation = () => {
    evt.emit('scroll:stop')
    // Create a fresh timeline
    tl = gsap.timeline({
      paused: true,
      delay: 1,
      defaults: {
        immediateRender: false,
        ease: 'expo.inOut',
        duration: CONFIG.animation.timeline,
      },
      onComplete: cleanupTimeline
    })

    // Set initial states
    gsap.set([elements.reel, elements.globalText], {
      yPercent: 101,
    })

    // Get clip path values based on handler position
    const clipPaths = calculateClipPaths()

    // Set initial clip path
    gsap.set(elements.preloaderContainer, {
      clipPath: clipPaths.textPosition,
    })
    gsap.set(elements.preloaderImage, {
      opacity: 1,
    })

    // Build animation sequence
    tl.to(elements.text1, {
      yPercent: -100
    })
      .to(elements.text2, {
        yPercent: 100
      }, '-=2')
      .to(elements.preloaderContainer, {
        clipPath: clipPaths.handlerSize,
        ease: 'expo.inOut',
      }, '-=2')
      .fromTo(elements.preloaderImage,
        { scale: 0.3 },
        { scale: 0.7 },
        '-=2'
      )
      .fromTo(elements.preloaderContainer,
        { clipPath: clipPaths.handlerSize },
        {
          clipPath: clipPaths.end,
          ease: 'expo.inOut',
        }
      )
      .fromTo(elements.preloaderImage,
        { scale: 0.7 },
        {
          scale: 1,
          ease: 'expo.inOut',
        },
        '-=2'
      )
      // Menu reveal
      .from(elements.preloaderMenu, {
        yPercent: -100,
      }, '-=1.5')
      // Split text animation
      .add(() => {
        if (splitElements?.length > 0) {
          splitController.forceRotation(splitElements, CONFIG.splitText.rotation.hover)
          splitController.animate.in(splitElements, {
            y: 0,
            rotation: CONFIG.splitText.rotation.final,
            stagger: CONFIG.splitText.sequentialDelay,
            duration: 2.75,
            ease: 'expo.inOut',
            sequentialStagger: true,
          })
        }
        if (dom.body.dataset) {
          dom.body.dataset.nav = 'white'
        }
        evt.emit('scroll:header')
      }, '-=2.65')
      // Additional elements reveal
      .to(elements.reel, {
        yPercent: 0,
        stagger: CONFIG.splitText.stagger,
      }, '-=2')
      .to(elements.globalText, {
        yPercent: 0,
        stagger: CONFIG.splitText.stagger,
      }, '-=2')
      // Enable scrolling when animation completes
      .add(() => {
        dom.body.classList.remove('is-loading')
        ScrollTrigger.refresh()
      }, '-=1.5')
  }

  /**
   * Start the animation
   */
  const loaded = () => {

    if (splitIntro?.length > 0) {
      splitController.animate.in(splitIntro, {
        y: 0,
        rotation: CONFIG.splitText.rotation.final,
        stagger: CONFIG.splitText.stagger,
        startDelay: 0, // Can be adjusted as needed - 50ms is often enough
        sequentialStagger: true
      })
    }

    if (tl) {
      tl.play()
    }
  }

  /**
   * Clean up the timeline to prevent memory leaks
   */
  const cleanupTimeline = () => {
    if (tl) {
      tl.clear()
      tl.kill()
    }

    gsap.set(elements.preloaderContainer, {
      clearProps: 'all'
    })

    evt.emit('scroll:start')

    ScrollTrigger.refresh()
  }

  /**
   * Clean up function to prevent memory leaks
   */
  const unmount = () => {
    // Clean up all split elements
    if (splitController) {
      if (splitElements?.length > 0) {
        splitController.unmount(splitElements)
      }

      if (splitIntro?.length > 0) {
        splitController.unmount(splitIntro)
      }

      // Clear references
      splitController = null
      splitElements = null
      splitIntro = null
    }

    // Kill the timeline
    cleanupTimeline()
    tl = null
  }

  // Return public API
  return {
    homeAnimation,
    normalAnimation,
    loaded,
    initSplit,
    initSplitMarquee,
    unmount
  }
}