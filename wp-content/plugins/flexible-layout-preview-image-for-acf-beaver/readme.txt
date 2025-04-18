=== Flexible Layout Preview Image for ACF ===
Contributors: galaxyweblinks, gwlwp
Donate link: https://galaxyweblinks.com/
Tags: acf, advanced custom fields, flexible content, layout preview, admin
Requires at least: 5.0
Tested up to: 6.7
Requires PHP: 7.4
Requires Plugins: advanced-custom-fields (>= 5.0)
Stable tag: 1.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adds flexible layout preview images for Advanced Custom Fields (ACF) in the WordPress admin.

== Description ==

**Flexible Layout Preview Image for ACF** is a WordPress plugin that enhances the admin experience by adding custom images to the previews of flexible layouts created using Advanced Custom Fields (ACF). This visual aid helps administrators quickly identify and manage various layout blocks within ACF flexible content fields.

Here’s a link to the documentation for the plugin. This will help you learn more about its features and how to use it.
<strong>[Documentation](https://wp-plugins.galaxyweblinks.com/wp-plugins/flexible-layout-preview-image-for-acf/)</strong>
For any feedback or queries regarding this plugin, please contact our [Support team](https://wp-plugins.galaxyweblinks.com/contact/).

### Features

- Adds preview images for ACF flexible content layouts in the WordPress admin.
- Automatically detects and applies images stored in your theme directory.
- Allows developers to customize image paths via filters.
- Works seamlessly with the ACF plugin.

### How It Works

Place your custom preview images in your theme directory at `/lib/admin/images/flexible-layout-preview-image-for-acf/` with filenames matching the ACF layout names (e.g., `layout-name.jpg`). The plugin will automatically display these images in the ACF layout preview popups.

### Filters 

The following filters are available for customization:

- **`flexible_layout_preview-image_for_acf_images_path`**: Customize the path to load images from.
- **`flexible_layout_preview-image_for_acf_images`**: Modify the array of layout keys and image URLs.

== License ==

This plugin is licensed under the GPLv2 or later. See the [LICENSE](https://www.gnu.org/licenses/gpl-2.0.html) file for more details.

== Installation ==

1. **Upload the Plugin Files**: Upload the `flexible-layout-preview-image-for-acf` folder to the `/wp-content/plugins/` directory.
2. **Activate the Plugin**: Activate the plugin through the 'Plugins' screen in WordPress.
3. **Add Preview Images**: Place your layout preview images in your active theme's directory at `/lib/admin/images/flexible-layout-preview-image-for-acf/` with filenames corresponding to the layout names.
4. **View in Admin**: Go to any page or post editor where you have ACF flexible content fields. You'll see the preview images in the ACF layout selection popup.

== Frequently Asked Questions ==

= What is required for this plugin to work? =

You need to have the Advanced Custom Fields (ACF) plugin installed and active on your WordPress site.

= Where do I place my custom layout preview images? =

Place your images in your active theme's directory at `/lib/admin/images/flexible-layout-preview-image-for-acf/`. The images should be named according to your ACF layout names (e.g., `layout-name.jpg`).

= What if an image is not found? =

If an image for a specific layout is not found in the specified directory, the plugin will display a default image.

= Can I customize the path where images are loaded from? =

Yes, developers can use the `flexible_layout_preview-image_for_acf_images_path` filter to customize the path where images are loaded from.

== Screenshots ==

1. **Flexible Layout Preview in Admin**: Screenshot showing the preview images in the ACF flexible layout popup.
2. **Custom Layout Image Path**: Example of the folder structure and custom images in the theme directory.

== Changelog ==

= 1.2 =
Stable release.

= 1.1 =
Stable release.

= 1.0.0 =
* Initial release of the plugin.
* Added functionality to display custom layout preview images in ACF flexible content fields.
* Supports image customization via filters.

== Upgrade Notice ==

= 1.2 =
Stable release.

= 1.1 =
Stable release.

= 1.0.0 =
Initial release.