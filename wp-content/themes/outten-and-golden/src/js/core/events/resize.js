import { evt, store } from '../index'
import debounce from 'lodash.debounce'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
const { bounds } = store

export default function () {
    function resize() {
        bounds.ww = gsap.utils.wrap(0, window.innerWidth)
        bounds.wh = gsap.utils.wrap(0, window.innerHeight)

        let ww = bounds.ww
        let wh = bounds.wh

        ScrollTrigger.refresh()

        evt.emit('resize', { ww, wh })
    }

    const debouncedResize = debounce(resize, 200)

    function mount() {
        window.addEventListener('resize', debouncedResize)
    }

    function unmount() {
        window.removeEventListener('resize', debouncedResize)
    }

    mount()

    return {
        unmount
    }
}