import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import Flip from 'gsap/Flip'
import { utils } from '@/core'

const { qs } = utils

gsap.registerPlugin(ScrollTrigger, Flip)

export default function (el) {
    if (!el) return

    const scaleEl = qs('.js-scale', el)
    const targetEl = qs('.js-scale-target', el)

    if (!scaleEl || !targetEl) return

}