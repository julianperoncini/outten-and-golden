<?php
/**
 * OUTTEN_AND_GOLDEN_Search
 * =====================
 *
 * Enhanced search functionality with predictive search API, title search, tags, and categories
 *
 * @author  Jesper Westlund <jesper.westlund1@hotmail.com>
 * @package OUTTEN_AND_GOLDEN
 */

class OUTTEN_AND_GOLDEN_Search {
    
    public function __construct() {
        add_action('init', [$this, 'add_clean_search_rewrite_rules']);
        add_filter('query_vars', [$this, 'add_search_query_vars']);
        add_filter('template_include', [$this, 'force_search_template']);
        add_action('pre_get_posts', [$this, 'custom_search_query']);
        add_action('init', [$this, 'handle_clean_search_params']);
        
        // Add REST API endpoint for predictive search
        add_action('rest_api_init', [$this, 'register_search_api']);
    }

    public function add_search_query_vars($vars) {
        $vars[] = 'search_tags';
        $vars[] = 'search_type';
        return $vars;
    }

    public function add_clean_search_rewrite_rules() {
        add_rewrite_rule(
            '^search/([^/]+)/tags/([^/]+)/?$',
            'index.php?s=$matches[1]&search_type=advanced&search_tags=$matches[2]',
            'top'
        );
        
        add_rewrite_rule(
            '^search/tags/([^/]+)/?$',
            'index.php?search_type=advanced&search_tags=$matches[1]',
            'top'
        );
        
        add_rewrite_rule(
            '^search/([^/]+)/?$',
            'index.php?s=$matches[1]',
            'top'
        );
        
    }

    public function force_search_template($template) {
        if (is_search() || get_query_var('search_tags') || get_query_var('search_type')) {
            $search_template = locate_template('search.php');
            if ($search_template) {
                return $search_template;
            }
        }
        return $template;
    }

    public function custom_search_query($query) {
        if (!is_admin() && $query->is_main_query()) {
            if (get_query_var('search_tags') || get_query_var('search_type')) {
                $query->set('is_search', true);
                $query->is_search = true;
                $query->is_home = false;
            }
            
            // Add actual search logic here
            if (is_search() || get_query_var('search_tags') || get_query_var('search_type')) {
                // Set post types to search
                $query->set('post_type', ['post', 'cases', 'issues']); // Add your custom post types
                
                // Handle search tags
                $search_tags = get_query_var('search_tags');
                if ($search_tags) {
                    // Convert URL format back to array
                    if (is_string($search_tags)) {
                        $tags_array = explode('+', $search_tags);
                        $tags_array = array_map(function($tag) {
                            return str_replace('-', ' ', trim($tag));
                        }, $tags_array);
                    } else {
                        $tags_array = $search_tags;
                    }
                    
                    // Set up tax query for tags
                    $tax_query = array(
                        'relation' => 'OR',
                        array(
                            'taxonomy' => 'post_tag',
                            'field'    => 'name',
                            'terms'    => $tags_array,
                            'operator' => 'IN'
                        ),
                        array(
                            'taxonomy' => 'category',
                            'field'    => 'name',
                            'terms'    => $tags_array,
                            'operator' => 'IN'
                        )
                    );
                    
                    $query->set('tax_query', $tax_query);
                }
                
                // Handle text search
                $search_term = get_search_query();
                if (!empty($search_term)) {
                    // WordPress will handle the text search automatically
                    // But you can customize it here if needed
                    
                    // Optional: Add meta query for custom fields
                    $meta_query = array(
                        'relation' => 'OR',
                        array(
                            'key'     => 'custom_field_name', // Replace with your actual custom field names
                            'value'   => $search_term,
                            'compare' => 'LIKE'
                        )
                    );
                    // $query->set('meta_query', $meta_query);
                }
                
                // If no search term and no tags, return no results
                if (empty($search_term) && empty($search_tags)) {
                    $query->set('post__in', array(0)); // No results
                }
                
                // Set posts per page
                $query->set('posts_per_page', 50); // Adjust as needed
            }
        }
    }

