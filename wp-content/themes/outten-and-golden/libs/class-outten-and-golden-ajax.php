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
  public function __construct() {
    add_action( 'wp_head', array( $this, 'define_ajax_url' ) );

    // Register the AJAX action for logged in and non-logged in users
    add_action('wp_ajax_submit_gravity_form_ajax', array( $this, 'handle_gravity_form_ajax_submission' ));
    add_action('wp_ajax_nopriv_submit_gravity_form_ajax', array( $this, 'handle_gravity_form_ajax_submission' ));

    add_action('wp_ajax_search', array( $this, 'handle_search_ajax' ));
    add_action('wp_ajax_nopriv_search', array( $this, 'handle_search_ajax' ));
  }

  function handle_search_ajax() {
    $tag_text = $_POST['tagText'] ?? '';
    $active_tags = json_decode(stripslashes($_POST['activeTags'] ?? '[]'), true);
    
    $args = array(
        'post_type' => ['issues', 'cases', 'post'],
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

    $context = [];
    $timber_posts = Timber::get_posts($args);

    foreach ($timber_posts as $post) {
        $posttype = get_post_type($post->ID);

        if ($posttype === 'issues') {
            $post->fields = get_fields($post->ID);
            
            if (!is_array($context['issues_results'])) {
                $context['issues_results'] = [];
            }

            $context['issues_results'][] = $post;
            $number_of_posts++;
        }

        if ($posttype === 'cases') {
            $post->fields = get_fields($post->ID);
            
            if (!is_array($context['cases_results'])) {
                $context['cases_results'] = [];
            }

            $context['cases_results'][] = $post;
            $number_of_posts++;
        }

        if ($posttype === 'post') {
            $post->fields = get_fields($post->ID);
            
            if (!is_array($context['post_results'])) {
                $context['post_results'] = [];
            }

            $context['post_results'][] = $post;
            $number_of_posts++;
        }
    }

    wp_send_json([
        'success' => true,
        'data' => [
            'tagText' => $tag_text,
            'activeTags' => $active_tags,
            'html' => Timber::compile('partials/search-results.twig', $context),
            'total' => $number_of_posts
        ]
    ]);
  }

  /**
   * Localizes the URL to the AJAX endpoint.
   * @return void
   */
  public function define_ajax_url() {
    // Fix: wp_localize_script expects an array as the third parameter
    wp_localize_script( 'main', 'ajaxurl_data', array(
      'url' => admin_url( 'admin-ajax.php' )
    ));
    
    // Alternative approach using wp_add_inline_script (recommended in newer WordPress)
    wp_add_inline_script( 'main', 'const ajaxurl = "' . admin_url( 'admin-ajax.php' ) . '";', 'before' );
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