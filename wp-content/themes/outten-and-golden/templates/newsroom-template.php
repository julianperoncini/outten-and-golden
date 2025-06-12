<?php
/**
    * Template Name: Newsroom Template
*/

use Timber\Timber;
use Timber\Post as TimberPost;
use Timber\Term;

$context = Timber::context();
// Hero
$context['hero'] = get_field('hero', $context['post']->ID) ?? [];

// Feature Billboard
$context['feature_billboard'] = get_field('feature_billboard', $context['post']->ID) ?? [];
$feature_billboard_id = $context['feature_billboard']->ID;

// All Post Articles
$context['all_post_articles'] = get_field('all_post_articles', $context['post']->ID) ?? [];

// Content Builder
$context['content_builder'] = get_fields($context['post']->ID)['content_builder'] ?? null;

// Newsroom Posts
$context['newsroom_posts'] = Timber::get_posts([
    'post_type' => 'post',
    'posts_per_page' => 12,
    'post__not_in' => [$feature_billboard_id],
    'order' => 'ASC',
    'paged' => get_query_var('paged') ?: 1
]);

// Newsroom Posts Categories
$categories = get_terms([
    'taxonomy' => 'category',
    'hide_empty' => true,
    'orderby' => 'name',
]);

$context['categories'] = Timber::get_terms($categories);

$template = 'views/pages/newsroom/_index.twig';

Timber::render($template, $context);