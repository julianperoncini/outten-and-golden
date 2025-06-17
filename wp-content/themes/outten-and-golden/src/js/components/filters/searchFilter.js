import { gsap } from 'gsap'
import { evt, utils, store } from '@/core'

const { qs, qsa } = utils

export default function (config) {
    const elements = {
        section: config.section || config,
        container: config.elements || config
    }

    const filterButtons = qsa('[data-filter]', elements.section)
    const items = qsa('[data-post-type]', elements.section)

    // Function to update the status and accessibility attributes of items
    const updateStatus = (element, shouldBeActive) => {
        element.setAttribute('data-filter-status', shouldBeActive ? 'active' : 'not-active');
        element.setAttribute('aria-hidden', shouldBeActive ? 'false' : 'true');
    };

    const filter = (target) => {
        items.forEach((item) => {
            const shouldBeActive = target === 'all' || item.getAttribute('data-filter-name') === target;
            const currentStatus = item.getAttribute('data-filter-status');

            // Only transition items currently visible (status: active)
            if (currentStatus === 'active') {
                item.setAttribute('data-filter-status', 'transition-out');
                setTimeout(() => updateStatus(item, shouldBeActive), 300);
            } else {
                setTimeout(() => updateStatus(item, shouldBeActive), 300);
            }
        });

        filterButtons.forEach((button) => {
            const isActive = button.getAttribute('data-filter-target') === target;
            button.setAttribute('data-filter-status', isActive ? 'active' : 'not-active');
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function mount() {
        evt.on('click', filterButtons, (e) => {

            const target = e.currentTarget.getAttribute('data-filter-target');

            if (e.currentTarget.getAttribute('data-filter-status') === 'active') return
    
            filter(target)
        })
    }

    function unmount() {
        console.log('unmount')
    }

    mount()

    return {
        destroy: unmount
    }
}