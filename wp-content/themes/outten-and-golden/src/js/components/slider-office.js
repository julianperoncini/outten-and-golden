import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { evt, utils, store } from '@/core'

gsap.registerPlugin(ScrollTrigger)

const { qs, qsa } = utils
const { device } = store
const isMobile = device.isMobile

export default function sliderOffice(config) {
    const state = {
        currentIdx: 0,
        lastIdx: 0,
        isVisible: false,
        totalSlides: 0,
        autoplayInterval: null,
        autoplayDuration: 5000,
        progressTimelines: [],
        progressDuration: 5,
        isTransitioning: false
    }

    const elements = {
        section: config.section || config,
        container: qs('.js-slider-office-container', config.section || config),
        items: qsa('.js-slide-office', config.section || config),
        progress: qs('.js-slider-office-progress', config.section || config),
        progressWrapBars: qsa('.js-sop-bar-wrap', config.section || config),
        progressBars: qsa('.js-slider-office-progress span', config.section || config)
    }

    const initProgressTimelines = () => {
        const progressFills = elements.progressBars.filter(bar => {
            return bar.querySelector('span.bg-green');
        });

        state.progressTimelines = progressFills.map((bar) => {
            const progressFill = qs('span', bar);
            if (!progressFill) {
                return gsap.timeline({ paused: true });
            }
            
            const tl = gsap.timeline({ paused: true });
            
            gsap.set(progressFill, { scaleY: 0 });
            
            tl.to(progressFill, {
                scaleY: 1,
                duration: state.progressDuration,
                ease: 'none'
            });
            
            return tl;
        });
    }

    const updateProgress = () => {
        elements.progressWrapBars.forEach((bar, index) => {
            bar.classList.remove('is-active');
            
            if (index === state.currentIdx) {
                bar.classList.add('is-active');
            }
        });
    
        state.progressTimelines.forEach((timeline, index) => {
            if (index === state.currentIdx) {
                timeline.restart();
            } else {
                timeline.pause(0);
            }
        });
    }

    const animateSlideTransition = (prevIndex, newIndex) => {
        state.isTransitioning = true;
        
        const prevSlide = elements.items[prevIndex];
        const newSlide = elements.items[newIndex];
        
        gsap.set(newSlide, {
            autoAlpha: 0,
            x: 100,
        });
        
        const tl = gsap.timeline({
            onComplete: () => {
                state.isTransitioning = false;
            }
        });
        
        tl.to(prevSlide, {
            autoAlpha: 0,
            x: -100,
            duration: 0.5,
            ease: 'power1.out'
        });
        
        tl.to(newSlide, {
            autoAlpha: 1,
            x: 0,
            duration: 0.75,
            ease: 'circ.out'
        }, '0.3');
        
        tl.add(() => {
            gsap.set(prevSlide, { autoAlpha: 0, x: 0 });
        });
    }

    const setSlide = (index) => {
        if (state.isTransitioning) return;
        
        const prevIdx = state.currentIdx;
        
        state.lastIdx = state.currentIdx;
        state.currentIdx = index;
        
        if (state.currentIdx < 0) state.currentIdx = state.totalSlides - 1;
        if (state.currentIdx >= state.totalSlides) state.currentIdx = 0;
        
        if (prevIdx === state.currentIdx) return;
        
        animateSlideTransition(prevIdx, state.currentIdx);
        
        updateProgress();
        
        resetAutoplay();
    }

    const tick = () => {
        if (!state.isVisible) return;
    }

    const goToPrevious = () => {
        setSlide(state.currentIdx - 1);
    }

    const goToNext = () => {
        setSlide(state.currentIdx + 1);
    }

    const goToSlide = (index) => {
        setSlide(index);
    }

    const startAutoplay = () => {
        clearInterval(state.autoplayInterval);
        
        if (state.progressTimelines.length > 0 && state.currentIdx < state.progressTimelines.length) {
            state.progressTimelines[state.currentIdx].restart();
        }
        
        state.autoplayInterval = setInterval(() => {
            goToNext();
        }, state.autoplayDuration);
    }

    const resetAutoplay = () => {
        if (state.autoplayInterval) {
            clearInterval(state.autoplayInterval);
            startAutoplay();
        }
    }

    const pauseAutoplay = () => {
        if (state.progressTimelines.length > 0 && state.currentIdx < state.progressTimelines.length) {
            state.progressTimelines[state.currentIdx].pause();
        }
        
        clearInterval(state.autoplayInterval);
        state.autoplayInterval = null;
    }

    const setupProgressClicks = () => {
        const clickableProgressBars = elements.progressBars.filter(bar => 
            bar.classList.contains('cursor-pointer')
        );
        
        if (!clickableProgressBars.length) {
            return;
        }
        
        clickableProgressBars.forEach((bar, index) => {
            evt.on('click', bar, () => {
                goToSlide(index);
            });
        });
    }

    const setupTouchEvents = () => {
        let startX, endX;
        const threshold = 50;
        
        evt.on('touchstart', elements.container, (e) => {
            startX = e.touches[0].clientX;
        });
        
        evt.on('touchend', elements.container, (e) => {
            if (!startX) return;
            
            endX = e.changedTouches[0].clientX;
            const diffX = endX - startX;
            
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    goToPrevious();
                } else {
                    goToNext();
                }
            }
            
            startX = null;
            endX = null;
        });
    }

    const cache = () => {
        state.totalSlides = elements.items.length;
        
        elements.items.forEach((slide, idx) => {
            if (idx === state.currentIdx) {
                gsap.set(slide, { autoAlpha: 1, x: 0 });
            } else {
                gsap.set(slide, { autoAlpha: 0, x: 0 });
            }
        });
    }

    const setupVisibility = () => {
        ScrollTrigger.create({
            trigger: elements.section,
            start: 'top 90%',
            end: 'bottom 10%',
            onEnter: () => {
                state.isVisible = true;
                startAutoplay();
            },
            onLeave: () => {
                state.isVisible = false;
                pauseAutoplay();
            },
            onEnterBack: () => {
                state.isVisible = true;
                startAutoplay();
            },
            onLeaveBack: () => {
                state.isVisible = false;
                pauseAutoplay();
            }
        });
    }



    const mount = () => {
        if (!elements.items.length) {
            return;
        }
        
        state.progressDuration = state.autoplayDuration / 1000;
        
        cache();
        initProgressTimelines();
        setupProgressClicks();
        setupTouchEvents();
        setupVisibility();
        
        evt.on('tick', tick);
        evt.on('resize', cache);
        
        updateProgress();
        
        if (elements.section.getBoundingClientRect().top < window.innerHeight) {
            state.isVisible = true;
            startAutoplay();
        }
    }

    const unmount = () => {
        pauseAutoplay();
        
        state.progressTimelines.forEach(timeline => {
            if (timeline && timeline.kill) {
                timeline.kill();
            }
        });
        
        evt.off('resize', cache);
        evt.off('tick', tick);
        evt.off('touchstart', elements.container);
        evt.off('touchend', elements.container);
        
        elements.progressBars.forEach((bar) => {
            if (bar.classList.contains('cursor-pointer')) {
                evt.off('click', bar);
            }
        });
    }

    mount();

    return {
        mount,
        unmount,
        goToNext,
        goToPrevious,
        goToSlide,
        getCurrentIndex: () => state.currentIdx,
        pauseAutoplay,
        startAutoplay
    }
}