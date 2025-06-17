<?php

/**
	 * Load Composer dependencies
	 * ==========================
*/
if (!class_exists('Timber\Timber')) {
	include __DIR__ . '/vendor/autoload.php';
}

/**
	 * General
	 * =======
	 *
	 * General theme settings and actions.
*/
require_once __DIR__ . '/libs/class-outten-and-golden-general.php';

/**
	 * Enqueue
	 * =======
	 *
	 * Hooks and filters for enqueu scripts.
*/
require_once __DIR__ . '/libs/class-outten-and-golden-enqueue.php';

/**
	 * AJAX
	 * ====
	 *
	 * Hooks and filters for enqueu scripts.
*/
require_once __DIR__ . '/libs/class-outten-and-golden-ajax.php';

/**
	 * Search
	 * ======
	 *
	 * Hooks and filters for search.
*/
require_once __DIR__ . '/libs/class-outten-and-golden-search.php';
