import { Renderer } from '@unseenco/taxi';
import { evt, ev, utils, store } from '@/core';

import * as components from '@/components'


const { qs, qsa, rect } = utils;
const { device } = store;

const scroll = ev.scroll()

const path = window.location.pathname;
const isHomePage = path === '/';

// Check if user is logged in as wp-admin
const isWpAdmin = document.body.classList.contains('logged-in') || path.includes('/wp-admin');

let isPageReload = false

export default class extends Renderer {
    initialLoad() {
        isPageReload = true;

        window.onload = () => this.load()

		this.onEnter()
		this.onEnterCompleted()
    }

    load() {
        if (!isWpAdmin) {
            this.preloader?.loaded()
        }

		components['menu'](qs('.js-menu'))

		components['s']({
			section: qs('.js-header-search'),
			// mode: 'modal' (default)
			searchCallbacks: {
				onTagAdded: (text) => console.log('Tag added:', text),
				onTagsChanged: (tags) => console.log('Tags changed:', tags),
			},
			uiOptions: {
				onOpen: () => console.log('Search opened'),
				onClose: () => console.log('Search closed'),
				onSubmit: (tags, query) => console.log('Search submitted')
			}
		})

		components['s']({
			section: qs('.js-search-mobile-section'),
			mode: 'mobile',
		})
		

		components['bookACall'](this.el);
		components['sliderOffice']({ 
			section: qs('.js-slider-office-header'), 
			disableScrollTrigger: true 
		});

		console.log(this.el)
    }

    onEnter() {
		console.log('onEnter')
        this.el = this.content;


		components['triggered'](this.el);

        this.sliderElements = [];
        this.lazyElements = [];
        this.observers = [];

        evt.emit('scroll:header');

		if (qs('.js-search-mini-section')) {
			components['s']({
				section: qs('.js-search-mini-section'),
				mode: 'static',
			})
		}
    }

    onEnterCompleted() {
		console.log('onEnterCompleted')
		this.initComponents();
    }

    onLeave() {
        isPageReload = false;
    }

    onLeaveCompleted() {
		if (this.components && this.components.length) {
			this.components.forEach(component => {
				if (component && typeof component.unmount === 'function') {
					component.unmount()
				}
			})
			this.components = null
		}
    }

	initComponents() {
		let elems = qsa('[data-component]')

		elems = elems.filter(
		  (el) =>
			el.dataset.mobile === undefined ||
			el.dataset.mobile === `${device.isMobile ? 'true' : 'false'}`
		)
		
		if (elems.length) {
		  this.components = elems.map((el) => {
			const componentAttr = el.dataset.component
			let componentName, componentParams
			
			const paramMatch = componentAttr.match(/^(\w+)\((.+)\)$/)
			
			if (paramMatch) {
			  componentName = paramMatch[1]
			  const paramString = paramMatch[2]
			  
			  componentParams = paramString.split(',').map(param => {
				const trimmedParam = param.trim()
				
				if (trimmedParam.startsWith('js-')) {
				  return qs(`.${trimmedParam}`, el) || qs(`.${trimmedParam}`)
				}
				
				if (trimmedParam === 'true') return true
				if (trimmedParam === 'false') return false
				if (!isNaN(trimmedParam) && trimmedParam !== '') return Number(trimmedParam)
				
				return trimmedParam
			  })
			} else {
			  componentName = componentAttr
			  componentParams = []
			}
			
			const component = components[componentName]
			
			if (!component) {
			  console.warn(`Component "${componentName}" not found`)
			  return null
			}
			
			const config = {
			  section: el
			}
			
			if (componentParams.length > 0) {
			  return component({ ...config, elements: componentParams })
			} else {
			  return component(config)
			}
		  }).filter(Boolean)
		}
	}
}
