import { animate } from 'motion/mini'
import { Transition } from '@unseenco/taxi';
import { utils, evt } from '@/core';

const { qs, qsa } = utils;
const mask = qs('.js-transition-mask');

export default class extends Transition {
    onLeave({ from, trigger, done }) {
		mask.classList.remove('invisible')
		
        evt.emit('menu:close');

        // Create new timeline
        let tl = animate(mask, {
			opacity: [0, 1]
		},{
			duration: 0.35,
			easing: 'ease-out'
		})

        tl.finished.then(() => {
            done();
        })

        evt.emit('leave');
    }

    onEnter({ to, trigger, done }) {
		window.scrollTo(0, 0);
		document.body.scrollTop = 0;
		document.documentElement.scrollTop = 0;

        //evt.emit('tick:start');
        //evt.emit('speed:boost');
		done()

        evt.emit('menu:reset');

        let tl = animate(mask, {
			opacity: [1, 0]
		},{
			duration: 0.35,
			easing: 'ease-out'
		})

		tl.finished.then(() => {
			mask.classList.add('invisible')
		})
    }
}