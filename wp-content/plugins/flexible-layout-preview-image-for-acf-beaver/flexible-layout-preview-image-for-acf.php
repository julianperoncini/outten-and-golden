<?php
/**
 * Plugin Name: Flexible Layout Preview Image for ACF - Beaver Builder
 * Description: Adds flexible layout preview images for ACF in the WordPress admin.
 * Version:     1.2
 * Author:      Motto
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Author URI:  https://www.wearemotto.com/
 * Text Domain: flexible-layout-preview-image-for-acf-beaver
 * Domain Path: /languages
 *
 * @package flexible_layout_preview-image_for_acf
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Define plugin constants.
define( 'FLEXIBLE_LAYOUT_PREVIEW_IMAGE_ACF_VERSION', '1.2' );
define( 'FLEXIBLE_LAYOUT_PREVIEW_IMAGE_ACF_URL', plugin_dir_url( __FILE__ ) );
define( 'FLEXIBLE_LAYOUT_PREVIEW_IMAGE_ACF_PATH', plugin_dir_path( __FILE__ ) );

/**
 * Initialize hooks and actions.
 */
function flpi_acf_init() {
    // Register assets.
    add_action( 'admin_footer', 'flpi_acf_register_assets', 1 );
    add_action( 'admin_footer', 'flpi_acf_enqueue_assets' );

    // Layout images.
    add_action( 'acf/input/admin_footer', 'flpi_acf_layouts_images_style', 20 );

    // Retrieve Flexible Keys.
    add_action( 'acf/input/admin_head', 'flpi_acf_retrieve_flexible_keys', 1 );
}
add_action( 'init', 'flpi_acf_init' );

/**
 * Display the flexible layouts images related CSS for backgrounds.
 */
function flpi_acf_layouts_images_style() {
    $images = flpi_acf_get_layouts_images();
    if ( empty( $images ) ) {
        return;
    }

    $css  = "\n<style>";
    $css .= "\n\t /** Flexible Content Preview for Advanced Custom Fields: dynamic images */";
    foreach ( $images as $layout_key => $image_url ) {
        $css .= sprintf( "\n\t .acf-fc-popup ul li a[data-layout=%s] .acf-fc-popup-image { background-image: url(\"%s\"); }", esc_attr( $layout_key ), esc_url( $image_url ) );
    }
    $css .= "\n</style>\n";

    echo $css; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

/**
 * Get all ACF flexible content field layout keys.
 *
 * @return array Array of layout keys.
 */
function flpi_acf_retrieve_flexible_keys() {
    $keys   = array();
    $groups = acf_get_field_groups();
    if ( empty( $groups ) ) {
        return $keys;
    }

    foreach ( $groups as $group ) {
        $fields = (array) acf_get_fields( $group );
        if ( ! empty( $fields ) ) {
            flpi_acf_retrieve_flexible_keys_from_fields( $fields, $keys );
        }
    }

    return $keys;
}

/**
 * Recursively get ACF flexible content field layout keys from fields.
 *
 * @param array $fields Array of fields.
 * @param array $keys   Array of keys passed by reference.
 */
function flpi_acf_retrieve_flexible_keys_from_fields( $fields, &$keys ) {
    foreach ( $fields as $field ) {
        if ( 'flexible_content' === $field['type'] ) {
            foreach ( $field['layouts'] as $layout_field ) {
                // Don't revisit keys we've recorded already.
                if ( ! empty( $keys[ $layout_field['key'] ] ) ) {
                    continue;
                }

                $keys[ $layout_field['key'] ] = $layout_field['name'];

                // Flexible content has a potentially recursive structure. Each layout has its own sub-fields that could in turn be flexible content.
                if ( ! empty( $layout_field['sub_fields'] ) ) {
                    flpi_acf_retrieve_flexible_keys_from_fields( $layout_field['sub_fields'], $keys );
                }
            }
        }
    }
}

/**
 * Get images for all flexible content field keys.
 *
 * @return array Array of flexible content field keys with associated image URLs.
 */
function flpi_acf_get_layouts_images() {
    $layouts_images = array();
    $flexibles      = flpi_acf_retrieve_flexible_keys();
    if ( empty( $flexibles ) ) {
        return array();
    }

    foreach ( $flexibles as $flexible ) {
        $layouts_images[ $flexible ] = flpi_acf_locate_image( $flexible );
    }

    /**
     * Filter to allow adding/removing/changing flexible layout keys.
     *
     * @param array $layouts_images Array of flexible content field layout's keys with associated image URLs.
     */
    return apply_filters( 'flexible_layout_preview-image_for_acf_images', $layouts_images );
}

/**
 * Locate layout in the theme or plugin if needed.
 *
 * @param string $layout The layout name. Adds .jpg at the end of the file.
 *
 * @return false|string The URL of the image or a default image URL if not found.
 */
function flpi_acf_locate_image( $layout ) {
    if ( empty( $layout ) ) {
        return false;
    }

    /**
     * Filter to allow adding/removing/changing the path to images.
     *
     * @param string $path Path to check.
     */
    $path = apply_filters( 'flexible_layout_preview-image_for_acf_images_path', 'acf-preview-images' );

    // Replace underscores with hyphens in the layout name.
    $layout = str_replace( '_', '-', $layout );

    // Construct the path to the image file.
    $image_path = get_stylesheet_directory() . '/' . $path . '/' . $layout . '.jpg';
    $image_uri  = get_stylesheet_directory_uri() . '/' . $path . '/' . $layout . '.jpg';

    // Check if the image file exists in the theme directory.
    if ( is_file( $image_path ) ) {
        return $image_uri;
    }

    // Return the default image URL if the specific image is not found.
    return FLEXIBLE_LAYOUT_PREVIEW_IMAGE_ACF_URL . 'assets/images/default.jpg';
}

/**
 * Register assets.
 */
function flpi_acf_register_assets() {
    wp_register_script( 'flpi-acf-flexible-layout-preview-script', FLEXIBLE_LAYOUT_PREVIEW_IMAGE_ACF_URL . 'assets/js/flexible-layout-preview-image-for-acf.js', array( 'jquery' ), FLEXIBLE_LAYOUT_PREVIEW_IMAGE_ACF_VERSION, true );
    wp_register_style( 'flpi-acf-flexible-layout-preview-style', FLEXIBLE_LAYOUT_PREVIEW_IMAGE_ACF_URL . 'assets/css/flexible-layout-preview-image-for-acf.css', array(), FLEXIBLE_LAYOUT_PREVIEW_IMAGE_ACF_VERSION );
}

/**
 * Enqueue assets.
 */
function flpi_acf_enqueue_assets() {
    wp_enqueue_script( 'flpi-acf-flexible-layout-preview-script' );
    wp_enqueue_style( 'flpi-acf-flexible-layout-preview-style' );
}

/**
 * You can use these filters to add custom links to your plugin row in the plugin list.
 * @param $links, $file
 * @return $links [array]
 * @since 1.1
 */
if (! function_exists('flpi_add_custom_plugin_links')) {
    function flpi_add_custom_plugin_links($links, $file)
    {
        if (!isset($plugin)){
            $plugin = plugin_basename(__FILE__);
        }
  
        if ($plugin == $file) {
            $links[] = '<a href="https://wp-plugins.galaxyweblinks.com/wp-plugins/flexible-layout-preview-image-for-acf/doc/" target="_blank">Documentation</a>';
            $links[] = '<a href="https://wp-plugins.galaxyweblinks.com/contact/" target="_blank">Contact Support</a>';
        }
        return $links;
    }
  }
  add_filter('plugin_row_meta', 'flpi_add_custom_plugin_links', 10, 2);