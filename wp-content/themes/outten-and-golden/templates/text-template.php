<?php
/**
    * Template Name: Text Template
*/

use Timber\Timber;

$context = Timber::context();
$template = 'views/pages/text-template/_index.twig';

Timber::render($template, $context);