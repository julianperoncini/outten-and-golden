<?php
/**
 * Template Name: Cases and Investigations Template
 */

use Timber\Timber;
use Timber\Post as TimberPost;
use Timber\Term;

// Initialize context
$context = Timber::context();
$post_id = $context['post']->ID;

// ================================
// HERO SECTION
// ================================
$context['hero'] = get_field('hero', $post_id) ?? [];

// ================================
// FEATURE BILLBOARD
// ================================
$context['feature_billboard'] = get_field('feature_billboard', $post_id) ?? [];
$feature_billboard_id = $context['feature_billboard']['post'] ?? null;

// Debug feature billboard post
if ($feature_billboard_id) {
    error_log('Feature billboard post ID: ' . $feature_billboard_id);
    
    // Check what taxonomies this post has
    $post_taxonomies = get_object_taxonomies('cases');
    error_log('Available taxonomies for cases: ' . print_r($post_taxonomies, true));
    
    // Check case-status terms specifically
    $case_status_terms = get_the_terms($feature_billboard_id, 'case-status');
    error_log('Case status terms for billboard post: ' . print_r($case_status_terms, true));
    
    // Try alternative taxonomy name
    $case_status_alt = get_the_terms($feature_billboard_id, 'case_status');
    error_log('Case status (underscore) terms: ' . print_r($case_status_alt, true));
}

// ================================
// ACTIVE INVESTIGATIONS (Enhanced)
// ================================
$context['active_investigations'] = build_active_investigations($post_id);

// ================================
// ADDITIONAL SECTIONS
// ================================
$context['all_cases_and_investigations'] = get_field('all_cases_and_investigations', $post_id) ?? [];
$context['content_builder'] = get_fields($post_id)['content_builder'] ?? null;

// ================================
// TAXONOMY DATA
// ================================
$context['case_status_tags'] = get_terms([
    'taxonomy' => 'case-status',
    'orderby' => 'name',
    'order' => 'ASC'
]);

$context['categories'] = get_terms([
    'taxonomy' => 'case-categories',
    'hide_empty' => true,
]);

$context['tags'] = get_terms([
    'taxonomy' => 'post_tag',
    'hide_empty' => true,
]);

// Custom filter buttons
$context['case_status_buttons'] = [
    [
        'slug' => 'cases', 
        'name' => 'Cases', 
        'original_terms' => ['Active Case', 'Resolved Case']
    ],
    [
        'slug' => 'investigations', 
        'name' => 'Investigations', 
        'original_terms' => ['Active Investigation', 'Resolved Investigation']
    ],
    [
        'slug' => 'active', 
        'name' => 'Active', 
        'original_terms' => ['Active Case', 'Active Investigation']
    ],
    [
        'slug' => 'resolved', 
        'name' => 'Resolved', 
        'original_terms' => ['Resolved Case', 'Resolved Investigation']
    ]
];

// ================================
// MAIN POSTS QUERY
// ================================
$context['cases_posts'] = build_main_posts_query($context);

// ================================
// ALL POSTS (Unfiltered for "All" section)
// ================================
$context['all_posts'] = build_all_posts_query();

// ================================
// RENDER TEMPLATE
// ================================
$template = 'views/pages/cases-and-investigations/_index.twig';
Timber::render($template, $context);

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Build active investigations with automatic fallback
 * 
 * @param int $post_id
 * @return array
 */
function build_active_investigations($post_id) {
    // Get ACF active investigations data
    $acf_data = get_field('active_investigations', $post_id) ?? [];
    $manual_posts = extract_manual_posts($acf_data);
    
    // Determine which posts to use
    if (!empty($manual_posts)) {
        // Use ACF manually selected posts
        $investigation_posts = $acf_data['active_investigations_posts'];
        $source = 'manual';
    } else {
        // Automatically get posts with "active investigation" case-status
        $investigation_posts = get_automatic_active_investigations();
        $source = 'automatic';
    }
    
    return [
        'title' => $acf_data['title'] ?? 'Active Investigations',
        'description' => $acf_data['description'] ?? '',
        'active_investigations_posts' => $investigation_posts,
        'source' => $source
    ];
}

