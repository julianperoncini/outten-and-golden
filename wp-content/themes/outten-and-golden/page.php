<?php
/**
     * The template for displaying all pages.
     *
     * This is the template that displays all pages by default.
     * Please note that this is the WordPress construct of pages
     * and that other 'pages' on your WordPress site will use a
     * different template.
*/

namespace App;

use Timber\Timber;

$context = Timber::context();
$context['post'] = Timber::get_post();
$context['content_builder'] = get_fields($context['post']->ID)['content_builder'] ?? null;

$issues_posts = Timber::get_posts([
     'post_type' => 'issues',
     'posts_per_page' => -1,
     'orderby' => 'date',
     'order' => 'DESC',
 ]);
 
$issues_with_fields = [];

foreach ($issues_posts as $issue) {
    $issue_fields = get_fields($issue->ID);
    
    $categories = get_the_terms($issue->ID, 'categories-issues');
    
    $issue->fields = $issue_fields;
    $issue->categories = $categories;
    $issues_with_fields[] = $issue;
}

$client_stories_posts = Timber::get_posts([
    'post_type' => 'client-stories',
    'posts_per_page' => -1,
    'orderby' => 'date',
    'order' => 'DESC',
]);

$client_stories_with_fields = [];

foreach ($client_stories_posts as $client_story) {
   $client_story_fields = get_fields($client_story->ID);
   
   $categories = get_the_terms($client_story->ID, 'categories-client-stories');
   
   $client_story->fields = $client_story_fields;
   $client_story->categories = $categories;
   $client_stories_with_fields[] = $client_story;
}

$context['client_stories'] = $client_stories_with_fields;
$context['issues'] = $issues_with_fields;

Timber::render( 'views/page.twig', $context );
