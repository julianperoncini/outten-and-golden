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
  const allSvgPaths = qsa('.js-svg-color path', section);

  if(bg && text && bgColorElements.length && textColorElements.length) {
    // Color mapping
    const colorMap = {
      'yellow': '#FCDC9B',
      'green': '#6da479', 
      'grey': '#7a7871',
      'gray': '#7a7871',
    };

    const textColorMap = {
      'black': '#1E383E',
      'white': '#fff',
    };

    // Extract and convert colors
    const bgColors = Array.from(bgColorElements).map(el => {
      const color = el.dataset.bgColor;
      return colorMap[color] || color;
    });
    
    const textColors = Array.from(textColorElements).map(el => {
      const color = el.dataset.textColor;
      return textColorMap[color] || color;
    });

    // Set initial colors
    gsap.set(bg, { backgroundColor: bgColors[0] })
    gsap.set(text, { color: textColors[0] })
    gsap.set(allSvgPaths, { stroke: textColors[0] })

    allSvgPaths.forEach(path => {
      const pathLength = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength
      })

      const currentFill = path.getAttribute('fill');
      if (currentFill === '#7A7871') {
        gsap.set(path, { fill: bgColors[0] });
      }
      if (currentFill === '#FCDC9B') {
        gsap.set(path, { fill: textColors[0], opacity: 0 });
      }  
    })

    bgColorElements.forEach((elem, index) => {
      const currentSvgPaths = qsa('.js-svg-color path', elem)
      
      ScrollTrigger.create({
        trigger: elem,
        start: "top center",
        end: "bottom center",
        onEnter: () => {
          gsap.to(bg, { backgroundColor: bgColors[index] });
          gsap.to(text, { color: textColors[index] });
          
          // Change stroke color on ALL SVGs at once
          gsap.to(allSvgPaths, { stroke: textColors[index] });
          
          // Reset current paths to hidden state first, then animate
          currentSvgPaths.forEach((path, pathIndex) => {
            const pathLength = path.getTotalLength();
            
            // Reset to hidden state
            gsap.set(path, {
              strokeDasharray: pathLength,
              strokeDashoffset: pathLength,
              //opacity: 0
            });
            
            // Then animate to visible
            gsap.to(path, {
              strokeDashoffset: 0,
              opacity: 1,
              duration: 2,
              ease: 'expo',
              delay: pathIndex * 0.1,
            });
          });

          allSvgPaths.forEach((path, pathIndex) => {
            const currentFill = path.getAttribute('fill');

            if (currentFill === '#7A7871') {
              gsap.to(path, { fill: bgColors[index] });
            }

            if (currentFill === '#FCDC9B') {
              if (textColors[index] == '#292929') {
                gsap.to(path, { fill: '#1E383E' });
              } else if (textColors[index] == '#fff') {
                gsap.to(path, { fill: '#fcdc9b' });
              }
            } 
          });
        },
        onEnterBack: () => {
          gsap.to(bg, { backgroundColor: bgColors[index] });
          gsap.to(text, { color: textColors[index] });
          
          // Change stroke color on ALL SVGs at once
          gsap.to(allSvgPaths, { stroke: textColors[index] });
          
          // Reset current paths to hidden state first, then animate
          currentSvgPaths.forEach((path, pathIndex) => {
            const pathLength = path.getTotalLength();
            
            // Reset to hidden state
            gsap.set(path, {
              strokeDasharray: pathLength,
              strokeDashoffset: pathLength,
              //opacity: 0
            });
            
            // Then animate to visible
            gsap.to(path, {
              strokeDashoffset: 0,
              opacity: 1,
              duration: 2,
              ease: 'expo',
              delay: pathIndex * 0.1,
            });
          });
        
          allSvgPaths.forEach((path, pathIndex) => {
            const currentFill = path.getAttribute('fill');
        
            if (currentFill === '#7A7871') {
              gsap.to(path, { fill: bgColors[index] });
            }
        
            if (currentFill === '#FCDC9B') {
              if (textColors[index] == '#1E383E') {
                gsap.to(path, { fill: '#292929' });
              } else if (textColors[index] == '#fcdc9b') {
                gsap.to(path, { fill: '#fff' });
              }
            } 
          });
        }
      });
    });
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