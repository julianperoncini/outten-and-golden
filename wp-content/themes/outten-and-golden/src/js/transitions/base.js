import gsap from 'gsap'
import { Transition } from '@unseenco/taxi'
import { utils, evt } from '@/core'

const { qs, qsa } = utils
const mask = qs('.js-transition-mask')

let tl

export default class extends Transition {
    onLeave({ from, trigger, done }) {
        evt.emit('menu:close')

		tl?.kill()
		tl = gsap.timeline()
			.fromTo(mask, { 
				autoAlpha: 0
			}, {
				autoAlpha: 1,
				duration: .5,
				ease: 'power1'
			})
			.add(() => done())

		evt.emit('leave')
    }

    onEnter({ to, trigger, done }) {
        evt.emit('tick:start')
        evt.emit('speed:boost')
        evt.emit('menu:reset')

		window.scrollTo(0, 0)
		done()

		tl?.kill()
		tl = gsap.timeline({
			paused: true,
			defaults: {
				duration: .75,
				ease: 'power1'
			}
		})
			.to(mask, { autoAlpha: 0 })

		tl.play()
    }
}