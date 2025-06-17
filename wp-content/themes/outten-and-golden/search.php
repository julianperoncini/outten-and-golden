<?php
use Timber\Timber;

/**
 * Search Page Handler
 * Handles search queries with support for:
 * - Title search
 * - Tag filtering
 * - Category filtering
 * - Multiple post types
 * - Clean URL format
 * - Additional taxonomies: tags-cases, categories-issues, case-categories
 */

// ============================================================================
// SEARCH PARAMETER EXTRACTION
// ============================================================================

class SearchParameterExtractor {
    
    public static function getSearchQuery() {
        return get_search_query();
    }
    
    public static function getSearchTags() {
        // Decode tags from clean URL format (/search/tags/tag1+tag2)
        $search_tags_param = get_query_var('search_tags');
        
        if ($search_tags_param) {
            return array_map('trim', explode('+', str_replace('-', ' ', $search_tags_param)));
        }
        
        // Fallback to GET parameter
        return isset($_GET['search_tags']) ? $_GET['search_tags'] : array();
    }
    
    public static function getSearchType() {
        return isset($_GET['search_type']) ? $_GET['search_type'] : 'basic';
    }
    
    public static function getAllSearchTerms($search_query, $search_tags) {
        $search_terms = array();
        
        if (!empty($search_query)) {
            $search_terms[] = $search_query;
        }
        
        if (!empty($search_tags)) {
            $search_terms = array_merge($search_terms, $search_tags);
        }
        
        return $search_terms;
    }
}

// ============================================================================
// TAXONOMY SEARCH HANDLER
// ============================================================================

class TaxonomySearchHandler {
    
    /**
     * Define all searchable taxonomies
     */
    public static function getSearchableTaxonomies() {
        return array(
            'post_tag' => 'Tags',
            'case-categories' => 'Case Categories',
            'tags-cases' => 'Case Tags',
            'categories-issues' => 'Issue Categories'
        );
    }
    
    public static function findMatchingTerms($search_terms) {
        $all_matching_terms = array();
        $taxonomies = self::getSearchableTaxonomies();
        
        // Initialize arrays for each taxonomy
        foreach ($taxonomies as $taxonomy => $label) {
            $all_matching_terms[$taxonomy] = array();
        }
        
        foreach ($search_terms as $term) {
            foreach ($taxonomies as $taxonomy => $label) {
                // Find matching terms for each taxonomy
                $matching_terms = get_terms(array(
                    'taxonomy' => $taxonomy,
                    'search' => $term,
                    'hide_empty' => false,
                    'fields' => 'ids'
                ));
                
                if (!empty($matching_terms) && !is_wp_error($matching_terms)) {
                    $all_matching_terms[$taxonomy] = array_merge(
                        $all_matching_terms[$taxonomy], 
                        $matching_terms
                    );
                }
            }
        }
        
        // Remove duplicates and empty arrays
        foreach ($all_matching_terms as $taxonomy => $terms) {
            if (!empty($terms)) {
                $all_matching_terms[$taxonomy] = array_unique($terms);
            } else {
                unset($all_matching_terms[$taxonomy]);
            }
        }
        
        return $all_matching_terms;
    }
    
    public static function buildTaxQuery($matching_terms) {
        if (empty($matching_terms)) {
            return null;
        }
        
        $tax_queries = array('relation' => 'OR');
        
        foreach ($matching_terms as $taxonomy => $term_ids) {
            if (!empty($term_ids)) {
                $tax_queries[] = array(
                    'taxonomy' => $taxonomy,
                    'field'    => 'term_id',
                    'terms'    => $term_ids,
                    'operator' => 'IN'
                );
            }
        }
        
        // Only return tax_query if we have actual taxonomy queries
        return count($tax_queries) > 1 ? $tax_queries : null;
    }
    
    /**
     * Get debug information about taxonomy matches
     */
    public static function getDebugInfo($matching_terms) {
        $debug = array();
        
        foreach ($matching_terms as $taxonomy => $term_ids) {
            if (!empty($term_ids)) {
                $terms = get_terms(array(
                    'taxonomy' => $taxonomy,
                    'include' => $term_ids,
                    'hide_empty' => false
                ));
                
                $term_names = array();
                if (!is_wp_error($terms)) {
                    foreach ($terms as $term) {
                        $term_names[] = $term->name;
                    }
                }
                
                $debug[$taxonomy] = array(
                    'term_ids' => $term_ids,
                    'term_names' => $term_names,
                    'count' => count($term_ids)
                );
            }
        }
        
        return $debug;
    }
}

// ============================================================================
// TITLE SEARCH HANDLER
// ============================================================================

class TitleSearchHandler {
    
