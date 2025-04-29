import { Renderer } from '@unseenco/taxi';
import { evt, utils, store } from '@/core';

import * as components from '@/components'

const { qs, qsa, rect } = utils;
const { device } = store;

const path = window.location.pathname;
const isHomePage = path === '/';

// Check if user is logged in as wp-admin
const isWpAdmin = document.body.classList.contains('logged-in') || path.includes('/wp-admin');

let isPageReload = false

export default class extends Renderer {
    initialLoad() {
        isPageReload = true;

        this.onEnter();

        window.onload = () => this.load()
    }

    load() {
        if (!isWpAdmin) {
            this.preloader?.loaded()
        }

		this.onEnterCompleted()
    }

    onEnter() {
        this.el = this.content;

		components['triggered'](this.el);

        this.sliderElements = [];
        this.lazyElements = [];
        this.observers = [];

        evt.emit('scroll:header');
    }

    onEnterCompleted() {
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