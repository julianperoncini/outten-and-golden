<?php
/**
    * Template Name: Client Stories Template
*/

use Timber\Timber;
use Timber\Post as TimberPost;
use Timber\Term;

$context = Timber::context();

// Hero
$context['hero'] = get_field('hero', $context['post']->ID) ?? [];

// Hero
$context['all_client_stories'] = get_field('all_client_stories', $context['post']->ID) ?? [];

// Content Builder
$context['content_builder'] = get_fields($context['post']->ID)['content_builder'] ?? null;

// Client Stories Posts
$context['client_stories_posts'] = Timber::get_posts([
    'post_type' => 'client-stories',
    'posts_per_page' => 18,
    'order' => 'ASC',
    'paged' => get_query_var('paged') ?: 1
]);

$template = 'views/pages/client-stories/_index.twig';

Timber::render($template, $context);