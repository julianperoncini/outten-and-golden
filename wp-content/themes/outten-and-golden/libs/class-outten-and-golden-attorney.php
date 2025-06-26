<?php

class OUTTEN_AND_GOLDEN_Attorney {

    public function __construct() {
        add_filter('gform_notification', [$this, 'route_to_member_email'], 10, 3);
    }
    
    public function route_to_member_email($notification, $form, $entry) {
        if ($form['id'] == 2) {
            global $post;
            
            // Get the entire contact_info group
            $contact_info = get_field('contact_info', $post->ID);
            $member_email = $contact_info['email'] ?? null;
            
            $fallback_email = 'jesper.westlund1@hotmail.com';
            
            if ($member_email) {
                $notification['to'] = $member_email;
            } else {
                $notification['to'] = $fallback_email;
            }
        }

        return $notification;
    }
}
new OUTTEN_AND_GOLDEN_Attorney;