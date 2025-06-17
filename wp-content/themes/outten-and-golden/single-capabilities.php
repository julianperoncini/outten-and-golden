<?php
namespace App;

use Timber\Timber;

$context = Timber::context();
$context['post'] = Timber::get_post();

$post->feature_content = get_field('feature_content');
$post->content_post = get_field('content_post');
$post->content_builder = get_field('content_builder');

$context['post'] = $post;

$other_capabilities_slider = array(
    'post_type' => 'capabilities',
    'posts_per_page' => -1,
    'post__not_in' => [$post->ID],
    'post_status' => 'publish'
);

$other_capabilities = get_posts($other_capabilities_slider);
$formatted_capabilities = [];

foreach ($other_capabilities as $capabilities) {
    $issue_data = (array) $capabilities;
    $issue_data['title'] = $capabilities->post_title;
    $issue_data['feature_content'] = get_field('feature_content', $capabilities->ID);
    $issue_data['link'] = get_permalink($capabilities->ID);
    
    $categories = wp_get_post_terms($capabilities->ID, 'categories-capabilities');
    if (!empty($categories) && !is_wp_error($categories)) {
        $issue_data['categories'] = array_map(function($cat) {
            return [
                'name' => $cat->name,
                'slug' => $cat->slug,
                'id' => $cat->term_id
            ];
        }, $categories);
        $issue_data['category'] = $categories[0]->name;
    } else {
        $issue_data['categories'] = [];
        $issue_data['category'] = '';
    }
    
    $formatted_capabilities[] = $issue_data;
}

$context['other_capabilities_slider'] = $formatted_capabilities;

Timber::render('views/pages/capabilities/_single.twig', $context);