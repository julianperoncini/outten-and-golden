import { motion, animate, transform, scroll } from 'motion'
import { utils, store } from '@/core'

const { device } = store
const { qs, qsa, rect, wrapLines } = utils

const homeTriggered = (el) => {
  const tracker = qs('.js-st-hero');
  const elem = qs('.js-t-hero', el);
  const content = qs('.js-t-hero-content', el);
  const text = qs('.js-t-text', el);

  if(tracker) {
    const timeline = [
      [elem, {
        clipPath: 'inset(0 calc((100vw - 85rem)/2) 0 calc((100vw - 85rem)/2) round 6.4rem)',
      }],
      [elem, {
        clipPath: 'inset(14% 14% 14% 14% round 3.2rem)',
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
        clipPath: ['inset(14% 14% 14% 14% round 3.2rem)', 'inset(0% 0% 0% 0% round 0rem)'],
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

export default function initializeAnimations(el = document.body) {
  if (!device.isMobile) {
    homeTriggered(el)
  }
}