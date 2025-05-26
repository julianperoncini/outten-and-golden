<?php
namespace App;

use Timber\Timber;

$context = Timber::context();
$context['post'] = Timber::get_post();

$post->feature_content = get_field('feature_content');
$post->content_post = get_field('content_post');
$post->content_builder = get_field('content_builder');

$context['post'] = $post;

Timber::render('views/pages/issues/_single.twig', $context);