<?php
/**
 * Template Name: Text Template
 */

use Timber\Timber;

$context = Timber::context();
$post = Timber::get_post();
$context['post'] = $post;

$context['item'] = get_fields();

$template = 'views/pages/text-template/_index.twig';

Timber::render($template, $context);