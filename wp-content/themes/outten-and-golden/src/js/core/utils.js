export const qs = (s, o = document) => o.querySelector(s)
export const qsa = (s, o = document) => [...o.querySelectorAll(s)]
export const rect = (el) => el.getBoundingClientRect()
export const pointerEvent = (event) => event.preventDefault()
export const wrapLines = (elems, wrapType, wrapClass) => {
	elems.forEach((char, i) => {
		const wrapEl = document.createElement(wrapType)
		wrapEl.classList = wrapClass
		char.parentNode.appendChild(wrapEl)
		wrapEl.appendChild(char)
	})
}
export const CS = (el, prop) => {
    const computedStyle = window.getComputedStyle(el)
    return parseFloat(computedStyle[prop])
}
export const Translate = (element, x, y, unit = "px") => {
    element.style.transform = `translate(${x}${unit}, ${y}${unit})`;
}
