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
        add_action('init',              [$this, 'register_menus']);
        add_action('wp_footer',         [$this, 'deregister_wp_scripts']);
        add_filter('timber/context',    [$this, 'add_base_timber_context']);
        add_filter('upload_mimes',      [$this, 'add_svg_to_mime_types']);
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
        add_filter('taxi_namespace', [ $this, 'taxi_namespace' ] );
        
        add_action('admin_head-profile.php', [$this, 'hide_gravatar_section']);
        add_action('admin_head-user-edit.php', [$this, 'hide_gravatar_section']);

        add_filter( 'timmy/sizes', function( $sizes ) {
            return array_map( function( $size ) {
                if ( ! isset( $size['webp'] ) ) {
                    $size['webp'] = true;
                }
        
                return $size;
            }, $sizes );
        }, 50 );
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

        $context['taxi_namespace'] = apply_filters('taxi_namespace', 'default');

        $context['options'] = get_fields('option');
        $args = array(
            'post_type' => 'post',
            'posts_per_page' => -1,
        );
        
        $context['posts'] = Timber::get_posts($args);
        $context['breadcrumb'] = $this->get_breadcrumb();
        $context['is_home'] = is_front_page();

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

    /**
     * Sets the correct highway namespace depending on
     * what page the user is on.
     * @param  string $ns
     * @return string
     */
	public function taxi_namespace( $ns ) {
		if ( is_page() ) {
			$ns = 'page';
		}

		if ( is_front_page() ) {
			$ns = 'home';
		}

		return $ns;
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
                } elseif ($post_type !== 'post' && $post_type !== 'page') {
                    $post_type_obj = get_post_type_object($post_type);
                    if ($post_type_obj && $post_type_obj->has_archive) {
                        $breadcrumb[] = [
                            'label' => $post_type_obj->labels->name,
                            'url'   => get_post_type_archive_link($post_type)
                        ];
                    }
                }
    
                if ($post_type === 'post') {
                    $categories = get_the_category();
                    if (!empty($categories)) {
                        $breadcrumb[] = [
                            'label' => $categories[0]->name,
                            'url'   => get_category_link($categories[0]->term_id)
                        ];
                    }
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
    
}

new OUTTEN_AND_GOLDEN_Theme_General;