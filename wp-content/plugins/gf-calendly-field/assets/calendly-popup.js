document.addEventListener('DOMContentLoaded', function () {
    if (!window.gfCalendlyField) return;

    const { contactFieldName, mapping } = gfCalendlyField;

    document.querySelectorAll('.gf-calendly-wrapper').forEach(wrapper => {
        const trigger = wrapper.querySelector('.gf-calendly-trigger');
        const output  = wrapper.querySelector('.gf-calendly-selected-date');
        const hidden  = wrapper.querySelector('input[type="hidden"]');
        const contactSelect = document.querySelector(`select[name="${contactFieldName}"]`);

        if (!trigger || !hidden || !contactSelect) return;

        trigger.addEventListener('click', function () {
            const selected = contactSelect.value;
            const calendlyUrl = mapping[selected];

            if (!calendlyUrl) {
                alert('Please select a contact first.');
                return;
            }

            Calendly.initPopupWidget({ url: calendlyUrl });

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
