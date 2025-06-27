document.addEventListener('DOMContentLoaded', () => {
	document.dispatchEvent(new Event('gform_page_loaded'));

	const navigationButtons = [
		...document.querySelectorAll('.gform_previous_button') ?? [],
		...document.querySelectorAll('.gform_next_button') ?? [],
	];

	navigationButtons.forEach((navigationBtn) => {
		navigationBtn.addEventListener('click', () => {
			document.dispatchEvent(new Event('gform_page_loaded'));
		});
	});
});

document.addEventListener('gform_page_loaded', function () {
    document.querySelectorAll('.gf-calendly-wrapper').forEach(wrapper => {
        const trigger = wrapper.querySelector('.gf-calendly-trigger');
        const output  = wrapper.querySelector('.gf-calendly-selected-date');
        const hidden  = wrapper.querySelector('input[type="hidden"]');
        const contactSelect = wrapper.querySelector('.gf-calendly-contact');
		const conditionalInputName = wrapper.getAttribute('data-conditional-input');
		const conditionalInputValue = wrapper.getAttribute('data-conditional-value');
		const conditionalInputs = document.querySelectorAll(`input[name='${conditionalInputName}']`);

		if (!trigger || !hidden || !contactSelect) return;

		const defaultSelected = contactSelect.value;

		if (defaultSelected === '') {
			trigger.setAttribute('disabled', 'true');
		}

		if (conditionalInputs != null && conditionalInputs.length > 0) {
			conditionalInputs.forEach((input) => {
				input.addEventListener('change', function (event) {
					if (event.target.value.toLowerCase() === conditionalInputValue.toLowerCase()) {
						wrapper.classList.remove('hidden');
					} else {
						if (!wrapper.classList.contains('hidden')) {
							wrapper.classList.add('hidden');
						}
					}
				});
			});
		}

		contactSelect.addEventListener('change', function (event) {
			if (event.target.value != '') {
				trigger.removeAttribute('disabled');
			} else {
				trigger.setAttribute('disabled', 'true');
			}
		});

		function handleEscapeKey(event) {
			if (event.key === 'Escape') {
				document.querySelector('.calendly-popup-close')?.click();
			}
		}

		trigger.addEventListener('click', function () {
			const selected = contactSelect.value;

			if (!selected) {
				alert('Please select a contact first.');
				return;
			}

			Calendly.initPopupWidget({ url: selected + "?hide_gdpr_banner=1" });

			const topBar = wrapper.querySelector('#overlay-top-bar')?.cloneNode(true);

			if (topBar != null) {
				document.querySelector('.calendly-popup')?.prepend(topBar);
				topBar.classList.remove('calendly-top-bar-template');
				topBar.querySelector('.js-close-calendly')?.addEventListener('click', (event) => {
					event.preventDefault();
					document.querySelector('.calendly-popup-close')?.click();
				});
			}

			document.addEventListener('keydown', handleEscapeKey);
			window.addEventListener('message', function handleEvent(e) {
				if (e.data.event === 'calendly.event_scheduled') {
					console.log('### data', e.data);
					const date = e.data.payload?.event_start_time;
					if (date) {
						trigger.classList.add('hidden');
						hidden.value = date;
						output.textContent = `${new Date(date).toLocaleString()}`;
					} else {
						output.textContent = 'Scheduled.';
					}

					// Clean up
					window.removeEventListener('message', handleEvent);
					document.removeEventListener('keydown', handleEscapeKey);
				}
			});
		});
	});
});
