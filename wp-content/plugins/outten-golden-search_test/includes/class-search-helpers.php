<?php
/**
 * Search Helper Functions
 * Utility functions and helpers for search functionality
 */

if (!defined('ABSPATH')) {
    exit;
}

class Outten_Search_Helpers {
    
    /**
     * Get taxonomies for a specific post
     */
    public static function get_post_taxonomies($post_id, $post_type) {
        $categories = [];
        $tags = [];
        
        // Get all public taxonomies for this post type
        $taxonomies = get_object_taxonomies($post_type, 'objects');
        
        foreach ($taxonomies as $taxonomy) {
            if (!$taxonomy->public) {
                continue;
            }
            
            $terms = get_the_terms($post_id, $taxonomy->name);
            if ($terms && !is_wp_error($terms)) {
                $term_names = wp_list_pluck($terms, 'name');
                
                if ($taxonomy->hierarchical) {
                    $categories = array_merge($categories, $term_names);
                } else {
                    $tags = array_merge($tags, $term_names);
                }
            }
        }
        
        return [
            'categories' => array_unique($categories),
            'tags' => array_unique($tags)
        ];
    }
    
    /**
     * Get client IP address
     */
    public static function get_client_ip() {
        $ip_keys = [
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        ];
        
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) && !empty($_SERVER[$key])) {
                $ips = explode(',', $_SERVER[$key]);
                $ip = trim($ips[0]);
                
                // Validate IP
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '';
    }
    
    /**
     * Get user agent
     */
    public static function get_user_agent() {
        return sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? '');
    }
    
    /**
     * Generate session ID
     */
    public static function get_session_id() {
        if (session_status() === PHP_SESSION_NONE) {
            return wp_generate_uuid4();
        }
        return session_id();
    }
    
    /**
     * Sanitize search query
     */
    public static function sanitize_search_query($query) {
        // Remove HTML tags
        $query = wp_strip_all_tags($query);
        
        // Remove extra whitespace
        $query = preg_replace('/\s+/', ' ', $query);
        
        // Trim
        $query = trim($query);
        
        // Remove dangerous characters but keep useful ones
        $query = preg_replace('/[<>"\'\(\)\{\}\[\]]/', '', $query);
        
        return $query;
    }
    
    /**
     * Highlight search terms in text
     */
    public static function highlight_search_terms($text, $search_query, $highlight_class = 'search-highlight') {
        if (empty($search_query) || empty($text)) {
            return $text;
        }
        
        // Split search query into words
        $words = preg_split('/\s+/', $search_query);
        $words = array_filter($words, function($word) {
            return strlen($word) > 2; // Only highlight words longer than 2 characters
        });
        
        if (empty($words)) {
            return $text;
        }
        
        // Sort by length (longest first) to avoid partial replacements
        usort($words, function($a, $b) {
            return strlen($b) - strlen($a);
        });
        
        foreach ($words as $word) {
            $escaped_word = preg_quote($word, '/');
            $text = preg_replace(
                '/\b(' . $escaped_word . ')\b/iu',
                '<mark class="' . esc_attr($highlight_class) . '">$1</mark>',
                $text
            );
        }
        
        return $text;
    }
    
    /**
     * Format search time
     */
    public static function format_search_time($start_time) {
        return round(microtime(true) - $start_time, 4);
    }
    
    /**
     * Check if post type is searchable
     */
    public static function is_post_type_searchable($post_type) {
        $post_type_obj = get_post_type_object($post_type);
        
        if (!$post_type_obj) {
            return false;
        }
        
        return $post_type_obj->public && !$post_type_obj->exclude_from_search;
    }
    
    /**
     * Get searchable post types
     */
    public static function get_searchable_post_types() {
        $post_types = get_post_types(['public' => true], 'objects');
        $searchable = [];
        
        foreach ($post_types as $post_type) {
            if (self::is_post_type_searchable($post_type->name)) {
                $searchable[] = [
                    'name' => $post_type->name,
                    'label' => $post_type->label,
                    'singular_name' => $post_type->labels->singular_name ?? $post_type->label
                ];
            }
        }
        
        return $searchable;
    }
    
    /**
     * Clean search query for logging
     */
    public static function clean_query_for_logging($query) {
        // Remove potentially sensitive information
        $cleaned = preg_replace('/\b(?:password|pass|pwd|token|key|secret|email|phone|ssn)\b[:\s]*\S+/i', '[REDACTED]', $query);
        
        // Limit length
        if (strlen($cleaned) > 255) {
            $cleaned = substr($cleaned, 0, 252) . '...';
        }
        
        return $cleaned;
    }
    
    /**
     * Parse post types string
     */
    public static function parse_post_types($post_types_string) {
        if (empty($post_types_string)) {
            return [];
        }
        
        $post_types = array_map('trim', explode(',', $post_types_string));
        return array_filter($post_types, 'post_type_exists');
    }
    
    /**
     * Get post type display name
     */
    public static function get_post_type_label($post_type) {
        $labels = [
            'issues' => __('Issue', 'outten-search'),
            'cases' => __('Case', 'outten-search'),
            'posts' => __('Post', 'outten-search'),
            'post' => __('Post', 'outten-search'),
            'page' => __('Page', 'outten-search')
        ];
        
        if (isset($labels[$post_type])) {
            return $labels[$post_type];
        }
        
        $post_type_obj = get_post_type_object($post_type);
        if ($post_type_obj) {
            return $post_type_obj->labels->singular_name ?? $post_type_obj->label;
        }
        
        return ucfirst($post_type);
    }
    
    /**
     * Check if request is from mobile device
     */
    public static function is_mobile() {
        return wp_is_mobile();
    }
    
    /**
     * Get browser information
     */
    public static function get_browser_info() {
        $user_agent = self::get_user_agent();
        
        if (empty($user_agent)) {
            return ['browser' => 'Unknown', 'version' => 'Unknown'];
        }
        
        // Simple browser detection
        $browsers = [
            'Chrome' => '/Chrome\/([0-9.]+)/',
            'Firefox' => '/Firefox\/([0-9.]+)/',
            'Safari' => '/Safari\/([0-9.]+)/',
            'Edge' => '/Edge\/([0-9.]+)/',
            'Internet Explorer' => '/MSIE ([0-9.]+)/'
        ];
        
        foreach ($browsers as $browser => $pattern) {
            if (preg_match($pattern, $user_agent, $matches)) {
                return [
                    'browser' => $browser,
                    'version' => $matches[1] ?? 'Unknown'
                ];
            }
        }
        
        return ['browser' => 'Unknown', 'version' => 'Unknown'];
    }
    
    /**
     * Validate email address
     */
    public static function is_valid_email($email) {
        return is_email($email);
    }
    
    /**
     * Format file size
     */
    public static function format_file_size($bytes) {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
    
    /**
     * Get memory usage
     */
    public static function get_memory_usage() {
        return [
            'current' => self::format_file_size(memory_get_usage()),
            'peak' => self::format_file_size(memory_get_peak_usage()),
            'limit' => ini_get('memory_limit')
        ];
    }
    
    /**
     * Log debug message
     */
    public static function debug_log($message, $data = null) {
        if (!WP_DEBUG_LOG) {
            return;
        }
        
        $log_message = '[Outten Search] ' . $message;
        
        if ($data !== null) {
            $log_message .= ' | Data: ' . print_r($data, true);
        }
        
        error_log($log_message);
    }
    
    /**
     * Check if string contains HTML
     */
    public static function contains_html($string) {
        return $string !== strip_tags($string);
    }
    
    /**
     * Truncate text safely
     */
    public static function truncate_text($text, $length = 100, $suffix = '...') {
        if (strlen($text) <= $length) {
            return $text;
        }
        
        $truncated = substr($text, 0, $length);
        
        // Try to break at word boundary
        $last_space = strrpos($truncated, ' ');
        if ($last_space !== false && $last_space > $length * 0.75) {
            $truncated = substr($truncated, 0, $last_space);
        }
        
        return $truncated . $suffix;
    }
    
    /**
     * Convert array to comma-separated string
     */
    public static function array_to_string($array, $separator = ', ') {
        if (empty($array) || !is_array($array)) {
            return '';
        }
        
        return implode($separator, array_filter($array));
    }
    
    /**
     * Generate cache key
     */
    public static function generate_cache_key($prefix, ...$parts) {
        $key_parts = array_filter($parts, function($part) {
            return $part !== null && $part !== '';
        });
        
        $key = $prefix . '_' . md5(serialize($key_parts));
        
        return substr($key, 0, 250); // Limit key length
    }
    
    /**
     * Check if current user can manage search
     */
    public static function current_user_can_manage_search() {
        return current_user_can('manage_options') || current_user_can('edit_posts');
    }
    
    /**
     * Get WordPress timezone
     */
    public static function get_wordpress_timezone() {
        $timezone_string = get_option('timezone_string');
        
        if (!empty($timezone_string)) {
            return new DateTimeZone($timezone_string);
        }
        
        $offset = get_option('gmt_offset');
        $sign = ($offset < 0) ? '-' : '+';
        $hour = (int) abs($offset);
        $minute = (abs($offset) - $hour) * 60;
        
        $offset_string = sprintf('%s%02d:%02d', $sign, $hour, $minute);
        
        return new DateTimeZone($offset_string);
    }
    
    /**
     * Format date according to WordPress settings
     */
    public static function format_date($timestamp, $format = null) {
        if ($format === null) {
            $format = get_option('date_format') . ' ' . get_option('time_format');
        }
        
        return wp_date($format, $timestamp);
    }
}