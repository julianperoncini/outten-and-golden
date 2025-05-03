import { motion, animate, transform, scroll } from 'motion'
import { evt, utils, store } from '@/core'

const { device } = store
const { qs, qsa, rect, wrapLines } = utils

// Desktop animation
const homeTriggeredDesktop = (el) => {
  const tracker = qs('.js-st-hero');
  const elem = qs('.js-t-hero', el);
  const content = qs('.js-t-hero-content', el);
  const text = qs('.js-t-text', el);

  console.log('desktop triggered')

  if(tracker) {
    const timeline = [
      [elem, {
        clipPath: 'inset(0 20% 0 20% round 6.4em)',
      }],
      [elem, {
        clipPath: 'inset(15% 15% 15% 15% round 3.2rem)',
        transform: ['translateY(75%)', 'none'],
      }],
      [content, {
        scale: [0.45, 0.65],
        transform: ['translateY(-2rem)', 'none'],
      }, {
        at: '<'
      }],
      [text, {
        transform: ['none', 'translateY(-25%)'],
        opacity: [1, 0],
      }, {
        at: '<'
      }],
      [elem, {
        clipPath: ['inset(15% 15% 15% 15% round 3.2rem)', 'inset(0% 0% 0% 0% round 0rem)'],
      }],
      [content, {
        scale: [0.65, 1],
      }, {
        at: '<'
      }],
      'test',
      [elem, {
        transform: ['translateY(0rem)', 'translateY(-20rem)'],
      }, {
        at: 'test'
      }],
    ]

    scroll(animate(timeline), { 
      target: tracker,
      offset: ['start end', 'end start'],
    })
  }
}

// Mobile animation
const homeTriggeredMobile = (el) => {
  console.log('mobile triggered')
  const tracker = qs('.js-st-hero');
  const elem = qs('.js-t-hero', el);
  const content = qs('.js-t-hero-content', el);
  const text = qs('.js-t-text', el);

  const timeline = [
    [elem, {
      transform: ['translateY(0%)', 'none'],
      clipPath: ['inset(10rem 10rem 10rem 10rem round 3.2rem)', 'inset(0% 0% 0% 0% round 0rem)'],
    }],
  ]

  scroll(animate(timeline), { 
    target: tracker,
    offset: ['start end', 'end end'],
  })
}


const checkBreakpoint = () => {
  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}

const homeTriggered = (el) => {
  const breakpoint = checkBreakpoint()

  if (breakpoint === 'mobile') {
    homeTriggeredMobile(el);
    return
  } else {
    homeTriggeredDesktop(el);
    return
  }
}

export default function initializeAnimations(el = document.body) {
  homeTriggered(el)

  evt.on('resize', () => {
    homeTriggered(el);
  })
}