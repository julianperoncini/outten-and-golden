document.addEventListener('DOMContentLoaded', function () {
    if (!window.gfCalendlyField) return;

    const { contactFieldName } = gfCalendlyField;

    document.querySelectorAll('.gf-calendly-wrapper').forEach(wrapper => {
        const trigger = wrapper.querySelector('.gf-calendly-trigger');
        const output  = wrapper.querySelector('.gf-calendly-selected-date');
        const hidden  = wrapper.querySelector('input[type="hidden"]');
        const contactSelect = wrapper.querySelector(`.gf-calendly-contact`);

        if (!trigger || !hidden || !contactSelect) return;

		const defaultSelected = contactSelect.value;

		if (defaultSelected === '') {
			trigger.setAttribute('disabled', 'true');
		}

		contactSelect.addEventListener('change', function (event) {
			if (event.target.value != '') {
				trigger.removeAttribute('disabled');
			} else {
				trigger.setAttribute('disabled', 'true');
			}
		});

        trigger.addEventListener('click', function () {
            const selected = contactSelect.value;

            if (!selected) {
                alert('Please select a contact first.');
                return;
            }

            Calendly.initPopupWidget({ url: selected });

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
                }
            });
        });
    });
});
