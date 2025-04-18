<?php
/**
 * OUTTEN_AND_GOLDEN_Enqueue_Scripts
 * =====================
 *
 * Enqueue Scripts
 *
 * @author  Jesper Westlund <jesper.westlund1@hotmail.com>
 * @package OUTTEN_AND_GOLDEN
 */

class OUTTEN_AND_GOLDEN_Enqueue_Scripts {

	/**
	 * @var string
	 */
	private static $style_version = '';

	/**
	 * @var string
	 */
	private static $script_version = '';

	/**
	 * Inits hooks and filters.
	 */
	public function __construct() {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_styles' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ], 99999 );

		add_filter( 'script_loader_tag', [ $this, 'defer_scripts' ], 10, 3 );
		add_filter( 'script_loader_tag', [ $this, 'async_scripts' ], 10, 3 );
	}

	/**
	* Use assets with hashed names.
	*
	* Matches a filename against a hash manifest and returns the hash file name if
	* it exists.
	*
	* @param  string $filename Original name of the file.
	* @return string $filename Hashed name version of a file.
	*/
	public static function get_asset_path( $filename ) {
	    $manifest_path = __DIR__ . '/../dist/assets-manifest.json';

	    if ( file_exists( $manifest_path ) ) {
	        $file_content = file_get_contents( $manifest_path );
	        $manifest = json_decode( $file_content );

	        if ( isset( $manifest->$filename ) ) {
	            $file_path = get_stylesheet_directory_uri() . '/dist/' . $manifest->$filename;
	            self::$style_version = filemtime( $manifest_path );
	            self::$script_version = filemtime( $manifest_path );
	            return $file_path;
	        }
	    }

	    $file_path = get_stylesheet_directory_uri() . '/dist/' . $filename;

	    return $file_path;
	}



	/**
	 * Enqueue stylesheets
	 * @return void
	 */
	public function enqueue_styles() {
		wp_enqueue_style( 'app', $this->get_asset_path( 'app.css' ), [], self::$style_version );

		//echo '<link rel="stylesheet" id="app-css" href="' . self::get_asset_path( 'app.css' ) .'" type="text/css" media="all">';
	}

	/**
	 * App
	 * @return root
	 */
	public function enqueue_scripts() {
		/*
		wp_enqueue_script(
			'vendor',
			self::get_asset_path( 'vendor.js' ),
			[],
			self::$script_version,
			true
		);
		
		wp_enqueue_script(
			'app',
			self::get_asset_path( 'app.js' ),
			[],
			self::$script_version,
			true
		);
		*/

		wp_enqueue_script( 'app', $this->get_asset_path( 'app.js' ), [], self::$script_version, true );

    // Inline script to initialize your app
    $inline_script = '
        document.addEventListener("DOMContentLoaded", function() {
            window.scrollTo(0, 0);
        });

				window.onbeforeunload = function() {
					window.scrollTo(0, 0);
				};
    ';

    //wp_add_inline_script( 'app', $inline_script );
		
		//echo '<script type="text/javascript" src="' . self::get_asset_path( 'app.js' ), '?ver=' . self::$script_version . '"></script>';
		//echo '<script type="text/javascript" src="' . self::get_asset_path( 'app.js' ) .'"></script>';
	}

	/**
	 * Defer Scripts
	 *
	 * @param string $tag    HTML output
	 * @param string $handle registered name
	 * @param string $src    path to JS file
	 * @return string
	 */
	public function defer_scripts( $tag, $handle, $src ) {

		// The handles of the enqueued scripts we want to defer
		$defer_scripts = array( 
			'admin-bar',
			'cookie',
			'jquery-migrate',
			'app',
		);

	    if ( in_array( $handle, $defer_scripts ) ) {
	        return str_replace( ' src=', ' defer="defer" src=', $tag );
	    }

	    // Allow all other tags to pass
	    return $tag;
	} 

	/**
	 * Async Scripts
	 *
	 * @param string $tag    HTML output
	 * @param string $handle registered name
	 * @param string $src    path to JS file
	 * @return string
	 */
	public function async_scripts( $tag, $handle, $src ) {

		// Check for our registered handle and add async
		if ( 'jquery' === $handle ) {
			return str_replace( ' src=', ' async src=', $tag );
		}

		// Allow all other tags to pass
		return $tag;
	}

}
new OUTTEN_AND_GOLDEN_Enqueue_Scripts;