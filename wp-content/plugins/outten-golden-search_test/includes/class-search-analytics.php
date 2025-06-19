<?php
/**
 * Search Analytics Handler
 * Tracks search queries and user interactions
 */

if (!defined('ABSPATH')) {
    exit;
}

class Outten_Search_Analytics {
    
    /**
     * Instance
     * @var Outten_Search_Analytics
     */
    private static $instance = null;
    
    /**
     * Settings instance
     * @var Outten_Search_Settings
     */
    private $settings;
    
    /**
     * Table name
     * @var string
     */
    private $table_name;
    
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
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'outten_search_analytics';
        $this->settings = Outten_Search_Settings::get_instance();
        
        add_action('init', [$this, 'init']);
    }
    
    /**
     * Initialize
     */
    public function init() {
        // Schedule cleanup if analytics enabled
        if ($this->settings->get('enable_analytics', true)) {
            $this->schedule_cleanup();
        }
    }
    
    /**
     * Track search query
     */
    public function track_search($query, $results_count, $post_types = []) {
        if (!$this->settings->get('enable_analytics', true)) {
            return false;
        }
        
        global $wpdb;
        
        $data = [
            'query' => Outten_Search_Helpers::clean_query_for_logging($query),
            'results_count' => intval($results_count),
            'post_type' => is_array($post_types) ? implode(',', $post_types) : $post_types,
            'user_ip' => Outten_Search_Helpers::get_client_ip(),
            'user_agent' => Outten_Search_Helpers::get_user_agent(),
            'session_id' => Outten_Search_Helpers::get_session_id(),
            'timestamp' => current_time('mysql')
        ];
        
        $result = $wpdb->insert($this->table_name, $data);
        
        if ($result === false) {
            Outten_Search_Helpers::debug_log('Failed to track search', [
                'query' => $query,
                'error' => $wpdb->last_error
            ]);
        }
        
        return $result !== false;
    }
    
    /**
     * Track result selection
     */
    public function track_result_selection($query, $result_id, $post_type = '', $results_count = 0) {
        if (!$this->settings->get('enable_analytics', true)) {
            return false;
        }
        
        global $wpdb;
        
        $data = [
            'query' => Outten_Search_Helpers::clean_query_for_logging($query),
            'results_count' => intval($results_count),
            'selected_result_id' => intval($result_id),
            'post_type' => sanitize_text_field($post_type),
            'user_ip' => Outten_Search_Helpers::get_client_ip(),
            'user_agent' => Outten_Search_Helpers::get_user_agent(),
            'session_id' => Outten_Search_Helpers::get_session_id(),
            'timestamp' => current_time('mysql')
        ];
        
        return $wpdb->insert($this->table_name, $data) !== false;
    }
    
    /**
     * Track tag-based search
     */
    public function track_tag_search($tags, $query = '') {
        if (!$this->settings->get('enable_analytics', true)) {
            return false;
        }
        
        $tag_texts = array_column($tags, 'text');
        $search_query = !empty($query) ? $query . ' [tags: ' . implode(', ', $tag_texts) . ']' : '[tags: ' . implode(', ', $tag_texts) . ']';
        
        return $this->track_search($search_query, count($tags), 'tag_search');
    }
    
    /**
     * Track from REST request
     */
    public function track_from_request($request) {
        if (!$this->settings->get('enable_analytics', true)) {
            return rest_ensure_response(['success' => false, 'message' => 'Analytics disabled']);
        }
        
        $data = $request->get_json_params();
        
        if (empty($data)) {
            return new WP_Error('no_data', 'No analytics data provided', ['status' => 400]);
        }
        
        $result = false;
        
        if (!empty($data['selected_result_id'])) {
            $result = $this->track_result_selection(
                $data['query'] ?? '',
                $data['selected_result_id'],
                $data['post_type'] ?? '',
                $data['results_count'] ?? 0
            );
        } else {
            $result = $this->track_search(
                $data['query'] ?? '',
                $data['results_count'] ?? 0,
                $data['post_type'] ?? ''
            );
        }
        
        return rest_ensure_response([
            'success' => $result,
            'tracked_at' => current_time('c')
        ]);
    }
    
    /**
     * Get popular search terms
     */
    public function get_popular_search_terms($limit = 10, $days = 30) {
        global $wpdb;
        
        $date_limit = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        $results = $wpdb->get_results($wpdb->prepare("
            SELECT query, COUNT(*) as search_count, AVG(results_count) as avg_results
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND query != ''
            AND selected_result_id IS NULL
            GROUP BY query
            ORDER BY search_count DESC, avg_results DESC
            LIMIT %d
        ", $date_limit, $limit));
        
        return $results ?: [];
    }
    
    /**
     * Get search statistics
     */
    public function get_stats($days = 30) {
        global $wpdb;
        
        $date_limit = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        // Total searches
        $total_searches = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*)
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND selected_result_id IS NULL
        ", $date_limit));
        
        // Searches with results
        $searches_with_results = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*)
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND results_count > 0
            AND selected_result_id IS NULL
        ", $date_limit));
        
        // Searches with clicks
        $searches_with_clicks = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(DISTINCT query)
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND selected_result_id IS NOT NULL
        ", $date_limit));
        
        // Average results per search
        $avg_results = $wpdb->get_var($wpdb->prepare("
            SELECT AVG(results_count)
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND results_count > 0
            AND selected_result_id IS NULL
        ", $date_limit));
        
        // Top post types searched
        $top_post_types = $wpdb->get_results($wpdb->prepare("
            SELECT post_type, COUNT(*) as search_count
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND post_type != ''
            AND post_type != 'tag_search'
            AND selected_result_id IS NULL
            GROUP BY post_type
            ORDER BY search_count DESC
            LIMIT 5
        ", $date_limit));
        
        return [
            'total_searches' => intval($total_searches),
            'searches_with_results' => intval($searches_with_results),
            'searches_with_clicks' => intval($searches_with_clicks),
            'success_rate' => $total_searches > 0 ? round(($searches_with_results / $total_searches) * 100, 2) : 0,
            'click_through_rate' => $searches_with_results > 0 ? round(($searches_with_clicks / $searches_with_results) * 100, 2) : 0,
            'avg_results_per_search' => round(floatval($avg_results), 2),
            'top_post_types' => $top_post_types ?: [],
            'period_days' => $days
        ];
    }
    
    /**
     * Get search trends over time
     */
    public function get_search_trends($days = 30) {
        global $wpdb;
        
        $date_limit = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        $results = $wpdb->get_results($wpdb->prepare("
            SELECT DATE(timestamp) as search_date, 
                   COUNT(*) as search_count,
                   COUNT(CASE WHEN results_count > 0 THEN 1 END) as successful_searches
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND selected_result_id IS NULL
            GROUP BY DATE(timestamp)
            ORDER BY search_date ASC
        ", $date_limit));
        
        return $results ?: [];
    }
    
    /**
     * Get zero result queries
     */
    public function get_zero_result_queries($limit = 20, $days = 30) {
        global $wpdb;
        
        $date_limit = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        $results = $wpdb->get_results($wpdb->prepare("
            SELECT query, COUNT(*) as search_count
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND results_count = 0
            AND query != ''
            AND selected_result_id IS NULL
            GROUP BY query
            ORDER BY search_count DESC
            LIMIT %d
        ", $date_limit, $limit));
        
        return $results ?: [];
    }
    
    /**
     * Get most clicked results
     */
    public function get_most_clicked_results($limit = 20, $days = 30) {
        global $wpdb;
        
        $date_limit = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        $results = $wpdb->get_results($wpdb->prepare("
            SELECT selected_result_id, post_type, COUNT(*) as click_count
            FROM {$this->table_name}
            WHERE timestamp > %s
            AND selected_result_id IS NOT NULL
            GROUP BY selected_result_id, post_type
            ORDER BY click_count DESC
            LIMIT %d
        ", $date_limit, $limit));
        
        // Enrich with post data
        foreach ($results as &$result) {
            $post = get_post($result->selected_result_id);
            if ($post) {
                $result->post_title = $post->post_title;
                $result->post_url = get_permalink($post);
            }
        }
        
        return $results ?: [];
    }
    
    /**
     * Clean old analytics data
     */
    public function cleanup_old_data() {
        if (!$this->settings->get('enable_analytics', true)) {
            return 0;
        }
        
        global $wpdb;
        
        $retention_days = $this->settings->get('analytics_retention_days', 90);
        $date_limit = date('Y-m-d H:i:s', strtotime("-{$retention_days} days"));
        
        $deleted = $wpdb->query($wpdb->prepare("
            DELETE FROM {$this->table_name}
            WHERE timestamp < %s
        ", $date_limit));
        
        if ($deleted !== false) {
            Outten_Search_Helpers::debug_log("Cleaned up {$deleted} old analytics records");
        }
        
        return $deleted !== false ? $deleted : 0;
    }
    
    /**
     * Schedule cleanup task
     */
    private function schedule_cleanup() {
        $interval = $this->settings->get('cache_cleanup_interval', 'daily');
        
        if (!wp_next_scheduled('outten_search_analytics_cleanup')) {
            wp_schedule_event(time(), $interval, 'outten_search_analytics_cleanup');
        }
        
        add_action('outten_search_analytics_cleanup', [$this, 'cleanup_old_data']);
    }
    
    /**
     * Export analytics data
     */
    public function export_data($format = 'csv', $days = 30) {
        global $wpdb;
        
        $date_limit = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        $results = $wpdb->get_results($wpdb->prepare("
            SELECT query, results_count, selected_result_id, post_type, timestamp
            FROM {$this->table_name}
            WHERE timestamp > %s
            ORDER BY timestamp DESC
        ", $date_limit), ARRAY_A);
        
        if ($format === 'csv') {
            return $this->export_to_csv($results);
        }
        
        return $results;
    }
    
    /**
     * Export to CSV format
     */
    private function export_to_csv($data) {
        if (empty($data)) {
            return '';
        }
        
        $output = '';
        
        // Headers
        $headers = array_keys($data[0]);
        $output .= implode(',', $headers) . "\n";
        
        // Data rows
        foreach ($data as $row) {
            $escaped_row = array_map(function($value) {
                return '"' . str_replace('"', '""', $value) . '"';
            }, $row);
            $output .= implode(',', $escaped_row) . "\n";
        }
        
        return $output;
    }
    
    /**
     * Get table size and info
     */
    public function get_table_info() {
        global $wpdb;
        
        $table_status = $wpdb->get_row($wpdb->prepare("
            SHOW TABLE STATUS LIKE %s
        ", $this->table_name));
        
        $row_count = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
        
        return [
            'table_name' => $this->table_name,
            'row_count' => intval($row_count),
            'data_length' => $table_status ? Outten_Search_Helpers::format_file_size($table_status->Data_length) : 'Unknown',
            'index_length' => $table_status ? Outten_Search_Helpers::format_file_size($table_status->Index_length) : 'Unknown',
            'total_size' => $table_status ? Outten_Search_Helpers::format_file_size($table_status->Data_length + $table_status->Index_length) : 'Unknown'
        ];
    }
}