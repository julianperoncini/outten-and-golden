<?php
namespace App;

use Timber\Timber;

$context = Timber::context();
$context['post'] = Timber::get_post();

$post->feature_content = get_field('feature_content');
$post->content_post = get_field('content_post');
$post->content_builder = get_field('content_builder');

$context['categories'] = wp_get_post_terms($post->ID, 'case-categories');
$tags = wp_get_post_terms($post->ID, 'tags-cases');
if (!empty($tags)) {
    foreach ($tags as $tag) {
        $tag->background_color = get_field('background_color', 'tags-cases_' . $tag->term_id);
    }
}
$context['tags'] = $tags;

$context['post'] = $post;

Timber::render('views/pages/cases-and-investigations/_single.twig', $context);