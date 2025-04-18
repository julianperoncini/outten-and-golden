export default function (el) {
  if (!el) return

  let observer; // Declare observer in outer scope

  const initLazyLoad = () => {
    const lazyElements = document.querySelectorAll('img[loading="lazy"], video[data-lazy]');

    if (!("IntersectionObserver" in window)) {
      lazyElements.forEach(el => loadElement(el))
      return
    }

    observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadElement(entry.target)
          obs.unobserve(entry.target)
        }
      })
    })

    lazyElements.forEach(el => {
      el.style.opacity = '0'
      el.style.transition = 'opacity 0.65s'
      observer.observe(el)
    })
  }

  const loadElement = (el) => {
    if (el.tagName === 'IMG') {
      el.src = el.dataset.src;
      el.onload = () => el.style.opacity = '1'
    } else if (el.tagName === 'VIDEO') {
      el.querySelectorAll('source').forEach(source => {
        source.src = source.dataset.src;
      })
      el.load()
      el.onloadeddata = () => el.style.opacity = '1'
    }
  }

  initLazyLoad()

  return {
    unmount: () => {
      if (observer) observer.disconnect()
    }
  }
}
