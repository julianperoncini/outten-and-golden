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
			return '<em>' . esc_html__('Calendly field – preview only.', 'gravityforms') . '</em>';
		}

		return sprintf('
			<div class="gf-calendly-wrapper" data-field-id="%s">
				<input type="hidden" name="%s" id="%s" value="%s" />
				<button type="button" class="gf-calendly-trigger">Schedule a time</button>
				<span class="gf-calendly-selected-date"></span>
			</div>
			<div class="calendly-inline"></div>
			',
			esc_attr($field_id),
			esc_attr($field_id),
			esc_attr($field_id),
			esc_attr($value)
		);
	}

    public function is_conditional_logic_supported() {
        return false;
    }
}
