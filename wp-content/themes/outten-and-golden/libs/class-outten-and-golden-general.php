<?php
/**
 * OUTTEN_AND_GOLDEN_Theme_General
 * ===================
 *
 * General theme functions and actions.
 *
 * @author  Jesper Westlund <jesper.westlund1@hotmail.com>
 * @package OUTTEN_AND_GOLDEN
 */

use Timber\Site;
use Timber\Timber;
use Twig\TwigFunction;
use Timmy\Timmy;

class OUTTEN_AND_GOLDEN_Theme_General extends Site {

	/**
	 * Inits hooks and filters.
	 */
	public function __construct() {

        // Init Timmy.
        Timmy::init();

		// Init Timber.
		$this->init_timber();

        // Setup theme support.
        $this->setup_theme_support();

        // Add our hooks.
        $this->add_hooks();

        // Cleanup.
        $this->cleanup_wp_head();

        // Check if ACF is installed.
        if (function_exists('acf_add_options_page')) {
            acf_add_options_page();
        }

        set_post_thumbnail_size( 0, 0 );

		parent::__construct();
	}

	/**
	 * Inits Timber.
	 * @return void
	 */
	private function init_timber() {
        if (!class_exists('\Timber\Timber')) {
            error_log('Timber is not loaded properly.');
            return;
        }

		Timber::$dirname = ['views'];
	}

    private function setup_theme_support() {
        $supports = [
            'post-thumbnails',
            'categories',
            'menus',
            'title-tag'
        ];
        
        foreach ($supports as $support) {
            add_theme_support($support);
        }
    }

