import gsap from 'gsap'
import SplitText from '../lib/SplitText'
import { utils, evt } from '@/core'

const { wrapLines } = utils

export default function () {
    const elements = {}
    const observers = {}

    const normalizeElements = (targetElements) => {
        if (!targetElements) return [];

        if (typeof targetElements === 'string') {
            return Array.from(document.querySelectorAll(targetElements))
        } else if (targetElements instanceof Element) {
            return [targetElements]
        } else if (targetElements instanceof NodeList || Array.isArray(targetElements)) {
            return Array.from(targetElements)
        }
        return []
    }

    const filterSplitElements = (elems) => {
        if (!elems || !Array.isArray(elems)) return [];

        return elems.filter(el => {
            return el &&
                el.nodeType === 1 &&
                el.dataset &&
                el.dataset.splitId &&
                elements[el.dataset.splitId];
        });
    };

    const prepare = (targetElements, options = {}) => {
        const config = {
            y: '150%',            // Default initial Y position
            rotation: 10,         // Default initial rotation
            targetRotation: 0,
            stagger: 0.08,
            triggerOffset: 100,
            threshold: 0.2,
            autoObserve: false,
            skipVisibleOnLoad: false,
            setInitialState: true, // New option to control whether to set initial state
            ...options
        }

        const elems = normalizeElements(targetElements);
        if (!elems || elems.length === 0) {
            return controller;
        }

        // First clean up any existing splits
        unmount(elems);

        elems.forEach((element, index) => {
            // Safety checks
            if (!element || element.nodeType !== 1) return;
            if (!element.textContent || !element.textContent.trim()) return;
            if (!element.isConnected) return;

            // Generate unique ID for this element
            const randomId = Math.random().toString(36).substring(2, 15) + Date.now();
            const id = `split-${randomId}`;
            element.dataset.splitId = id;

            // Store original content in case we need to revert
            const originalContent = element.innerHTML;

            try {
                // Store original styles
                const computedStyle = window.getComputedStyle(element);
                const originalStyles = {
                    display: computedStyle.display,
                    position: computedStyle.position,
                    top: computedStyle.top,
                    left: computedStyle.left
                };

                // Force element to be visible and positioned for splitting
                gsap.set(element, {
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1,
                    position: 'static',
                    top: 'auto',
                    left: 'auto',
                    clearProps: 'transform'
                });

                // Force a reflow
                element.offsetHeight;

                // Verify that SplitText is available
                if (typeof SplitText !== 'function') {
                    console.error('SplitText is not a function, check imports');
                    gsap.set(element, originalStyles);
                    return;
                }

                // Create the split instance
                const splitInstance = new SplitText(element, {
                    type: 'lines',
                    linesClass: 'line'
                });

                // Check if split was successful
                if (!splitInstance || !splitInstance.lines || splitInstance.lines.length === 0) {
                    // Restore original styles and content if split fails
                    gsap.set(element, originalStyles);
                    element.innerHTML = originalContent;
                    console.warn('SplitText failed to create lines for element', element);
                    return;
                }

                // Wrap the lines in overflow containers
                wrapLines(splitInstance.lines, 'div', 'overflow-hidden');

                // Store all the data we need about this element
                elements[id] = {
                    element,
                    splitter: splitInstance,
                    tween: null,
                    inView: false,
                    outView: config.setInitialState ? true : false,
                    originalContent,
                    originalStyles,
                    config: { ...config }
                };

                // Restore original display state but keep the split
                gsap.set(element, originalStyles);

                // Set the initial state if requested (default is true)
                if (config.setInitialState) {
                    gsap.set(splitInstance.lines, {
                        y: config.y,
                        rotation: config.rotation,
                        force3D: true
                    });
                }

            } catch (error) {
                console.error('Error creating SplitText:', error, element);
                element.innerHTML = originalContent;
                if (element.dataset.splitId) {
                    delete element.dataset.splitId;
                }
            }
        });

        // Set up observers if needed
        if (config.autoObserve) {
            observe(elems, {
                threshold: config.threshold,
                triggerOffset: config.triggerOffset
            });
        }

        // Listen for resize events to handle text reflowing
        evt.on('resize', resize);

        return controller;
    }

    const observe = (targetElements, options = {}) => {
        const config = {
            threshold: 0.2,
            triggerOffset: 100,
            onEnter: (element) => {
                animate.in(element)
            },
            ...options
        }

        // Initialize tracking Set if not exists
        if (!window._animatedElements) {
            window._animatedElements = new Set();
        }

        // Get valid elements that have been split
        const elems = filterSplitElements(normalizeElements(targetElements));
        if (elems.length === 0) return controller;

        // Create a new observer
        const observerId = `observer-${Object.keys(observers).length}`;
        observers[observerId] = {
            observer: null,
            elements: []
        };

        // Filter to only handle elements not already animated
        const elemsToProcess = elems.filter(el => !window._animatedElements.has(el.dataset.splitId))
        if (elemsToProcess.length === 0) return controller

        const viewportHeight = window.innerHeight
        const elemsToObserve = []

        // Get element positions
        const elementPositions = elemsToProcess.map(el => {
            try {
                const rect = el.getBoundingClientRect();
                return { el, top: rect.top };
            } catch (e) {
                console.warn('Error getting element position:', e);
                return null;
            }
        }).filter(Boolean)

        // Process elements based on their position
        elementPositions.forEach(({ el, top }) => {
            const id = el.dataset.splitId;

            if (top < 0) {
                // Element is already scrolled past - make visible without animation
                animate.setVisible(el);
                window._animatedElements.add(id);
            } else if (top >= viewportHeight) {
                // Element is below viewport - observe it
                elemsToObserve.push(el);
            } else {
                // Element is in viewport - animate it
                if (id && elements[id]) {
                    elements[id].preventInterruption = true;
                }
                config.onEnter(el);
                window._animatedElements.add(id);
            }
        });

        // Set up IntersectionObserver for elements below viewport
        if (elemsToObserve.length > 0) {
            try {
                const intersectionObserver = new IntersectionObserver(
                    (entries) => {
                        const visibleEntries = entries.filter(entry =>
                            entry.isIntersecting &&
                            entry.target &&
                            entry.target.dataset &&
                            !window._animatedElements.has(entry.target.dataset.splitId)
                        )

                        if (visibleEntries.length === 0) return

                        visibleEntries.forEach(entry => {
                            const element = entry.target
                            const id = element.dataset.splitId

                            window._animatedElements.add(id)

                            if (id && elements[id]) {
                                elements[id].preventInterruption = true
                            }
                        })

                        visibleEntries.forEach(entry => {
                            config.onEnter(entry.target)
                        })

                        visibleEntries.forEach(entry => {
                            intersectionObserver.unobserve(entry.target)
                        })
                    },
                    {
                        threshold: config.threshold,
                        rootMargin: `0px 0px ${config.triggerOffset}px 0px`
                    }
                );

                elemsToObserve.forEach(el => {
                    intersectionObserver.observe(el)
                    observers[observerId].elements.push(el)
                })

                observers[observerId].observer = intersectionObserver
            } catch (e) {
                console.error('Error creating IntersectionObserver:', e)
            }
        }

        return controller
    }

    const animate = {
        out: (targetElements, options = {}) => {
            const config = {
                y: '150%',
                rotation: 15,
                ...options
            }

            const elems = filterSplitElements(normalizeElements(targetElements))
            if (elems.length === 0) return animate

            elems.forEach(element => {
                const id = element.dataset.splitId
                const data = elements[id]

                if (!data || !data.splitter || !data.splitter.lines) return

                if (data.tween) {
                    data.tween.kill()
                    data.tween = null
                }

                data.outView = true
                data.inView = false

                // Set the position with GSAP
                gsap.set(data.splitter.lines, {
                    y: config.y,
                    rotation: config.rotation,
                    force3D: true
                })
            })

            return animate
        },

        in: (targetElements, options = {}) => {
            const config = {
                duration: 1.2,
                stagger: 0.08,
                ease: 'power3.out',
                delay: 0,
                y: 0,
                rotation: 0,
                sequentialStagger: false,
                ensureOutState: true, // New option to guarantee proper starting state
                startDelay: 100,      // Default small delay to ensure proper sequence
                ...options
            };

            const elems = filterSplitElements(normalizeElements(targetElements));
            if (elems.length === 0) return animate;

            // Use setTimeout with a small delay to ensure proper sequencing
            // This is more reliable across browsers and contexts
            setTimeout(() => {
                // If sequential staggering is enabled, handle all elements together
                if (config.sequentialStagger) {
                    const allLines = [];

                    // Collect all lines from all elements
                    elems.forEach((element, elementIndex) => {
                        const id = element.dataset.splitId;
                        const data = elements[id];

                        if (!data || !data.splitter || !data.splitter.lines) return;

                        if (data.tween) {
                            data.tween.kill();
                            data.tween = null;
                        }

                        data.inView = true;

                        // Always ensure the starting state is correct before animating
                        if (config.ensureOutState) {
                            gsap.set(data.splitter.lines, {
                                y: data.config.y,
                                rotation: data.config.rotation,
                                force3D: true
                            });
                            data.outView = true;

                            // Force a browser reflow to ensure the above style is applied
                            // before we start the animation
                            data.splitter.lines[0]?.offsetHeight;
                        } else if (!data.outView) {
                            // If not forcing the out state but element hasn't been animated out,
                            // we still need to set the starting position
                            gsap.set(data.splitter.lines, {
                                y: data.config.y,
                                rotation: data.config.rotation,
                                force3D: true
                            });
                        }

                        // Collect all lines with their element data
                        data.splitter.lines.forEach(line => {
                            allLines.push({
                                line,
                                data
                            });
                        });
                    });

                    // Create a single timeline for all lines
                    if (allLines.length > 0) {
                        const timeline = gsap.timeline({
                            defaults: {
                                duration: config.duration,
                                ease: config.ease,
                                force3D: true
                            }
                        });

                        // Add each line to the timeline with sequential stagger
                        allLines.forEach((item, index) => {
                            timeline.to(
                                item.line,
                                {
                                    y: config.y,
                                    rotation: config.rotation,
                                    force3D: true,
                                    ease: config.ease,
                                    duration: config.duration
                                },
                                index * config.stagger + (config.delay || 0)
                            );
                        });

                        // Store timeline reference in element data
                        const processedData = new Set();
                        allLines.forEach(item => {
                            if (!processedData.has(item.data)) {
                                item.data.tween = timeline;
                                processedData.add(item.data);
                            }
                        });
                    }

                    return;
                }

                // Original behavior (standard staggering per element)
                const animations = [];

                elems.forEach(element => {
                    const id = element.dataset.splitId;
                    const data = elements[id];

                    if (!data || !data.splitter || !data.splitter.lines) return;

                    if (data.tween) {
                        data.tween.kill();
                        data.tween = null;
                    }

                    data.inView = true;

                    // Always ensure the starting state is correct before animating
                    if (config.ensureOutState) {
                        gsap.set(data.splitter.lines, {
                            y: data.config.y,
                            rotation: data.config.rotation,
                            force3D: true
                        });
                        data.outView = true;

                        // Force a browser reflow to ensure the above style is applied
                        data.splitter.lines[0]?.offsetHeight;
                    } else if (!data.outView) {
                        // If not forcing but element hasn't been animated out
                        gsap.set(data.splitter.lines, {
                            y: data.config.y,
                            rotation: data.config.rotation,
                            force3D: true
                        });
                    }

                    animations.push({
                        element,
                        data,
                        lines: data.splitter.lines,
                        finalProps: {
                            y: config.y,
                            rotation: config.rotation,
                            ease: config.ease,
                            duration: config.duration,
                            force3D: true
                        }
                    });
                });

                if (animations.length > 0) {
                    animations.forEach(anim => {
                        const tweenConfig = {
                            ...anim.finalProps,
                            duration: config.duration,
                            stagger: config.stagger,
                            ease: config.ease,
                            delay: config.delay || 0,
                            force3D: true,
                            onInterrupt: () => {
                                gsap.set(anim.lines, anim.finalProps);
                                anim.data.tweenCompleted = true;
                            },
                            onComplete: () => {
                                anim.data.tweenCompleted = true;
                                if (typeof config.onComplete === 'function') {
                                    config.onComplete(anim.element, anim.data);
                                }
                            }
                        };

                        anim.data.tween = gsap.to(anim.lines, tweenConfig);
                    });
                }
            }, config.startDelay);

            return animate;
        },

        reset: (targetElements, options = {}) => {
            const config = {
                y: 0,
                rotation: 0,
                ...options
            }

            const elems = normalizeElements(targetElements)

            elems.forEach(element => {
                const id = element?.dataset?.splitId
                if (!id || !elements[id]) return

                const data = elements[id]
                if (data?.splitter?.lines) {
                    gsap.set(data.splitter.lines, {
                        y: config.y,
                        rotation: config.rotation
                    })
                }
            })

            return animate
        },

        setVisible: (targetElements, options = {}) => {
            const config = {
                y: 0,
                rotation: 0,
                ...options
            }

            const elems = filterSplitElements(normalizeElements(targetElements))

            elems.forEach(element => {
                const id = element.dataset.splitId
                const data = elements[id]

                if (!data || !data.splitter || !data.splitter.lines) return

                if (data.tween) {
                    data.tween.kill()
                    data.tween = null
                }

                gsap.set(data.splitter.lines, {
                    y: config.y,
                    rotation: config.rotation,
                })

                data.inView = true
                data.tweenCompleted = true
            })

            return animate
        },
    }

    const forceRotation = (targetElements, rotationValue) => {
        const elems = filterSplitElements(normalizeElements(targetElements));

        elems.forEach(element => {
            const id = element.dataset.splitId;
            const data = elements[id];

            if (!data || !data.splitter || !data.splitter.lines) return;

            // Kill any existing animation
            if (data.tween) {
                data.tween.kill();
                data.tween = null;
            }

            // Force the rotation value directly with GSAP
            gsap.set(data.splitter.lines, {
                rotation: rotationValue,
                force3D: true
            });

            // Update the data config to match
            data.config.rotation = rotationValue;
        });

        return controller;
    }

    const cleanupElement = (data, id) => {
        if (!data) return

        if (data.preventInterruption && data.tween && !data.tweenCompleted) {
            if (data.tween) {
                data.tween.kill()
                data.tween = null
            }

            Object.keys(observers).forEach(observerId => {
                const observer = observers[observerId]
                if (observer?.elements && data.element) {
                    const index = observer.elements.findIndex(el => el === data.element)
                    if (index !== -1) {
                        if (observer.observer) {
                            try {
                                observer.observer.unobserve(data.element)
                            } catch (e) {
                                // Ignore unobserve errors
                            }
                        }
                        observer.elements.splice(index, 1)
                    }
                }
            })

            return; // Skip full cleanup to let animation complete
        }

        if (data.tween) {
            data.tween.kill()
            data.tween = null
        }

        Object.keys(observers).forEach(observerId => {
            const observer = observers[observerId]
            if (observer?.elements && data.element) {
                const index = observer.elements.findIndex(el => el === data.element)
                if (index !== -1) {
                    if (observer.observer) {
                        try {
                            observer.observer.unobserve(data.element)
                        } catch (e) {
                            // Ignore unobserve errors
                        }
                    }
                    observer.elements.splice(index, 1)
                }
            }
        })

        if (!data.element) return;

        // Revert split text
        if (data.splitter && typeof data.splitter.revert === 'function') {
            try {
                if (data.splitter.lines) {
                    gsap.killTweensOf(data.splitter.lines)
                }
                data.splitter.revert()
                data.splitter = null
            } catch (e) {
                if (data.element && data.originalContent) {
                    try {
                        data.element.innerHTML = data.originalContent
                    } catch (innerError) {
                        console.warn('Error restoring original content:', innerError)
                    }
                }
            }
        } else if (data.element && data.originalContent) {
            try {
                data.element.innerHTML = data.originalContent
            } catch (e) {
                console.warn('Error restoring original content:', e)
            }
        }

        if (data.element) {
            try {
                data.element.removeAttribute('data-split-id')
                gsap.set(data.element, { clearProps: "all" })
            } catch (e) {
                console.warn('Error cleaning up element:', e)
            }
        }
    }

    const unmount = (targetElements) => {
        if (!targetElements) {
            Object.keys(observers).forEach(id => {
                if (observers[id]?.observer) {
                    observers[id].observer.disconnect()
                }
                delete observers[id]
            })

            Object.keys(elements).forEach(id => {
                cleanupElement(elements[id], id)
                delete elements[id]
            })
            return controller
        }

        const elems = normalizeElements(targetElements)

        elems.forEach(element => {
            if (element?.dataset?.splitId) {
                const id = element.dataset.splitId
                if (elements[id]) {
                    cleanupElement(elements[id], id)
                    delete elements[id]
                }
            }
        })

        return controller
    }

    const resize = () => {
        if (resize.isProcessing) return
        resize.isProcessing = true

        requestAnimationFrame(() => {
            const elementsToProcess = []

            Object.keys(elements).forEach(id => {
                const data = elements[id]
                if (!data) return

                const element = data.element
                if (!element) return

                if (element.closest('.js-marquee')) return

                // Skip elements no longer in the DOM
                if (!element.isConnected) return

                elementsToProcess.push({
                    id,
                    data,
                    element,
                    wasInView: data.inView,
                    wasOutView: data.outView,
                    wasCompleted: data.tweenCompleted,
                    config: data.config,
                    originalContent: data.originalContent
                })
            })

            // Batch all writes - kill tweens first
            elementsToProcess.forEach(item => {
                if (item.data.tween) {
                    item.data.tween.kill()
                    item.data.tween = null
                }

                if (item.data.splitter && typeof item.data.splitter.revert === 'function') {
                    try {
                        if (item.data.splitter.lines) {
                            gsap.killTweensOf(item.data.splitter.lines)
                        }
                        item.data.splitter.revert()
                        item.data.splitter = null
                    } catch (e) {
                        console.warn('Could not revert SplitText for element:', e)
                        item.element.innerHTML = item.originalContent
                    }
                } else {
                    item.element.innerHTML = item.originalContent;
                }
            });

            // Batch all re-splitting operations
            const splitInstances = elementsToProcess.map(item => {
                try {
                    if (!item.element.textContent.trim()) return null;

                    const splitInstance = new SplitText(item.element, {
                        type: 'lines',
                        linesClass: 'line'
                    })

                    if (!splitInstance.lines || splitInstance.lines.length === 0) {
                        item.element.innerHTML = item.originalContent;
                        return null;
                    }

                    wrapLines(splitInstance.lines, 'div', 'overflow-hidden')

                    return {
                        ...item,
                        splitInstance
                    };
                } catch (error) {
                    console.warn('Error re-splitting element:', error)
                    item.element.innerHTML = item.originalContent
                    return null
                }
            }).filter(Boolean)

            splitInstances.forEach(item => {
                // Determine the state of the animation
                let props;

                if (item.wasInView) {
                    // If it was in view, keep it visible
                    props = {
                        y: 0,
                        rotation: 0,
                        force3D: true
                    }
                } else if (item.wasOutView) {
                    // If out() was called, restore that state
                    props = {
                        y: item.config.y,
                        rotation: item.config.rotation,
                        force3D: true
                    }
                } else {
                    // Default state - not visible
                    props = {
                        y: item.config.y,
                        rotation: item.config.rotation,
                        force3D: true
                    }
                }

                gsap.set(item.splitInstance.lines, props)

                item.data.splitter = item.splitInstance;
                item.data.inView = item.wasInView;
                item.data.outView = item.wasOutView;
                item.data.tweenCompleted = item.wasCompleted;
            });

            resize.isProcessing = false
        })
    }

    const controller = {
        prepare,
        resize,
        animate,
        unmount,
        forceRotation,
        isInViewport: (element, offset = 0) => {
            if (!element) return false
            const rect = element.getBoundingClientRect()
            return (
                rect.top < (window.innerHeight - offset) &&
                rect.bottom > +offset
            )
        },
        observe,
        elements,
        observers,
        resizeOff: () => evt.off('resize', resize),
        resizeOn: () => evt.on('resize', resize)
    }

    return controller
}