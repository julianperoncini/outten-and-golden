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