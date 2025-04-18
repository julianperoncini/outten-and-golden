import { qs, qsa } from './utils'

const dom = {
  	body: document.body,
}

const bounds = {
	ww: window.innerWidth,
	wh: window.innerHeight,
	maxScroll: 0
}

const device = {
	isFirefox: navigator.userAgent.indexOf('Firefox') > -1,
	isMobile: (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
	isSmall: window.matchMedia('(max-width: 649px)').matches,
	isPortrait: window.matchMedia('(orientation: portrait)').matches
}

export default {
  	dom, device, bounds
}