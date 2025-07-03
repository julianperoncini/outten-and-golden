import { gsap } from 'gsap'
import { Transition } from '@unseenco/taxi'
import { utils, evt } from '@/core'

const { qs, qsa } = utils
const mask = qs('.js-transition-mask')

export default class extends Transition {

    onEnter({ to, trigger, done }) {

        // Reset scroll
        window.scrollTo(0, 0)
        document.body.scrollTop = 0
        document.documentElement.scrollTop = 0
        evt.emit('scroll:reset')

        // Reset menu
        evt.emit('menu:reset')

        gsap.killTweensOf(mask)
        gsap.to(mask, {
            opacity: 0,
            duration: 0.35,
            ease: 'power2',
            onComplete: done
        })
    }

    onLeave({ from, trigger, done }) {
        evt.emit('menu:close')
        
        gsap.killTweensOf(mask)
        gsap.to(mask, {
            opacity: 1,
            duration: 0.35,
            ease: 'power2',
            onComplete: done
        })

        evt.emit('leave')
    }
}