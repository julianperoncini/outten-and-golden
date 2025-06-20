import debounce from 'lodash.debounce'
import { evt } from '@/core'
import ScrollTrigger from 'gsap/ScrollTrigger'

export default function () {
    const resize = debounce(() => {
        const ww = document.documentElement.clientWidth
        const wh = document.documentElement.clientHeight

        evt.emit('resize', { 
            ww, wh
        })

        ScrollTrigger.refresh()
    }, 50)
   
    const observer = new ResizeObserver(resize)
    observer.observe(document.documentElement)

    resize()
    
    return {
        resize
    } 
}
