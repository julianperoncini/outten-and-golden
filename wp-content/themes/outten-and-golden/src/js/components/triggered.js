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

/*
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
*/

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
    }],
    [text, {
      transform: ['none', 'translateY(-25%)'],
      opacity: [1, 0],
    }, {
      at: '<'
    }],
    [screen, {
      clipPath: ['inset(15% 15% 15% 15% round 3.2rem)', 'inset(10% 10% 10% 10% round 3.2rem)'],
    }],
    [screen, {
      clipPath: ['inset(10% 10% 10% 10% round 3.2rem)', 'inset(0% 0% 0% 0% round 0rem)'],
    }],
  ];

  const timeline2 = [
    [content, {
      transform: ['translateY(-5%) scale(0.9)', 'translateY(0) scale(1)'],
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
}