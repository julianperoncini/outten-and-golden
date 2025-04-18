<?php
/**
    * Template Name: Page Template
*/

use Timber\Timber;
use Timber\Post as TimberPost;
use Timber\Term;

$context = Timber::context();
$context['content_builder'] = get_fields($context['post']->ID)['content_builder'] ?? null;
$template = 'views/pages/page-template/_index.twig';

Timber::render($template, $context);