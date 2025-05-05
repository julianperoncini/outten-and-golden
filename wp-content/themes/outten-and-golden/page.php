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

// Get issues posts
$issues_posts = Timber::get_posts([
     'post_type' => 'issues',
     'posts_per_page' => -1,
     'orderby' => 'date',
     'order' => 'DESC',
 ]);
 
 // Get ACF fields for each issue
// Get ACF fields and categories for each issue
$issues_with_fields = [];
foreach ($issues_posts as $issue) {
    $issue_fields = get_fields($issue->ID);
    
    // Get categories for this issue
    // Replace 'category' with your actual taxonomy name if it's different
    $categories = get_the_terms($issue->ID, 'categories-issues');
    
    // If you're using a custom taxonomy for your issues, use that instead
    // For example, if you have a taxonomy called 'issue_category':
    // $categories = get_the_terms($issue->ID, 'issue_category');
    
    $issue->fields = $issue_fields;
    $issue->categories = $categories;
    $issues_with_fields[] = $issue;
}

$context['issues'] = $issues_with_fields;

Timber::render( 'views/page.twig', $context );
