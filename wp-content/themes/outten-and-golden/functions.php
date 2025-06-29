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

/**
 * Attorney
 * =======
 *
 * Hooks and filters for attorney.
 */
require_once __DIR__ . '/libs/class-outten-and-golden-attorney.php';

/**
 * Tag Parent Child Mapping
 * =======================
 *
 * Outputs the tag parent child mapping to the head.
 */
function output_tag_parent_child_mapping() {
    $parent_mapping = array();
    $parent_child_mapping = array();
    $taxonomies = array('post_tag', 'tags-cases', 'case-categories', 'categories-issues');
    
    foreach ($taxonomies as $taxonomy) {
        // Get all terms
        $all_terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'hide_empty' => false
        ));
        
        if (!is_wp_error($all_terms)) {
            foreach ($all_terms as $term) {
                // Create child-to-parent mapping
                if ($term->parent) {
                    $parent_term = get_term($term->parent, $taxonomy);
                    if ($parent_term && !is_wp_error($parent_term)) {
                        $parent_mapping[$term->name] = $parent_term->name;
                    }
                }
                
                // Create parent-to-children mapping
                if ($term->parent == 0) {
                    $children = get_terms(array(
                        'taxonomy' => $taxonomy,
                        'parent' => $term->term_id,
                        'hide_empty' => false
                    ));
                    
                    if (!is_wp_error($children) && !empty($children)) {
                        $child_names = array();
                        foreach ($children as $child) {
                            $child_names[] = $child->name;
                        }
                        $parent_child_mapping[$term->name] = $child_names;
                    }
                }
            }
        }
    }
    ?>
    <script>
        window.tagParentMapping = <?php echo json_encode($parent_mapping); ?>;
        window.tagParentChildMap = <?php echo json_encode($parent_child_mapping); ?>;
    </script>
    <?php
}
add_action('wp_head', 'output_tag_parent_child_mapping');


add_action('wp_footer', function() {
    // Create a fresh nonce for comparison
    $fresh_nonce = wp_create_nonce('ajax_filter_nonce');
    $newsroom_nonce = wp_create_nonce('newsroom_filter_nonce');
    ?>
    <script>
    console.log('=== NONCE DEBUG ===');
    console.log('Fresh ajax_filter_nonce:', '<?php echo $fresh_nonce; ?>');
    console.log('Fresh newsroom_filter_nonce:', '<?php echo $newsroom_nonce; ?>');
    console.log('Localized nonce:', window.ajaxurl_data?.nonce);
    console.log('Do they match?', window.ajaxurl_data?.nonce === '<?php echo $fresh_nonce; ?>');
    
    // Check if the nonce might have been created with a different action
    if (window.ajaxurl_data?.nonce === '<?php echo $newsroom_nonce; ?>') {
        console.log('❗ NONCE MISMATCH: The nonce was created with "newsroom_filter_nonce" action!');
    }
    </script>
    <?php
});

// Also add logging to see when ajax_url is defined
add_action('wp_enqueue_scripts', function() {
    error_log('wp_enqueue_scripts: About to localize script');
    error_log('Current user ID: ' . get_current_user_id());
    error_log('Is user logged in: ' . (is_user_logged_in() ? 'Yes' : 'No'));
}, 99);