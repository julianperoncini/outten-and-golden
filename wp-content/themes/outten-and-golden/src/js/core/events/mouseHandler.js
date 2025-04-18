import { evt } from '@/core'

export default function MouseHandler(options) {
    const callback = options.cb
    const element = options.el || document

    const allowScroll = options.allowScroll !== undefined ? options.allowScroll : false
    const passive = options.passive !== undefined ? options.passive : allowScroll

    const state = {
        x: 0,
        y: 0,
        pageX: 0,
        pageY: 0,
        clientX: 0,
        clientY: 0
    }

    const handleEvent = (e) => {
        const event = e.type === 'touchmove' ? e.touches[0] : e;

        state.clientX = event.clientX || e.touches?.[0]?.clientX || 0;
        state.clientY = event.clientY || e.touches?.[0]?.clientY || 0;
        state.pageX = event.pageX || e.touches?.[0]?.pageX || 0;
        state.pageY = event.pageY || e.touches?.[0]?.pageY || 0;

        state.x = state.pageX;
        state.y = state.pageY;

        evt.emit('mousemove', {
            e,
            x: state.x,
            y: state.y,
            pageX: state.pageX,
            pageY: state.pageY,
            clientX: state.clientX,
            clientY: state.clientY,
            originalEvent: e
        })

        if (callback) {
            callback(state.pageX, state.pageY, e);
        }
    }

    const addListeners = () => {
        const eventOptions = { passive }

        evt.on('mousemove', element, handleEvent, eventOptions)
        evt.on('touchmove', element, handleEvent, eventOptions)
        evt.on('touchstart', element, handleEvent, eventOptions)
    }

    const removeListeners = () => {
        evt.off('mousemove', element, handleEvent)
        evt.off('touchmove', element, handleEvent)
        evt.off('touchstart', element, handleEvent)
    }

    return {
        on: addListeners,
        off: removeListeners,
        state
    }
}