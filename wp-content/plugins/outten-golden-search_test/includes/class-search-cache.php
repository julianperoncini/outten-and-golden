<?php
/**
 * Search Cache Handler
 * Manages caching for search results
 */

if (!defined('ABSPATH')) {
    exit;
}

class Outten_Search_Cache {
    
    /**
     * Instance
     * @var Outten_Search_Cache
     */
    private static $instance = null;
    
    /**
     * Settings instance
     * @var Outten_Search_Settings
     */
    private $settings;
    
    /**
     * Cache table name
     * @var string
     */
    private $table_name;
    
    /**
     * Memory cache
     * @var array
     */
    private $memory_cache = [];
    
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
        $this->table_name = $wpdb->prefix . 'outten_search_cache';
        $this->settings = Outten_Search_Settings::get_instance();
        
        add_action('init', [$this, 'init']);
    }
    
    /**
     * Initialize
     */
    public function init() {
        if ($this->settings->get('enable_cache', true)) {
            $this->schedule_cleanup();
        }
    }
    
    /**
     * Get cached data
     */
    public function get($key) {
        if (!$this->settings->get('enable_cache', true)) {
            return false;
        }
        
        // Check memory cache first
        if (isset($this->memory_cache[$key])) {
            return $this->memory_cache[$key];
        }
        
        // Check WordPress object cache
        $wp_cache_key = $this->get_wp_cache_key($key);
        $cached = wp_cache_get($wp_cache_key, 'outten_search');
        
        if ($cached !== false) {
            $this->memory_cache[$key] = $cached;
            return $cached;
        }
        
        // Check database cache
        global $wpdb;
        
        $result = $wpdb->get_row($wpdb->prepare("
            SELECT cache_value, expires
            FROM {$this->table_name}
            WHERE cache_key = %s
            AND expires > NOW()
        ", $key));
        
        if ($result) {
            $data = maybe_unserialize($result->cache_value);
            
            // Store in memory and WP cache
            $this->memory_cache[$key] = $data;
            wp_cache_set($wp_cache_key, $data, 'outten_search', 300); // 5 min WP cache
            
            return $data;
        }
        
        return false;
    }
    
    /**
     * Set cache data
     */
    public function set($key, $data, $duration = null) {
        if (!$this->settings->get('enable_cache', true)) {
            return false;
        }
        
        if ($duration === null) {
            $duration = $this->settings->get('cache_duration', 300);
        }
        
        // Store in memory cache
        $this->memory_cache[$key] = $data;
        
        // Store in WordPress object cache
        $wp_cache_key = $this->get_wp_cache_key($key);
        wp_cache_set($wp_cache_key, $data, 'outten_search', min($duration, 300));
        
        // Store in database cache
        global $wpdb;
        
        $expires = date('Y-m-d H:i:s', time() + $duration);
        $serialized_data = maybe_serialize($data);
        
        $result = $wpdb->replace($this->table_name, [
            'cache_key' => $key,
            'cache_value' => $serialized_data,
            'expires' => $expires,
            'created' => current_time('mysql')
        ]);
        
        return $result !== false;
    }
    
    /**
     * Delete cached data
     */
    public function delete($key) {
        // Remove from memory cache
        unset($this->memory_cache[$key]);
        
        // Remove from WordPress cache
        $wp_cache_key = $this->get_wp_cache_key($key);
        wp_cache_delete($wp_cache_key, 'outten_search');
        
        // Remove from database cache
        global $wpdb;
        
        return $wpdb->delete($this->table_name, ['cache_key' => $key]) !== false;
    }
    
    /**
     * Clear all cache
     */
    public function clear_all() {
        // Clear memory cache
        $this->memory_cache = [];
        
        // Clear WordPress cache group
        wp_cache_flush_group('outten_search');
        
        // Clear database cache
        global $wpdb;
        
        return $wpdb->query("TRUNCATE TABLE {$this->table_name}") !== false;
    }
    
    /**
     * Clean expired cache entries
     */
    public function cleanup_expired() {
        global $wpdb;
        
        $deleted = $wpdb->query("
            DELETE FROM {$this->table_name}
            WHERE expires < NOW()
        ");
        
        if ($deleted !== false && $deleted > 0) {
            Outten_Search_Helpers::debug_log("Cleaned up {$deleted} expired cache entries");
        }
        
        return $deleted !== false ? $deleted : 0;
    }
    
    /**
     * Get cache statistics
     */
    public function get_stats() {
        global $wpdb;
        
        $total_entries = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
        $expired_entries = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE expires < NOW()");
        $active_entries = $total_entries - $expired_entries;
        
        $table_size = $wpdb->get_row("
            SELECT 
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
                data_length,
                index_length
            FROM information_schema.TABLES 
            WHERE table_schema = DATABASE() 
            AND table_name = '{$this->table_name}'
        ");
        
        return [
            'total_entries' => intval($total_entries),
            'active_entries' => intval($active_entries),
            'expired_entries' => intval($expired_entries),
            'memory_cache_size' => count($this->memory_cache),
            'table_size_mb' => $table_size ? floatval($table_size->size_mb) : 0,
            'cache_enabled' => $this->settings->get('enable_cache', true),
            'cache_duration' => $this->settings->get('cache_duration', 300)
        ];
    }
    
    /**
     * Get WordPress cache key
     */
    private function get_wp_cache_key($key) {
        return 'search_' . md5($key);
    }
    
    /**
     * Schedule cache cleanup
     */
    private function schedule_cleanup() {
        $interval = $this->settings->get('cache_cleanup_interval', 'daily');
        
        if (!wp_next_scheduled('outten_search_cache_cleanup')) {
            wp_schedule_event(time(), $interval, 'outten_search_cache_cleanup');
        }
        
        add_action('outten_search_cache_cleanup', [$this, 'cleanup_expired']);
    }
    
    /**
     * Get cache key with prefix
     */
    public function get_cache_key($prefix, ...$parts) {
        return Outten_Search_Helpers::generate_cache_key($prefix, ...$parts);
    }
    
    /**
     * Cache with automatic key generation
     */
    public function cache_search_results($query, $post_types, $limit, $results) {
        $key = $this->get_cache_key('search', $query, $post_types, $limit);
        return $this->set($key, $results);
    }
    
    /**
     * Get cached search results
     */
    public function get_cached_search_results($query, $post_types, $limit) {
        $key = $this->get_cache_key('search', $query, $post_types, $limit);
        return $this->get($key);
    }
    
    /**
     * Invalidate cache by pattern
     */
    public function invalidate_pattern($pattern) {
        global $wpdb;
        
        $keys = $wpdb->get_col($wpdb->prepare("
            SELECT cache_key 
            FROM {$this->table_name} 
            WHERE cache_key LIKE %s
        ", $pattern));
        
        $deleted = 0;
        foreach ($keys as $key) {
            if ($this->delete($key)) {
                $deleted++;
            }
        }
        
        return $deleted;
    }
    
    /**
     * Warm cache with popular searches
     */
    public function warm_cache($popular_queries = []) {
        if (!$this->settings->get('enable_cache', true)) {
            return false;
        }
        
        if (empty($popular_queries)) {
            // Get popular queries from analytics
            $analytics = Outten_Search_Analytics::get_instance();
            $popular_terms = $analytics->get_popular_search_terms(10, 7);
            $popular_queries = wp_list_pluck($popular_terms, 'query');
        }
        
        $api = Outten_Search_API::get_instance();
        $warmed = 0;
        
        foreach ($popular_queries as $query) {
            if (strlen($query) >= $this->settings->get('min_query_length', 2)) {
                // Create a mock request
                $request = new WP_REST_Request('GET', '/outten/v1/search');
                $request->set_param('query', $query);
                $request->set_param('post_types', $this->settings->get('default_post_types', 'issues,cases,posts'));
                $request->set_param('limit', $this->settings->get('max_results', 15));
                
                // This will cache the results
                $api->handle_search($request);
                $warmed++;
            }
        }
        
        return $warmed;
    }
    
    /**
     * Get oldest cache entries
     */
    public function get_oldest_entries($limit = 10) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare("
            SELECT cache_key, created, expires,
                   CASE WHEN expires < NOW() THEN 'expired' ELSE 'active' END as status
            FROM {$this->table_name}
            ORDER BY created ASC
            LIMIT %d
        ", $limit));
    }
    
    /**
     * Get cache hit rate (approximate)
     */
    public function get_hit_rate() {
        // This would require tracking hits/misses
        // For now, return basic stats
        $stats = $this->get_stats();
        
        if ($stats['total_entries'] == 0) {
            return 0;
        }
        
        return round(($stats['active_entries'] / $stats['total_entries']) * 100, 2);
    }
}