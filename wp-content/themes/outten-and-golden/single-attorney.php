<?php
namespace App;

use Timber\Timber;

$context = Timber::context();
$context['post'] = Timber::get_post();

$post = $context['post'];
$post->feature_media = get_field('featured_image');
$post->feature_content = get_field('feature_content');
$post->contact_info = get_field('contact_info');
$post->content_builder = get_field('content_builder');

$post->team_categories = wp_get_post_terms($post->ID, 'team-categories');
$post->team_locations = wp_get_post_terms($post->ID, 'team-locations');

$context['post'] = $post;

$team_members_slider = array(
    'post_type' => 'attorney',
    'posts_per_page' => -1,
    'post__not_in' => [$post->ID],
    'post_status' => 'publish'
);

$team_members = get_posts($team_members_slider);
$formatted_members = [];

foreach ($team_members as $member) {
    $member_data = (array) $member;
    $member_data['title'] = $member->post_title;
    $member_data['featured_image'] = get_field('featured_image', $member->ID);
    $member_data['contact_info'] = get_field('contact_info', $member->ID);
    $member_data['link'] = get_the_permalink($member->ID);
    
    $locations = wp_get_post_terms($member->ID, 'team-locations');
    $member_data['location'] = !empty($locations) ? $locations[0]->name : '';
    
    $member_data['all_locations'] = $locations;
    
    $categories = wp_get_post_terms($member->ID, 'team-categories');
    $member_data['category'] = !empty($categories) ? $categories[0]->name : '';
    
    $member_data['all_categories'] = $categories;
    
    $formatted_members[] = $member_data;
}

$context['team_members_slider'] = $formatted_members;

Timber::render('views/pages/team/_single.twig', $context);