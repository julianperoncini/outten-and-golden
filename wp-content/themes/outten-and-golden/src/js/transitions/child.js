import { animate } from 'motion/mini'
import { Transition } from '@unseenco/taxi';
import { utils, evt } from '@/core';

const { qs, qsa } = utils;

export default class Child extends Transition {
    onLeave({ from, trigger, done }) {
        done()
    }

    onEnter({ to, trigger, done }) {
        done()
    }
}