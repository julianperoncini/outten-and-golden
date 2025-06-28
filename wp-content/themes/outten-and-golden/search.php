<?php
use Timber\Timber;

/**
 * Streamlined Search Page Handler
 * Handles search queries with support for multiple taxonomies and post types
 */

// ============================================================================
// MAIN SEARCH HANDLER
// ============================================================================

class SearchHandler {
    
    /**
     * Get searchable taxonomies configuration
     */
    public static function getSearchableTaxonomies() {
        return array(
            'post_tag' => 'Tags',
            'case-categories' => 'Case Categories',
            'tags-cases' => 'Case Tags',
            'categories-issues' => 'Issue Categories'
        );
    }
    
    /**
     * Build search query arguments
     */
    public static function buildSearchArgs($search_query, $search_tags) {
        $args = array(
            'post_type' => array('cases', 'issues', 'post'),
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'relevance date',
            'order' => 'DESC'
        );
        
        // Handle text search
        if (!empty($search_query)) {
            $args['s'] = $search_query;
        }
        
        // Handle taxonomy search with parent/child expansion
        $tax_query = self::buildExpandedTaxQuery($search_tags);
        if ($tax_query) {
            $args['tax_query'] = $tax_query;
        }
        
        // If no search parameters, show recent posts
        if (empty($search_query) && empty($search_tags)) {
            $args['posts_per_page'] = 20;
        }
        
        return $args;
    }
    
    /**
     * Build taxonomy query with parent/child tag expansion
     */
    private static function buildExpandedTaxQuery($search_tags) {
        if (empty($search_tags)) {
            return null;
        }
        
        // Expand search tags to include parent/child relationships
        $expanded_tags = self::expandSearchTags($search_tags);
        
        $taxonomies = self::getSearchableTaxonomies();
        $tax_queries = array('relation' => 'OR');
        
        // For each taxonomy, add queries for both exact and partial matches
        foreach ($taxonomies as $taxonomy => $label) {
            // Add exact match query
            $tax_queries[] = array(
                'taxonomy' => $taxonomy,
                'field'    => 'name',
                'terms'    => $expanded_tags,
                'operator' => 'IN'
            );
            
            // For each search tag, also look for terms that contain the search string
            foreach ($search_tags as $search_tag) {
                // Get all terms in this taxonomy
                $all_terms = get_terms(array(
                    'taxonomy' => $taxonomy,
                    'hide_empty' => true,
                    'fields' => 'ids'
                ));
                
                if (!is_wp_error($all_terms) && !empty($all_terms)) {
                    $matching_term_ids = array();
                    
                    foreach ($all_terms as $term_id) {
                        $term = get_term($term_id, $taxonomy);
                        if ($term && !is_wp_error($term)) {
                            // Check if term name contains the search string
                            if (stripos($term->name, $search_tag) !== false) {
                                $matching_term_ids[] = $term_id;
                                
                                // If it has a parent, include the parent too
                                if ($term->parent) {
                                    $matching_term_ids[] = $term->parent;
                                }
                            }
                        }
                    }
                    
                    if (!empty($matching_term_ids)) {
                        $tax_queries[] = array(
                            'taxonomy' => $taxonomy,
                            'field'    => 'term_id',
                            'terms'    => array_unique($matching_term_ids),
                            'operator' => 'IN'
                        );
                    }
                }
            }
        }
        
        return count($tax_queries) > 1 ? $tax_queries : null;
    }
    
