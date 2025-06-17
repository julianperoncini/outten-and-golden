<?php
/**
 * Template Name: Capabilities Template
 */

use Timber\Timber;
use Timber\Post as TimberPost;
use Timber\Term;

$context = Timber::context();

// Hero
$context['hero'] = get_field('hero', $context['post']->ID) ?? [];

// All capabilities Layout
$all_capabilities_layout = get_field('all_capabilities_layout', $context['post']->ID) ?? [];

if (!empty($all_capabilities_layout['layout'])) {
    foreach ($all_capabilities_layout['layout'] as $index => &$layout_section) {
        $posts_data = [];
        
        if (!empty($layout_section['post_type']) && is_array($layout_section['post_type'])) {
            $term_ids = $layout_section['post_type'];
            
            $args = [
                'post_type' => 'capabilities',
                'posts_per_page' => -1,
                'post_status' => 'publish',
                'orderby' => 'date',
                'order' => 'ASC',
                'tax_query' => [
                    [
                        'taxonomy' => 'categories-capabilities',
                        'field'    => 'term_id',
                        'terms'    => $term_ids,
                        'operator' => 'IN'
                    ]
                ]
            ];
            
            $posts_data = Timber::get_posts($args);
        }
        
        $layout_section['posts'] = $posts_data;
        
        if (!empty($layout_section['post_type'])) {
            $terms_info = [];
            $taxonomy_name = '';

            foreach ($layout_section['post_type'] as $term_id) {
                $term = get_term($term_id);
                if ($term && !is_wp_error($term)) {
                    $terms_info[] = [
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug
                    ];
                }
            }
            $layout_section['terms_info'] = $terms_info;
        }
    }
}

$context['all_capabilities_layout'] = $all_capabilities_layout;

$context['categories'] = get_terms([
    'taxonomy' => 'categories-capabilities',
    'hide_empty' => true,
]);

// Content Builder
$context['content_builder'] = get_fields($context['post']->ID)['content_builder'] ?? null;

$template = 'views/pages/capabilities/_index.twig';

Timber::render($template, $context);
?>