    public static function findPostsByTitle($search_terms, $post_types = array('cases', 'issues', 'post')) {
        global $wpdb;
        
        if (empty($search_terms)) {
            return array();
        }
        
        // Debug: Log what we're searching for
        error_log('TitleSearchHandler: Searching for terms: ' . implode(', ', $search_terms));
        error_log('TitleSearchHandler: Post types: ' . implode(', ', $post_types));
        
        // Create search conditions for titles (OR logic - any term matches)
        $title_conditions = array();
        $prepare_values = array();
        
        foreach ($search_terms as $term) {
            $title_conditions[] = "post_title LIKE %s";
            $prepare_values[] = '%' . $wpdb->esc_like(trim($term)) . '%';
        }
        
        // Create post type conditions
        $post_type_conditions = array();
        foreach ($post_types as $post_type) {
            $post_type_conditions[] = "post_type = %s";
            $prepare_values[] = $post_type;
        }
        
        // Build the query
        $sql = "
            SELECT ID, post_title, post_type
            FROM {$wpdb->posts} 
            WHERE post_status = 'publish' 
            AND (" . implode(' OR ', $post_type_conditions) . ")
            AND (" . implode(' OR ', $title_conditions) . ")
            ORDER BY post_date DESC
        ";
        
        error_log('TitleSearchHandler SQL: ' . $sql);
        error_log('TitleSearchHandler prepare values: ' . print_r($prepare_values, true));
        
        $results = $wpdb->get_results($wpdb->prepare($sql, $prepare_values));
        
        error_log('TitleSearchHandler found ' . count($results) . ' results');
        
        if ($results) {
            foreach ($results as $result) {
                error_log("Found post: ID={$result->ID}, Title='{$result->post_title}', Type={$result->post_type}");
            }
        }
        
        $post_ids = array();
        if ($results) {
            foreach ($results as $result) {
                $post_ids[] = intval($result->ID);
            }
        }
        
        return $post_ids;
    }
    
    /**
     * Alternative method using WP_Query for comparison
     */
    public static function findPostsByTitleWPQuery($search_terms, $post_types = array('cases', 'issues', 'post')) {
        if (empty($search_terms)) {
            return array();
        }
        
        // Combine all search terms into one search string
        $search_string = implode(' ', $search_terms);
        
        error_log('TitleSearchHandler WP_Query: Searching for: ' . $search_string);
        
        $args = array(
            'post_type' => $post_types,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            's' => $search_string, // This searches in title and content
            'fields' => 'ids'
        );
        
        $query = new WP_Query($args);
        $post_ids = $query->posts;
        
        error_log('TitleSearchHandler WP_Query found: ' . count($post_ids) . ' results');
        
        wp_reset_postdata();
        
        return $post_ids;
    }
}

// ============================================================================
// SEARCH QUERY BUILDER
// ============================================================================

class SearchQueryBuilder {
    
    public static function buildSearchArgs($search_query, $search_tags) {
        $args = array(
            'post_type' => array('cases', 'issues', 'post'),
            'post_status' => 'publish',
            'posts_per_page' => -1
        );
        
        // If no search parameters, return all posts
        if (empty($search_query) && empty($search_tags)) {
            return $args;
        }
        
        $search_terms = SearchParameterExtractor::getAllSearchTerms($search_query, $search_tags);
        
        if (empty($search_terms)) {
            return $args;
        }
        
        // Find posts by taxonomy terms (now includes all taxonomies)
        $matching_terms = TaxonomySearchHandler::findMatchingTerms($search_terms);
        $tax_query = TaxonomySearchHandler::buildTaxQuery($matching_terms);
        
        // Find posts by title - try both methods for debugging
        $title_post_ids = TitleSearchHandler::findPostsByTitle($search_terms, $args['post_type']);
        
        // Fallback to WP_Query method if custom SQL fails
        if (empty($title_post_ids)) {
            error_log('SearchQueryBuilder: Custom SQL found no results, trying WP_Query method');
            $title_post_ids = TitleSearchHandler::findPostsByTitleWPQuery($search_terms, $args['post_type']);
        }
        
        // Combine results
        $has_taxonomy_matches = !empty($matching_terms);
        $has_title_matches = !empty($title_post_ids);
        
        if ($has_taxonomy_matches && $has_title_matches) {
            // Use a custom query to combine both approaches
            return self::buildCombinedQuery($title_post_ids, $tax_query, $args);
            
        } elseif ($has_title_matches) {
            // Only title matches
            $args['post__in'] = $title_post_ids;
            $args['orderby'] = 'post__in'; // Maintain relevance order
            
        } elseif ($has_taxonomy_matches) {
            // Only taxonomy matches
            $args['tax_query'] = $tax_query;
            
        } else {
            // No matches found - return empty result set
            $args['post__in'] = array(0);
        }
        
        return $args;
    }
    
