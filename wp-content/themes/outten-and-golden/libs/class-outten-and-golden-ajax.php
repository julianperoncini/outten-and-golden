<?php
/**
 * OUTTEN_AND_GOLDEN_AJAX
 * ========
 *
 * Adds our AJAX responses.
 *
 * @author  Jesper Westlund <jesper.westlund1@gmail.com>
 * @package OUTTEN_AND_GOLDEN
 */

use Timber\Timber;

class OUTTEN_AND_GOLDEN_AJAX {
  
  private $newsroom_posts_per_page = 12;
  
  public function __construct() {
    add_action( 'wp_head', array( $this, 'define_ajax_url' ) );

    add_action('wp_ajax_submit_gravity_form_ajax', array( $this, 'handle_gravity_form_ajax_submission' ));
    add_action('wp_ajax_nopriv_submit_gravity_form_ajax', array( $this, 'handle_gravity_form_ajax_submission' ));

    add_action('wp_ajax_search', array( $this, 'handle_search_ajax' ));
    add_action('wp_ajax_nopriv_search', array( $this, 'handle_search_ajax' ));

    // New newsroom filtering AJAX actions
    add_action('wp_ajax_filter_newsroom_posts', array( $this, 'handle_newsroom_filter' ));
    add_action('wp_ajax_nopriv_filter_newsroom_posts', array( $this, 'handle_newsroom_filter' ));
  }

  /**
   * Localizes the URL to the AJAX endpoint.
   * @return void
   */
  public function define_ajax_url() {
    wp_localize_script( 'main', 'ajaxurl_data', array(
      'url' => admin_url( 'admin-ajax.php' ),
      'nonce' => wp_create_nonce('newsroom_filter_nonce')
    ));
    
    wp_add_inline_script( 'main', 'const ajaxurl = "' . admin_url( 'admin-ajax.php' ) . '";', 'before' );
  }
  
  /**
   * Handle newsroom filtering AJAX request - TIMBER VERSION
   */
  public function handle_newsroom_filter() {
    // Add nonce verification for security
    if (!wp_verify_nonce($_POST['nonce'] ?? '', 'newsroom_filter_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed'));
    }
    
    $category = sanitize_text_field($_POST['category'] ?? 'all');
    $page = intval($_POST['page'] ?? 1);
    $posts_per_page = intval($_POST['posts_per_page'] ?? 12);
    
