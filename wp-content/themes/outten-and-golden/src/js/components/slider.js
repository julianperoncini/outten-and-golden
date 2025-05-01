import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import lerp from '@14islands/lerp'
import { evt, utils, store } from '@/core'
import { DragHandler } from '@/core/events/dragHandler'

const { device } = store
const isMobile = device.isMobile

const { qs, qsa, rect, CS } = utils

gsap.registerPlugin(ScrollTrigger)

export default function (config) {
    const state = {
        isDragging: false,
        isDragged: false,
        down: false,
        previousX: 0,
        minScroll: 0,
        maxScroll: 0,
        scrollSensitivity: isMobile ? 3 : 2,
        snapIndex: 0,
        position: { current: 0, target: 0, previous: 0, start: 0 },
        bounds: [],
        itemPositions: [],
        viewPositions: [],
        settersX: [],
        diff: 0,
        ratio: 1,
        still: true,
        progressX: [],
        cursorX: [],
        cursorY: []
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

    const snapConfig = config.snap || { move: true, end: 'max' }

    gsap.set(elements.progress, { scaleX: 0.2 })
    gsap.set(elements.cursor, { xPercent: -50, yPercent: -50 })

    const initQuickSetters = () => {
        state.settersX = elements.items.map(item => gsap.quickSetter(item, 'x', 'px'))
    }

    const handleContainerClick = (e) => {
        if (state.hasDragged) return

        const containerBounds = rect(elements.container)
        const clickX = e.clientX - containerBounds.left
        const clickZoneSize = containerBounds.width * 0.5

        if (clickX < clickZoneSize) {
            goToPrevious()
            elements.cursor.classList.add('prev-hover')
        } else if (clickX > containerBounds.width - clickZoneSize) {
            goToNext()
            elements.cursor.classList.add('next-hover')
        }
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

            state.itemPositions[i] = {
                x: currentOffset,
                y: areaTop,
                w: itemWidth,
                h: itemBounds.height,
                marginX: marginLeft
            }

            state.viewPositions[i] = {
                start: currentOffset - windowWidth,
                end: currentOffset + itemWidth,
                out: false
            }

            currentOffset += itemWidth
        })

        return currentOffset
    }

    const snapPositions = (windowWidth, lastIndex) => {
        let snapLimit = getSnapLimit(windowWidth, lastIndex)
        let totalPosition = 0

        snapConfig.positions = [0]

        for (let i = 0; i < snapLimit; i++) {
            totalPosition += state.itemPositions[i].w + state.itemPositions[i + 1].marginX
            snapConfig.positions.push(totalPosition + 1)
        }

        state.maxScroll = gsap.utils.clamp(0, Infinity, totalPosition)
        state.position.target = snapConfig.positions[state.snapIndex]
    }

    const getSnapLimit = (windowWidth, lastIndex) => {
        if (snapConfig.end !== 'max') return lastIndex

        let remainingWidth = windowWidth - state.itemPositions[0].marginX

        for (let i = lastIndex; i >= 0; i--) {
            remainingWidth -= state.itemPositions[i].w + state.itemPositions[i].marginX 
            if (remainingWidth < 0) return i + 1
        }

        return lastIndex
    }

    const tick = () => {
        state.diff = state.position.target - state.position.current;
        state.still = Math.abs(state.diff) < 0.05;
        state.ratio = gsap.ticker.deltaRatio(60)

        if (!state.still) {
            state.position.current = lerp(state.position.current, state.position.target, isMobile ? 0.15 * state.ratio : 0.135 * state.ratio);

            inView()
        }
    }

    const updateAllSlides = () => {
        const currentX = gsap.utils.clamp(0, Infinity, state.position.current)

        state.viewPositions.forEach((view, i) => {
            view.out = false
            state.settersX[i](-currentX)
        })

        inView()
    }

    const inView = () => {
        const threshold = 150;
        const currentX = gsap.utils.clamp(0, Infinity, state.position.current)

        const targetX = state.position.target

        state.viewPositions.forEach((view, i) => {
            const currentlyInView = currentX > view.start - threshold && currentX <= view.end + threshold
            const willBeInView = targetX > view.start - threshold && targetX <= view.end + threshold
            const isTransitioning = Math.abs(targetX - currentX) > 10

            if (currentlyInView || (willBeInView && isTransitioning)) {
                view.out = false
                state.settersX[i](-currentX)
            } else if (!view.out) {
                view.out = true
                state.settersX[i](-currentX)
            }
        });
    };

    const down = ({ e, start }) => {
        if (start.y >= state.bounds[0].top && start.y <= state.bounds[0].bottom) {
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

        if (x > state.previousX && state.position.target === state.minScroll) {
            dragInstance.state.start.x = x - (state.position.previous - state.minScroll) / state.scrollSensitivity
        } else if (x < state.previousX && state.position.target === state.maxScroll) {
            dragInstance.state.start.x = x - (state.position.previous - state.maxScroll) / state.scrollSensitivity
        }

        state.previousX = x

        const delta = -(x - dragInstance.state.start.x) * state.scrollSensitivity + state.position.previous
        updateScrollTarget(delta)
    }

    const trackCurrentIndex = () => {
        // Find closest index to current position
        let closestIndex = 0;
        let closestDistance = Math.abs(state.position.target - snapConfig.positions[0]);

        for (let i = 1; i < snapConfig.positions.length; i++) {
            const distance = Math.abs(state.position.target - snapConfig.positions[i]);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }

        // Update the snapIndex without changing position
        state.snapIndex = closestIndex;
    }

    const up = ({ e, x, y, drag }) => {
        if (!state.down) return
        state.down = false
        state.isDragging = false

        const selectedIndex = getSelectedIndex(x, y)

        if (snapConfig.move && drag && snapUp(selectedIndex)) {
            // After snapping, make sure the index is updated
            trackCurrentIndex();
            return;
        }

        if (snapConfig.click && !drag && selectedIndex !== -1) {
            state.position.target = snapConfig.positions[selectedIndex]
            state.snapIndex = selectedIndex
        }

        updateScrollTarget(state.position.target)

        // Track approximate index after any movement
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

    const snapUp = () => {
        const closestIndex = snapConfig.positions.reduce((closest, pos, i) => {
            const distance = Math.abs(state.position.target - pos)
            return distance < Math.abs(state.position.target - snapConfig.positions[closest]) ? i : closest
        }, 0)

        state.snapIndex = closestIndex
        state.position.target = snapConfig.positions[closestIndex]
        return true
    }

    const goToPrevious = () => {
        // First ensure we have the right index
        trackCurrentIndex();

        // Now navigate
        if (state.snapIndex > 0) {
            state.snapIndex = state.snapIndex - 1;
            state.position.target = snapConfig.positions[state.snapIndex];
            updateScrollTarget(state.position.target);
        }
    }

    const goToNext = () => {
        // First ensure we have the right index
        trackCurrentIndex();

        // Now navigate
        if (state.snapIndex < snapConfig.positions.length - 1) {
            state.snapIndex = state.snapIndex + 1;
            state.position.target = snapConfig.positions[state.snapIndex];
            updateScrollTarget(state.position.target);
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
            snapPositions(windowWidth, lastIndex)
        } else {
            const marginRight = CS(elements.items[lastIndex], 'marginRight')
            state.maxScroll = gsap.utils.clamp(state.minScroll, Infinity, totalWidth - windowWidth + marginRight)
            snapConfig.positions = [0]
            snapPositions(windowWidth, lastIndex)
        }

        updateAllPositions(state.position.target)
        updateAllSlides()
    }

    const resize = () => cache()

    let dragInstance

    const setupDragHandler = () => {
        dragInstance = DragHandler({
            down,
            move,
            up
        })
        dragInstance.mount()
    }

    const mount = () => {
        initQuickSetters()
        setupDragHandler()

        evt.on('tick', tick)
        evt.on('resize', resize)

        !isMobile && elements.container && evt.on('click', elements.container, handleContainerClick)
        elements.prevButton && evt.on('click', elements.prevButton, goToPrevious)
        elements.nextButton && evt.on('click', elements.nextButton, goToNext)
    }

    const unmount = () => {
        dragInstance?.unmount()

        evt.off('resize', resize)
        evt.off('tick', tick)

        !isMobile && elements.container && evt.off('click', elements.container, handleContainerClick)
        elements.prevButton && evt.off('click', elements.prevButton, goToPrevious)
        elements.nextButton && evt.off('click', elements.nextButton, goToNext)
    }

    mount()
    cache()

    return { mount, unmount }
}