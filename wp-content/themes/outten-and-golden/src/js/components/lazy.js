import { evt } from '@/core'
import { utils } from '@/core'
import Player from '@vimeo/player'

const { qs, qsa, rect } = utils

export default function (el) {
    if (!el) return

    const videos = qsa('video', el)
    const vimeos = qsa('[data-vimeo]', el)

    const videoInstances = new Map()
    const vimeoInstances = new Map()

    const handleIntersection = (entries) => {
        entries.forEach(entry => {
            const element = entry.target

            if (element.hasAttribute('data-lazy')) {
                if (entry.isIntersecting) {
                    if (element.paused && element.autoplay) {
                        element.play()
                    }
                } else {
                    if (!element.paused) {
                        element.pause()
                        element.currentTime = 0
                        console.log('pause')
                    }
                }
            }

            if (element.hasAttribute('data-vimeo')) {
                const player = vimeoInstances.get(element)
                if (!player) return

                if (entry.isIntersecting) {
                    player.getPaused().then(paused => {
                        if (paused) player.play()
                    })
                } else {
                    player.pause()
                }
            }
        })
    }

    const observer = new IntersectionObserver(handleIntersection, {
        root: null,
        rootMargin: '50px',
        threshold: 0
    })

    videos.forEach(video => {
        if (video.autoplay) {
            videoInstances.set(video, true)
            observer.observe(video)
        }
    })

    vimeos.forEach(vimeoEl => {
        const videoId = vimeoEl.getAttribute('data-vimeo-video-id')
        if (!videoId) return

        const iframe = qs('iframe', vimeoEl)
        if (!iframe) return

        const player = new Player(iframe, {
            id: videoId,
            background: true,
            autoplay: false,
            loop: vimeoEl.getAttribute('data-vimeo-loop') === 'true',
            muted: true
        })

        vimeoInstances.set(vimeoEl, player)
        observer.observe(vimeoEl)

        player.on('play', () => {
            vimeoEl.setAttribute('data-vimeo-loaded', 'true')
        })

        player.on('ended', () => {
            if (vimeoEl.getAttribute('data-vimeo-loop') !== 'true') {
                vimeoEl.setAttribute('data-vimeo-activated', 'false')
                vimeoEl.setAttribute('data-vimeo-playing', 'false')
                player.unload()
            }
        })
    })

    // Cleanup function
    const unmount = () => {
        observer.disconnect()
        videoInstances.clear()

        vimeoInstances.forEach(player => {
            player.destroy()
        })

        vimeoInstances.clear()
    }

    return { unmount }
}