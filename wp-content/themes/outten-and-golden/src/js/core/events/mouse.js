import { evt } from '@/core'

export default function () {
    // State
    const state = {
        e: null,
        x: 0,
        y: 0,
        target: null
    }

    // Event names
    const events = {
        move: 'mousemove',
        down: 'mousedown',
        up: 'mouseup'
    }

    // Update mouse state
    const updateState = (e) => {

        state.x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
        state.y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY
        state.target = e.target
        state.e = e
    }

    // Event handlers
    const onMouseMove = (e) => {
        updateState(e)
        evt.emit('mousemove', state)
    }

    const onMouseDown = (e) => {
        updateState(e)
        evt.emit('mousedown', state)
    }

    const onMouseUp = (e) => {
        updateState(e)
        evt.emit('mouseup', state)
    }

    // Event management
    const mount = () => {
        const { move, down, up } = events

        evt.on(move, window, onMouseMove)
        evt.on(down, window, onMouseDown)
        evt.on(up, window, onMouseUp)
    }

    const unmount = () => {
        const { move, down, up } = events

        evt.off(move, window, onMouseMove)
        evt.off(down, window, onMouseDown)
        evt.off(up, window, onMouseUp)
    }

    // Initialize
    mount()

    return {
        unmount
    }
}
