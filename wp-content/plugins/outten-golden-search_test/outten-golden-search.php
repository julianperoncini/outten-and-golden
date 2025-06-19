<?php
/**
 * Plugin Name: Outten & Golden Search - Beaver Builder
 * Plugin URI: https://outtenandgolden.com
 * Description: Advanced predictive search functionality for Issues and Cases
 * Version: 1.0.0
 * Author: Motto
 * Author URI: https://wearemotto.com
 * License: GPL v2 or later
 * Text Domain: outten-search
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('OUTTEN_SEARCH_VERSION', '1.0.0');
define('OUTTEN_SEARCH_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('OUTTEN_SEARCH_PLUGIN_URL', plugin_dir_url(__FILE__));
define('OUTTEN_SEARCH_PLUGIN_FILE', __FILE__);
define('OUTTEN_SEARCH_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main Plugin Class
 */
final class Outten_Golden_Search_Plugin {
    
    /**
     * Plugin instance
     * @var Outten_Golden_Search_Plugin
     */
    private static $instance = null;
    
    /**
     * Get plugin instance
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
        $this->init_hooks();
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('plugins_loaded', [$this, 'init']);
        
        // Activation/Deactivation hooks
        register_activation_hook(OUTTEN_SEARCH_PLUGIN_FILE, [$this, 'activate']);
        register_deactivation_hook(OUTTEN_SEARCH_PLUGIN_FILE, [$this, 'deactivate']);
        register_uninstall_hook(OUTTEN_SEARCH_PLUGIN_FILE, [__CLASS__, 'uninstall']);
        
        // Plugin action links
        add_filter('plugin_action_links_' . OUTTEN_SEARCH_PLUGIN_BASENAME, [$this, 'add_action_links']);
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Check WordPress version
        if (!$this->check_requirements()) {
            return;
        }
        
        // Load dependencies
        $this->load_dependencies();
        
        // Initialize components
        $this->init_components();
        
        // Load textdomain
        $this->load_textdomain();
        
        // Plugin loaded action
        do_action('outten_search_loaded');
    }
    
    /**
     * Check plugin requirements
     */
    private function check_requirements() {
        global $wp_version;
        
        if (version_compare($wp_version, '5.0', '<')) {
            add_action('admin_notices', [$this, 'wordpress_version_notice']);
            return false;
        }
        
        if (version_compare(PHP_VERSION, '7.4', '<')) {
            add_action('admin_notices', [$this, 'php_version_notice']);
            return false;
        }
        
        return true;
    }
    
    /**
     * Load plugin dependencies
     */
    private function load_dependencies() {
        // Core classes
        require_once OUTTEN_SEARCH_PLUGIN_DIR . 'includes/class-search-api.php';
        require_once OUTTEN_SEARCH_PLUGIN_DIR . 'includes/class-search-admin.php';
        require_once OUTTEN_SEARCH_PLUGIN_DIR . 'includes/class-search-analytics.php';
        require_once OUTTEN_SEARCH_PLUGIN_DIR . 'includes/class-search-cache.php';
        require_once OUTTEN_SEARCH_PLUGIN_DIR . 'includes/class-search-frontend.php';
        
        // Helper classes
        require_once OUTTEN_SEARCH_PLUGIN_DIR . 'includes/class-search-helpers.php';
        require_once OUTTEN_SEARCH_PLUGIN_DIR . 'includes/class-search-settings.php';
        
        // Load functions
        require_once OUTTEN_SEARCH_PLUGIN_DIR . 'includes/functions.php';
    }
    
    /**
     * Initialize plugin components
     */
    private function init_components() {
        // Initialize in order of dependency
        Outten_Search_Settings::get_instance();
        Outten_Search_Cache::get_instance();
        Outten_Search_Analytics::get_instance();
        Outten_Search_API::get_instance();
        Outten_Search_Frontend::get_instance();
        
        // Admin components (only in admin)
        if (is_admin()) {
            Outten_Search_Admin::get_instance();
        }
    }
    
    /**
     * Load plugin textdomain
     */
    private function load_textdomain() {
        load_plugin_textdomain(
            'outten-search',
            false,
            dirname(OUTTEN_SEARCH_PLUGIN_BASENAME) . '/languages'
        );
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Check requirements
        if (!$this->check_requirements()) {
            wp_die(__('Plugin requirements not met.', 'outten-search'));
        }
        
        // Create database tables
        $this->create_tables();
        
        // Set default options
        $this->set_default_options();
        
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Set activation flag
        update_option('outten_search_activated', true);
        
        do_action('outten_search_activated');
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Clear scheduled events
        wp_clear_scheduled_hook('outten_search_cleanup');
        
        do_action('outten_search_deactivated');
    }
    
