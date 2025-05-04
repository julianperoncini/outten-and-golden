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

$post_types = ['cases', 'newsroom', 'client-stories', 'team-member', 'issues'];

foreach ($post_types as $post_type) {
    $context_key = str_replace('-', '_', $post_type);
    
    $args = [
        'post_type' => $post_type,
        'posts_per_page' => -1,
    ];
    
    $context[$context_key] = Timber::get_posts($args);
}

Timber::render('views/page.twig', $context);