    private static function buildCombinedQuery($title_post_ids, $tax_query, $base_args) {
        // For combined searches, we need to use a custom approach
        // First get taxonomy matches
        $taxonomy_args = $base_args;
        if ($tax_query) {
            $taxonomy_args['tax_query'] = $tax_query;
            $taxonomy_args['fields'] = 'ids';
        }
        
        $taxonomy_post_ids = array();
        if ($tax_query) {
            $taxonomy_query = new WP_Query($taxonomy_args);
            $taxonomy_post_ids = $taxonomy_query->posts;
            wp_reset_postdata();
        }
        
        // Combine and deduplicate IDs
        $all_post_ids = array_unique(array_merge($title_post_ids, $taxonomy_post_ids));
        
        if (empty($all_post_ids)) {
            $base_args['post__in'] = array(0);
        } else {
            $base_args['post__in'] = $all_post_ids;
            // Custom ordering: exact title matches first, then by date
            $base_args['orderby'] = array(
                'post__in' => 'ASC',
                'date' => 'DESC'
            );
        }
        
        return $base_args;
    }
}

// ============================================================================
// RESULTS PROCESSOR
// ============================================================================

class SearchResultsProcessor {
    
    public static function groupPostsByType($posts, $limit_per_type = 6) {
        $grouped_posts = array();
        $total_results = 0;
        
        if (!$posts) {
            return array(
                'grouped' => $grouped_posts,
                'total' => $total_results
            );
        }
        
        foreach ($posts as $post) {
            $post_type = $post->post_type;
            $post_type_obj = get_post_type_object($post_type);
            $post_type_label = $post_type_obj ? $post_type_obj->labels->name : ucfirst($post_type);
            
            if (!isset($grouped_posts[$post_type])) {
                $grouped_posts[$post_type] = array(
                    'label' => $post_type_label,
                    'posts' => array(),
                    'count' => 0,
                    'total_found' => 0 // Track total before limiting
                );
            }
            
            // Count all posts for this type
            $grouped_posts[$post_type]['total_found']++;
            
            // Only add to posts array if under limit
            if (count($grouped_posts[$post_type]['posts']) < $limit_per_type) {
                $grouped_posts[$post_type]['posts'][] = $post;
                $grouped_posts[$post_type]['count']++;
            }
            
            $total_results++;
        }
        
        // Sort post types by priority (cases first, then issues, then posts)
        $type_priority = array('cases' => 1, 'issues' => 2, 'post' => 3);
        uksort($grouped_posts, function($a, $b) use ($type_priority) {
            $priority_a = isset($type_priority[$a]) ? $type_priority[$a] : 999;
            $priority_b = isset($type_priority[$b]) ? $type_priority[$b] : 999;
            return $priority_a - $priority_b;
        });
        
        return array(
            'grouped' => $grouped_posts,
            'total' => $total_results
        );
    }
    
    public static function addSearchMetadata($context, $search_query, $search_tags, $search_type, $total_results) {
        $context['search_query'] = $search_query;
        $context['search_tags'] = $search_tags;
        $context['search_type'] = $search_type;
        $context['total_results'] = $total_results;
        
        // Add search summary for display
        $search_summary = array();
        if (!empty($search_query)) {
            $search_summary[] = "Query: \"{$search_query}\"";
        }
        if (!empty($search_tags)) {
            $search_summary[] = "Tags: " . implode(', ', $search_tags);
        }
        
        $context['search_summary'] = implode(' | ', $search_summary);
        $context['has_search_terms'] = !empty($search_query) || !empty($search_tags);
        
        return $context;
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

// Initialize context
$context = Timber::context();

// Extract search parameters
$search_query = SearchParameterExtractor::getSearchQuery();
$search_tags = SearchParameterExtractor::getSearchTags();
$search_type = SearchParameterExtractor::getSearchType();

// Build and execute search query
$search_args = SearchQueryBuilder::buildSearchArgs($search_query, $search_tags);
$posts = Timber::get_posts($search_args);

// Process results
$results = SearchResultsProcessor::groupPostsByType($posts, 6);
$grouped_posts = $results['grouped'];
$total_results = $results['total'];

// Add data to context
$context['posts'] = $posts;
$context['grouped_posts'] = $grouped_posts;
$context = SearchResultsProcessor::addSearchMetadata(
    $context, 
    $search_query, 
    $search_tags, 
    $search_type, 
    $total_results
);

// Debug information (remove in production)
if (WP_DEBUG && current_user_can('administrator')) {
    // Get enhanced debug info including taxonomy matches
    $search_terms = SearchParameterExtractor::getAllSearchTerms($search_query, $search_tags);
    $matching_terms = TaxonomySearchHandler::findMatchingTerms($search_terms);
    $taxonomy_debug = TaxonomySearchHandler::getDebugInfo($matching_terms);
    
    $context['debug_info'] = array(
        'search_args' => $search_args,
        'search_query' => $search_query,
        'search_tags' => $search_tags,
        'search_terms' => $search_terms,
        'taxonomy_matches' => $taxonomy_debug,
        'total_found' => $total_results,
        'searchable_taxonomies' => TaxonomySearchHandler::getSearchableTaxonomies()
    );
}

// Render template
Timber::render('views/search.twig', $context);