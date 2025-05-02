<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the
 * installation. You don't have to use the web site, you can
 * copy this file to "wp-config.php" and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * MySQL settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'gold' );

/** MySQL database username */
define( 'DB_USER', 'root' );

/** MySQL database password */
define( 'DB_PASSWORD', '' );

/** MySQL hostname */
define( 'DB_HOST', '127.0.0.1:3306' );

/** Database Charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The Database Collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',          'H>htZkW51Pqh1oe1?H_=up?.[lf0].1_tJs*+;9K.rL)C]{--|xB|tK`j$YL1(wc' );
define( 'SECURE_AUTH_KEY',   'k^j)pt-lmzfN(D`P#Ey,rZ{5:dXyMx{&Bv_uaNo-!S%L6[_ioH?^;EZbW_vHU|ev' );
define( 'LOGGED_IN_KEY',     '^aJQyZ]~as:r*);}^y},0,lE2.Ol*jSMpd%k*]SVd%FoW`7-/7s4@5$I7QmT$`~i' );
define( 'NONCE_KEY',         'QbTYi%M1+b/PpReSBERBGx*`1Rd@+|d?pt`:Jm%:~BrgBJ7<=zA4Q<!d~EtDro=)' );
define( 'AUTH_SALT',         '>+#J+xsJCK2,B7c9R0NQl-dU.-ALYVURi1-2xc:}uiRY %p^B6(_Yqp!$-Jel@M.' );
define( 'SECURE_AUTH_SALT',  '}W86^^h5F>K4;7R#CI2&0oo/So$/aXq!b&H=LoV^,v~{[D7[<o9eGNK}m_6V?%_;' );
define( 'LOGGED_IN_SALT',    'L39Gl3*d53>X;+8K5%]4>:)mS=,1h0x9/[];y$]}_A1b@2XKL|,[Fv-Hu<Vi$3;m' );
define( 'NONCE_SALT',        'p=#o v5TC|0Yj%+1h%t`G<|Oy<*_][[3cBE[A;BHVoF(v1nt?Dy$AkrAi38(30Cu' );
define( 'WP_CACHE_KEY_SALT', '!kUGf^8uu*qt83(.K(}Ov+M2SE]/cO>9bkaqG*t<NF {Ikyz19 1z@&8ly(zJumU' );

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';

/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';

// Enable WP_DEBUG mode
define('WP_DEBUG', true);

// Enable Debug logging to the /wp-content/debug.log file
define('WP_DEBUG_LOG', true);

// Disable display of errors and warnings
define('WP_DEBUG_DISPLAY', false);