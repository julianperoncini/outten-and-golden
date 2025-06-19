<?php
/**
 * Search Frontend Handler
 * Manages frontend scripts and styles
 */

if (!defined('ABSPATH')) {
    exit;
}

class Outten_Search_Frontend {
    
    /**
     * Instance
     * @var Outten_Search_Frontend
     */
    private static $instance = null;
    
    /**
     * Settings instance
     * @var Outten_Search_Settings
     */
    private $settings;
    
    /**
     * Get instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->settings = Outten_Search_Settings::get_instance();
        
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('wp_head', [$this, 'add_search_config']);

        add_action('wp_ajax_outten_search', [$this, 'handle_outten_ajax_search']);
        add_action('wp_ajax_nopriv_outten_search', [$this, 'handle_outten_ajax_search']);
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        if (!$this->settings->get('enable_frontend_scripts', true)) {
            return;
        }
        
        // Main search script
        wp_enqueue_script(
            'outten-search',
            OUTTEN_SEARCH_PLUGIN_URL . 'assets/js/main.js',
            ['jquery'],
            OUTTEN_SEARCH_VERSION,
            true
        );
        
        // Localize script with settings and URLs
        wp_localize_script('outten-search', 'outtenSearchConfig', [
            'apiUrl' => rest_url('outten/v1/search'),
            'tagSearchUrl' => rest_url('outten/v1/tag-search'),
            'analyticsUrl' => rest_url('outten/v1/analytics'),
            'nonce' => wp_create_nonce('wp_rest'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'settings' => [
                'minQueryLength' => $this->settings->get('min_query_length', 2),
                'maxResults' => $this->settings->get('max_results', 15),
                'debounceDelay' => $this->settings->get('debounce_delay', 250),
                'postTypes' => $this->settings->get('default_post_types', 'issues,cases,posts'),
                'enableAnalytics' => $this->settings->get('enable_analytics', true),
                'enableCache' => $this->settings->get('enable_cache', true)
            ],
            'i18n' => [
                'searching' => __('Searching...', 'outten-search'),
                'noResults' => __('No results found', 'outten-search'),
                'searchError' => __('Search failed. Please try again.', 'outten-search'),
                'minChars' => sprintf(__('Please enter at least %d characters', 'outten-search'), $this->settings->get('min_query_length', 2))
            ]
        ]);
        
        // Main search styles
        wp_enqueue_style(
            'outten-search',
            OUTTEN_SEARCH_PLUGIN_URL . 'assets/css/outten-search.css',
            [],
            OUTTEN_SEARCH_VERSION
        );
    }
    
    /**
     * Add search configuration to head
     */
    public function add_search_config() {
        if (!$this->settings->get('enable_frontend_scripts', true)) {
            return;
        }
        
        ?>
        <script type="application/json" id="outten-search-config">
        {
            "apiUrl": "<?php echo esc_url(rest_url('outten/v1/search')); ?>",
            "tagSearchUrl": "<?php echo esc_url(rest_url('outten/v1/tag-search')); ?>",
            "settings": {
                "minQueryLength": <?php echo intval($this->settings->get('min_query_length', 2)); ?>,
                "maxResults": <?php echo intval($this->settings->get('max_results', 15)); ?>,
                "debounceDelay": <?php echo intval($this->settings->get('debounce_delay', 250)); ?>,
                "postTypes": "<?php echo esc_js($this->settings->get('default_post_types', 'issues,cases,posts')); ?>",
                "enableAnalytics": <?php echo $this->settings->get('enable_analytics', true) ? 'true' : 'false'; ?>
            }
        }
        </script>
        <?php
    }

    function handle_outten_ajax_search() {
        // Verify nonce
        if (!wp_verify_nonce($_REQUEST['nonce'], 'outten_search_nonce')) {
            wp_die('Security check failed');
        }
        
        $query = sanitize_text_field($_REQUEST['query']);
        $post_types = sanitize_text_field($_REQUEST['post_types'] ?? 'issues,cases,posts');
        $limit = intval($_REQUEST['limit'] ?? 10);
        
        // Use the same search logic as the REST API
        $api = Outten_Search_API::get_instance();
        $request = new WP_REST_Request('GET', '/outten/v1/search');
        $request->set_param('query', $query);
        $request->set_param('post_types', $post_types);
        $request->set_param('limit', $limit);
        
        $response = $api->handle_search($request);
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
        } else {
            wp_send_json_success($response->get_data());
        }
    }
}