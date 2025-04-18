import { evt } from '@/core'
import MouseHandler from './mouseHandler'

export default function DragHandler(options) {

    let dragState = {
        pos: [-1, -1],
        start: { x: 0, y: 0 },
        down: false,
        isDragging: { down: false, drag: false },
        axis: ''
    }

    const cb = {
        down: options.down,
        move: options.move,
        up: options.up
    }

    const mouseHandler = new MouseHandler({ cb: move });

    function move(x, y, e) {
        dragState.pos = [x, y]
        cb.move({ e, x, y })

        if (!dragState.isDragging.down) return

        const dx = Math.abs(x - dragState.start.x)
        const dy = Math.abs(y - dragState.start.y)

        dragState.isDragging.drag = dx > 6 || dy > 6

        if (dragState.isDragging.drag) {
            if (dragState.axis === '') {
                dragState.axis = dx > dy + 5 ? 'x' : 'y'
            }

            if (cb.move) {
                cb.move({
                    e,
                    x,
                    y,
                    axis: dragState.axis,
                    state: dragState
                })
            }
        }
    }

    function down(e) {
        if (e.target.tagName === 'A' && e.target.draggable) {
            e.preventDefault()
            return
        }

        if (e.button === 2 || e.ctrlKey) return

        // Store start position as object
        dragState.isDragging.down = true
        dragState.isDragging.drag = false
        dragState.axis = ''
        dragState.start = {
            x: e.pageX || (e.touches && e.touches[0].pageX),
            y: e.pageY || (e.touches && e.touches[0].pageY)
        }

        if (cb.down) {
            cb.down({ e, start: dragState.start, state: dragState })
        }
    }

    function up({ e, x, y }) {
        if (!dragState.isDragging.down) return
        dragState.isDragging.down = false
        dragState.down = false

        if (cb.up) {
            cb.up({
                e,
                x,
                y,
                drag: dragState.isDragging.drag,
                state: dragState
            })
        }
    }

    function mount() {
        document.addEventListener('pointerdown', down)
        document.addEventListener('pointerup', up)
        document.addEventListener('pointercancel', up)
        mouseHandler.on()
    }

    function unmount() {
        document.removeEventListener('pointerdown', down)
        document.removeEventListener('pointerup', up)
        document.removeEventListener('pointercancel', up)
        mouseHandler.off()
    }

    return {
        mount,
        unmount,
        state: dragState
    }
}

export { DragHandler }