    private function add_hooks() {
        add_action('wp_footer',         [$this, 'deregister_wp_scripts']);
        add_filter('timber/context',    [$this, 'add_base_timber_context']);
        add_action('admin_menu',        [$this, 'remove_comment_from_menu']);
        add_filter('timber/twig',       [$this, 'add_to_twig']);
        add_action('after_setup_theme', [$this, 'register_menus']);
        add_filter('timmy/sizes',       [$this, 'get_image_sizes']);
        add_filter('acf/load_field/type=image', [$this, 'get_id_images']);
        add_filter('wpseo_image_sizes', [$this, 'filter_image_sizes']);
        add_filter('timmy/sizes',      [$this, 'add_og_image_size']);
        add_action('wp_enqueue_scripts', [$this, 'remove_gravity_forms_css'], 20);
        add_filter('upload_mimes', [$this, 'allow_svg_upload']);
        add_action('admin_init', [$this, 'disable_content_editor']);
        add_action('do_meta_boxes', [$this, 'remove_featured_image_metabox']);
        add_filter('show_admin_bar',     '__return_false');
        add_filter('taxi_namespace', [$this, 'taxi_namespace']);

        add_action('admin_head-profile.php', [$this, 'hide_gravatar_section']);
        add_action('admin_head-user-edit.php', [$this, 'hide_gravatar_section']);

        add_action('init', [$this, 'modify_tags_to_hierarchical'], 0);

        add_filter('gform_disable_css', '__return_true');
 
        // Dequeue all GF styles at a later priority
        add_action('wp_enqueue_scripts', function() {
            wp_dequeue_style('gforms_reset_css');
            wp_dequeue_style('gforms_datepicker_css');
            wp_dequeue_style('gforms_formsmain_css');
            wp_dequeue_style('gforms_ready_class_css');
            wp_dequeue_style('gforms_browsers_css');
        }, 999);

        add_filter( 'timmy/sizes', function( $sizes ) {
            return array_map( function( $size ) {
                if ( ! isset( $size['webp'] ) ) {
                    $size['webp'] = true;
                }
        
                return $size;
            }, $sizes );
        }, 50 );

        add_filter('timber/twig', function($twig) {
            $twig->addFunction(new \Twig\TwigFunction('get_svg', function($attachment, $class = '') {
                if (!$attachment) return '';
                
                // Handle different input types
                if (is_numeric($attachment)) {
                    $attachment_id = $attachment;
                } elseif (is_array($attachment) && isset($attachment['ID'])) {
                    $attachment_id = $attachment['ID'];
                } elseif (is_object($attachment) && isset($attachment->ID)) {
                    $attachment_id = $attachment->ID;
                } else {
                    return '';
                }
                
                $svg_path = get_attached_file($attachment_id);
                
                if (!$svg_path || !file_exists($svg_path)) {
                    return '';
                }
                
                $svg_content = file_get_contents($svg_path);
                
                // Add class if provided
                if ($class) {
                    // Check if class attribute already exists
                    if (preg_match('/class="([^"]*)"/', $svg_content, $matches)) {
                        // Append to existing class
                        $existing_classes = $matches[1];
                        $new_classes = $existing_classes . ' ' . $class;
                        $svg_content = str_replace('class="' . $existing_classes . '"', 'class="' . $new_classes . '"', $svg_content);
                    } else {
                        // Add class attribute to <svg> tag
                        $svg_content = preg_replace('/<svg/', '<svg class="' . $class . '"', $svg_content, 1);
                    }
                }
                
                return $svg_content;
            }));
            
            return $twig;
        });


        /**
         * Gravity Forms
         * ============
         *
         * Customize the Gravity Forms field content.
         *
         * @param string $content The field content.
         * @param object $field The field object.
         */
        add_filter('gform_field_content', function($content, $field, $value, $lead_id, $form_id) {
            if (is_admin()) return $content;

            $input_types = ['text', 'email', 'textarea', 'number', 'phone', 'website', 'password'];

            if (in_array($field->type, $input_types)) {
                // Add placeholder to input and textarea elements if they don't have one
                if (!preg_match('/placeholder=/', $content)) {
                    // Handle input tags
                    $content = preg_replace('/(<input[^>]*)(>)/', '$1 placeholder=" "$2', $content);
                    // Handle textarea tags
                    $content = preg_replace('/(<textarea[^>]*)(>)/', '$1 placeholder=" "$2', $content);
                }

                // Extract the label
                preg_match('/<label.*?<\/label>/s', $content, $label_match);
                $label_html = $label_match[0] ?? '';

                if ($label_html) {
                    // For textarea fields, keep the label above (don't move it)
                    if ($field->type === 'textarea') {
                        // Do nothing - leave label in original position above the field
                    } else {
                        // For other input types, move label below the input
                        // Remove the original label
                        $content = preg_replace('/<label.*?<\/label>/s', '', $content);
                        
                        // Place label immediately after the input
                        $content = preg_replace('/(<input[^>]*>)(\s*)/', '$1$2' . $label_html, $content);
                    }
                }
            }

            return $content;
        }, 10, 5);

    }


    public function modify_tags_to_hierarchical() {
        register_taxonomy('post_tag', 'post', array(
            'hierarchical' => true,
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_nav_menus' => true,
            'show_tagcloud' => true,
            'meta_box_cb' => 'post_categories_meta_box', // This gives it the category-style metabox
            'labels' => array(
                'name' => 'Tags',
                'singular_name' => 'Tag',
                'menu_name' => 'Tags',
                'all_items' => 'All Tags',
                'edit_item' => 'Edit Tag',
                'view_item' => 'View Tag',
                'update_item' => 'Update Tag',
                'add_new_item' => 'Add New Tag',
                'new_item_name' => 'New Tag Name',
                'parent_item' => 'Parent Tag',
                'parent_item_colon' => 'Parent Tag:',
                'search_items' => 'Search Tags',
                'popular_items' => 'Popular Tags',
                'not_found' => 'No tags found'
            ),
            'rewrite' => array('slug' => 'tag', 'hierarchical' => true),
        ));
    }
    

