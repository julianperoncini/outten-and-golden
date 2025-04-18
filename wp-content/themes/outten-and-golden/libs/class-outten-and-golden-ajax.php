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

class OUTTEN_AND_GOLDEN_AJAX {
  public function __construct() {
    add_action( 'wp_head', array( $this, 'define_ajax_url' ) );

    // Register the AJAX action for logged in and non-logged in users
    add_action('wp_ajax_submit_gravity_form_ajax', array( $this, 'handle_gravity_form_ajax_submission' ));
    add_action('wp_ajax_nopriv_submit_gravity_form_ajax', array( $this, 'handle_gravity_form_ajax_submission' ));
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