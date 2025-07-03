import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { evt, utils, store } from '../core'

const { qs, qsa, rect } = utils
const { dom, features, bounds, device } = store

gsap.registerPlugin(ScrollTrigger)

export default function stickyAside(elm) {
    const el = elm.section
    const aside = qs('.js-aside-sticky-content', el)
    const main = qs('.js-main-sticky', el)

    if (!aside || !main) {
        console.warn('stickyAside: Required elements not found')
        return
    }

    const mm = gsap.matchMedia()

    let startScroll = 180
    let endScroll = main.offsetHeight - aside.offsetHeight - (startScroll / 2)
    let currPos = 0
    let screenHeight = window.innerHeight
    let asideHeight = aside.offsetHeight + startScroll

    const onResize = () => {
        screenHeight = window.innerHeight
        asideHeight = aside.offsetHeight + startScroll
        endScroll = main.offsetHeight - aside.offsetHeight - (startScroll / 2)
    }

    const onScroll = ({ y }) => {
        endScroll = window.innerHeight - aside.offsetHeight - (startScroll / 2)
        let asideTop = parseInt(aside.style.top.replace('px', ''))

        if (asideHeight > screenHeight) {
            if (y < currPos) {
                // scroll up
                if (asideTop < startScroll) {
                    aside.style.top = (asideTop + currPos - y) + 'px'
                } else if (asideTop >= startScroll && asideTop != startScroll) {
                    aside.style.top = startScroll + 'px'
                }
            } else {
                // scroll down
                if (asideTop > endScroll) {
                    aside.style.top = (asideTop + currPos - y) + 'px'
                } else if (asideTop < endScroll && asideTop != endScroll) {
                    aside.style.top = endScroll + 'px'
                }
            }
        } else {
            aside.style.top = startScroll + 'px'
        }

        currPos = y
    }

    const resetAside = () => {
        aside.style.top = ''
        aside.style.position = ''
        currPos = 0
    }

    const initDesktop = () => {
        aside.style.position = 'sticky'
        aside.style.top = startScroll + 'px'
        evt.on('resize', onResize)
        evt.on('scroll', onScroll)
    }

    const destroy = () => {
        mm.kill()
        evt.off('resize', onResize)  
        evt.off('scroll', onScroll)
        resetAside()
    }

    const init = () => {
        mm.add("(min-width: 650px)", () => {
            // Desktop behavior
            initDesktop()

            return () => {
                evt.off('resize', onResize)
                evt.off('scroll', onScroll)
            }
        })

        mm.add("(max-width: 649px)", () => {
            // Mobile behavior - reset aside to normal flow
            resetAside()
            
            return () => {
                // No cleanup needed for mobile
            }
        })
    }

    init()

    return { destroy }
}