    public function allow_svg_upload($mimes) {
        if (current_user_can('administrator')) {
            $mimes['svg']  = 'image/svg+xml';
            $mimes['svgz'] = 'image/svg+xml';
        }
        return $mimes;
    }

    public function remove_gravity_forms_css() {
        wp_deregister_style('gforms_reset_css');
        wp_deregister_style('gforms_datepicker_css');
        wp_deregister_style('gforms_formsmain_css');
        wp_deregister_style('gforms_ready_class_css');
        wp_deregister_style('gforms_browsers_css');

        add_filter('gform_disable_css', '__return_true');
    }

    public function add_og_image_size( $sizes ) {
        return array_merge( $sizes, [
            'og-image'          => [
                'resize'     => [ 1200, 630 ],
                'post_types' => [ 'all' ],
            ],
        ] );
    }

    public function filter_image_sizes($sizes) {
        // Remove 'full' image size.
        $sizes = array_filter( $sizes, function( $size ) {
            return 'full' !== $size;
        } );

        // Prepend 'og-image'.
        array_unshift( $sizes, 'og-image' );

        return $sizes;
    }

    public function get_image_sizes($sizes) {
        return array(
            'thumbnail' => array(
                'resize' => array( 250 ),
            ),
            'small' => array(
                'resize' => array( 370 ),
                'srcset' => array( array( 570 ) ),
            ),
            'medium' => array(
                'resize' => array( 420 ),
                'srcset' => array( array( 720 ) ),
            ),
            'large' => array(
                'resize' => array( 1440 ),
                'srcset' => array(
                    array( 370 ),
                    array( 570 ),
                    array( 1440 ),
                )
            ),
            'hero' => array(
                'resize' => array( 1920 ),
                'srcset' => array(
                    array( 1200 ),
                    array( 1440 ),
                    array( 1920 ),
                )
            )
        );
    }

    public function get_id_images($field) {
        $field['return_format'] = 'id';
        return $field;
    }

    public function register_menus() {
        register_nav_menu('main-menu', __('Main', 'outten-and-golden'));
        register_nav_menu('menu-1', __('Menu 1', 'outten-and-golden'));
        register_nav_menu('menu-2', __('Menu 2', 'outten-and-golden'));
        register_nav_menu('footer-menu-1', __('Footer Menu 1', 'outten-and-golden'));
        register_nav_menu('footer-menu-2', __('Footer Menu 2', 'outten-and-golden'));
        register_nav_menu('footer-menu-3', __('Footer Menu 3', 'outten-and-golden'));
        register_nav_menu('footer-menu-4', __('Footer Menu 4', 'outten-and-golden'));
        register_nav_menu('footer-menu-5', __('Footer Menu 5', 'outten-and-golden'));
        register_nav_menu('footer-menu-6', __('Footer Menu 6', 'outten-and-golden'));
    }

    private function cleanup_wp_head() {
        $actions_to_remove = [
            'rest_output_link_wp_head', 'wp_oembed_add_discovery_links', 'wlwmanifest_link',
            'index_rel_link', 'rsd_link', 'wp_generator', 'feed_links',
            'feed_links_extra', 'start_post_rel_link', 'parent_post_rel_link',
            'adjacent_posts_rel_link', 'adjacent_posts_rel_link_wp_head',
            'wp_shortlink_wp_head', 'print_emoji_detection_script',
        ];

        foreach ($actions_to_remove as $action) {
            remove_action('wp_head', $action);
        }

        // Remove global printing emoji styles
        remove_action('wp_print_styles',     'print_emoji_styles');
        remove_action('admin_print_styles',  'print_emoji_styles');
        remove_action('admin_print_scripts', 'print_emoji_detection_script');
        remove_action('template_redirect',   'rest_output_link_header', 11);

        // Remove SVG and global styles
        remove_action('wp_enqueue_scripts', 'wp_enqueue_global_styles');
        remove_action('wp_footer',          'wp_enqueue_global_styles', 1);

        // Remove render_block filters
        remove_filter('render_block', 'wp_render_duotone_support');
        remove_filter('render_block', 'wp_restore_group_inner_container');
        remove_filter('render_block', 'wp_render_layout_support_flag');
    }

