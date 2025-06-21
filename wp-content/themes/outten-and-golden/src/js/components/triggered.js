import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { evt, utils, store } from '@/core'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const { device } = store
const { qs, qsa, rect, wrapLines } = utils

const bgSwitcher = (el) => {
  const section = qs('.js-bg-switcher-section', el);
  const bg = qs('.js-bg-switcher', section);
  const text = qsa('.js-bg-switcher-text', section);
  const bgColorElements = qsa('[data-bg-color]', section);
  const textColorElements = qsa('[data-text-color]', section);

  if(bg && text && bgColorElements.length && textColorElements.length) {
    // Color mapping
    const colorMap = {
      'yellow': '#FCDC9B',
      'green': '#6da479', 
      'grey': '#7a7871',
      'gray': '#7a7871',
      'white': '#fff',
      'black': '#1E383E',
    };

    // Extract and convert colors
    const bgColors = Array.from(bgColorElements).map(el => {
      const color = el.dataset.bgColor;
      return colorMap[color] || color; // fallback to original if not in map
    });
    
    const textColors = Array.from(textColorElements).map(el => {
      const color = el.dataset.textColor;
      return colorMap[color] || color;
    });

    // Set initial colors to first in array
    gsap.set(bg, { backgroundColor: bgColors[0] })
    gsap.set(text, { color: textColors[0] })

    bgColorElements.forEach((elem, index) => {
      ScrollTrigger.create({
        trigger: elem,
        start: "top center",
        end: "bottom center",
        onEnter: () => {
          gsap.to(bg, { backgroundColor: bgColors[index], duration: 1, ease: 'expo' })
          gsap.to(text, { color: textColors[index], duration: 1, ease: 'expo' })
        },
        onEnterBack: () => {
          gsap.to(bg, { backgroundColor: bgColors[index], duration: 1, ease: 'expo' })
          gsap.to(text, { color: textColors[index], duration: 1, ease: 'expo' })
        }
      })
    })
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

  const tl1 = gsap.timeline({
    defaults: {
      ease: 'none',
    },
    scrollTrigger: {
      trigger: tracker,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      onRefresh: function(self) {
        if (self.progress === 0) {
          gsap.set(screen, {
            top: 'calc(100% + 0rem)',
            clipPath: 'inset(0% 20% 20% 20% round 6.4rem)',
          });
          gsap.set(content, {
            transform: 'translateY(-5%) scale(0.9)'
          });
        }
      }
    }
  });
  
  tl1.fromTo(screen, {
    top: 'calc(100% + 0rem)',
    clipPath: 'inset(0% 20% 20% 20% round 6.4rem)',
  }, {
    top: 'calc(0% + 8rem)',
    clipPath: 'inset(15% 15% 15% 15% round 3.2rem)',
  })
  .fromTo(text, {
    transform: 'none',
    opacity: 1
  }, {
    transform: 'translateY(-25%)',
    opacity: 0,
  }, '<')
  .fromTo(screen, {
    clipPath: 'inset(15% 15% 15% 15% round 3.2rem)',
    top: 'calc(0% + 8rem)',
  }, {
    clipPath: 'inset(0% 0% 0% 0% round 0rem)',
    top: 'calc(0% + 8rem)',
  })
  .fromTo(content, {
    transform: 'translateY(-5%) scale(0.9)'
  }, {
    transform: 'translateY(0%) scale(1)',
  }, '<')
}

export default function initializeAnimations(el = document.body) {
  if(window.innerWidth < 1024) return
  
  // Store ScrollTrigger instances for cleanup
  const scrollTriggers = [];
  
  try {
    homeTriggered(el);
    bgSwitcher(el);
    
    // Get all created ScrollTriggers
    scrollTriggers.push(...ScrollTrigger.getAll());
  } catch (e) {
    console.error('Animation error:', e);
  }

  const unmount = () => {
    console.log('unmount');
    // Kill all ScrollTrigger instances
    scrollTriggers.forEach(st => st.kill());
    // Alternative: Kill all ScrollTriggers
    // ScrollTrigger.killAll();
  }

  return unmount;
}