    /**
     * Plugin uninstall
     */
    public static function uninstall() {
        // Check if we should remove data
        if (!get_option('outten_search_remove_data_on_uninstall', false)) {
            return;
        }
        
        // Remove database tables
        global $wpdb;
        
        $tables = [
            $wpdb->prefix . 'outten_search_analytics',
            $wpdb->prefix . 'outten_search_cache'
        ];
        
        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS {$table}");
        }
        
        // Remove options
        $options = [
            'outten_search_settings',
            'outten_search_version',
            'outten_search_activated',
            'outten_search_remove_data_on_uninstall'
        ];
        
        foreach ($options as $option) {
            delete_option($option);
        }
        
        // Clear caches
        wp_cache_flush();
        
        do_action('outten_search_uninstalled');
    }
    
    /**
     * Create database tables
     */
    private function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Analytics table
        $analytics_table = $wpdb->prefix . 'outten_search_analytics';
        $analytics_sql = "CREATE TABLE IF NOT EXISTS {$analytics_table} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            query varchar(255) NOT NULL,
            results_count int(11) NOT NULL DEFAULT 0,
            selected_result_id bigint(20) DEFAULT NULL,
            post_type varchar(50) DEFAULT NULL,
            user_ip varchar(45) DEFAULT NULL,
            user_agent text DEFAULT NULL,
            session_id varchar(100) DEFAULT NULL,
            timestamp datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY query_idx (query(50)),
            KEY timestamp_idx (timestamp),
            KEY post_type_idx (post_type),
            KEY session_idx (session_id)
        ) {$charset_collate};";
        
        // Cache table
        $cache_table = $wpdb->prefix . 'outten_search_cache';
        $cache_sql = "CREATE TABLE IF NOT EXISTS {$cache_table} (
            cache_key varchar(255) NOT NULL,
            cache_value longtext NOT NULL,
            expires datetime NOT NULL,
            created datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (cache_key),
            KEY expires_idx (expires)
        ) {$charset_collate};";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($analytics_sql);
        dbDelta($cache_sql);
    }
    
    /**
     * Set default plugin options
     */
    private function set_default_options() {
        $default_settings = [
            'enable_analytics' => true,
            'enable_cache' => true,
            'cache_duration' => 300,
            'max_results' => 15,
            'min_query_length' => 2,
            'default_post_types' => 'issues,cases,posts',
            'debounce_delay' => 250,
            'enable_frontend_scripts' => true,
            'remove_data_on_uninstall' => false
        ];
        
        add_option('outten_search_settings', $default_settings);
        add_option('outten_search_version', OUTTEN_SEARCH_VERSION);
    }
    
    /**
     * Add plugin action links
     */
    public function add_action_links($links) {
        $plugin_links = [
            '<a href="' . admin_url('options-general.php?page=outten-search') . '">' . __('Settings', 'outten-search') . '</a>',
            '<a href="' . admin_url('options-general.php?page=outten-search&tab=analytics') . '">' . __('Analytics', 'outten-search') . '</a>',
        ];
        
        return array_merge($plugin_links, $links);
    }
    
    /**
     * WordPress version notice
     */
    public function wordpress_version_notice() {
        echo '<div class="notice notice-error"><p>';
        printf(
            __('Outten & Golden Search requires WordPress version 5.0 or higher. You are running version %s. Please update WordPress.', 'outten-search'),
            get_bloginfo('version')
        );
        echo '</p></div>';
    }
    
    /**
     * PHP version notice
     */
    public function php_version_notice() {
        echo '<div class="notice notice-error"><p>';
        printf(
            __('Outten & Golden Search requires PHP version 7.4 or higher. You are running version %s. Please update PHP.', 'outten-search'),
            PHP_VERSION
        );
        echo '</p></div>';
    }
    
    /**
     * Get plugin info
     */
    public static function get_plugin_info() {
        return [
            'name' => 'Outten & Golden Search',
            'version' => OUTTEN_SEARCH_VERSION,
            'file' => OUTTEN_SEARCH_PLUGIN_FILE,
            'dir' => OUTTEN_SEARCH_PLUGIN_DIR,
            'url' => OUTTEN_SEARCH_PLUGIN_URL,
            'basename' => OUTTEN_SEARCH_PLUGIN_BASENAME
        ];
    }
}

/**
 * Initialize plugin
 */
function outten_search_init() {
    return Outten_Golden_Search_Plugin::get_instance();
}

// Start the plugin
outten_search_init();