    public function add_to_twig($twig) {
        if (function_exists('sanitize_title')) {
            $twig->addFunction(
                new TwigFunction(
                    'sanitize_title',
                    function ($title, $fallback_title = '', $context = 'save') {
                        return sanitize_title($title, $fallback_title, $context);
                    }
                )
            );
        }
        return $twig;
    }

    public function deregister_wp_scripts() {
        wp_deregister_script('wp-embed');
    }

    public function add_base_timber_context($context) {
        $context['site']    = $this;
        $context['menu']    = Timber::get_menu('main-menu');
        $context['menu_1']    = Timber::get_menu('menu-1');
        $context['menu_2']    = Timber::get_menu('menu-2');
        $context['footer_menu_1'] = Timber::get_menu('footer-menu-1');
        $context['footer_menu_2'] = Timber::get_menu('footer-menu-2');
        $context['footer_menu_3'] = Timber::get_menu('footer-menu-3');
        $context['footer_menu_4'] = Timber::get_menu('footer-menu-4');
        $context['footer_menu_5'] = Timber::get_menu('footer-menu-5');
        $context['footer_menu_6'] = Timber::get_menu('footer-menu-6');

        if (class_exists('GFAPI')) {
            ob_start();
            gravity_form(1, false, false, false, '', true); // Last parameter enables AJAX
            $context['gravity_form'] = ob_get_clean();
        }

        
        $context['all_tags'] = Timber::get_terms([
            'taxonomy' => 'post_tag',
            'hide_empty' => false,
            'number' => 20,
            //'orderby' => 'count',
            'order' => 'ASC'
        ]);

        $context['latest_cases'] = Timber::get_posts([
            'post_type' => 'cases',
            'posts_per_page' => 6,
            'orderby' => 'date',
            'order' => 'ASC'
        ]);

        $context['latest_posts'] = Timber::get_posts([
            'post_type' => 'post',
            'posts_per_page' => 6,
            'orderby' => 'date',
            'order' => 'ASC'
        ]);

        $search_related = get_field('search_category', 'option');


        // Convert WP_Post objects to Timber Posts
        if ($search_related) {
            foreach ($search_related as &$category) {
                if (isset($category['search_category_posts'])) {
                    foreach ($category['search_category_posts'] as &$post_group) {
                        if (isset($post_group['search_category_post'])) {
                            foreach ($post_group['search_category_post'] as &$post) {
                                // Handle WP_Post object
                                if (is_object($post) && $post instanceof WP_Post) {
                                    // Use Timber::get_post() instead
                                    $post = Timber::get_post($post->ID);
                                }
                            }
                        }
                    }
                }
            }
        }

        $context['search_related'] = $search_related;

        $context['taxi_namespace'] = $this->taxi_namespace('default');


        $context['options'] = get_fields('option');
        $args = array(
            'post_type' => 'post',
            'posts_per_page' => -1,
        );
        
        $context['posts'] = Timber::get_posts($args);
        $context['breadcrumb'] = $this->get_breadcrumb();
        $context['is_home'] = is_front_page();

        $context['page_data'] = [
            'type' => $this->get_page_type(),
            'template' => get_page_template_slug(),
            'body_classes' => get_body_class(),
        ];

        return $context;
    }

    public function add_svg_to_mime_types($mimes) {
        $mimes['svg'] = 'image/svg+xml';
        $mimes['eps'] = 'application/postscript';
        return $mimes;
    }

    public function remove_comment_from_menu() {
        remove_menu_page('edit-comments.php');
    }

    public function disable_content_editor() {
        remove_post_type_support('page', 'editor');
    }

