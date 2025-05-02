import gsap from 'gsap'
import lerp from '@14islands/lerp'

import { evt, utils, store } from '../core'

const { qs, qsa, rect } = utils
const { dom, features, bounds } = store

export default function Carousel(element, options = {}) {
  const config = {
    toggle: options.toggle || false
  };

  const state = {
    speed: 3.5,
    ox: 0,
    cx: 0,
    cy: 0,
    dx: 0,
    t: 0,
    tc: 0,
    max: 0,
    margin: 0,
    idx: 0,
    active: false,
    resizing: false,
    run: false,
    cache: null,
    events: {}
  };

  // Elements
  const elements = {
    el: element.section,
    pb: null
  };

  console.log(elements.el)

  let snaps = [];
  let st = null;
  let crect = null;

  const resize = () => {
    state.resizing = true;
    
    const slide = qsa(".js-slide", elements.el);
    if (!slide.length) return;
    
    const slides = elements.el;
    const srect = rect(slides);
    crect = rect(elements.el);
    const total = slide.length - 1;
    const offset = srect.left;
    
    const isSmall = bounds.ww < 768;
    state.speed = isSmall ? 3.5 : 2;
    
    snaps = [];
    
    if (state.cache) {
      state.cache.forEach((c, i) => {
        c.el.style.transform = `translate3d(0, 0, 0)`;
        const { left, right, width } = rect(c.el);
        c.start = left - window.innerWidth;
        c.end = right;
        c.left = left;
        c.width = width;
        c.out = true;
        snaps.push(left - srect.left);

        if (i === total) calcMax(c.el, c.end, offset);
      });
    } else {
      state.cache = slide.map((elem, i) => {
        elem.style.transform = `translate3d(0, 0, 0)`;
        const { left, right, width } = rect(elem);
        const start = left - window.innerWidth;
        const end = right;
        snaps.push(left - srect.left);

        if (i === total) calcMax(elem, end, offset);

        return { el: elem, start, end, left, width, out: true };
      });
    }

    transforms();
    setTimeout(() => (state.resizing = false), 0);
  };

  const calcMax = (elem, right, offset) => {
    state.margin = parseInt(
      getComputedStyle(elem).getPropertyValue("margin-right")
    );
    state.max = Math.max(0, right + state.margin - offset);

    console.log("state.margin:", state.margin);
  };

  const pos = (e) => {
    const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    return { x, y };
  };

  const down = (e) => {
    const { x, y } = pos(e);
    state.active = true;
    state.cx = x;
    state.cy = y;
    state.dx = x;
    state.ox = state.t + x * state.speed;
  };

  const move = (e) => {
    if (!state.active) return;
    const { x, y } = pos(e);
    if (Math.abs(x - state.cx) > Math.abs(y - state.cy) && e.cancelable) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newT = state.ox - x * state.speed;
    state.t = gsap.utils.clamp(0, state.max, newT);
  };

  const up = (e) => {
    if (!state.active) return;
    state.active = false;
    const { x } = pos(e);

    if (Math.abs(x - state.dx) < 10) {
      const target = e.target.closest("[data-url], [data-modal]");
      if (!target || !element.contains(target)) return;

      if (target.dataset.url) {
        window.location.href = target.dataset.url;
        const event = new CustomEvent('slide:click');
        window.dispatchEvent(event);
      } else if (target.dataset.modal) {
        document.body.classList.add('modal-open');
      }
    } else {
      snap();
    }
  };

  const snap = () => {
    const clampedT = gsap.utils.clamp(0, state.max, state.t);
    const snap = gsap.utils.snap(snaps, clampedT);
    const diff = snap - clampedT;
    state.t = gsap.utils.clamp(0, state.max, clampedT + diff);

    state.idx = snaps.indexOf(snap);

    console.log("state.snap:", snap);
  };

  const tick = (time) => {
    if (config.toggle && !state.run) return;

    const ratio = 1;

    state.tc = lerp(state.tc, state.t, 0.1 * ratio);
    state.tc = Math.round(state.tc * 100) / 100;
    
    if (!state.resizing) {
      transforms();
    }
    
    requestAnimationFrame(tick);
  };

  const transforms = () => {
    if (!state.cache) return;
    
    state.cache.forEach((c, i) => {
      const { start, end, left, width, el } = c;
      const t = gsap.utils.clamp(0, state.max, state.tc);
      const v = visible(start, end, left, width, t);

      if (v.visible || state.resizing) {
        c.out && (c.out = false);
        transform(el, t);
      } else if (!c.out) {
        c.out = true;
        transform(el, t);
      }
    });
  };

  const transform = (el, transform) => {
    el.style.transform = `translate3d(${-transform}px, 0, 0)`;
  };

  const visible = (start, end, t) => {
    const visible = t > start && t < end;

    return {
      visible,
    };
  };

  const setEvents = () => {
    const isMobile = 'ontouchstart' in window;
    console.log("isMobile:", isMobile);

    state.events = {
      move: isMobile ? "touchmove" : "mousemove",
      down: isMobile ? "touchstart" : "mousedown",
      up: isMobile ? "touchend" : "mouseup",
    };
  };

  const next = () => {
    if (!state.cache) return;
    if (state.idx >= state.cache.length - 1) return;
    const c = state.cache[state.idx];
    if (!c) return;
    const left = c.width;
    const newT = state.t + left + state.margin;
    state.t = gsap.utils.clamp(0, state.max, newT);
    state.idx += 1;
  };

  const previous = () => {
    if (!state.cache) return;
    if (state.idx <= 0) return;
    const c = state.cache[state.idx];
    if (!c) return;
    const left = c.width;
    const newT = state.t - (left + state.margin);
    state.t = gsap.utils.clamp(0, state.max, newT);
    state.idx -= 1;
  };

  const bindEvents = () => {
    setEvents();

    elements.el.addEventListener(state.events.down, down);
    elements.el.addEventListener(state.events.move, move);
    window.addEventListener(state.events.up, up);
    
    window.addEventListener('resize', resize);
    
    requestAnimationFrame(tick);
  };

  const unbindEvents = () => {
    element.removeEventListener(state.events.down, down);
    element.removeEventListener(state.events.move, move);
    window.removeEventListener(state.events.up, up);
    
    window.removeEventListener('resize', resize);
  };

  const init = async () => {
    if (config.toggle) {
      st = ScrollTrigger.create({
        trigger: element,
        onToggle: ({ isActive }) => (state.run = isActive),
      });
    }
    bindEvents();
    resize();
  };

  // Cleanup (equivalent to onBeforeUnmount in Vue)
  const destroy = () => {
    unbindEvents();
    if (st) {
      st.kill();
    }
  };

  init()

  return {
    init,
    destroy,
    next,
    previous,
    get index() {
      return state.idx;
    },
    get cache() {
      return state.cache;
    }
  };
}