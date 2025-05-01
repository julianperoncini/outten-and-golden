import gsap from 'gsap'
import { Transition } from '@unseenco/taxi'
import { utils, evt } from '@/core'

const { qs, qsa } = utils
const overlay = qs('.js-transition-overlay')
const mask = qs('.js-transition-mask')

export default class extends Transition {
    onLeave({ from, trigger, done }) {
        evt.emit('menu:close')

        done()
    }

    onEnter({ to, trigger, done }) {
        evt.emit('tick:start')
        evt.emit('speed:boost')
        evt.emit('menu:reset')

        done()
    }
}