import Lenis from 'lenis'
import { evt, store } from '@/core'

const { device } = store

export default function createScrollManager(app) {
	// Instance variables
	let ctx = null;
	let lenis = null;
	let currentScroll = 0;
	let velocity = 0;
	let lastScrollTime = 0;
	let lastScrollY = 0;
	let scrollHeight = 0;
	let lastTime = 0;
	let animationFrameId = null;

	/**
	 * Animation frame tick handler
	 * @param {number} time - Current time from requestAnimationFrame
	 */
	const tick = (time) => {
		const now = performance.now();
		const deltaTime = now - lastTime;
		lastTime = now;

		if (!device.isMobile && lenis) {
			lenis.raf(time);
		}

		const ratioTime = deltaTime > 0 ? deltaTime / (1000/60) : 0;

		// Use the global currentScroll for both mobile and desktop
		evt.emit('tick', {
			y: currentScroll,
			time,
			ratio: ratioTime,
			diff: velocity
		});

		// Continue the animation loop
		animationFrameId = requestAnimationFrame(tick);
	};

	/**
	 * Lenis scroll handler
	 */
	const scroll = (e) => {
		// Update our global scroll position
		currentScroll = lenis.animatedScroll;
		velocity = lenis.velocity || 0;
		scrollHeight = lenis.dimensions?.scrollHeight || document.body.scrollHeight;

		evt.emit('scroll', {
			y: currentScroll,
			velocity: velocity,
			height: scrollHeight
		});

		checkScrollHeader(lenis.direction);
	};

	/**
	 * Mobile scroll handler
	 */
	const mobileScroll = () => {
		const now = performance.now();
		const newY = window.scrollY;
		const timeDelta = now - lastScrollTime;

		// Calculate velocity (pixels per millisecond * scaling factor)
		velocity = timeDelta > 0 ? (newY - lastScrollY) / timeDelta * 1000 : 0;

		// Update tracking variables
		lastScrollY = newY;
		lastScrollTime = now;

		// Update our global scroll position
		currentScroll = newY;
		scrollHeight = document.body.scrollHeight;

		evt.emit('scroll', {
			y: currentScroll,
			velocity: velocity,
			height: scrollHeight
		});

		const direction = velocity > 0 ? 1 : -1;
		checkScrollHeader(direction);
	};

	/**
	 * Handles section detection and header updates
	 * @param {number} direction - Scroll direction (-1 or 1)
	 */
	const checkScrollHeader = (direction = -1) => {
		// Implementation here
	}

	/**
	 * Set up scroll system based on device
	 */
	const setup = () => {
		window.scrollTo(0, 0);
		document.body.scrollTop = 0;
		document.documentElement.scrollTop = 0;

		// Reset values
		currentScroll = 0;
		lastScrollY = 0;
		lastScrollTime = performance.now();
		lastTime = performance.now();

		// Start the animation loop
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		animationFrameId = requestAnimationFrame(tick);

		if (!device.isMobile) {
			// Desktop setup with Lenis
			if (lenis) {
				lenis.destroy();
			}

			lenis = new Lenis({
				lerp: 0.125,
				touchMultiplier: 2,
			})

			lenis.on('scroll', scroll)
		} else {
			// Mobile setup with native scroll
			window.addEventListener('scroll', mobileScroll, { passive: true })
		}

		// Initialize anchor link scrolling
		initScrollToAnchorLenis()

		// Initial header check
		checkScrollHeader()
	}

	/**
	 * Initialize anchor link scrolling
	 */
	const initScrollToAnchorLenis = () => {
		evt.on('click', (e) => {
			const target = e.target.closest('[data-scroll-to]');
			if (target && target.dataset.scrollTo) {
				if (lenis) {
					lenis.scrollTo(target.dataset.scrollTo, {
						easing: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
						duration: 0.8,
					})
				} else {
					const element = document.querySelector(target.dataset.scrollTo);
					if (element) {
						element.scrollIntoView({ behavior: 'smooth' })
					}
				}
			}
		})
	}

	/**
	 * Reset scroll position to top
	 */
	const reset = () => {
		if (lenis) {
			lenis.scrollTo(0, { immediate: true })
		} else {
			window.scrollTo(0, 0)
		}
		currentScroll = 0
	}

	/**
	 * Mount scroll manager
	 */
	const mount = (context) => {
		if (context) ctx = context
		scrollHeight = document.body.scrollHeight
		setup()
	}

	/**
	 * Clean up resources
	 */
	const unmount = () => {
		if (lenis) {
			lenis.destroy();
			lenis = null;
		}

		if (device.isMobile) {
			window.removeEventListener('scroll', mobileScroll);
		}

		// Cancel the animation frame instead of removing from GSAP ticker
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	/**
	 * Scroll to top with animation
	 * @param {number} d - Animation duration in seconds
	 */
	const top = (d = 1) => {
		if (lenis) {
			lenis.scrollTo(0, {
				duration: d,
				easing: x => x === 0
					? 0
					: x === 1
						? 1
						: x < 0.5 ? Math.pow(2, 20 * x - 10) / 2
							: (2 - Math.pow(2, -20 * x + 10)) / 2
			});
		} else {
			// Implement smooth scroll to top without GSAP
			const start = window.scrollY;
			const startTime = performance.now();
			const duration = d * 1000; // Convert to milliseconds
			
			function scrollStep(timestamp) {
				const elapsed = timestamp - startTime;
				const progress = Math.min(elapsed / duration, 1);
				
				// Exponential ease in-out (similar to expo.inOut)
				const easeProgress = progress === 0
					? 0
					: progress === 1
						? 1
						: progress < 0.5 ? Math.pow(2, 20 * progress - 10) / 2
							: (2 - Math.pow(2, -20 * progress + 10)) / 2;
				
				window.scrollTo(0, start * (1 - easeProgress));
				
				if (progress < 1) {
					requestAnimationFrame(scrollStep);
				}
			}
			
			requestAnimationFrame(scrollStep);
		}
	}

	const scrollTo = (target, options = {}) => {
		if (lenis) {
			lenis.scrollTo(target, {
				easing: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
				duration: 1,
				offset: -100,
				...options
			})
		} else {
			// Handle native scrolling
			const element = typeof target === 'string' ? document.querySelector(target) : target;
			if (element instanceof Element) {
				const offset = options.offset || -100;
				const targetPosition = element.getBoundingClientRect().top + window.scrollY + offset;
				
				if (options.immediate) {
					window.scrollTo(0, targetPosition);
				} else {
					window.scrollTo({
						top: targetPosition,
						behavior: 'smooth'
					});
				}
			} else if (typeof target === 'number') {
				window.scrollTo({
					top: target,
					behavior: options.immediate ? 'auto' : 'smooth'
				});
			}
		}
	}

	/**
	 * Handle window resize
	 */
	const resize = () => {
		scrollHeight = document.body.scrollHeight;
		if (lenis) {
			lenis.resize();
		}
	}

	mount()

	evt.on('scroll:header', checkScrollHeader);
	evt.on('tick:start', mount);
	evt.on('tick:stop', unmount);
	evt.on('scroll:start', () => {
		if (lenis) {
			lenis.start()
		}
	})
	evt.on('scroll:stop', () => {
		if (lenis) {
			lenis.stop()
		}
	})
	evt.on('scroll:reset', reset)
	evt.on('scroll:resize', resize)
	evt.on('scroll:to', scrollTo)

	// Public API
	return {
		mount,
		unmount,
		top,
		scrollTo,
		resize,
		get current() {
			return currentScroll;
		}
	};
}