// Styles
import '../css/app.scss'

// Core
import * as Taxi from '@unseenco/taxi'
import { ev, utils } from '@/core'

const { qs } = utils

// Renderers
import * as R from '@/renderers'

// Transitions
import * as T from '@/transitions'

// Initialize events - store the returned objects with their unmount methods
const initResize = ev.resize()
const initScroll = ev.scroll()
const initMouse = ev.mouse()


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
	},
})

initTaxi.on('NAVIGATE_IN', (e) => {
    const pageElement = e.to.page
    const taxiNamespace = e.to.renderer.content.dataset.taxiNamespace || 'default'
    const pageType = e.to.renderer.content.dataset.pageType || taxiNamespace

	//updateWpAdminBar(pageElement)
	updatePageState(taxiNamespace, pageType);
})

function initializePageState() {
    const pageElement = document.querySelector('[data-taxi-view]');
    const taxiNamespace = pageElement.dataset.taxiNamespace || 'default';
    const pageType = pageElement.dataset.pageType || taxiNamespace;
    
    updatePageState(taxiNamespace, pageType);
}

initializePageState()

function updatePageState(namespace, pageType) {
    updateBodyClasses(namespace, pageType);
    //updateHeaderClasses(namespace, pageType);
    //updateNavigationStates();
    //updateSpecialFeatures(namespace, pageType);
}

function updateBodyClasses(namespace) {
    const body = document.body;

    // You can also mirror WordPress body classes
    const wpClasses = ['page', 'home', 'search', 'search-empty', 'search-no-results', 'single', 'archive', 'category', 'tag', 'error404'];
    body.classList.remove(...wpClasses);
    
    if (namespace === 'error') {
        body.classList.add('error404');
    } else {
        body.classList.add(namespace);
    }
}

function updateHeaderClasses(namespace, pageType) {
	const header = document.querySelector('header')

	if (header) {
		header.classList.add(`taxi-${namespace}`, `taxi-${pageType}`);
	}
}	

function updateNavigationStates() {
	const links = document.querySelectorAll('header a')

	for (let i = 0; i < links.length; i++) {
		const link = links[i];

		link.classList.remove('is-active');
	}

	const link = links.find(link => link.href === location.href)

	if (link) {
		link.classList.add('is-active');
	}
}

const grid = document.querySelector('.js-template-grid')
document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'G') {
        grid.classList.toggle('is-active')
    }
})

// Export initialized modules
export { initMouse, initResize, initScroll, initTaxi }