    public function handle_clean_search_params() {
        if (isset($_GET['q']) && !isset($_GET['s'])) {
            $_GET['s'] = $_GET['q'];
        }
        
        if (isset($_GET['tags'])) {
            $_GET['search_tags'] = array_map('trim', explode(',', $_GET['tags']));
        }
        
        if (isset($_GET['type'])) {
            $_GET['search_type'] = $_GET['type'];
        }
    }

    /**
     * Register REST API endpoint for predictive search
     */
    public function register_search_api() {
        register_rest_route('outten-golden/v1', '/search', array(
            'methods' => 'GET',
            'callback' => [$this, 'handle_search_api'],
            'permission_callback' => '__return_true',
            'args' => array(
                'query' => array(
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'limit' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 10,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));
    }

    /**
     * Handle the search API request - tags, categories, and case tags
     */
    public function handle_search_api($request) {
        $query = $request->get_param('query');
        $limit = $request->get_param('limit');
        
        if (empty($query)) {
            return new WP_Error('no_query', 'Search query is required', array('status' => 400));
        }

        $results = array();

        // 1. Search in regular tags
        $tag_results = $this->search_tags($query, $limit);
        $results = array_merge($results, $tag_results);

        // 2. Search in case tags (tags-cases taxonomy)
        $case_tag_results = $this->search_tags_cases($query, $limit);
        $results = array_merge($results, $case_tag_results);

        // 3. Search in categories
        $category_results = $this->search_categories($query, $limit);
        $results = array_merge($results, $category_results);

        // Remove duplicates and limit results
        $unique_results = array_values(array_unique($results, SORT_REGULAR));
        $limited_results = array_slice($unique_results, 0, $limit);

        return rest_ensure_response($limited_results);
    }

    /**
     * Search in tags
     */
    private function search_tags($query, $limit) {
        $tags = get_terms(array(
            'taxonomy' => 'post_tag',
            'hide_empty' => true,
            'search' => $query,
            'number' => $limit
        ));

        $results = array();
        if (!is_wp_error($tags)) {
            foreach ($tags as $tag) {
                $results[] = array(
                    'text' => $tag->name,
                    'type' => 'tag',
                    'id' => $tag->term_id,
                    'count' => $tag->count
                );
            }
        }

        return $results;
    }

    /**
     * Search in case tags (updated)
     */
    private function search_tags_cases($query, $limit) {
        $tags = get_terms(array(
            'taxonomy' => 'tags-cases',
            'hide_empty' => true,
            'search' => $query,
            'number' => $limit
        ));

        $results = array();
        if (!is_wp_error($tags)) {
            foreach ($tags as $tag) {
                $results[] = array(
                    'text' => $tag->name,
                    'type' => 'case-tag', // Changed from 'tag' to distinguish from regular tags
                    'id' => $tag->term_id,
                    'count' => $tag->count
                );
            }
        }

        return $results;
    }

    /**
     * Search in categories
     */
    private function search_categories($query, $limit) {
        $categories = get_terms(array(
            'taxonomy' => 'category',
            'hide_empty' => true,
            'search' => $query,
            'number' => $limit
        ));

        $results = array();
        if (!is_wp_error($categories)) {
            foreach ($categories as $category) {
                $results[] = array(
                    'text' => $category->name,
                    'type' => 'case-categories',
                    'id' => $category->term_id,
                    'count' => $category->count
                );
            }
        }

        return $results;
    }

    /**
     * Updated tax_query to include tags-cases taxonomy
     * Add this to your custom_search_query method where you set up the tax_query
     */
    private function get_updated_tax_query($tags_array) {
        return array(
            'relation' => 'OR',
            array(
                'taxonomy' => 'post_tag',
                'field'    => 'name',
                'terms'    => $tags_array,
                'operator' => 'IN'
            ),
            array(
                'taxonomy' => 'tags-cases', // Added case tags taxonomy
                'field'    => 'name',
                'terms'    => $tags_array,
                'operator' => 'IN'
            ),
            array(
                'taxonomy' => 'category',
                'field'    => 'name',
                'terms'    => $tags_array,
                'operator' => 'IN'
            )
        );
    }
}

new OUTTEN_AND_GOLDEN_Search();