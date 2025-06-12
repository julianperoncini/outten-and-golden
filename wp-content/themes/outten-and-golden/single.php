<?php
namespace App;

use Timber\Timber;

$context = Timber::context();
$context['post'] = Timber::get_post();

$post->link = get_permalink($post->ID);
$post->feature_content = get_field('feature_content');
$post->content_post = get_field('content_post');
$post->attorneys_on_the_case = get_field('attorneys_on_the_case');
$post->content_builder = get_field('content_builder');

$context['post'] = $post;
$context['categories'] = wp_get_post_terms($post->ID, 'category');

$author_id = $post->post_author;
$post->author = (object) [
    'ID' => $author_id,
    'first_name' => get_the_author_meta('first_name', $author_id),
    'last_name' => get_the_author_meta('last_name', $author_id),
    'profile_picture' => get_the_author_meta('profile_picture', $author_id),
];

$other_stories_slider = array(
    'post_type' => 'post',
    'posts_per_page' => -1,
    'post__not_in' => [$post->ID],
    'post_status' => 'publish'
);

$other_stories = get_posts($other_stories_slider);
$formatted_stories = [];

foreach ($other_stories as $stories) {
    $storie_data = (array) $stories;
    $storie_data['title'] = $stories->post_title;
    $storie_data['feature_content'] = get_field('feature_content', $stories->ID);
    $storie_data['link'] = get_permalink($stories->ID);
    
    $categories = wp_get_post_terms($stories->ID, 'category');
    if (!empty($categories) && !is_wp_error($categories)) {
        $storie_data['categories'] = array_map(function($cat) {
            return [
                'name' => $cat->name,
                'slug' => $cat->slug,
                'id' => $cat->term_id
            ];
        }, $categories);
        $storie_data['category'] = $categories[0]->name;
    } else {
        $storie_data['categories'] = [];
        $storie_data['category'] = '';
    }
    
    $formatted_stories[] = $storie_data;
}

$context['other_stories_slider'] = $formatted_stories;

Timber::render('views/pages/newsroom/_single.twig', $context);