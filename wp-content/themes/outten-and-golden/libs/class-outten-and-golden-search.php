<?php
/**
 * OUTTEN_AND_GOLDEN_Search
 * =====================
 *
 * Enhanced search functionality with predictive search API, title search, tags, and categories
 * Now with proper parent/child tag support
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

    /**
     * Expand search terms to include parent/child relationships
     */
    private function expand_search_terms($search_terms) {
        $expanded_terms = array();
        
        foreach ($search_terms as $term_name) {
            // Add the original term
            $expanded_terms[] = $term_name;
            
            // Search for this term in all taxonomies
            $taxonomies = array('post_tag', 'tags-cases', 'case-categories', 'categories-issues');
            
            foreach ($taxonomies as $taxonomy) {
                // First check if it's a child tag
                $term = get_term_by('name', $term_name, $taxonomy);
                
                if ($term && !is_wp_error($term)) {
                    // If it has a parent, add the parent term
                    if ($term->parent) {
                        $parent_term = get_term($term->parent, $taxonomy);
                        if ($parent_term && !is_wp_error($parent_term)) {
                            $expanded_terms[] = $parent_term->name;
                        }
                    }
                    
                    // Also check if this term has children
                    $children = get_terms(array(
                        'taxonomy' => $taxonomy,
                        'parent' => $term->term_id,
                        'hide_empty' => false
                    ));
                    
                    if (!is_wp_error($children) && !empty($children)) {
                        foreach ($children as $child) {
                            $expanded_terms[] = $child->name;
                        }
                    }
                }
            }
        }
        
        return array_unique($expanded_terms);
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
                    
                    // Expand search terms to include parent/child relationships
                    $expanded_tags = $this->expand_search_terms($tags_array);
                    
                    // Set up tax query for tags
                    $tax_query = array(
                        'relation' => 'OR',
                        array(
                            'taxonomy' => 'post_tag',
                            'field'    => 'name',
                            'terms'    => $expanded_tags,
                            'operator' => 'IN'
                        ),
                        array(
                            'taxonomy' => 'tags-cases',
                            'field'    => 'name',
                            'terms'    => $expanded_tags,
                            'operator' => 'IN'
                        ),
                        array(
                            'taxonomy' => 'case-categories',
                            'field'    => 'name',
                            'terms'    => $expanded_tags,
                            'operator' => 'IN'
                        ),
                        array(
                            'taxonomy' => 'categories-issues',
                            'field'    => 'name',
                            'terms'    => $expanded_tags,
                            'operator' => 'IN'
                        ),
                        array(
                            'taxonomy' => 'category',
                            'field'    => 'name',
                            'terms'    => $expanded_tags,
                            'operator' => 'IN'
                        )
                    );
                    
                    $query->set('tax_query', $tax_query);
                }
                
                // Handle text search
                $search_term = get_search_query();
                if (!empty($search_term)) {
                    // WordPress will handle the text search automatically
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
        
        // Add endpoint for getting parent tag
        register_rest_route('outten-golden/v1', '/get-parent-tag', array(
            'methods' => 'GET',
            'callback' => [$this, 'get_parent_tag'],
            'permission_callback' => '__return_true',
            'args' => array(
                'tag' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ));
    }

    /**
     * Get parent tag for a given tag name
     */
    public function get_parent_tag($request) {
        $tag_name = $request->get_param('tag');
        
        // Search across all taxonomies
        $taxonomies = array('post_tag', 'tags-cases', 'case-categories', 'categories-issues');
        
        foreach ($taxonomies as $taxonomy) {
            $term = get_term_by('name', $tag_name, $taxonomy);
            
            if ($term && !is_wp_error($term)) {
                // If it has a parent, return the parent name
                if ($term->parent) {
                    $parent_term = get_term($term->parent, $taxonomy);
                    if ($parent_term && !is_wp_error($parent_term)) {
                        return rest_ensure_response(array(
                            'parentTag' => $parent_term->name,
                            'originalTag' => $tag_name,
                            'taxonomy' => $taxonomy
                        ));
                    }
                }
                // It's already a parent tag
                return rest_ensure_response(array(
                    'parentTag' => $term->name,
                    'originalTag' => $tag_name,
                    'taxonomy' => $taxonomy
                ));
            }
        }
        
        // Tag not found, return original
        return rest_ensure_response(array(
            'parentTag' => $tag_name,
            'originalTag' => $tag_name,
            'taxonomy' => null
        ));
    }

    /**
     * Handle the search API request - enhanced to show parent tags when searching for children
     */
    public function handle_search_api($request) {
        $query = $request->get_param('query');
        $limit = $request->get_param('limit');
        
        if (empty($query)) {
            return new WP_Error('no_query', 'Search query is required', array('status' => 400));
        }

        $results = array();
        $found_parent_ids = array(); // Track parent tags we've already added

        // 1. Search in regular tags - enhanced to include parent tags
        $tag_results = $this->search_tags_with_parents($query, $limit, 'post_tag', 'tag', $found_parent_ids);
        $results = array_merge($results, $tag_results);

        // 2. Search in case tags - enhanced to include parent tags
        $case_tag_results = $this->search_tags_with_parents($query, $limit, 'tags-cases', 'case-tag', $found_parent_ids);
        $results = array_merge($results, $case_tag_results);

        // 3. Search in categories - enhanced to include parent categories
        $category_results = $this->search_categories_with_parents($query, $limit, $found_parent_ids);
        $results = array_merge($results, $category_results);

        // Remove duplicates and limit results
        $unique_results = array_values(array_unique($results, SORT_REGULAR));
        $limited_results = array_slice($unique_results, 0, $limit);

        return rest_ensure_response($limited_results);
    }

    /**
     * Search tags including parent tags when child tags match
     */
    private function search_tags_with_parents($query, $limit, $taxonomy, $type, &$found_parent_ids) {
        // Initialize taxonomy tracking if not exists
        if (!isset($found_parent_ids[$taxonomy])) {
            $found_parent_ids[$taxonomy] = array();
        }
        
        // First get all matching terms (including children)
        $all_terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'hide_empty' => true,
            'search' => $query,
            'number' => $limit * 3 // Get more to account for filtering
        ));

        $results = array();
        
        if (!is_wp_error($all_terms)) {
            foreach ($all_terms as $term) {
                // If this is a child term, add its parent instead
                if ($term->parent && !isset($found_parent_ids[$taxonomy][$term->parent])) {
                    $parent_term = get_term($term->parent, $taxonomy);
                    if ($parent_term && !is_wp_error($parent_term)) {
                        $results[] = array(
                            'text' => $parent_term->name,
                            'type' => $type,
                            'id' => $parent_term->term_id,
                            'count' => $parent_term->count,
                            'isParent' => true,
                            'matchedChild' => $term->name
                        );
                        $found_parent_ids[$taxonomy][$parent_term->term_id] = true;
                    }
                } elseif (!$term->parent && !isset($found_parent_ids[$taxonomy][$term->term_id])) {
                    // It's already a parent term
                    $results[] = array(
                        'text' => $term->name,
                        'type' => $type,
                        'id' => $term->term_id,
                        'count' => $term->count,
                        'isParent' => true
                    );
                    $found_parent_ids[$taxonomy][$term->term_id] = true;
                }
            }
        }

        // Also search for parent tags whose children might match
        $parent_terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'hide_empty' => true,
            'parent' => 0, // Only parent terms
            'number' => 100
        ));

        if (!is_wp_error($parent_terms)) {
            foreach ($parent_terms as $parent) {
                if (isset($found_parent_ids[$taxonomy][$parent->term_id])) {
                    continue; // Already added
                }

                // Get children of this parent
                $children = get_terms(array(
                    'taxonomy' => $taxonomy,
                    'parent' => $parent->term_id,
                    'hide_empty' => false
                ));

                if (!is_wp_error($children)) {
                    foreach ($children as $child) {
                        // Check if child name matches the search query
                        if (stripos($child->name, $query) !== false) {
                            $results[] = array(
                                'text' => $parent->name,
                                'type' => $type,
                                'id' => $parent->term_id,
                                'count' => $parent->count,
                                'isParent' => true,
                                'matchedChild' => $child->name
                            );
                            $found_parent_ids[$taxonomy][$parent->term_id] = true;
                            break; // Found a match, no need to check other children
                        }
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Search in categories with parent support
     */
    private function search_categories_with_parents($query, $limit, &$found_parent_ids) {
        return $this->search_tags_with_parents($query, $limit, 'category', 'case-categories', $found_parent_ids);
    }
}

new OUTTEN_AND_GOLDEN_Search();