    /**
     * Expand search tags to include parent and child tags
     */
    public static function expandSearchTags($search_tags) {
        $expanded = array();
        $taxonomies = self::getSearchableTaxonomies();
        
        foreach ($search_tags as $tag_name) {
            // Add the original tag
            $expanded[] = $tag_name;
            
            // Search for this tag in all taxonomies
            foreach ($taxonomies as $taxonomy => $label) {
                // First try exact match
                $term = get_term_by('name', $tag_name, $taxonomy);
                
                // If no exact match, try searching for partial matches
                if (!$term || is_wp_error($term)) {
                    $search_terms = get_terms(array(
                        'taxonomy' => $taxonomy,
                        'search' => $tag_name,
                        'hide_empty' => false,
                        'number' => 10
                    ));
                    
                    if (!is_wp_error($search_terms) && !empty($search_terms)) {
                        foreach ($search_terms as $search_term) {
                            // Add the found term
                            $expanded[] = $search_term->name;
                            
                            // If it has a parent, add the parent too
                            if ($search_term->parent) {
                                $parent_term = get_term($search_term->parent, $taxonomy);
                                if ($parent_term && !is_wp_error($parent_term)) {
                                    $expanded[] = $parent_term->name;
                                }
                            }
                        }
                    }
                }
                
                if ($term && !is_wp_error($term)) {
                    // If it has a parent, add the parent
                    if ($term->parent) {
                        $parent_term = get_term($term->parent, $taxonomy);
                        if ($parent_term && !is_wp_error($parent_term)) {
                            $expanded[] = $parent_term->name;
                        }
                    }
                    
                    // If it's a parent, add its children
                    $children = get_terms(array(
                        'taxonomy' => $taxonomy,
                        'parent' => $term->term_id,
                        'hide_empty' => false
                    ));
                    
                    if (!is_wp_error($children) && !empty($children)) {
                        foreach ($children as $child) {
                            $expanded[] = $child->name;
                        }
                    }
                }
            }
        }
        
        return array_unique($expanded);
    }
    
    /**
     * Convert child tags to parent tags for display
     */
    public static function convertToParentTags($search_tags) {
        if (empty($search_tags)) {
            return array();
        }
        
        $parent_tags = array();
        $taxonomies = self::getSearchableTaxonomies();
        
        foreach ($search_tags as $tag_name) {
            $found_parent = false;
            
            // Search in each taxonomy for exact match first
            foreach ($taxonomies as $taxonomy => $label) {
                // Find the term in this taxonomy
                $term = get_term_by('name', $tag_name, $taxonomy);
                
                if ($term && !is_wp_error($term)) {
                    // If it has a parent, get the parent
                    if ($term->parent) {
                        $parent_term = get_term($term->parent, $taxonomy);
                        if ($parent_term && !is_wp_error($parent_term)) {
                            $parent_tags[] = $parent_term->name;
                            $found_parent = true;
                            break;
                        }
                    } else {
                        // It's already a parent tag
                        $parent_tags[] = $term->name;
                        $found_parent = true;
                        break;
                    }
                }
            }
            
            // If no exact match found, look for partial matches
            if (!$found_parent) {
                foreach ($taxonomies as $taxonomy => $label) {
                    $search_terms = get_terms(array(
                        'taxonomy' => $taxonomy,
                        'search' => $tag_name,
                        'hide_empty' => false,
                        'number' => 10
                    ));
                    
                    if (!is_wp_error($search_terms) && !empty($search_terms)) {
                        foreach ($search_terms as $search_term) {
                            // Check if this term contains our search string
                            if (stripos($search_term->name, $tag_name) !== false) {
                                if ($search_term->parent) {
                                    $parent_term = get_term($search_term->parent, $taxonomy);
                                    if ($parent_term && !is_wp_error($parent_term)) {
                                        $parent_tags[] = $parent_term->name;
                                        $found_parent = true;
                                        break 2; // Break out of both loops
                                    }
                                } else {
                                    $parent_tags[] = $search_term->name;
                                    $found_parent = true;
                                    break 2;
                                }
                            }
                        }
                    }
                }
            }
            
            // If still not found, keep the original
            if (!$found_parent) {
                $parent_tags[] = $tag_name;
            }
        }
        
        return array_unique($parent_tags);
    }
    
    /**
     * Get only parent terms from a list of terms
     */
    public static function filterParentTermsOnly($terms, $taxonomy) {
        $parent_terms = array();
        
        foreach ($terms as $term) {
            // If it's a term object
            if (is_object($term)) {
                if ($term->parent == 0) {
                    $parent_terms[] = $term;
                }
            } 
            // If it's a term ID
            elseif (is_numeric($term)) {
                $term_obj = get_term($term, $taxonomy);
                if ($term_obj && !is_wp_error($term_obj) && $term_obj->parent == 0) {
                    $parent_terms[] = $term_obj;
                }
            }
        }
        
        return $parent_terms;
    }

