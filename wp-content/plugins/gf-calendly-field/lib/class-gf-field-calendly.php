<?php

if (!class_exists('GFForms')) {
    die();
}

class GF_Field_Calendly extends GF_Field {

	public $type = 'calendly';

	public function get_form_editor_field_title() {
		return esc_attr__('Calendly', 'gravityforms');
	}

	public function get_form_editor_field_settings() {
		return [
			'label_setting',
			'description_setting',
			'conditional_input_setting',
			'conditional_value_setting'
		];
	}

	public function get_field_input($form, $value = '', $entry = null) {
		$field_id = 'input_' . $this->id;

		if (is_admin() && !wp_doing_ajax()) {
			return '<em>' . esc_html__('Calendly field – no preview. Options are displayed from attorneys post type. Requires Calendly link to be set', 'gravityforms') . '</em>';
		}

		// Get attorneys (CPT) with Calendly URL
		$people = get_posts([
			'post_type'      => 'attorney',
			'posts_per_page' => -1,
			'post_status'    => 'publish',
		]);

		$conditionalInput = rgar($this, 'conditionalInput');
		$conditionalValue = rgar($this, 'conditionalValue');
		$options_html     = '';

		foreach ($people as $person) {
			$name = esc_html(get_the_title($person));
			$contact_info = get_field('contact_info', $person->ID);
			$calendly = $contact_info['calendly_url'];

			if (!$calendly) continue;

			$options_html .= sprintf(
				'<option value="%s">%s</option>',
				esc_attr($calendly),
				$name
			);
		}

		// Output: select + button + hidden field + JS data
		ob_start();
		?>
		<div
			class="gf-calendly-wrapper<?php echo !empty($conditionalInput) ? ' hidden' : ''; ?>"
			data-field-id="<?php echo esc_attr($field_id); ?>"
			data-conditional-input="<?php echo esc_attr($conditionalInput); ?>"
			data-conditional-value="<?php echo esc_attr($conditionalValue); ?>"
		>
			<label>Select attorney:</label>
			<select class="gf-calendly-contact" name="<?php echo esc_attr($field_id); ?>_contact">
				<option value="">-- Choose --</option>
				<?php echo $options_html; ?>
			</select>

			<button type="button" class="gf-calendly-trigger">Schedule a time</button>
			<span class="gf-calendly-selected-date"></span>
			<input type="hidden" name="<?php echo esc_attr($field_id); ?>" value="<?php echo esc_attr($value); ?>" />

			<div class="hidden" id="overlay-top-bar">
				<button class="flex items-center justify-center transition-opacity duration-300 size-48 rounded-[0.4rem] border border-grey-taupe text-12 font-medium leading-[1.32] bg-white text-green js-close-calendly">
					<svg class="size-11" width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M5.5 6.6711L1.40114 10.77C1.24778 10.9233 1.0526 11 0.815589 11C0.57858 11 0.383396 10.9233 0.230038 10.77C0.076679 10.6166 0 10.4214 0 10.1844C0 9.9474 0.076679 9.75222 0.230038 9.59886L4.3289 5.5L0.230038 1.40114C0.076679 1.24778 0 1.0526 0 0.815589C0 0.57858 0.076679 0.383396 0.230038 0.230038C0.383396 0.076679 0.57858 0 0.815589 0C1.0526 0 1.24778 0.076679 1.40114 0.230038L5.5 4.3289L9.59886 0.230038C9.75222 0.076679 9.9474 0 10.1844 0C10.4214 0 10.6166 0.076679 10.77 0.230038C10.9233 0.383396 11 0.57858 11 0.815589C11 1.0526 10.9233 1.24778 10.77 1.40114L6.6711 5.5L10.77 9.59886C10.9233 9.75222 11 9.9474 11 10.1844C11 10.4214 10.9233 10.6166 10.77 10.77C10.6166 10.9233 10.4214 11 10.1844 11C9.9474 11 9.75222 10.9233 9.59886 10.77L5.5 6.6711Z" fill="#1E383E"></path>
					</svg>
				</button>

				<div>dsa</div>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	public function is_conditional_logic_supported() {
		return false;
	}
}
