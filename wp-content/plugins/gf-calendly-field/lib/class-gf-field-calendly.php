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
		return ['label_setting', 'description_setting'];
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

		$options_html = '';

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
		<div class="gf-calendly-wrapper" data-field-id="<?php echo esc_attr($field_id); ?>">
			<label>Select attorney:</label>
			<select class="gf-calendly-contact" name="<?php echo esc_attr($field_id); ?>_contact">
				<option value="">-- Choose --</option>
				<?php echo $options_html; ?>
			</select>

			<button type="button" class="gf-calendly-trigger">Schedule a time</button>
			<span class="gf-calendly-selected-date"></span>
			<input type="hidden" name="<?php echo esc_attr($field_id); ?>" value="<?php echo esc_attr($value); ?>" />
		</div>
		<?php
		return ob_get_clean();
	}

	public function is_conditional_logic_supported() {
		return false;
	}
}