    /**
     * Process post terms to only show parent tags
     */
    public static function processPostTerms($post) {
        $taxonomies = self::getSearchableTaxonomies();
        
        foreach ($taxonomies as $taxonomy => $label) {
            // Get all terms for this post and taxonomy
            $terms = wp_get_post_terms($post->ID, $taxonomy);
            
            if (!is_wp_error($terms) && !empty($terms)) {
                // Filter to only parent terms
                $parent_terms = self::filterParentTermsOnly($terms, $taxonomy);
                
                // Replace the post's terms with only parent terms
                // This is for display purposes only
                $post->{$taxonomy . '_display'} = $parent_terms;
            }
        }
        
        return $post;
    }
    
    /**
     * Group posts by type for display
     */
    public static function groupPostsByType($posts, $limit_per_type = 6) {
        $grouped = array();
        
        foreach ($posts as $post) {
            // Process the post to filter terms
            $post = self::processPostTerms($post);
            
            $type = $post->post_type;
            
            if (!isset($grouped[$type])) {
                $type_obj = get_post_type_object($type);
                $grouped[$type] = array(
                    'label' => $type_obj ? $type_obj->labels->name : ucfirst($type),
                    'posts' => array(),
                    'total' => 0,
                    'count' => 0  // Add count property
                );
            }
            
            $grouped[$type]['total']++;
            $grouped[$type]['count']++;  // Increment count
            
            if (count($grouped[$type]['posts']) < $limit_per_type) {
                $grouped[$type]['posts'][] = $post;
            }
        }
        
        // Sort by priority
        $priority = array('cases' => 1, 'issues' => 2, 'post' => 3);
        uksort($grouped, function($a, $b) use ($priority) {
            $pa = isset($priority[$a]) ? $priority[$a] : 999;
            $pb = isset($priority[$b]) ? $priority[$b] : 999;
            return $pa - $pb;
        });
        
        return $grouped;
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

// Initialize context
$context = Timber::context();

// Get search parameters
$search_query = get_search_query();
$search_tags = get_query_var('search_tags');

// Handle search_tags format (convert from URL format)
if ($search_tags && is_string($search_tags)) {
    $search_tags = array_map('trim', explode('+', str_replace('-', ' ', $search_tags)));
} elseif (isset($_GET['search_tags'])) {
    $search_tags = is_array($_GET['search_tags']) ? $_GET['search_tags'] : array($_GET['search_tags']);
} else {
    $search_tags = array();
}

// Build and execute search
$args = SearchHandler::buildSearchArgs($search_query, $search_tags);
$posts = Timber::get_posts($args);

// Process results
$grouped_posts = SearchHandler::groupPostsByType($posts);
$total_results = count($posts);

// Process all posts to filter terms for display
// Convert to array first to avoid iterator issues
$posts_array = array();
foreach ($posts as $post) {
    $posts_array[] = SearchHandler::processPostTerms($post);
}
$posts = $posts_array;

// Convert search tags to parent tags for display
$display_tags = SearchHandler::convertToParentTags($search_tags);

// Add to context
$context['posts'] = $posts;
$context['grouped_posts'] = !empty($grouped_posts) ? $grouped_posts : null;
$context['search_query'] = $search_query;
$context['search_tags'] = $search_tags;
$context['display_tags'] = $display_tags;
$context['total_results'] = $total_results;
$context['has_results'] = $total_results > 0;
$context['has_search_tags'] = !empty($search_tags);

// Create search summary
$summary = array();
if ($search_query) {
    $summary[] = sprintf('"%s"', $search_query);
}
if ($display_tags) { // Use display_tags instead of search_tags for the summary
    $summary[] = implode(', ', $display_tags);
}
$context['search_summary'] = implode(' + ', $summary);

// Render template
Timber::render('views/search.twig', $context);