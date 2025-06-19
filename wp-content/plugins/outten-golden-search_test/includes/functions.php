<?php
/**
 * Outten Search Functions
 * Global functions and utilities
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Get search instance
 */
if (!function_exists('outten_search_api')) {
    function outten_search_api() {
        return Outten_Search_API::get_instance();
    }
}

/**
 * Get search settings
 */
if (!function_exists('outten_search_settings')) {
    function outten_search_settings() {
        return Outten_Search_Settings::get_instance();
    }
}

/**
 * Get search analytics
 */
if (!function_exists('outten_search_analytics')) {
    function outten_search_analytics() {
        return Outten_Search_Analytics::get_instance();
    }
}

/**
 * Get search cache
 */
if (!function_exists('outten_search_cache')) {
    function outten_search_cache() {
        return Outten_Search_Cache::get_instance();
    }
}

/**
 * Perform a search programmatically
 */
function outten_search_query($query, $args = []) {
    $defaults = [
        'post_types' => 'issues,cases,posts',
        'limit' => 10,
        'include_taxonomies' => true
    ];
    
    $args = wp_parse_args($args, $defaults);
    
    // Create mock request
    $request = new WP_REST_Request('GET', '/outten/v1/search');
    $request->set_param('query', $query);
    $request->set_param('post_types', $args['post_types']);
    $request->set_param('limit', $args['limit']);
    $request->set_param('include_taxonomies', $args['include_taxonomies']);
    
    $api = outten_search_api();
    $response = $api->handle_search($request);
    
    if (is_wp_error($response)) {
        return $response;
    }
    
    return $response->get_data();
}

/**
 * Track search analytics
 */
function outten_track_search($query, $results_count, $post_types = []) {
    $analytics = outten_search_analytics();
    return $analytics->track_search($query, $results_count, $post_types);
}

/**
 * Get popular search terms
 */
function outten_get_popular_searches($limit = 10, $days = 30) {
    $analytics = outten_search_analytics();
    return $analytics->get_popular_search_terms($limit, $days);
}

/**
 * Clear search cache
 */
function outten_clear_search_cache() {
    $cache = outten_search_cache();
    return $cache->clear_all();
}

/**
 * Get search statistics
 */
function outten_get_search_stats($days = 30) {
    $analytics = outten_search_analytics();
    return $analytics->get_stats($days);
}

/**
 * Check if search is enabled
 */
function outten_is_search_enabled() {
    $settings = outten_search_settings();
    return $settings->get('enable_analytics', true) || $settings->get('enable_cache', true);
}

/**
 * Get searchable post types
 */
function outten_get_searchable_post_types() {
    return Outten_Search_Helpers::get_searchable_post_types();
}

/**
 * Highlight search terms in content
 */
function outten_highlight_search_terms($content, $search_query) {
    $settings = outten_search_settings();
    
    if (!$settings->get('enable_search_highlighting', true)) {
        return $content;
    }
    
    return Outten_Search_Helpers::highlight_search_terms($content, $search_query);
}

/**
 * Get post taxonomies for search
 */
function outten_get_post_search_taxonomies($post_id, $post_type = null) {
    if (!$post_type) {
        $post_type = get_post_type($post_id);
    }
    
    return Outten_Search_Helpers::get_post_taxonomies($post_id, $post_type);
}

/**
 * Format search result data
 */
function outten_format_search_result($post) {
    if (!$post) {
        return null;
    }
    
    $taxonomies = outten_get_post_search_taxonomies($post->ID, $post->post_type);
    
    return [
        'id' => $post->ID,
        'title' => get_the_title($post),
        'content' => wp_trim_words(get_the_content(null, false, $post), 25),
        'excerpt' => get_the_excerpt($post),
        'url' => get_permalink($post),
        'type' => $post->post_type,
        'date' => get_the_date('c', $post),
        'thumbnail' => get_the_post_thumbnail_url($post->ID, 'thumbnail'),
        'categories' => $taxonomies['categories'],
        'tags' => $taxonomies['tags'],
        'author' => get_the_author_meta('display_name', $post->post_author)
    ];
}

/**
 * Get search suggestions
 */
