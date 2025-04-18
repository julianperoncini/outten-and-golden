import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { utils, store } from '@/core'

const { device } = store
const { qs, qsa, rect, wrapLines } = utils

const animateCards = () => {
  const cards = qsa('.js-fade-in')
  if (!cards.length) return

  ScrollTrigger.batch(cards, {
    once: true,
    onEnter: batch => gsap.fromTo(batch, {
      autoAlpha: 0,
      yPercent: 100
    }, {
      autoAlpha: 1,
      yPercent: 0,
      ease: 'power3',
      duration: 1.2,
      stagger: 0.1
    }),
  });
}

const animateFooter = () => {
  const main = qs('.app');
  const element = qs('.js-sfoot');
  const inner = qs('.js-sfoot-inner', element);
  const test = qs('.test', element);

  gsap.set(inner, {
    yPercent: -30
  });

  return ScrollTrigger.create({
    trigger: main,
    start: "bottom bottom",
    end: () => `+=${test.offsetHeight * 2}`,
    animation: gsap.to(inner, {
      yPercent: 0,
      ease: 'none'
    }),
    scrub: true,
    invalidateOnRefresh: true,
  });
}

const animateHeroImage = () => {
  const heroImage = qs('.js-hero-image');
  if (!heroImage) return;

  gsap.fromTo(heroImage, {
    yPercent: 0,
  }, {
    yPercent: 40,
    ease: 'none',
    scrollTrigger: {
      trigger: heroImage,
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  }
  );
};

export default function initializeAnimations(el) {

  if (!device.isMobile) {
    animateCards()
    animateFooter(el);
    animateHeroImage();
  }
}

ScrollTrigger.config({ ignoreMobileResize: true })