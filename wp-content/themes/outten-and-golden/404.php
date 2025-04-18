<?php
/**
 * The template for the 404 page
 */

namespace App;

use Timber\Timber;

$context = Timber::context();

Timber::render('views/fourofour.twig', $context);