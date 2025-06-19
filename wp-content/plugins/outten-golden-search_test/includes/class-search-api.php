<?php
/**
 * Search API Handler
 * Handles all REST API endpoints for search functionality
 */

if (!defined('ABSPATH')) {
    exit;
}

class Outten_Search_API {
    
    /**
     * Instance
     * @var Outten_Search_API
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
     * Cache instance
     * @var Outten_Search_Cache
     */
    private $cache;
    
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
        $this->cache = Outten_Search_Cache::get_instance();
        
        add_action('rest_api_init', [$this, 'register_routes']);
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Main search endpoint
        register_rest_route('outten/v1', '/search', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_search'],
            'permission_callback' => '__return_true',
            'args' => $this->get_search_args()
        ]);
        
        // Tag-based search endpoint
        register_rest_route('outten/v1', '/tag-search', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_tag_search'],
            'permission_callback' => '__return_true',
            'args' => [
                'tags' => [
                    'required' => false,
                    'type' => 'array',
                    'default' => []
                ],
                'query' => [
                    'required' => false,
                    'type' => 'string',
                    'default' => ''
                ]
            ]
        ]);
        
        // Suggestions endpoint
        register_rest_route('outten/v1', '/suggestions', [
            'methods' => 'GET',
            'callback' => [$this, 'get_suggestions'],
            'permission_callback' => '__return_true',
            'args' => [
                'post_type' => [
                    'required' => false,
                    'type' => 'string',
                    'default' => 'all'
                ],
                'limit' => [
                    'required' => false,
                    'type' => 'integer',
                    'default' => 10
                ]
            ]
        ]);
        
        // Get taxonomies for post type
        register_rest_route('outten/v1', '/taxonomies/(?P<post_type>[a-zA-Z0-9_-]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_post_type_taxonomies'],
            'permission_callback' => '__return_true'
        ]);
        
        // Analytics endpoint
        register_rest_route('outten/v1', '/analytics', [
            'methods' => 'POST',
            'callback' => [$this, 'track_analytics'],
            'permission_callback' => '__return_true'
        ]);
        
        // Debug/info endpoints
        register_rest_route('outten/v1', '/test', [
            'methods' => 'GET',
            'callback' => [$this, 'test_endpoint'],
            'permission_callback' => '__return_true'
        ]);
        
        register_rest_route('outten/v1', '/info', [
            'methods' => 'GET',
            'callback' => [$this, 'get_plugin_info'],
            'permission_callback' => '__return_true'
        ]);
    }
    
    /**
     * Get search endpoint arguments
     */
    private function get_search_args() {
        return [
            'query' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'validate_callback' => [$this, 'validate_query']
            ],
            'post_types' => [
                'required' => false,
                'type' => 'string',
                'default' => $this->settings->get('default_post_types', 'issues,cases,posts'),
                'sanitize_callback' => 'sanitize_text_field'
            ],
            'limit' => [
                'required' => false,
                'type' => 'integer',
                'default' => $this->settings->get('max_results', 10),
                'sanitize_callback' => 'absint'
            ],
            'include_taxonomies' => [
                'required' => false,
                'type' => 'boolean',
                'default' => true
            ],
            'exclude_ids' => [
                'required' => false,
                'type' => 'string',
                'default' => '',
                'sanitize_callback' => 'sanitize_text_field'
            ]
        ];
    }
    
    /**
     * Validate search query
     */
    public function validate_query($param) {
        $min_length = $this->settings->get('min_query_length', 2);
        return strlen(trim($param)) >= $min_length;
    }
    
    /**
     * Handle search request
     */
    public function handle_search($request) {
        $start_time = microtime(true);
        
        // Get parameters
        $query = $request->get_param('query');
        $post_types = $request->get_param('post_types');
        $limit = min($request->get_param('limit'), 50); // Hard cap
        $include_taxonomies = $request->get_param('include_taxonomies');
        $exclude_ids = $request->get_param('exclude_ids');
        
        // Parse post types
        $post_types_array = array_map('trim', explode(',', $post_types));
        $valid_post_types = array_filter($post_types_array, 'post_type_exists');
        
        if (empty($valid_post_types)) {
            return new WP_Error('no_valid_post_types', 'No valid post types provided', ['status' => 400]);
        }
        
        // Check cache
        $cache_key = $this->get_cache_key($query, $post_types, $limit, $include_taxonomies, $exclude_ids);
        if ($this->settings->get('enable_cache', true)) {
            $cached_result = $this->cache->get($cache_key);
            if ($cached_result !== false) {
                return rest_ensure_response($cached_result);
            }
        }
        
        // Parse exclude IDs
        $exclude_ids_array = [];
        if (!empty($exclude_ids)) {
            $exclude_ids_array = array_map('intval', array_filter(explode(',', $exclude_ids)));
        }
        
        // First, search for posts by title and content
        $post_results = $this->search_posts($query, $valid_post_types, $exclude_ids_array, $limit);
        
        // Then, search for posts by taxonomy terms
        $taxonomy_results = $this->search_by_taxonomies($query, $valid_post_types, $exclude_ids_array, $limit);
        
        // Combine and deduplicate results
        $combined_results = $this->combine_search_results($post_results, $taxonomy_results, $limit);
        
        // Format results
        $formatted_results = [];
        foreach ($combined_results as $post) {
            $formatted_results[] = $this->format_post_data($post, $include_taxonomies);
        }
        
        // Track analytics
        $this->analytics->track_search($query, count($formatted_results), $valid_post_types);
        
        // Prepare response
        $response_data = [
            'posts' => $formatted_results,
            'total' => count($formatted_results),
            'query' => $query,
            'post_types' => $valid_post_types,
            'timestamp' => current_time('c'),
            'search_time' => round(microtime(true) - $start_time, 4),
            'search_method' => 'enhanced_taxonomy_search'
        ];
        
        // Cache results
        if ($this->settings->get('enable_cache', true)) {
            $this->cache->set($cache_key, $response_data);
        }
        
        // Apply filters and return
        $response_data = apply_filters('outten_search_results', $response_data, $request);
        
        return rest_ensure_response($response_data);
    }
    
    /**
     * Search posts by title and content
     */
    private function search_posts($query, $post_types, $exclude_ids, $limit) {
        $args = [
            'post_type' => $post_types,
            'post_status' => 'publish',
            's' => $query,
            'posts_per_page' => $limit,
            'orderby' => 'relevance',
            'order' => 'DESC',
            'no_found_rows' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false
        ];
        
        if (!empty($exclude_ids)) {
            $args['post__not_in'] = $exclude_ids;
        }
        
        $search_query = new WP_Query($args);
        $results = [];
        
        if ($search_query->have_posts()) {
            while ($search_query->have_posts()) {
                $search_query->the_post();
                $post = get_post();
                $post->search_relevance = 10; // High relevance for title/content matches
                $results[] = $post;
            }
            wp_reset_postdata();
        }
        
        return $results;
    }
    
    /**
     * Search posts by taxonomy terms
     */
    private function search_by_taxonomies($query, $post_types, $exclude_ids, $limit) {
        global $wpdb;
        
        $results = [];
        $found_post_ids = [];
        
        foreach ($post_types as $post_type) {
            // Get all taxonomies for this post type
            $taxonomies = get_object_taxonomies($post_type);
            
            if (empty($taxonomies)) continue;
            
            // Prepare taxonomy names for SQL
            $taxonomy_placeholders = implode(',', array_fill(0, count($taxonomies), '%s'));
            
            // Search for terms that match the query
            $search_term = '%' . $wpdb->esc_like($query) . '%';
            
            // Combine all arguments into a single array
            $prepare_args = array_merge(
                [$search_term, $search_term, $post_type],
                $taxonomies,
                [$search_term, $search_term, $limit]
            );
            
            $sql = $wpdb->prepare("
                SELECT DISTINCT p.ID, p.*, 
                       t.name as matched_term,
                       tt.taxonomy as matched_taxonomy,
                       CASE 
                           WHEN t.name LIKE %s THEN 8
                           WHEN t.slug LIKE %s THEN 6  
                           ELSE 4
                       END as search_relevance
                FROM {$wpdb->posts} p
                INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
                INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
                INNER JOIN {$wpdb->terms} t ON tt.term_id = t.term_id
                WHERE p.post_type = %s
                AND p.post_status = 'publish'
                AND tt.taxonomy IN ({$taxonomy_placeholders})
                AND (t.name LIKE %s OR t.slug LIKE %s)
                ORDER BY search_relevance DESC, p.post_date DESC
                LIMIT %d
            ", $prepare_args);
            
            $taxonomy_posts = $wpdb->get_results($sql);
            
            foreach ($taxonomy_posts as $post) {
                // Skip if already found or excluded
                if (in_array($post->ID, $found_post_ids) || in_array($post->ID, $exclude_ids)) {
                    continue;
                }
                
                $found_post_ids[] = $post->ID;
                $post->matched_term = $post->matched_term; // Store for debugging
                $post->matched_taxonomy = $post->matched_taxonomy;
                $results[] = $post;
            }
        }
        
        return $results;
    }
    
    /**
     * Combine and sort search results
     */
    private function combine_search_results($post_results, $taxonomy_results, $limit) {
        $combined = [];
        $seen_ids = [];
        
        // Add post results first (higher relevance)
        foreach ($post_results as $post) {
            if (!in_array($post->ID, $seen_ids)) {
                $combined[] = $post;
                $seen_ids[] = $post->ID;
            }
        }
        
        // Add taxonomy results (avoid duplicates)
        foreach ($taxonomy_results as $post) {
            if (!in_array($post->ID, $seen_ids)) {
                $combined[] = $post;
                $seen_ids[] = $post->ID;
            }
        }
        
        // Sort by relevance score
        usort($combined, function($a, $b) {
            $relevance_a = isset($a->search_relevance) ? $a->search_relevance : 0;
            $relevance_b = isset($b->search_relevance) ? $b->search_relevance : 0;
            
            if ($relevance_a === $relevance_b) {
                // If same relevance, sort by date
                return strtotime($b->post_date) - strtotime($a->post_date);
            }
            
            return $relevance_b - $relevance_a;
        });
        
        return array_slice($combined, 0, $limit);
    }
    
    /**
     * Handle tag-based search
     */
    public function handle_tag_search($request) {
        $data = $request->get_json_params();
        
        if (!$data) {
            return new WP_Error('no_data', 'No search data provided', ['status' => 400]);
        }
        
        $tags = $data['tags'] ?? [];
        $query = $data['query'] ?? '';
        
        // If only one tag and no additional query, redirect directly to the post
        if (count($tags) === 1 && empty($query)) {
            $tag = $tags[0];
            if (!empty($tag['url'])) {
                return rest_ensure_response([
                    'redirect_url' => $tag['url'],
                    'direct_redirect' => true,
                    'success' => true,
                    'timestamp' => current_time('c')
                ]);
            }
        }
        
        // Multiple tags or has query - build search results URL
        $params = [];
        
        if (!empty($tags)) {
            $post_ids = array_filter(array_column($tags, 'id'));
            $tag_texts = array_column($tags, 'text');
            
            if (!empty($post_ids)) {
                $params['selected_items'] = implode(',', $post_ids);
            }
            if (!empty($tag_texts)) {
                $params['tags'] = implode(',', $tag_texts);
            }
        }
        
        if (!empty($query)) {
            $params['q'] = $query;
        }
        
        // Create search results URL
        $search_url = apply_filters('outten_search_results_url', home_url('/search-results/'), $params);
        if (!empty($params)) {
            $search_url .= '?' . http_build_query($params);
        }
        
        // Track tag search
        $this->analytics->track_tag_search($tags, $query);
        
        return rest_ensure_response([
            'redirect_url' => $search_url,
            'search_data' => $data,
            'direct_redirect' => false,
            'success' => true,
            'timestamp' => current_time('c')
        ]);
    }
    
    /**
     * Get search suggestions
     */
    public function get_suggestions($request) {
        $post_type = $request->get_param('post_type');
        $limit = $request->get_param('limit');
        
        $cache_key = "suggestions_{$post_type}_{$limit}";
        $cached = $this->cache->get($cache_key);
        
        if ($cached !== false) {
            return rest_ensure_response($cached);
        }
        
        $suggestions = [];
        
        // Get popular search terms
        $popular_terms = $this->analytics->get_popular_search_terms($limit);
        
        // Get recent posts
        $recent_posts_args = [
            'post_type' => $post_type === 'all' ? ['issues', 'cases', 'posts'] : [$post_type],
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'orderby' => 'date',
            'order' => 'DESC'
        ];
        
        $recent_posts = get_posts($recent_posts_args);
        
        foreach ($recent_posts as $post) {
            $suggestions[] = [
                'text' => $post->post_title,
                'type' => 'post',
                'post_type' => $post->post_type,
                'url' => get_permalink($post)
            ];
        }
        
        // Add popular terms
        foreach ($popular_terms as $term) {
            $suggestions[] = [
                'text' => $term->query,
                'type' => 'search_term',
                'count' => $term->search_count
            ];
        }
        
        $result = [
            'suggestions' => array_slice($suggestions, 0, $limit),
            'timestamp' => current_time('c')
        ];
        
        $this->cache->set($cache_key, $result, 3600); // Cache for 1 hour
        
        return rest_ensure_response($result);
    }
    
    /**
     * Get taxonomies for post type
     */
    public function get_post_type_taxonomies($request) {
        $post_type = $request->get_param('post_type');
        
        if (!post_type_exists($post_type)) {
            return new WP_Error('invalid_post_type', 'Post type does not exist', ['status' => 404]);
        }
        
        $taxonomies = get_object_taxonomies($post_type, 'objects');
        $taxonomy_data = [];
        
        foreach ($taxonomies as $taxonomy) {
            if ($taxonomy->public) {
                $taxonomy_data[] = [
                    'name' => $taxonomy->name,
                    'label' => $taxonomy->label,
                    'hierarchical' => $taxonomy->hierarchical,
                    'show_in_rest' => $taxonomy->show_in_rest,
                    'terms_count' => wp_count_terms(['taxonomy' => $taxonomy->name, 'hide_empty' => false])
                ];
            }
        }
        
        return rest_ensure_response([
            'post_type' => $post_type,
            'taxonomies' => $taxonomy_data
        ]);
    }
    
    /**
     * Track analytics
     */
    public function track_analytics($request) {
        return $this->analytics->track_from_request($request);
    }
    
    /**
     * Test endpoint
     */
    public function test_endpoint() {
        return rest_ensure_response([
            'message' => 'Outten & Golden Search Plugin is working!',
            'version' => OUTTEN_SEARCH_VERSION,
            'timestamp' => current_time('c'),
            'settings' => $this->settings->get_all(),
            'endpoints' => [
                'search' => rest_url('outten/v1/search'),
                'tag_search' => rest_url('outten/v1/tag-search'),
                'suggestions' => rest_url('outten/v1/suggestions'),
                'analytics' => rest_url('outten/v1/analytics'),
                'taxonomies' => rest_url('outten/v1/taxonomies/{post_type}'),
                'test' => rest_url('outten/v1/test'),
                'info' => rest_url('outten/v1/info')
            ]
        ]);
    }
    
    /**
     * Get plugin info
     */
    public function get_plugin_info() {
        $post_types = get_post_types(['public' => true], 'objects');
        $available_post_types = [];
        
        foreach ($post_types as $post_type) {
            $taxonomies = get_object_taxonomies($post_type->name, 'objects');
            $public_taxonomies = array_filter($taxonomies, function($tax) {
                return $tax->public;
            });
            
            $available_post_types[] = [
                'name' => $post_type->name,
                'label' => $post_type->label,
                'public' => $post_type->public,
                'show_in_rest' => $post_type->show_in_rest,
                'taxonomies' => array_keys($public_taxonomies),
                'count' => wp_count_posts($post_type->name)->publish ?? 0
            ];
        }
        
        return rest_ensure_response([
            'plugin' => Outten_Golden_Search_Plugin::get_plugin_info(),
            'settings' => $this->settings->get_all(),
            'wordpress' => [
                'version' => get_bloginfo('version'),
                'site_url' => get_site_url(),
                'rest_url' => get_rest_url(),
                'timezone' => get_option('timezone_string') ?: 'UTC'
            ],
            'available_post_types' => $available_post_types,
            'analytics' => $this->analytics->get_stats(),
            'cache' => $this->cache->get_stats()
        ]);
    }
    
    /**
     * Format post data for API response
     */
    private function format_post_data($post, $include_taxonomies = true) {
        $post_id = $post->ID;
        $post_type = $post->post_type;
        
        $data = [
            'id' => $post_id,
            'title' => get_the_title($post),
            'content' => wp_trim_words(get_the_content(null, false, $post), 25),
            'excerpt' => get_the_excerpt($post),
            'url' => get_permalink($post),
            'type' => $post_type,
            'date' => get_the_date('c', $post),
            'modified' => get_the_modified_date('c', $post),
            'thumbnail' => get_the_post_thumbnail_url($post_id, 'thumbnail'),
            'author' => [
                'id' => $post->post_author,
                'name' => get_the_author_meta('display_name', $post->post_author)
            ]
        ];
        
        if ($include_taxonomies) {
            $taxonomies = Outten_Search_Helpers::get_post_taxonomies($post_id, $post_type);
            $data['categories'] = $taxonomies['categories'];
            $data['tags'] = $taxonomies['tags'];
        }
        
        return apply_filters('outten_search_post_data', $data, $post);
    }
    
    /**
     * Get cache key for search request
     */
    private function get_cache_key($query, $post_types, $limit, $include_taxonomies, $exclude_ids) {
        return md5(sprintf(
            'search_%s_%s_%d_%s_%s',
            $query,
            $post_types,
            $limit,
            $include_taxonomies ? '1' : '0',
            $exclude_ids
        ));
    }
}