function outten_get_search_suggestions($post_type = 'all', $limit = 10) {
    $request = new WP_REST_Request('GET', '/outten/v1/suggestions');
    $request->set_param('post_type', $post_type);
    $request->set_param('limit', $limit);
    
    $api = outten_search_api();
    $response = $api->get_suggestions($request);
    
    if (is_wp_error($response)) {
        return [];
    }
    
    $data = $response->get_data();
    return $data['suggestions'] ?? [];
}

/**
 * Export search analytics
 */
function outten_export_search_analytics($format = 'csv', $days = 30) {
    $analytics = outten_search_analytics();
    return $analytics->export_data($format, $days);
}

/**
 * Clean up old search data
 */
function outten_cleanup_search_data() {
    $analytics = outten_search_analytics();
    $cache = outten_search_cache();
    
    $analytics_cleaned = $analytics->cleanup_old_data();
    $cache_cleaned = $cache->cleanup_expired();
    
    return [
        'analytics' => $analytics_cleaned,
        'cache' => $cache_cleaned,
        'total' => $analytics_cleaned + $cache_cleaned
    ];
}

/**
 * Warm search cache
 */
function outten_warm_search_cache($queries = []) {
    $cache = outten_search_cache();
    return $cache->warm_cache($queries);
}

/**
 * Get search REST URL
 */
function outten_get_search_rest_url() {
    return rest_url('outten/v1/search');
}

/**
 * Get tag search REST URL
 */
function outten_get_tag_search_rest_url() {
    return rest_url('outten/v1/tag-search');
}

/**
 * Check if current user can access search analytics
 */
function outten_current_user_can_view_analytics() {
    return current_user_can('manage_options') || current_user_can('edit_posts');
}

/**
 * Get search plugin info
 */
function outten_get_plugin_info() {
    return Outten_Golden_Search_Plugin::get_plugin_info();
}

/**
 * Log search debug message
 */
function outten_search_debug_log($message, $data = null) {
    Outten_Search_Helpers::debug_log($message, $data);
}

/**
 * Get search memory usage
 */
function outten_get_search_memory_usage() {
    return Outten_Search_Helpers::get_memory_usage();
}

/**
 * Validate search query
 */
function outten_validate_search_query($query) {
    $settings = outten_search_settings();
    $min_length = $settings->get('min_query_length', 2);
    
    return strlen(trim($query)) >= $min_length;
}

/**
 * Sanitize search query
 */
function outten_sanitize_search_query($query) {
    return Outten_Search_Helpers::sanitize_search_query($query);
}

/**
 * Get post type label for search results
 */
function outten_get_post_type_search_label($post_type) {
    return Outten_Search_Helpers::get_post_type_label($post_type);
}

/**
 * Check if post type is searchable
 */
function outten_is_post_type_searchable($post_type) {
    return Outten_Search_Helpers::is_post_type_searchable($post_type);
}

/**
 * Template function to display search form
 */
function outten_search_form($args = []) {
    $defaults = [
        'placeholder' => __('Search...', 'outten-search'),
        'submit_text' => __('Search', 'outten-search'),
        'show_post_type_filter' => false,
        'css_class' => 'outten-search-form'
    ];
    
    $args = wp_parse_args($args, $defaults);
    
    $searchable_types = outten_get_searchable_post_types();
    
    ob_start();
    ?>
    <form class="<?php echo esc_attr($args['css_class']); ?>" role="search" method="get" action="<?php echo esc_url(home_url('/')); ?>">
        <div class="search-input-wrapper">
            <input type="search" 
                   name="s" 
                   placeholder="<?php echo esc_attr($args['placeholder']); ?>"
                   value="<?php echo get_search_query(); ?>"
                   required>
            
            <?php if ($args['show_post_type_filter'] && !empty($searchable_types)): ?>
            <select name="post_type">
                <option value=""><?php _e('All Types', 'outten-search'); ?></option>
                <?php foreach ($searchable_types as $type): ?>
                <option value="<?php echo esc_attr($type['name']); ?>" 
                        <?php selected(get_query_var('post_type'), $type['name']); ?>>
                    <?php echo esc_html($type['label']); ?>
                </option>
                <?php endforeach; ?>
            </select>
            <?php endif; ?>
            
            <button type="submit"><?php echo esc_html($args['submit_text']); ?></button>
        </div>
    </form>
    <?php
    return ob_get_clean();
}