    public function remove_featured_image_metabox() {
        remove_meta_box('postimagediv', 'page', 'side');
    }

    public function hide_gravatar_section() {
        echo '<style>
            /* Hide the Profile Picture section */
            .user-profile-picture,
            tr.user-profile-picture-wrap,
            .form-table tr:has([href*="gravatar"]),
            .form-table tr:has(img[src*="gravatar"]) {
                display: none !important;
            }
        </style>';
        
        echo '<script>
        document.addEventListener("DOMContentLoaded", function() {
            // Hide Profile Picture heading
            const headings = document.querySelectorAll("h3");
            headings.forEach(function(h3) {
                if (h3.textContent.includes("Profile Picture")) {
                    h3.style.display = "none";
                    // Hide the next table
                    let nextElement = h3.nextElementSibling;
                    if (nextElement && nextElement.classList.contains("form-table")) {
                        nextElement.style.display = "none";
                    }
                }
            });
            
            // Hide Gravatar links and images
            const gravatarElements = document.querySelectorAll("a[href*=\'gravatar\'], img[src*=\'gravatar\']");
            gravatarElements.forEach(function(element) {
                let row = element.closest("tr");
                if (row) {
                    row.style.display = "none";
                }
            });
        });
        </script>';
    }

    // public function get_breadcrumb() {
    //     global $post;
    //     $breadcrumb = [];
    
    //     if (!is_front_page()) {
    //         $breadcrumb[] = [
    //             'label' => 'Home',
    //             'url'   => home_url('/')
    //         ];
    
    //         if (is_single()) {
    //             $post_type = get_post_type();
    
    //             if ($post_type !== 'post' && $post_type !== 'page') {
    //                 $post_type_obj = get_post_type_object($post_type);
    //                 if ($post_type_obj && $post_type_obj->has_archive) {
    //                     $breadcrumb[] = [
    //                         'label' => $post_type_obj->labels->name,
    //                         'url'   => get_post_type_archive_link($post_type)
    //                     ];
    //                 }
    //             }
    
    //             if ($post_type === 'post') {
    //                 $categories = get_the_category();
    //                 if (!empty($categories)) {
    //                     $breadcrumb[] = [
    //                         'label' => $categories[0]->name,
    //                         'url'   => get_category_link($categories[0]->term_id)
    //                     ];
    //                 }
    //             }
    
    //             $breadcrumb[] = [
    //                 'label' => get_the_title(),
    //                 'url'   => get_permalink()
    //             ];
    
    //         } elseif (is_page()) {
    //             $ancestors = get_post_ancestors($post);
    //             $ancestors = array_reverse($ancestors);

    //             foreach ($ancestors as $ancestor_id) {
    //                 $breadcrumb[] = [
    //                     'label' => get_the_title($ancestor_id),
    //                     'url'   => get_permalink($ancestor_id)
    //                 ];
    //             }
    
    //             $breadcrumb[] = [
    //                 'label' => get_the_title(),
    //                 'url'   => get_permalink()
    //             ];
    //         } elseif (is_post_type_archive()) {
    //             $post_type = get_post_type();
    //             $post_type_obj = get_post_type_object($post_type);
    //             $breadcrumb[] = [
    //                 'label' => $post_type_obj->labels->name,
    //                 'url'   => get_post_type_archive_link($post_type)
    //             ];
    //         } elseif (is_category()) {
    //             $category = get_queried_object();
    //             $breadcrumb[] = [
    //                 'label' => $category->name,
    //                 'url'   => get_category_link($category->term_id)
    //             ];
    //         }
    //     }
    
    //     return $breadcrumb;
    // }

