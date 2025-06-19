<?php
/**
 * Search Admin Handler
 * Manages admin interface and settings pages
 */

if (!defined('ABSPATH')) {
    exit;
}

class Outten_Search_Admin {
    
    /**
     * Instance
     * @var Outten_Search_Admin
     */
    private static $instance = null;
    
    /**
     * Settings instance
     * @var Outten_Search_Settings
     */
    private $settings;
    
    /**
     * Analytics instance
     * @var Outten_Search_Analytics
     */
    private $analytics;
    
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
        $this->analytics = Outten_Search_Analytics::get_instance();
        
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'admin_init']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_scripts']);
    }
    
    /**
     * Admin initialization
     */
    public function admin_init() {
        // Register settings
        register_setting(
            'outten_search_settings_group',
            'outten_search_settings',
            [$this, 'sanitize_settings']
        );
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('Outten Search Settings', 'outten-search'),
            __('Outten Search', 'outten-search'),
            'manage_options',
            'outten-search',
            [$this, 'admin_page']
        );
    }
    
    /**
     * Enqueue admin scripts
     */
    public function enqueue_admin_scripts($hook) {
        if ($hook !== 'settings_page_outten-search') {
            return;
        }
        
        wp_enqueue_script('jquery');
        wp_enqueue_script('wp-color-picker');
        wp_enqueue_style('wp-color-picker');
    }
    
    /**
     * Admin page
     */
    public function admin_page() {
        $settings = $this->settings->get_all();
        $current_tab = isset($_GET['tab']) ? $_GET['tab'] : 'general';
        
        if (isset($_POST['submit'])) {
            check_admin_referer('outten_search_settings');
            $new_settings = $_POST['outten_search_settings'] ?? [];
            $this->settings->update($new_settings);
            echo '<div class="notice notice-success"><p>' . __('Settings saved!', 'outten-search') . '</p></div>';
        }
        
        ?>
        <div class="wrap">
            <h1><?php _e('Outten & Golden Search Settings', 'outten-search'); ?></h1>
            
            <nav class="nav-tab-wrapper">
                <a href="?page=outten-search&tab=general" class="nav-tab <?php echo $current_tab === 'general' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('General', 'outten-search'); ?>
                </a>
                <a href="?page=outten-search&tab=analytics" class="nav-tab <?php echo $current_tab === 'analytics' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Analytics', 'outten-search'); ?>
                </a>
                <a href="?page=outten-search&tab=advanced" class="nav-tab <?php echo $current_tab === 'advanced' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Advanced', 'outten-search'); ?>
                </a>
            </nav>
            
            <form method="post" action="">
                <?php wp_nonce_field('outten_search_settings'); ?>
                
                <?php if ($current_tab === 'general'): ?>
                    <?php $this->render_general_tab($settings); ?>
                <?php elseif ($current_tab === 'analytics'): ?>
                    <?php $this->render_analytics_tab(); ?>
                <?php elseif ($current_tab === 'advanced'): ?>
                    <?php $this->render_advanced_tab($settings); ?>
                <?php endif; ?>
                
                <?php if ($current_tab !== 'analytics'): ?>
                    <?php submit_button(); ?>
                <?php endif; ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * Render general settings tab
     */
    private function render_general_tab($settings) {
        ?>
        <table class="form-table">
            <tr>
                <th scope="row"><?php _e('Enable Analytics', 'outten-search'); ?></th>
                <td>
                    <input type="checkbox" name="outten_search_settings[enable_analytics]" value="1" 
                           <?php checked($settings['enable_analytics'] ?? true); ?> />
                    <p class="description"><?php _e('Track search queries for insights and improvements', 'outten-search'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Enable Caching', 'outten-search'); ?></th>
                <td>
                    <input type="checkbox" name="outten_search_settings[enable_cache]" value="1" 
                           <?php checked($settings['enable_cache'] ?? true); ?> />
                    <p class="description"><?php _e('Cache search results to improve performance', 'outten-search'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Maximum Results', 'outten-search'); ?></th>
                <td>
                    <input type="number" name="outten_search_settings[max_results]" 
                           value="<?php echo esc_attr($settings['max_results'] ?? 15); ?>" 
                           min="5" max="50" />
                    <p class="description"><?php _e('Maximum number of search results to return (5-50)', 'outten-search'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Minimum Query Length', 'outten-search'); ?></th>
                <td>
                    <input type="number" name="outten_search_settings[min_query_length]" 
                           value="<?php echo esc_attr($settings['min_query_length'] ?? 2); ?>" 
                           min="1" max="10" />
                    <p class="description"><?php _e('Minimum characters required to trigger search (1-10)', 'outten-search'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Default Post Types', 'outten-search'); ?></th>
                <td>
                    <input type="text" name="outten_search_settings[default_post_types]" 
                           value="<?php echo esc_attr($settings['default_post_types'] ?? 'issues,cases,posts'); ?>" 
                           class="regular-text" />
                    <p class="description"><?php _e('Comma-separated list of post types to search by default', 'outten-search'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * Render analytics tab
     */
    private function render_analytics_tab() {
        $stats = $this->analytics->get_stats(30);
        $popular_terms = $this->analytics->get_popular_search_terms(10, 30);
        $zero_results = $this->analytics->get_zero_result_queries(10, 30);
        
        ?>
        <div class="outten-search-analytics">
            <h2><?php _e('Search Statistics (Last 30 Days)', 'outten-search'); ?></h2>
            
            <div class="outten-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
                <div class="outten-stat-card" style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h3><?php _e('Total Searches', 'outten-search'); ?></h3>
                    <p style="font-size: 2em; margin: 0; color: #0073aa;"><?php echo esc_html($stats['total_searches']); ?></p>
                </div>
                
                <div class="outten-stat-card" style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h3><?php _e('Success Rate', 'outten-search'); ?></h3>
                    <p style="font-size: 2em; margin: 0; color: #46b450;"><?php echo esc_html($stats['success_rate']); ?>%</p>
                </div>
                
                <div class="outten-stat-card" style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h3><?php _e('Click-through Rate', 'outten-search'); ?></h3>
                    <p style="font-size: 2em; margin: 0; color: #f56e28;"><?php echo esc_html($stats['click_through_rate']); ?>%</p>
                </div>
                
                <div class="outten-stat-card" style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h3><?php _e('Avg Results', 'outten-search'); ?></h3>
                    <p style="font-size: 2em; margin: 0; color: #826eb4;"><?php echo esc_html($stats['avg_results_per_search']); ?></p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
                <div>
                    <h3><?php _e('Popular Search Terms', 'outten-search'); ?></h3>
                    <?php if (!empty($popular_terms)): ?>
                        <table class="wp-list-table widefat fixed striped">
                            <thead>
                                <tr>
                                    <th><?php _e('Query', 'outten-search'); ?></th>
                                    <th><?php _e('Count', 'outten-search'); ?></th>
                                    <th><?php _e('Avg Results', 'outten-search'); ?></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($popular_terms as $term): ?>
                                <tr>
                                    <td><?php echo esc_html($term->query); ?></td>
                                    <td><?php echo esc_html($term->search_count); ?></td>
                                    <td><?php echo esc_html(round($term->avg_results, 1)); ?></td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <p><?php _e('No search data available yet.', 'outten-search'); ?></p>
                    <?php endif; ?>
                </div>
                
                <div>
                    <h3><?php _e('Zero Result Queries', 'outten-search'); ?></h3>
                    <?php if (!empty($zero_results)): ?>
                        <table class="wp-list-table widefat fixed striped">
                            <thead>
                                <tr>
                                    <th><?php _e('Query', 'outten-search'); ?></th>
                                    <th><?php _e('Count', 'outten-search'); ?></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($zero_results as $term): ?>
                                <tr>
                                    <td><?php echo esc_html($term->query); ?></td>
                                    <td><?php echo esc_html($term->search_count); ?></td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <p><?php _e('No zero result queries found.', 'outten-search'); ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render advanced settings tab
     */
    private function render_advanced_tab($settings) {
        ?>
        <table class="form-table">
            <tr>
                <th scope="row"><?php _e('Cache Duration (seconds)', 'outten-search'); ?></th>
                <td>
                    <input type="number" name="outten_search_settings[cache_duration]" 
                           value="<?php echo esc_attr($settings['cache_duration'] ?? 300); ?>" 
                           min="60" max="3600" step="60" />
                    <p class="description"><?php _e('How long to cache search results (60-3600 seconds)', 'outten-search'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Debounce Delay (ms)', 'outten-search'); ?></th>
                <td>
                    <input type="number" name="outten_search_settings[debounce_delay]" 
                           value="<?php echo esc_attr($settings['debounce_delay'] ?? 250); ?>" 
                           min="100" max="2000" step="50" />
                    <p class="description"><?php _e('Delay before triggering search after user stops typing (100-2000ms)', 'outten-search'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Analytics Retention (days)', 'outten-search'); ?></th>
                <td>
                    <input type="number" name="outten_search_settings[analytics_retention_days]" 
                           value="<?php echo esc_attr($settings['analytics_retention_days'] ?? 90); ?>" 
                           min="7" max="365" />
                    <p class="description"><?php _e('How long to keep analytics data (7-365 days)', 'outten-search'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Remove Data on Uninstall', 'outten-search'); ?></th>
                <td>
                    <input type="checkbox" name="outten_search_settings[remove_data_on_uninstall]" value="1" 
                           <?php checked($settings['remove_data_on_uninstall'] ?? false); ?> />
                    <p class="description"><?php _e('Remove all plugin data when uninstalling (cannot be undone)', 'outten-search'); ?></p>
                </td>
            </tr>
        </table>
        
        <h3><?php _e('API Endpoints', 'outten-search'); ?></h3>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th><?php _e('Endpoint', 'outten-search'); ?></th>
                    <th><?php _e('URL', 'outten-search'); ?></th>
                    <th><?php _e('Test', 'outten-search'); ?></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Main Search</td>
                    <td><code><?php echo esc_html(rest_url('outten/v1/search')); ?></code></td>
                    <td><a href="<?php echo esc_url(rest_url('outten/v1/test')); ?>" target="_blank" class="button button-small">Test</a></td>
                </tr>
                <tr>
                    <td>Tag Search</td>
                    <td><code><?php echo esc_html(rest_url('outten/v1/tag-search')); ?></code></td>
                    <td>POST only</td>
                </tr>
                <tr>
                    <td>Plugin Info</td>
                    <td><code><?php echo esc_html(rest_url('outten/v1/info')); ?></code></td>
                    <td><a href="<?php echo esc_url(rest_url('outten/v1/info')); ?>" target="_blank" class="button button-small">View</a></td>
                </tr>
            </tbody>
        </table>
        <?php
    }
    
    /**
     * Sanitize settings
     */
    public function sanitize_settings($input) {
        return $this->settings->validate_settings($input, $this->settings->get_all());
    }
}