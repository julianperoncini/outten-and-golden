<?php
/**
 * Template Name: Newsroom Template
 */

use Timber\Timber;
use Timber\Post as TimberPost;
use Timber\Term;

$context = Timber::context();
$post_id = $context['post']->ID;

// Hero
$context['hero'] = get_field('hero', $post_id) ?? [];

// Feature Billboard
$context['feature_billboard'] = get_field('feature_billboard', $post_id) ?? [];
$feature_billboard_id = $context['feature_billboard']['post'] ?? null;

// All Post Articles
$context['all_post_articles'] = get_field('all_post_articles', $post_id) ?? [];

// Content Builder
$context['content_builder'] = get_fields($post_id)['content_builder'] ?? null;

// Get categories for filter buttons
$context['categories'] = get_terms([
    'taxonomy' => 'category',
    'hide_empty' => true,
    'orderby' => 'name',
    'order' => 'ASC'
]);

// Get URL parameters directly from $_GET
$current_category = sanitize_text_field($_GET['category'] ?? 'all');
$current_page = absint($_GET['page'] ?? 1);
$posts_per_page = absint($_GET['per_page'] ?? 12);

// Check if this is a direct link (not default state)
$is_direct_link = $current_category !== 'all' || $current_page !== 1 || $posts_per_page !== 12;

if ($is_direct_link) {
    // For direct links with URL parameters, don't load server-side posts
    // Let AJAX handle the loading for better consistency
    $context['all_posts'] = [];
    $context['is_direct_link'] = true;
    
    // Pass URL parameters to template for JavaScript
    $context['url_params'] = [
        'category' => $current_category,
        'page' => $current_page,
        'per_page' => $posts_per_page
    ];
    
} else {
    // Default state - load server-side posts as normal
    $query_args = [
        'post_type' => 'post',
        'posts_per_page' => 12,
        'paged' => 1,
        'post_status' => 'publish',
        'orderby' => 'date',
        'order' => 'DESC'
    ];

    // Exclude feature billboard if it exists
    if ($feature_billboard_id) {
        $query_args['post__not_in'] = [$feature_billboard_id];
    }

    // Get posts for initial load - Timber v2 compatible
    $context['all_posts'] = Timber::get_posts($query_args);
    $context['is_direct_link'] = false;
}

// Pass the current filter state to the template
$context['current_category'] = $current_category;
$context['current_page'] = $current_page;
$context['posts_per_page'] = $posts_per_page;

$template = 'views/pages/newsroom/_index.twig';

Timber::render($template, $context);