    public function get_breadcrumb() {
        global $post;
        $breadcrumb = [];
    
        if (!is_front_page()) {
            $breadcrumb[] = [
                'label' => 'Home',
                'url'   => home_url('/')
            ];
    
            if (is_single()) {
                $post_type = get_post_type();
    
                if ($post_type === 'attorney') {
                    $breadcrumb[] = [
                        'label' => 'Team',
                        'url'   => home_url('/attorney')
                    ];
                } 
                elseif ($post_type === 'client-stories') {
                    $breadcrumb[] = [
                        'label' => 'Client Stories',
                        'url'   => home_url('/client-stories')
                    ];
                } 
                elseif ($post_type === 'cases') {
                    $breadcrumb[] = [
                        'label' => 'Cases & Investigations',
                        'url'   => home_url('/cases-and-investigations')
                    ];
                }
                elseif ($post_type === 'capabilities') {
                    $breadcrumb[] = [
                        'label' => 'Capabilities',
                        'url'   => home_url('/capabilities')
                    ];
                }
                elseif ($post_type === 'issues') {
                    $breadcrumb[] = [
                        'label' => 'Issues',
                        'url'   => home_url('/issues')
                    ];
                }
                elseif ($post_type !== 'post' && $post_type !== 'page') {
                    $post_type_obj = get_post_type_object($post_type);
                    if ($post_type_obj && $post_type_obj->has_archive) {
                        $breadcrumb[] = [
                            'label' => $post_type_obj->labels->name,
                            'url'   => get_post_type_archive_link($post_type)
                        ];
                    }
                }
    
                if ($post_type === 'post') {
                    $breadcrumb[] = [
                        'label' => 'Newsroom',
                        'url'   => home_url('/newsroom')
                    ];
                }
    
                $breadcrumb[] = [
                    'label' => get_the_title(),
                    'url'   => get_permalink()
                ];
    
            } elseif (is_page()) {
                $ancestors = get_post_ancestors($post);
                $ancestors = array_reverse($ancestors);
    
                foreach ($ancestors as $ancestor_id) {
                    $breadcrumb[] = [
                        'label' => get_the_title($ancestor_id),
                        'url'   => get_permalink($ancestor_id)
                    ];
                }
    
                $breadcrumb[] = [
                    'label' => get_the_title(),
                    'url'   => get_permalink()
                ];
            } elseif (is_post_type_archive()) {
                $post_type = get_post_type();
                $post_type_obj = get_post_type_object($post_type);
                $breadcrumb[] = [
                    'label' => $post_type_obj->labels->name,
                    'url'   => get_post_type_archive_link($post_type)
                ];
            } elseif (is_category()) {
                $category = get_queried_object();
                $breadcrumb[] = [
                    'label' => $category->name,
                    'url'   => get_category_link($category->term_id)
                ];
            }
        }
    
        return $breadcrumb;
    }
    
    public function taxi_namespace( $ns ) {
        global $wp_query;
    
        if ( is_page() ) {
            $ns = 'page';
        }
    
        if ( is_front_page() ) {
            $ns = 'home';
        }
    
        // Detect custom search or enhanced search
        $is_custom_search = is_search() || get_query_var('search_tags') || get_query_var('search_type');
    
        if ( $is_custom_search ) {
            $current_path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
    
            $search_query = get_search_query();
            $search_tags  = get_query_var('search_tags');
            $has_tags     = !empty($search_tags);
    
            $is_clean_search_url = strpos($current_path, 'search') === 0;
            $is_empty_search     = empty($search_query) && !$has_tags;
    
            if ( $is_empty_search ) {
                $ns = 'search-empty';
            } elseif ( isset($wp_query->found_posts) && $wp_query->found_posts == 0 ) {
                $ns = 'search-no-results';
            } else {
                $ns = 'search';
            }
        }
    
        if ( is_single() ) {
            $ns = 'single';
        }
    
        if ( is_archive() ) {
            $ns = 'archive';
        }
    
        if ( is_category() ) {
            $ns = 'category';
        }
    
        return $ns;
    }
    
}

new OUTTEN_AND_GOLDEN_Theme_General;