/**
 * Template function to display search results
 */
function outten_search_results($query = null, $args = []) {
    if (!$query) {
        $query = get_search_query();
    }
    
    if (empty($query)) {
        return '';
    }
    
    $defaults = [
        'post_types' => 'issues,cases,posts',
        'limit' => 10,
        'show_excerpts' => true,
        'show_thumbnails' => true,
        'show_post_type' => true,
        'show_date' => true,
        'highlight_terms' => true
    ];
    
    $args = wp_parse_args($args, $defaults);
    
    $search_results = outten_search_query($query, [
        'post_types' => $args['post_types'],
        'limit' => $args['limit']
    ]);
    
    if (is_wp_error($search_results) || empty($search_results['posts'])) {
        return '<p>' . __('No results found.', 'outten-search') . '</p>';
    }
    
    ob_start();
    ?>
    <div class="outten-search-results">
        <div class="search-results-header">
            <p><?php printf(__('Found %d results for "%s"', 'outten-search'), 
                           $search_results['total'], 
                           esc_html($query)); ?></p>
        </div>
        
        <div class="search-results-list">
            <?php foreach ($search_results['posts'] as $result): ?>
            <article class="search-result-item">
                <?php if ($args['show_thumbnails'] && !empty($result['thumbnail'])): ?>
                <div class="result-thumbnail">
                    <img src="<?php echo esc_url($result['thumbnail']); ?>" 
                         alt="<?php echo esc_attr($result['title']); ?>"
                         loading="lazy">
                </div>
                <?php endif; ?>
                
                <div class="result-content">
                    <h3 class="result-title">
                        <a href="<?php echo esc_url($result['url']); ?>">
                            <?php echo $args['highlight_terms'] 
                                ? outten_highlight_search_terms($result['title'], $query)
                                : esc_html($result['title']); ?>
                        </a>
                    </h3>
                    
                    <?php if ($args['show_excerpts'] && !empty($result['content'])): ?>
                    <div class="result-excerpt">
                        <?php echo $args['highlight_terms'] 
                            ? outten_highlight_search_terms($result['content'], $query)
                            : esc_html($result['content']); ?>
                    </div>
                    <?php endif; ?>
                    
                    <div class="result-meta">
                        <?php if ($args['show_post_type']): ?>
                        <span class="result-type"><?php echo esc_html(outten_get_post_type_search_label($result['type'])); ?></span>
                        <?php endif; ?>
                        
                        <?php if ($args['show_date']): ?>
                        <span class="result-date"><?php echo esc_html(wp_date(get_option('date_format'), strtotime($result['date']))); ?></span>
                        <?php endif; ?>
                        
                        <?php if (!empty($result['categories'])): ?>
                        <span class="result-categories">
                            <?php echo esc_html(implode(', ', array_slice($result['categories'], 0, 2))); ?>
                        </span>
                        <?php endif; ?>
                    </div>
                </div>
            </article>
            <?php endforeach; ?>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Shortcode for search form
 */
function outten_search_form_shortcode($atts) {
    $atts = shortcode_atts([
        'placeholder' => __('Search...', 'outten-search'),
        'submit_text' => __('Search', 'outten-search'),
        'show_post_type_filter' => false,
        'css_class' => 'outten-search-form'
    ], $atts, 'outten_search_form');
    
    return outten_search_form($atts);
}
add_shortcode('outten_search_form', 'outten_search_form_shortcode');

/**
 * Shortcode for search results
 */
function outten_search_results_shortcode($atts) {
    $atts = shortcode_atts([
        'query' => get_search_query(),
        'post_types' => 'issues,cases,posts',
        'limit' => 10,
        'show_excerpts' => true,
        'show_thumbnails' => true,
        'show_post_type' => true,
        'show_date' => true,
        'highlight_terms' => true
    ], $atts, 'outten_search_results');
    
    // Convert string booleans
    foreach (['show_excerpts', 'show_thumbnails', 'show_post_type', 'show_date', 'highlight_terms'] as $bool_key) {
        $atts[$bool_key] = filter_var($atts[$bool_key], FILTER_VALIDATE_BOOLEAN);
    }
    
    return outten_search_results($atts['query'], $atts);
}
add_shortcode('outten_search_results', 'outten_search_results_shortcode');