/**
 * Extract manual post IDs from ACF data
 * 
 * @param array $acf_data
 * @return array
 */
function extract_manual_posts($acf_data) {
    $manual_posts = [];
    
    if (empty($acf_data['active_investigations_posts'])) {
        return $manual_posts;
    }
    
    foreach ($acf_data['active_investigations_posts'] as $post_obj) {
        if (is_object($post_obj) && isset($post_obj->post)) {
            $manual_posts[] = $post_obj->post;
        } elseif (is_array($post_obj) && isset($post_obj['post'])) {
            $manual_posts[] = $post_obj['post'];
        }
    }
    
    return array_filter($manual_posts); // Remove any empty values
}

/**
 * Get automatic active investigation posts from taxonomy
 * 
 * @return array
 */
function get_automatic_active_investigations() {
    // Get posts with active investigation status
    $auto_posts = get_posts([
        'post_type' => 'cases',
        'posts_per_page' => 4,
        'tax_query' => [
            [
                'taxonomy' => 'case-status',
                'field' => 'slug',
                'terms' => 'active-investigation', // Adjust this slug to match your taxonomy
            ],
        ],
        'post_status' => 'publish',
        'orderby' => 'date',
        'order' => 'DESC'
    ]);
    
    // Fallback: If no posts found with taxonomy, get recent cases instead
    if (empty($auto_posts)) {
        $auto_posts = get_posts([
            'post_type' => 'cases',
            'posts_per_page' => 4,
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC'
        ]);
    }
    
    // Convert to ACF-compatible format
    $formatted_posts = [];
    foreach ($auto_posts as $post) {
        $formatted_posts[] = (object) ['post' => $post->ID];
    }
    
    return $formatted_posts;
}

/**
 * Build the main posts query with proper exclusions and pagination
 * 
 * @param array $context
 * @return \Timber\PostQuery
 */
function build_main_posts_query($context) {
    // Build exclusion list
    $exclude_ids = build_exclusion_list($context);
    
    // Get pagination settings
    $posts_per_page = get_option('posts_per_page');
    $paged = get_query_var('paged') ?: 1;
    
    // Main query with proper pagination
    return Timber::get_posts([
        'post_type' => 'cases',
        'posts_per_page' => $posts_per_page,
        'post__not_in' => $exclude_ids,
        'paged' => $paged,
        'post_status' => 'publish'
    ]);
}

/**
 * Build array of post IDs to exclude from main query
 * 
 * @param array $context
 * @return array
 */
function build_exclusion_list($context) {
    $exclude_ids = [];
    
    // Add feature billboard ID
    if (!empty($context['feature_billboard']['post'])) {
        $exclude_ids[] = $context['feature_billboard']['post'];
    }
    
    // Add active investigations post IDs
    if (!empty($context['active_investigations']['active_investigations_posts'])) {
        foreach ($context['active_investigations']['active_investigations_posts'] as $post_obj) {
            if (is_object($post_obj) && isset($post_obj->post)) {
                $exclude_ids[] = $post_obj->post;
            } elseif (is_array($post_obj) && isset($post_obj['post'])) {
                $exclude_ids[] = $post_obj['post'];
            }
        }
    }
    
    return array_unique(array_filter($exclude_ids)); // Remove duplicates and empty values
}

/**
 * Build all posts query without exclusions (for "All" section)
 * 
 * @return \Timber\PostQuery
 */
function build_all_posts_query() {
    // Get pagination settings
    $posts_per_page = get_option('posts_per_page');
    $paged = get_query_var('paged') ?: 1;
    
    // Query all cases posts without exclusions
    return Timber::get_posts([
        'post_type' => 'cases',
        'posts_per_page' => $posts_per_page,
        'paged' => $paged,
        'post_status' => 'publish',
        'orderby' => 'date',
        'order' => 'DESC'
    ]);
}