    try {
        // Build query args
        $query_args = array(
            'post_type' => 'post',
            'posts_per_page' => $posts_per_page,
            'paged' => $page,
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC'
        );
        
        // Add category filter if not 'all'
        if ($category !== 'all') {
            $query_args['tax_query'] = array(
                array(
                    'taxonomy' => 'category',
                    'field' => 'slug',
                    'terms' => $category,
                ),
            );
        }
        
        $query = new WP_Query($query_args);
        
        // Generate posts HTML using Timber
        $posts_html = $this->generate_timber_posts_html($query);
        
        // Generate pagination HTML using your Twig template
        $pagination_html = $this->generate_timber_pagination_html($query->max_num_pages, $page, $category, $posts_per_page);
        
        wp_reset_postdata();
        
        wp_send_json_success(array(
            'posts_html' => $posts_html,
            'pagination_html' => $pagination_html,
            'total_pages' => $query->max_num_pages,
            'total_posts' => $query->found_posts,
            'current_page' => $page,
            'category' => $category,
            'posts_per_page' => $posts_per_page
        ));
        
    } catch (Exception $e) {
        wp_send_json_error(array(
            'message' => 'Error: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ));
    }
  }
  
  /**
   * Generate posts HTML using Timber and your newsroom-post-item.twig
   */
  private function generate_timber_posts_html($query) {
      if (!$query->have_posts()) {
          return '<div class="no-posts"><p class="text-center text-gray-600">No posts found for this category.</p></div>';
      }
      
      ob_start();
      echo '<div class="news-grid-blog-page">';
      
      while ($query->have_posts()) {
          $query->the_post();
          
          // Get Timber post object
          $timber_post = Timber::get_post();
          
          // Render your existing post template
          echo Timber::compile('partials/newsroom-post-item.twig', array('post' => $timber_post));
      }
      
      echo '</div>';
      
      return ob_get_clean();
  }
  
  /**
   * Generate pagination HTML using your pagination.twig template
   */
  private function generate_timber_pagination_html($total_pages, $current_page, $category, $posts_per_page = 12) {
      if ($total_pages <= 1) {
          return '';
      }
      
      // Get the newsroom page URL
      $base_url = $this->get_newsroom_page_url();
      
      // Build pagination data for your Twig template
      $pagination_data = array(
          'pages' => array(),
          'prev' => null,
          'next' => null
      );
      
      // Previous page
      if ($current_page > 1) {
          $pagination_data['prev'] = array(
              'link' => $this->build_pagination_url($base_url, $category, $current_page - 1, $posts_per_page),
              'title' => 'Previous'
          );
      }
      
      // Next page
      if ($current_page < $total_pages) {
          $pagination_data['next'] = array(
              'link' => $this->build_pagination_url($base_url, $category, $current_page + 1, $posts_per_page),
              'title' => 'Next'
          );
      }
      
      // Page numbers - show range around current page
      $start = max(1, $current_page - 2);
      $end = min($total_pages, $current_page + 2);
      
      // First page + ellipsis if needed
      if ($start > 1) {
          $pagination_data['pages'][] = array(
              'link' => $this->build_pagination_url($base_url, $category, 1, $posts_per_page),
              'title' => '1',
              'class' => 'page-number'
          );
          
          if ($start > 2) {
              $pagination_data['pages'][] = array(
                  'link' => null,
                  'title' => '...',
                  'class' => 'ellipsis'
              );
          }
      }
      
      // Main page numbers
      for ($i = $start; $i <= $end; $i++) {
          if ($i == $current_page) {
              // Current page (no link)
              $pagination_data['pages'][] = array(
                  'link' => null,
                  'title' => (string)$i,
                  'class' => 'current'
              );
          } else {
              // Other pages (with links) - each page gets its own URL
              $pagination_data['pages'][] = array(
                  'link' => $this->build_pagination_url($base_url, $category, $i, $posts_per_page),
                  'title' => (string)$i,
                  'class' => 'page-number'
              );
          }
      }
      
      // Last page + ellipsis if needed
      if ($end < $total_pages) {
          if ($end < $total_pages - 1) {
              $pagination_data['pages'][] = array(
                  'link' => null,
                  'title' => '...',
                  'class' => 'ellipsis'
              );
          }
          
          $pagination_data['pages'][] = array(
              'link' => $this->build_pagination_url($base_url, $category, $total_pages, $posts_per_page),
              'title' => (string)$total_pages,
              'class' => 'page-number'
          );
      }
      
      // Use Timber to render your pagination template
      return Timber::compile('partials/pagination.twig', array(
          'props' => array(
              'pagination' => $pagination_data,
              'items_per_page' => $posts_per_page,
              'items_per_page_options' => array(6, 12, 18)
          )
      ));
  }
  
  /**
   * Get the newsroom page URL
   */
  private function get_newsroom_page_url() {
      // Try to get the URL from the HTTP referer first
      $referer = wp_get_referer();
      if ($referer) {
          $parsed_url = parse_url($referer);
          if ($parsed_url) {
              $base_url = $parsed_url['scheme'] . '://' . $parsed_url['host'];
              if (isset($parsed_url['port'])) {
                  $base_url .= ':' . $parsed_url['port'];
              }
              
              // Clean the path - remove /page/X from referer
              $clean_path = preg_replace('/\/page\/\d+/', '', $parsed_url['path']);
              $base_url .= $clean_path;
              
              return $base_url;
          }
      }
      
      // Fallback: return home URL with newsroom path
      return home_url('/newsroom');
  }
  
  /**
   * Build pagination URL with proper parameters
   */
  private function build_pagination_url($base_url, $category, $page, $posts_per_page = 12) {
      // Remove any existing /page/X from base URL
      $clean_base_url = preg_replace('/\/page\/\d+/', '', $base_url);
      $clean_base_url = rtrim($clean_base_url, '/');
      
      // For page 1, use base URL without /page/X
      if ($page == 1) {
          $url = $clean_base_url;
      } else {
          // For other pages, add /page/X
          $url = $clean_base_url . '/page/' . $page;
      }
      
      $params = array();
      
      // Add category parameter if not 'all'
      if ($category !== 'all') {
          $params['category'] = $category;
      }
      
      // Add per_page parameter if not default 12
      if ($posts_per_page !== 12) {
          $params['per_page'] = $posts_per_page;
      }
      
      // Build query string
      if (!empty($params)) {
          $url .= '?' . http_build_query($params);
      }
      
      return $url;
  }

  function handle_search_ajax() {
    $tag_text = $_POST['tagText'] ?? '';
    $active_tags = json_decode(stripslashes($_POST['activeTags'] ?? '[]'), true);
    
    $args = array(
        'post_type' => array('issues', 'cases', 'post'),
        'posts_per_page' => -1,
        'tax_query' => array(
            array(
                'taxonomy' => 'post_tag',
                'field' => 'name',
                'terms' => $active_tags,
                'operator' => 'IN'
            )
        )
    );

    $number_of_posts = 0;

    $context = array();
    $timber_posts = Timber::get_posts($args);

    foreach ($timber_posts as $post) {
        $posttype = get_post_type($post->ID);

        if ($posttype === 'issues') {
            $post->fields = get_fields($post->ID);
            
            if (!is_array($context['issues_results'])) {
                $context['issues_results'] = array();
            }

            $context['issues_results'][] = $post;
            $number_of_posts++;
        }

        if ($posttype === 'cases') {
            $post->fields = get_fields($post->ID);
            
            if (!is_array($context['cases_results'])) {
                $context['cases_results'] = array();
            }

            $context['cases_results'][] = $post;
            $number_of_posts++;
        }

        if ($posttype === 'post') {
            $post->fields = get_fields($post->ID);
            
            if (!is_array($context['post_results'])) {
                $context['post_results'] = array();
            }

            $context['post_results'][] = $post;
            $number_of_posts++;
        }
    }

    wp_send_json(array(
        'success' => true,
        'data' => array(
            'tagText' => $tag_text,
            'activeTags' => $active_tags,
            'html' => Timber::compile('partials/search-results.twig', $context),
            'total' => $number_of_posts
        )
    ));
  }

  public function handle_gravity_form_ajax_submission() {
    // Check if Gravity Forms is active
    if (!class_exists('GFAPI')) {
      wp_send_json_error(array('message' => 'Gravity Forms is not active'));
    }
  
    // Get the form ID
    $form_id = isset($_POST['form_id']) ? absint($_POST['form_id']) : 0;
  
    if (!$form_id) {
      wp_send_json_error(array('message' => 'Invalid form ID'));
    }
  
    // Get the form
    $form = GFAPI::get_form($form_id);
  
    if (!$form) {
      wp_send_json_error(array('message' => 'Form not found'));
    }
  
    // Create an array to store field values
    $field_values = array();
    
    // Prepare input values in the format that Gravity Forms expects
    foreach ($_POST as $key => $value) {
      if (preg_match('/^input_(.+)$/', $key, $matches)) {
        $field_values[$matches[1]] = $value;
      }
    }
    
    // Validate the submission
    $validation_result = GFAPI::validate_form($form_id, $field_values);
    
    // Check if there are validation errors
    if ($validation_result['is_valid'] === false) {
      $validation_messages = array();
      
      // Format validation messages for each field
      foreach ($validation_result['form']['fields'] as $field) {
        if (!empty($field->validation_message)) {
          $validation_messages[$field->id] = $field->validation_message;
        }
      }
      
      // Return validation errors
      wp_send_json_error(array(
        'message' => 'Validation failed',
        'validation_messages' => $validation_messages,
        'validation_result' => $validation_result
      ));
      
      exit;
    }
    
    // If validation passed, submit the form
    $result = GFAPI::submit_form($form_id, $field_values);
    
    // Check for submission errors
    if (is_wp_error($result)) {
      wp_send_json_error(array(
        'message' => 'Form submission failed',
        'validation_messages' => $result->get_error_data()
      ));
    }
    
    // Get the confirmation message from Gravity Forms
    $confirmation = GFFormDisplay::handle_confirmation($form, $field_values, false);
    
    // Prepare the response
    $response = array(
      'success' => true,
      'confirmation_message' => is_array($confirmation) && isset($confirmation['redirect']) 
        ? '' 
        : $confirmation,
      'redirect_url' => is_array($confirmation) && isset($confirmation['redirect']) 
        ? $confirmation['redirect'] 
        : ''
    );
    
    // Send the response
    wp_send_json($response);
  }

}
new OUTTEN_AND_GOLDEN_AJAX;