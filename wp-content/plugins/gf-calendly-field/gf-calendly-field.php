<?php
/**
 * Plugin Name: Gravity Forms Calendly Field
 * Description: Adds a custom Calendly field type to Gravity Forms.
 * Version: 1.0
 * Author: Andreas Ekström
 */

add_action('gform_loaded', function () {
	if (class_exists('GF_Fields')) {
		require_once __DIR__ . '/lib/' . 'class-gf-field-calendly.php';
		GF_Fields::register(new GF_Field_Calendly());
	}
}, 5);

add_action('wp_enqueue_scripts', function () {
    if (!is_singular()) return;

    wp_enqueue_style(
        'calendly-field',
        plugin_dir_url(__FILE__) . 'assets/calendly-field.css',
        [],
        '1.0',
    );

    wp_enqueue_script(
        'calendly-script',
        'https://assets.calendly.com/assets/external/widget.js',
        [],
        '1.0',
        true
    );

    wp_enqueue_script(
        'gf-calendly-dynamic',
        plugin_dir_url(__FILE__) . 'assets/calendly-popup.js',
        [],
        '1.0',
        true
    );
});

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'forms_page_gf_edit_forms') {
        return;
    }

    // Ensure Gravity Forms script is loaded first
    wp_enqueue_script('gform_form_admin'); // This is the main GF editor JS

    // Add your inline script after it
    wp_add_inline_script('gform_form_admin', <<<JS
        fieldSettings['calendly'] += ', .conditional_input_setting, .conditional_value_setting';

        jQuery(document).on('gform_load_field_settings', function (event, field, form) {
            jQuery('#field_conditional_input').val(field.conditionalInput || '');
            jQuery('#field_conditional_value').val(field.conditionalValue || '');
        });
    JS);
});

add_action('gform_field_standard_settings', function ($position, $form_id) {
    if ($position == 1100): ?>
        <li class="conditional_input_setting field_setting">
            <label for="field_conditional_input">
                <?php esc_html_e('Conditional Input', 'gravityforms'); ?>
                <input type="text" id="field_conditional_input" onchange="SetFieldProperty('conditionalInput', this.value);" />
            </label>
            <p class="description">Field ID to check (e.g. input_1)</p>
        </li>

        <li class="conditional_value_setting field_setting">
            <label for="field_conditional_value">
                <?php esc_html_e('Conditional Value', 'gravityforms'); ?>
                <input type="text" id="field_conditional_value" onchange="SetFieldProperty('conditionalValue', this.value);" />
            </label>
            <p class="description">Required value (e.g. Yes)</p>
        </li>
    <?php endif;
}, 10, 2);