import gsap from 'gsap/all'
import ScrollTrigger from 'gsap/ScrollTrigger'
import SplitText from 'gsap/SplitText'
import { utils } from '@/core'

const { qs, qsa } = utils

gsap.registerPlugin(ScrollTrigger, SplitText)

export default function (el) {
    if (!el.section) return

    const elems = qsa('[data-highlight-text]', el.section)

    if (!elems) return

    elems.forEach(elem => {
        new SplitText(elem, {
            type: "words, chars",
            autoSplit: true,
            onSplit(self) {
                let ctx = gsap.context(() => {
                    let tl = gsap.timeline({
                        scrollTrigger: {
                            scrub: true,
                            trigger: el.section, 
                            start: 'top 80%',
                            end: 'center 40%',
                        }
                    })
                    tl.from(self.chars,{
                        autoAlpha: 0.3,
                        stagger: 0.2,
                        ease: 'linear'
                    })
                })
                
                return ctx
            }
        })
    })
}