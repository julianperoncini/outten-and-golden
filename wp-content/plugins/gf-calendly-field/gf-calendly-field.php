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

    // Define your contact-to-Calendly mapping here
    $calendly_map = [
        'Andreas' => 'https://calendly.com/didair/30min',
        'Jesper'  => 'https://calendly.com/jesper-westlund1/30-minute-meeting-clone',
        'Robbin'  => 'https://calendly.com/charlie-schedule',
    ];

    wp_localize_script('gf-calendly-dynamic', 'gfCalendlyField', [
        'contactFieldName' => 'input_22', // Change to your real field ID
        'mapping' => $calendly_map,
    ]);
});