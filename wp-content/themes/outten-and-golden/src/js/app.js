// Styles
import '../css/app.scss'

// Core
import * as Taxi from '@unseenco/taxi'
import { ev, utils } from '@/core'

const { qs } = utils

// Components
import menu from '@/components/menu'

// Renderers
import * as R from '@/renderers'

// Transitions
import * as T from '@/transitions'

// Initialize events - store the returned objects with their unmount methods
const initResize = ev.resize()
const initScroll = ev.scroll()
const initMouse = ev.mouse()

menu(qs('.js-menu'))

// Update admin bar actions
const updateWpAdminBar = (page = document) => {
	const currentBar = document.getElementById('wpadminbar')
	const newBar = page.getElementById('wpadminbar')

	if (!currentBar || !newBar) return

	newBar.querySelectorAll('a').forEach(link => {
		link.dataset.routerDisabled = true
		link.target = '_blank'
	})
	currentBar.innerHTML = newBar.innerHTML
	document.dispatchEvent(new Event('DOMContentLoaded'))
}

// Taxi
const initTaxi = new Taxi.Core({
	renderers: {
		default: R.Base,
	},
	transitions: {
		default: T.Base,
		child: T.Child,
	},
})

initTaxi.on('NAVIGATE_IN', (e) => {
	updateWpAdminBar(e.to.page)

	const links = document.querySelectorAll('header a')

	for (let i = 0; i < links.length; i++) {
		const link = links[i];

		// Clean class
		link.classList.remove('is-active');

		// Active link
		if (link.href === location.href) {
			link.classList.add('is-active');
		}
	}
})

const grid = document.querySelector('.js-template-grid')
document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'G') {
        grid.classList.toggle('is-active')
    }
})

// Export initialized modules
export { initMouse, initResize, initScroll, initTaxi }