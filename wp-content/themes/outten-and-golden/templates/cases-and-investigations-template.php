<?php
/**
    * Template Name: Cases and Investigations Template
*/

use Timber\Timber;
use Timber\Post as TimberPost;
use Timber\Term;

$context = Timber::context();
// Hero
$context['hero'] = get_field('hero', $context['post']->ID) ?? [];

// Feature Billboard
$context['feature_billboard'] = get_field('feature_billboard', $context['post']->ID) ?? [];
$feature_billboard_id = $context['feature_billboard']['post'] ?? null;

// Active Investigations
$context['active_investigations'] = get_field('active_investigations', $context['post']->ID) ?? [];

// All Posts
$context['all_cases_and_investigations'] = get_field('all_cases_and_investigations', $context['post']->ID) ?? [];

// Content Builder
$context['content_builder'] = get_fields($context['post']->ID)['content_builder'] ?? null;

// Build array of post IDs to exclude
$exclude_ids = [];

// Add feature billboard ID if it exists
if ($feature_billboard_id) {
    $exclude_ids[] = $feature_billboard_id;
}

// Extract post IDs from active_investigations group
if (!empty($context['active_investigations']) && isset($context['active_investigations']['active_investigations_posts'])) {
    $active_posts = $context['active_investigations']['active_investigations_posts'];
    
    if (!empty($active_posts)) {
        foreach ($active_posts as $post_obj) {
            if (is_object($post_obj) && isset($post_obj->post)) {
                $exclude_ids[] = $post_obj->post;
            } elseif (is_array($post_obj) && isset($post_obj['post'])) {
                $exclude_ids[] = $post_obj['post'];
            }
        }
    }
}

// Remove duplicates
$exclude_ids = array_unique($exclude_ids);

// Cases and Investigations Posts || Excluding Feature Billboard and Active Investigations
$context['cases_posts'] = Timber::get_posts([
    'post_type' => 'cases',
    'posts_per_page' => -1,
    'post__not_in' => $exclude_ids,
    'paged' => get_query_var('paged') ?: 1
]);

$context['categories'] = get_terms([
    'taxonomy' => 'case-categories',
    'hide_empty' => true,
]);

$context['tags'] = get_terms([
    'taxonomy' => 'tags-cases',
    'hide_empty' => true,
]);

$template = 'views/pages/cases-and-investigations/_index.twig';

Timber::render($template, $context);