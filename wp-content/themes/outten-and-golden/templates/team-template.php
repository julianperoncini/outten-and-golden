<?php
/**
 * Template Name: Team Template
 */

use Timber\Timber;

$context = Timber::context();
$context['hero'] = get_field('hero', $context['post']->ID) ?? [];
$context['content_builder'] = get_fields($context['post']->ID)['content_builder'] ?? null;

$args = array(
    'post_type' => 'attorney',
    'posts_per_page' => -1,
    'orderby' => 'menu_order',
    'order' => 'ASC'
);

$team_members = get_posts($args);
$formatted_members = [];

foreach ($team_members as $member) {
    $member_data = (array) $member;
    $member_data['title'] = $member->post_title;
    $member_data['featured_image'] = get_field('featured_image', $member->ID);
    $member_data['contact_info'] = get_field('contact_info', $member->ID);
    
    $locations = wp_get_post_terms($member->ID, 'team-locations');
    $member_data['location'] = !empty($locations) ? $locations[0]->name : '';
    
    $member_data['all_locations'] = $locations;
    
    $categories = wp_get_post_terms($member->ID, 'team-categories');
    $member_data['category'] = !empty($categories) ? $categories[0]->name : '';
    
    $member_data['all_categories'] = $categories;
    
    $formatted_members[] = $member_data;
}

$context['team_members'] = $formatted_members;

$context['all_locations'] = get_terms([
    'taxonomy' => 'team-locations',
    'hide_empty' => true,
]);

$context['all_categories'] = get_terms([
    'taxonomy' => 'team-categories',
    'hide_empty' => true,
]);

$template = 'views/pages/team/_index.twig';

Timber::render($template, $context);