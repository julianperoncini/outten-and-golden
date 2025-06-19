<?php
/**
 * Search Settings Handler
 * Manages all plugin settings and options
 */

if (!defined('ABSPATH')) {
    exit;
}

class Outten_Search_Settings {
    
    /**
     * Instance
     * @var Outten_Search_Settings
     */
    private static $instance = null;
    
    /**
     * Settings option name
     * @var string
     */
    private $option_name = 'outten_search_settings';
    
    /**
     * Default settings
     * @var array
     */
    private $defaults = [
        'enable_analytics' => true,
        'enable_cache' => true,
        'cache_duration' => 300,
        'max_results' => 15,
        'min_query_length' => 2,
        'default_post_types' => 'issues,cases,posts',
        'debounce_delay' => 250,
        'enable_frontend_scripts' => true,
        'remove_data_on_uninstall' => false,
        'enable_suggestions' => true,
        'enable_search_highlighting' => true,
        'analytics_retention_days' => 90,
        'cache_cleanup_interval' => 'daily'
    ];
    
    /**
     * Current settings
     * @var array
     */
    private $settings = [];
    
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
        $this->load_settings();
        add_action('init', [$this, 'init']);
    }
    
    /**
     * Initialize
     */
    public function init() {
        add_action('admin_init', [$this, 'register_settings']);
        add_filter('pre_update_option_' . $this->option_name, [$this, 'validate_settings'], 10, 2);
    }
    
    /**
     * Load settings from database
     */
    private function load_settings() {
        $saved_settings = get_option($this->option_name, []);
        $this->settings = wp_parse_args($saved_settings, $this->defaults);
    }
    
    /**
     * Register settings with WordPress
     */
    public function register_settings() {
        register_setting(
            'outten_search_settings_group',
            $this->option_name,
            [
                'sanitize_callback' => [$this, 'sanitize_settings'],
                'default' => $this->defaults
            ]
        );
    }
    
    /**
     * Get a specific setting value
     */
    public function get($key, $default = null) {
        if (array_key_exists($key, $this->settings)) {
            return $this->settings[$key];
        }
        
        if ($default !== null) {
            return $default;
        }
        
        return isset($this->defaults[$key]) ? $this->defaults[$key] : null;
    }
    
    /**
     * Get all settings
     */
    public function get_all() {
        return $this->settings;
    }
    
    /**
     * Set a specific setting value
     */
    public function set($key, $value) {
        $this->settings[$key] = $value;
        return $this->save();
    }
    
    /**
     * Update multiple settings
     */
    public function update($settings) {
        $this->settings = wp_parse_args($settings, $this->settings);
        return $this->save();
    }
    
    /**
     * Save settings to database
     */
    public function save() {
        $result = update_option($this->option_name, $this->settings);
        
        if ($result) {
            do_action('outten_search_settings_saved', $this->settings);
        }
        
        return $result;
    }
    
    /**
     * Reset settings to defaults
     */
    public function reset() {
        $this->settings = $this->defaults;
        return $this->save();
    }
    
    /**
     * Get default settings
     */
    public function get_defaults() {
        return $this->defaults;
    }
    
    /**
     * Validate settings before saving
     */
    public function validate_settings($new_value, $old_value) {
        $validated = [];
        
        // Boolean settings
        $boolean_settings = [
            'enable_analytics',
            'enable_cache',
            'enable_frontend_scripts',
            'remove_data_on_uninstall',
            'enable_suggestions',
            'enable_search_highlighting'
        ];
        
        foreach ($boolean_settings as $setting) {
            $validated[$setting] = !empty($new_value[$setting]);
        }
        
        // Integer settings with min/max constraints
        $validated['cache_duration'] = max(60, min(3600, intval($new_value['cache_duration'] ?? 300)));
        $validated['max_results'] = max(5, min(50, intval($new_value['max_results'] ?? 15)));
        $validated['min_query_length'] = max(1, min(10, intval($new_value['min_query_length'] ?? 2)));
        $validated['debounce_delay'] = max(100, min(2000, intval($new_value['debounce_delay'] ?? 250)));
        $validated['analytics_retention_days'] = max(7, min(365, intval($new_value['analytics_retention_days'] ?? 90)));
        
        // String settings
        $validated['default_post_types'] = sanitize_text_field($new_value['default_post_types'] ?? 'issues,cases,posts');
        $validated['cache_cleanup_interval'] = in_array($new_value['cache_cleanup_interval'] ?? 'daily', ['hourly', 'daily', 'weekly']) 
            ? $new_value['cache_cleanup_interval'] 
            : 'daily';
        
        // Validate post types exist
        $post_types = array_map('trim', explode(',', $validated['default_post_types']));
        $valid_post_types = array_filter($post_types, 'post_type_exists');
        
        if (empty($valid_post_types)) {
            $validated['default_post_types'] = 'post';
        } else {
            $validated['default_post_types'] = implode(',', $valid_post_types);
        }
        
        return apply_filters('outten_search_validate_settings', $validated, $new_value, $old_value);
    }
    
    /**
     * Sanitize settings (legacy support)
     */
    public function sanitize_settings($input) {
        return $this->validate_settings($input, $this->settings);
    }
    
    /**
     * Get settings schema for REST API
     */
    public function get_schema() {
        return [
            'type' => 'object',
            'properties' => [
                'enable_analytics' => [
                    'type' => 'boolean',
                    'description' => __('Enable search analytics tracking', 'outten-search'),
                    'default' => true
                ],
                'enable_cache' => [
                    'type' => 'boolean',
                    'description' => __('Enable search result caching', 'outten-search'),
                    'default' => true
                ],
                'cache_duration' => [
                    'type' => 'integer',
                    'description' => __('Cache duration in seconds', 'outten-search'),
                    'minimum' => 60,
                    'maximum' => 3600,
                    'default' => 300
                ],
                'max_results' => [
                    'type' => 'integer',
                    'description' => __('Maximum search results to return', 'outten-search'),
                    'minimum' => 5,
                    'maximum' => 50,
                    'default' => 15
                ],
                'min_query_length' => [
                    'type' => 'integer',
                    'description' => __('Minimum query length to trigger search', 'outten-search'),
                    'minimum' => 1,
                    'maximum' => 10,
                    'default' => 2
                ],
                'default_post_types' => [
                    'type' => 'string',
                    'description' => __('Default post types to search (comma-separated)', 'outten-search'),
                    'default' => 'issues,cases,posts'
                ],
                'debounce_delay' => [
                    'type' => 'integer',
                    'description' => __('Debounce delay in milliseconds', 'outten-search'),
                    'minimum' => 100,
                    'maximum' => 2000,
                    'default' => 250
                ],
                'enable_frontend_scripts' => [
                    'type' => 'boolean',
                    'description' => __('Auto-enqueue frontend scripts', 'outten-search'),
                    'default' => true
                ],
                'enable_suggestions' => [
                    'type' => 'boolean',
                    'description' => __('Enable search suggestions', 'outten-search'),
                    'default' => true
                ],
                'enable_search_highlighting' => [
                    'type' => 'boolean',
                    'description' => __('Enable search term highlighting', 'outten-search'),
                    'default' => true
                ],
                'analytics_retention_days' => [
                    'type' => 'integer',
                    'description' => __('Days to retain analytics data', 'outten-search'),
                    'minimum' => 7,
                    'maximum' => 365,
                    'default' => 90
                ],
                'cache_cleanup_interval' => [
                    'type' => 'string',
                    'description' => __('Cache cleanup interval', 'outten-search'),
                    'enum' => ['hourly', 'daily', 'weekly'],
                    'default' => 'daily'
                ],
                'remove_data_on_uninstall' => [
                    'type' => 'boolean',
                    'description' => __('Remove all data when plugin is uninstalled', 'outten-search'),
                    'default' => false
                ]
            ]
        ];
    }
    
    /**
     * Export settings
     */
    public function export() {
        return [
            'settings' => $this->settings,
            'version' => OUTTEN_SEARCH_VERSION,
            'exported_at' => current_time('c'),
            'site_url' => get_site_url()
        ];
    }
    
    /**
     * Import settings
     */
    public function import($data) {
        if (!is_array($data) || !isset($data['settings'])) {
            return new WP_Error('invalid_data', __('Invalid import data', 'outten-search'));
        }
        
        $settings = $data['settings'];
        
        // Validate imported settings
        $validated = $this->validate_settings($settings, $this->settings);
        
        // Update settings
        $this->settings = $validated;
        $result = $this->save();
        
        if ($result) {
            do_action('outten_search_settings_imported', $validated, $data);
            return true;
        }
        
        return new WP_Error('import_failed', __('Failed to import settings', 'outten-search'));
    }
    
    /**
     * Get setting field configuration for admin forms
     */
    public function get_field_config($field_name) {
        $configs = [
            'enable_analytics' => [
                'type' => 'checkbox',
                'label' => __('Enable Analytics', 'outten-search'),
                'description' => __('Track search queries and user interactions for insights', 'outten-search')
            ],
            'enable_cache' => [
                'type' => 'checkbox',
                'label' => __('Enable Caching', 'outten-search'),
                'description' => __('Cache search results to improve performance', 'outten-search')
            ],
            'cache_duration' => [
                'type' => 'number',
                'label' => __('Cache Duration (seconds)', 'outten-search'),
                'description' => __('How long to cache search results (60-3600 seconds)', 'outten-search'),
                'min' => 60,
                'max' => 3600,
                'step' => 60
            ],
            'max_results' => [
                'type' => 'number',
                'label' => __('Maximum Results', 'outten-search'),
                'description' => __('Maximum number of search results to return (5-50)', 'outten-search'),
                'min' => 5,
                'max' => 50,
                'step' => 1
            ],
            'min_query_length' => [
                'type' => 'number',
                'label' => __('Minimum Query Length', 'outten-search'),
                'description' => __('Minimum characters required to trigger search (1-10)', 'outten-search'),
                'min' => 1,
                'max' => 10,
                'step' => 1
            ],
            'default_post_types' => [
                'type' => 'text',
                'label' => __('Default Post Types', 'outten-search'),
                'description' => __('Comma-separated list of post types to search by default', 'outten-search'),
                'placeholder' => 'issues,cases,posts'
            ],
            'debounce_delay' => [
                'type' => 'number',
                'label' => __('Debounce Delay (ms)', 'outten-search'),
                'description' => __('Delay before triggering search after user stops typing (100-2000ms)', 'outten-search'),
                'min' => 100,
                'max' => 2000,
                'step' => 50
            ],
            'analytics_retention_days' => [
                'type' => 'number',
                'label' => __('Analytics Retention (days)', 'outten-search'),
                'description' => __('How long to keep analytics data (7-365 days)', 'outten-search'),
                'min' => 7,
                'max' => 365,
                'step' => 1
            ]
        ];
        
        return isset($configs[$field_name]) ? $configs[$field_name] : null;
    }
}