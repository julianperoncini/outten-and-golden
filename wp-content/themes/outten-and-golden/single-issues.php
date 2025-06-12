<?php
namespace App;

use Timber\Timber;

$context = Timber::context();
$context['post'] = Timber::get_post();

$post->feature_content = get_field('feature_content');
$post->content_post = get_field('content_post');
$post->content_builder = get_field('content_builder');

$context['post'] = $post;

$other_issues_slider = array(
    'post_type' => 'issues',
    'posts_per_page' => -1,
    'post__not_in' => [$post->ID],
    'post_status' => 'publish'
);

$other_issues = get_posts($other_issues_slider);
$formatted_issues = [];

foreach ($other_issues as $issues) {
    $issue_data = (array) $issues;
    $issue_data['title'] = $issues->post_title;
    $issue_data['feature_content'] = get_field('feature_content', $issues->ID);
    $issue_data['link'] = get_permalink($issues->ID);
    
    $categories = wp_get_post_terms($issues->ID, 'categories-issues');
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
    
    $formatted_issues[] = $issue_data;
}

$context['other_issues_slider'] = $formatted_issues;

Timber::render('views/pages/issues/_single.twig', $context);