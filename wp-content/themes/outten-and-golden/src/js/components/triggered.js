import { animate, scroll } from 'motion'
import { evt, utils, store } from '@/core'

const { device } = store
const { qs, qsa, rect, wrapLines } = utils

const bgSwitcher = (el) => {
  const bg = qs('.js-bg-switcher', el);
  const text = qsa('.js-bg-switcher-text', el);

  if(bg && text) {
    const timeline = [
      [bg, {
        backgroundColor: ['#7a7871', '#FCDC9B', '#6da479',  '#7a7871'],
      }],
      [text, {
        color: ['#fff', '#292929', '#fff',  '#fff'],
      }, {
        at: '<'
      }],
    ]

    scroll(animate(timeline), { target: bg, offset: ['start start', 'end end'] })
  }
}

const homeTriggered = (el) => {
  const tracker = qs('.js-tracker');
  const screen = qs('.js-t-screen', el);
  const content = qs('.js-t-hero-content', el);
  const text = qs('.js-t-text', el);
  if (!tracker || !screen || !content) {
    return
  }

  const timeline1 = [
    [screen, {
      top: ['calc(100% + 0rem)', 'calc(0% + 8rem)'],
      clipPath: ['inset(0% 20% 20% 20% round 6.4rem)', 'inset(15% 15% 15% 15% round 3.2rem)'],
    }, {
      duration: 0.5,
      ease: 'linear'
    }],
    [text, {
      transform: ['none', 'translateY(-25%)'],
      opacity: [1, 0],
    }, {
      duration: 0.5,
      ease: 'linear',
      at: '<'
    }],
    [screen, {
      clipPath: ['inset(15% 15% 15% 15% round 3.2rem)', 'inset(0% 0% 0% 0% round 0rem)'],
    }, {
      duration: 0.5,
      ease: 'linear'
    }],
  ];

  const timeline2 = [
    [content, {
      transform: ['translateY(-5%) scale(0.9)', 'translateY(0) scale(1)'],
    }, {
      duration: 0.5,
      ease: 'linear'
    }],
  ];
  
  try {
    scroll(animate(timeline1), {
      target: tracker,
      offset: ['start start', 'end end']
    });

    scroll(animate(timeline2), {
      target: tracker,
      offset: ['start start', 'end end']
    });
  } catch (e) {
    console.error('Animation error:', e);
  }
}

export default function initializeAnimations(el = document.body) {
  homeTriggered(el)
  bgSwitcher(el)

  const unmount = () => {
    console.log('unmount')
    //homeTriggered(el)
    //bgSwitcher(el)
  }

  return unmount
}