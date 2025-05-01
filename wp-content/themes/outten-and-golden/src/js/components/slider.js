import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import lerp from '@14islands/lerp'
import { evt, utils, store } from '@/core'
import { DragHandler } from '@/core/events/dragHandler'

gsap.registerPlugin(ScrollTrigger)

const { qs, qsa, rect, CS } = utils
const { device } = store
const isMobile = device.isMobile

export default function createSlider(config) {
    const state = {
        isDragging: false,
        isDragged: false,
        down: false,
        scrollSensitivity: isMobile ? 3 : 2,
        snapIndex: 0,
        isVisible: false,
        position: {
            current: 0,
            target: 0,
            previous: 0,
            start: 0
        },
        bounds: [],
        itemPositions: [],
        viewPositions: [],
        diff: 0,
        ratio: 1,
        still: true,
        minScroll: 0,
        maxScroll: 0
    }

    const elements = {
        section: config.section,
        container: qs('.slider-container', config.section),
        items: qsa('.slider-item', config.section),
        progress: qs('.slider-bar', config.section),
        prevButton: qs('.slider-prev', config.section),
        nextButton: qs('.slider-next', config.section),
        cursor: qs('.slider-cursor', config.section)
    }

    const snapConfig = config.snap || { move: true }
    let dragInstance

    gsap.set(elements.progress, { scaleX: 0.2 })
    gsap.set(elements.cursor, { xPercent: -50, yPercent: -50 })

    const initQuickSetters = () => {
        state.progressX = gsap.quickSetter(elements.progress, 'scaleX')

        // Using GSAP's quickTo for smoother animations
        state.cursorX = gsap.quickTo(elements.cursor, 'x', { duration: 0.5, ease: 'expo' })
        state.cursorY = gsap.quickTo(elements.cursor, 'y', { duration: 0.5, ease: 'expo' })
    }

    const updateBounds = () => {
        const scrollY = window.scrollY
        const areaBounds = rect(elements.container)

        state.bounds = [{
            top: areaBounds.top + scrollY,
            bottom: areaBounds.top + areaBounds.height + scrollY,
            height: areaBounds.height
        }]
    }

    const calculateItemPositions = (scrollY) => {
        const windowWidth = window.innerWidth
        const areaBounds = rect(elements.container)
        const areaTop = areaBounds.top + scrollY

        let currentOffset = 0
        state.itemPositions = []
        state.viewPositions = []

        elements.items.forEach((item, i) => {
            const itemBounds = rect(item)
            const marginLeft = CS(item, "marginLeft")
            const itemWidth = itemBounds.width

            currentOffset += marginLeft

            // Store item position data
            state.itemPositions[i] = {
                x: currentOffset,
                y: areaTop,
                w: itemWidth,
                h: itemBounds.height,
                marginX: marginLeft
            }

            // Store view position data
            state.viewPositions[i] = {
                start: currentOffset - windowWidth,
                end: currentOffset + itemWidth,
                out: false
            }

            currentOffset += itemWidth
        })

        return currentOffset
    }

    const calculateSnapPositions = (windowWidth, lastIndex) => {
        elements.items.forEach(item => {
            gsap.set(item, { x: 0 });
        })

        if (elements.items.length === 0) {
            snapConfig.positions = [0];
            state.maxScroll = 0;
            return;
        }

        const container = elements.container
        const containerBounds = rect(container)
        const containerWidth = containerBounds.width

        snapConfig.positions = [0]

        const firstItem = elements.items[0];
        const firstItemBounds = rect(firstItem);
        const offsetLeft = firstItemBounds.left - containerBounds.left;

        for (let i = 1; i < elements.items.length; i++) {
            const item = elements.items[i];
            const itemBounds = rect(item);
            const snapPosition = itemBounds.left - containerBounds.left - offsetLeft;
            snapConfig.positions.push(snapPosition);
        }

        const lastItem = elements.items[elements.items.length - 1];
        const lastItemBounds = rect(lastItem);
        const lastItemMarginRight = parseFloat(CS(lastItem, "marginRight")) || 0;

        const contentWidth = lastItemBounds.right - firstItemBounds.left + lastItemMarginRight;
        const rightAlignPosition = Math.max(0, contentWidth - containerWidth);

        snapConfig.positions[snapConfig.positions.length - 1] = rightAlignPosition

        state.maxScroll = rightAlignPosition

        updateAllSlides()

        state.position.target = snapConfig.positions[Math.min(state.snapIndex, snapConfig.positions.length - 1)]
    }

    const tick = ({ ratio }) => {
        if (!state.isVisible) return

        state.diff = state.position.target - state.position.current;
        state.still = Math.abs(state.diff) < 0.05
        state.ratio = ratio

        if (!state.still) {
            const ease = isMobile ? 0.15 * state.ratio : 0.135 * state.ratio
            state.position.current = lerp(state.position.current, state.position.target, ease)

            updateVisibleSlides()

            const progress = gsap.utils.normalize(
                state.minScroll,
                state.maxScroll,
                state.position.current
            )

            state.progressX(0.2 + (progress * 0.8))
        }
    }

    const updateAllSlides = () => {
        const currentX = gsap.utils.clamp(0, Infinity, state.position.current)

        state.viewPositions.forEach((view, i) => {
            view.out = false
            elements.items[i].style.transform = `translate3d(${-currentX}px, 0, 0)`
        })

        updateVisibleSlides()
    }

    const updateVisibleSlides = () => {
        const threshold = 150;
        const currentX = gsap.utils.clamp(0, Infinity, state.position.current)
        const targetX = state.position.target
        const isTransitioning = Math.abs(targetX - currentX) > 10

        state.viewPositions.forEach((view, i) => {
            const currentlyInView = currentX > view.start - threshold && currentX <= view.end + threshold;
            const willBeInView = targetX > view.start - threshold && targetX <= view.end + threshold;

            if (currentlyInView || (willBeInView && isTransitioning)) {
                view.out = false
                elements.items[i].style.transform = `translate3d(${-currentX}px, 0, 0)`
            } else if (!view.out) {
                view.out = true
                elements.items[i].style.transform = `translate3d(${-currentX}px, 0, 0)`
            }
        });
    };

    const down = ({ e, start }) => {
        const isInBounds = start.y >= state.bounds[0].top && start.y <= state.bounds[0].bottom;

        if (isInBounds) {
            state.down = true
            state.hasDragged = false
            dragInstance.state.start.x = start.x
            state.position.previous = state.position.target
        }
    }

    const move = ({ e, x, y, axis }) => {
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0

        if (state.down && axis === 'x') {
            e.preventDefault()
        }

        if (!state.down || axis !== 'x') return

        if (Math.abs(x - dragInstance.state.start.x) > 5 || Math.abs(y - dragInstance.state.start.y) > 5) {
            state.hasDragged = true
        }

        const delta = -(x - dragInstance.state.start.x) * state.scrollSensitivity + state.position.previous
        updateScrollTarget(delta)
    }

    const trackCurrentIndex = () => {
        const closestPosition = gsap.utils.snap(snapConfig.positions, state.position.target);
        state.snapIndex = snapConfig.positions.indexOf(closestPosition);
    }

    const up = ({ e, x, y, drag }) => {
        if (!state.down) return
        state.down = false
        state.isDragging = false

        const selectedIndex = getSelectedIndex(x, y)

        if (snapConfig.move && drag && snapToClosest()) {
            trackCurrentIndex();
            return;
        }

        if (snapConfig.click && !drag && selectedIndex !== -1) {
            state.position.target = snapConfig.positions[selectedIndex]
            state.snapIndex = selectedIndex
        }

        updateScrollTarget(state.position.target)
        trackCurrentIndex();
    }

    const getSelectedIndex = (x, y) => {
        const currentX = x + state.position.current
        return state.itemPositions.findIndex(item =>
            currentX >= item.x &&
            currentX <= item.x + item.w &&
            y >= item.y &&
            y <= item.y + item.h
        )
    }

    const snapToClosest = () => {
        const wrappedTarget = gsap.utils.wrap(0, state.maxScroll, state.position.target)
        const snappedPosition = gsap.utils.snap(snapConfig.positions, wrappedTarget)
        const diff = snappedPosition - wrappedTarget

        state.position.target += diff
        state.snapIndex = snapConfig.positions.indexOf(snappedPosition)

        return true
    }

    const goToPrevious = () => {
        trackCurrentIndex()

        if (state.snapIndex > 0) {
            state.snapIndex--
            state.position.target = snapConfig.positions[state.snapIndex]
            updateScrollTarget(state.position.target)
        }
    }

    const goToNext = () => {
        trackCurrentIndex()

        if (state.snapIndex < snapConfig.positions.length - 1) {
            state.snapIndex++
            state.position.target = snapConfig.positions[state.snapIndex]
            updateScrollTarget(state.position.target)
        }
    }

    const updateScrollTarget = (value) => {
        state.position.target = gsap.utils.clamp(state.minScroll, state.maxScroll, value)
    }

    const updateAllPositions = (value) => {
        state.position.current = state.position.target = gsap.utils.clamp(state.minScroll, state.maxScroll, value)
    }

    const cache = () => {
        const windowWidth = window.innerWidth
        const lastIndex = elements.items.length - 1
        const scrollY = window.scrollY

        updateBounds()
        const totalWidth = calculateItemPositions(scrollY)

        if (snapConfig.move) {
            calculateSnapPositions(windowWidth, lastIndex)
        } else {
            const marginRight = CS(elements.items[lastIndex], 'marginRight')
            state.maxScroll = gsap.utils.clamp(state.minScroll, Infinity, totalWidth - windowWidth + marginRight)
            snapConfig.positions = [0]
            calculateSnapPositions(windowWidth, lastIndex)
        }

        updateAllPositions(state.position.target)
        updateAllSlides()
    }

    const setupDragHandler = () => {
        dragInstance = DragHandler({
            down,
            move,
            up
        })
        dragInstance.mount()
    }

    const setupVisibilityObserver = () => {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        state.isVisible = entry.isIntersecting;
                    });
                },
                {
                    rootMargin: '100px 0px',
                    threshold: 0.01
                }
            );

            observer.observe(elements.container);

            state.observer = observer;
        } else {
            state.isVisible = true;
        }
    }

    const mount = () => {
        initQuickSetters()
        setupDragHandler()

        evt.on('tick', tick)
        evt.on('resize', cache)

        elements.prevButton && evt.on('click', elements.prevButton, goToPrevious)
        elements.nextButton && evt.on('click', elements.nextButton, goToNext)

        setupVisibilityObserver()
    }

    const unmount = () => {
        dragInstance?.unmount()

        evt.off('resize', cache)
        evt.off('tick', tick)

        elements.prevButton && evt.off('click', elements.prevButton, goToPrevious)
        elements.nextButton && evt.off('click', elements.nextButton, goToNext)

        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }
    }

    mount()
    cache()

    return {
        mount,
        unmount,
        goToNext,
        goToPrevious,
        getCurrentIndex: () => state.snapIndex
    }
}