/**
 * This file is where we decide whether to initialise the modern support browser run-time.
 *
 * - Beware: This file MUST parse without errors on even the most ancient of browsers!
 */
/* eslint-disable no-implicit-globals */
/* global $CODE, RLQ:true, NORLQ:true */

/**
 * See <https://www.mediawiki.org/wiki/Compatibility#Browsers>
 *
 * Capabilities required for modern run-time:
 * - ECMAScript 5
 * - DOM Level 4 (including Selectors API)
 * - HTML5 (including Web Storage API)
 *
 * Browsers we support in our modern run-time (Grade A):
 * - Chrome 13+
 * - IE 11+
 * - Firefox 4+
 * - Safari 5+
 * - Opera 15+
 * - Mobile Safari 6.0+ (iOS 6+)
 * - Android 4.1+
 *
 * Browsers we support in our no-JavaScript, basic run-time (Grade C):
 * - Chrome 1+
 * - IE 8+
 * - Firefox 3+
 * - Safari 3+
 * - Opera 15+
 * - Mobile Safari 5.0+ (iOS 4+)
 * - Android 2.0+
 * - WebOS < 1.5
 * - PlayStation
 * - Symbian-based browsers
 * - NetFront-based browser
 * - Opera Mini
 * - Nokia's Ovi Browser
 * - MeeGo's browser
 * - Google Glass
 * - UC Mini (speed mode on)
 *
 * Other browsers that pass the check are considered unknown (Grade X).
 *
 * @private
 * @param {string} ua User agent string
 * @return {boolean} User agent is compatible with MediaWiki JS
 */
function isCompatible( ua ) {
	return !!(
		// https://caniuse.com/#feat=es5
		// https://caniuse.com/#feat=use-strict
		( function () {
			'use strict';
			return !this && Function.prototype.bind;
		}() ) &&

		// https://caniuse.com/#feat=queryselector
		'querySelector' in document &&

		// https://caniuse.com/#feat=namevalue-storage
		// https://developer.blackberry.com/html5/apis/v1_0/localstorage.html
		// https://blog.whatwg.org/this-week-in-html-5-episode-30
		'localStorage' in window &&

		// Force certain browsers into Basic mode, even if they pass the check.
		//
		// Some of the below are "remote browsers", where the webpage is actually
		// rendered remotely in a capable browser (cloud service) by the vendor,
		// with the client app receiving a graphical representation through a
		// format that is not HTML/CSS. These get a better user experience if
		// we turn JavaScript off, to avoid triggering JavaScript calls, which
		// either don't work or require a roundtrip to the server with added
		// latency. Note that remote browsers are sometimes referred to as
		// "proxy browsers", but that term is also conflated with browsers
		// that accelerate or compress web pages through a "proxy", where
		// client-side JS would generally be okay.
		//
		// Remember:
		//
		// - Add new entries on top, and document why and since when.
		// - Please extend the regex instead of adding new ones, for performance.
		// - Add a test case to startup.test.js.
		//
		// Forced into Basic mode:
		//
		// - MSIE 10: Bugs (since 2018, T187869).
		//   Low traffic. Reduce support cost by no longer having to workaround
		//   bugs in its JavaScript APIs.
		//
		// - UC Mini "Speed Mode": Improve UX, save data (since 2016, T147369).
		//   Does not have an obvious user agent, other than ending with an
		//   incomplete `Gecko/` token.
		//
		// - Google Web Light: Bugs, save data (since 2016, T152602).
		//   Proxy breaks most JavaScript.
		//
		// - MeeGo: Bugs (since 2015, T97546).
		//
		// - Opera Mini: Improve UX, save data. (since 2013, T49572).
		//   It is a remote browser.
		//
		// - Ovi Browser: Improve UX, save data (since 2013, T57600).
		//   It is a remote browser. UA contains "S40OviBrowser".
		//
		// - Google Glass: Improve UX (since 2013, T58008).
		//   Run modern browser engine, but limited UI is better served when
		//   content is expand by default, requiring little interaction.
		//
		// - NetFront: Unsupported by jQuery (since 2013, commit c46fc74).
		// - PlayStation: Unsupported by jQuery (since 2013, commit c46fc74).
		//
		!ua.match( /MSIE 10|NetFront|Opera Mini|S40OviBrowser|MeeGo|Android.+Glass|^Mozilla\/5\.0 .+ Gecko\/$|googleweblight|PLAYSTATION|PlayStation/ )
	);
}

if ( !isCompatible( navigator.userAgent ) ) {
	// Handle basic supported browsers (Grade C).
	// Undo speculative modern (Grade A) root CSS class `<html class="client-js">`.
	// See ResourceLoaderClientHtml::getDocumentAttributes().
	document.documentElement.className = document.documentElement.className
		.replace( /(^|\s)client-js(\s|$)/, '$1client-nojs$2' );

	// Process any callbacks for basic support (Grade C).
	while ( window.NORLQ && NORLQ[ 0 ] ) {
		NORLQ.shift()();
	}
	NORLQ = {
		push: function ( fn ) {
			fn();
		}
	};

	// Clear and disable the modern (Grade A) queue.
	RLQ = {
		push: function () {}
	};
} else {
	// Handle modern (Grade A).

	if ( window.performance && performance.mark ) {
		performance.mark( 'mwStartup' );
	}

	// This embeds mediawiki.js, which defines 'mw' and 'mw.loader'.
	/**
 * Base library for MediaWiki.
 *
 * Exposed globally as `mw`, with `mediaWiki` as alias.
 *
 * @class mw
 * @singleton
 */
/* global $CODE */

( function () {
	'use strict';

	var mw, log,
		con = window.console;

	/* https://github.com/gajus/eslint-plugin-jsdoc/issues/806 */
	/**
	 * Log a message to window.console, if possible.
	 *
	 * Useful to force logging of some errors that are otherwise hard to detect (i.e., this logs
	 * also in production mode). Gets console references in each invocation instead of caching the
	 * reference, so that debugging tools loaded later are supported (e.g. Firebug Lite in IE).
	 *
	 * @private
	 * @param {string} topic Stream name passed by mw.track
	 * @param {Object} data Data passed by mw.track
	 * @param {Error} [data.exception]
	 * @param {string} data.source Error source
	 * @param {string} [data.module] Name of module which caused the error
	 */
	function logError( topic, data ) {
		var msg,
			e = data.exception;

		if ( con.log ) {
			msg = ( e ? 'Exception' : 'Error' ) +
				' in ' + data.source +
				( data.module ? ' in module ' + data.module : '' ) +
				( e ? ':' : '.' );

			con.log( msg );

			// If we have an exception object, log it to the warning channel to trigger
			// proper stacktraces in browsers that support it.
			if ( e && con.warn ) {
				con.warn( e );
			}
		}
	}
	/* eslint-enable jsdoc/valid-types */

	/**
	 * Create an object that can be read from or written to via methods that allow
	 * interaction both with single and multiple properties at once.
	 *
	 * @private
	 * @class mw.Map
	 *
	 * @constructor
	 */
	function Map() {
		this.values = Object.create( null );
	}

	Map.prototype = {
		constructor: Map,

		/**
		 * Get the value of one or more keys.
		 *
		 * If called with no arguments, all values are returned.
		 *
		 * @param {string|Array} [selection] Key or array of keys to retrieve values for.
		 * @param {Mixed} [fallback=null] Value for keys that don't exist.
		 * @return {Mixed|Object|null} If selection was a string, returns the value,
		 *  If selection was an array, returns an object of key/values.
		 *  If no selection is passed, a new object with all key/values is returned.
		 */
		get: function ( selection, fallback ) {
			var results, i;
			fallback = arguments.length > 1 ? fallback : null;

			if ( Array.isArray( selection ) ) {
				results = {};
				for ( i = 0; i < selection.length; i++ ) {
					if ( typeof selection[ i ] === 'string' ) {
						results[ selection[ i ] ] = selection[ i ] in this.values ?
							this.values[ selection[ i ] ] :
							fallback;
					}
				}
				return results;
			}

			if ( typeof selection === 'string' ) {
				return selection in this.values ?
					this.values[ selection ] :
					fallback;
			}

			if ( selection === undefined ) {
				results = {};
				for ( i in this.values ) {
					results[ i ] = this.values[ i ];
				}
				return results;
			}

			// Invalid selection key
			return fallback;
		},

		/**
		 * Set one or more key/value pairs.
		 *
		 * @param {string|Object} selection Key to set value for, or object mapping keys to values
		 * @param {Mixed} [value] Value to set (optional, only in use when key is a string)
		 * @return {boolean} True on success, false on failure
		 */
		set: function ( selection, value ) {
			// Use `arguments.length` because `undefined` is also a valid value.
			if ( arguments.length > 1 ) {
				// Set one key
				if ( typeof selection === 'string' ) {
					this.values[ selection ] = value;
					return true;
				}
			} else if ( typeof selection === 'object' ) {
				// Set multiple keys
				for ( var s in selection ) {
					this.values[ s ] = selection[ s ];
				}
				return true;
			}
			return false;
		},

		/**
		 * Check if a given key exists in the map.
		 *
		 * @param {string} selection Key to check
		 * @return {boolean} True if the key exists
		 */
		exists: function ( selection ) {
			return typeof selection === 'string' && selection in this.values;
		}
	};

	/**
	 * Write a verbose message to the browser's console in debug mode.
	 *
	 * This method is mainly intended for verbose logging. It is a no-op in production mode.
	 * In ResourceLoader debug mode, it will use the browser's console.
	 *
	 * See {@link mw.log} for other logging methods.
	 *
	 * @member mw
	 * @param {...string} msg Messages to output to console.
	 */
	log = function () {
		console.log.apply( console, arguments );
	};

	/**
	 * Collection of methods to help log messages to the console.
	 *
	 * @class mw.log
	 * @singleton
	 */

	/**
	 * Write a message to the browser console's warning channel.
	 *
	 * This method is a no-op in browsers that don't implement the Console API.
	 *
	 * @param {...string} msg Messages to output to console
	 */
	log.warn = con.warn ?
		Function.prototype.bind.call( con.warn, con ) :
		function () {};

	/**
	 * @class mw
	 */
	mw = {

		/**
		 * Get the current time, measured in milliseconds since January 1, 1970 (UTC).
		 *
		 * On browsers that implement the Navigation Timing API, this function will produce
		 * floating-point values with microsecond precision that are guaranteed to be monotonic.
		 * On all other browsers, it will fall back to using `Date`.
		 *
		 * @return {number} Current time
		 */
		now: function () {
			// Optimisation: Make startup initialisation faster by defining the
			// shortcut on first call, not at module definition.
			var perf = window.performance,
				navStart = perf && perf.timing && perf.timing.navigationStart;

			// Define the relevant shortcut
			mw.now = navStart && perf.now ?
				function () { return navStart + perf.now(); } :
				Date.now;

			return mw.now();
		},

		/**
		 * List of all analytic events emitted so far.
		 *
		 * Exposed only for use by mediawiki.base.
		 *
		 * @private
		 * @property {Array}
		 */
		trackQueue: [],

		track: function ( topic, data ) {
			mw.trackQueue.push( { topic: topic, data: data } );
			// This method is extended by mediawiki.base to also fire events.
		},

		/**
		 * Track an early error event via mw.track and send it to the window console.
		 *
		 * @private
		 * @param {string} topic Topic name
		 * @param {Object} data Data describing the event, encoded as an object; see mw#logError
		 */
		trackError: function ( topic, data ) {
			mw.track( topic, data );
			logError( topic, data );
		},

		// Expose Map constructor
		Map: Map,

		/**
		 * Map of configuration values.
		 *
		 * Check out [the complete list of configuration values](https://www.mediawiki.org/wiki/Manual:Interface/JavaScript#mw.config)
		 * on mediawiki.org.
		 *
		 * @property {mw.Map} config
		 */
		config: new Map(),

		/**
		 * Store for messages.
		 *
		 * @property {mw.Map}
		 */
		messages: new Map(),

		/**
		 * Store for templates associated with a module.
		 *
		 * @property {mw.Map}
		 */
		templates: new Map(),

		// Expose mw.log
		log: log

		// mw.loader is defined in a separate file that is appended to this
	};

	// Attach to window and globally alias
	window.mw = window.mediaWiki = mw;
}() );
/*!
 * Defines mw.loader, the infrastructure for loading ResourceLoader
 * modules.
 *
 * This file is appended directly to the code in startup/mediawiki.js
 */
/* global $VARS, $CODE, mw */

( function () {
	'use strict';

	var StringSet,
		store,
		hasOwn = Object.hasOwnProperty;

	function defineFallbacks() {
		// <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set>
		/**
		 * @private
		 * @class StringSet
		 */
		StringSet = window.Set || function () {
			var set = Object.create( null );
			return {
				add: function ( value ) {
					set[ value ] = true;
				},
				has: function ( value ) {
					return value in set;
				}
			};
		};
	}

	defineFallbacks();

	// In test mode, this generates `mw.redefineFallbacksForTest = defineFallbacks;`.
	// Otherwise, it produces nothing. See also ResourceLoaderStartUpModule::getScript().
	

	/**
	 * Client for ResourceLoader server end point.
	 *
	 * This client is in charge of maintaining the module registry and state
	 * machine, initiating network (batch) requests for loading modules, as
	 * well as dependency resolution and execution of source code.
	 *
	 * For more information, refer to
	 * <https://www.mediawiki.org/wiki/ResourceLoader/Features>
	 *
	 * @class mw.loader
	 * @singleton
	 */

	/**
	 * FNV132 hash function
	 *
	 * This function implements the 32-bit version of FNV-1.
	 * It is equivalent to hash( 'fnv132', ... ) in PHP, except
	 * its output is base 36 rather than hex.
	 * See <https://en.wikipedia.org/wiki/Fowler–Noll–Vo_hash_function>
	 *
	 * @private
	 * @param {string} str String to hash
	 * @return {string} hash as an five-character base 36 string
	 */
	function fnv132( str ) {
		var hash = 0x811C9DC5;

		/* eslint-disable no-bitwise */
		for ( var i = 0; i < str.length; i++ ) {
			hash += ( hash << 1 ) + ( hash << 4 ) + ( hash << 7 ) + ( hash << 8 ) + ( hash << 24 );
			hash ^= str.charCodeAt( i );
		}

		hash = ( hash >>> 0 ).toString( 36 ).slice( 0, 5 );
		while ( hash.length < 5 ) {
			hash = '0' + hash;
		}
		/* eslint-enable no-bitwise */

		return hash;
	}

	// Check whether the browser supports ES6.
	// We are feature detecting Promises and Arrow Functions with default params
	// (which are good indicators of overall support). An additional test for
	// regex behavior filters out Android 4.4.4 and Edge 18 or lower.
	// This check doesn't quite guarantee full ES6 support: Safari 11-13 don't
	// support non-BMP characters in identifiers, but support all other ES6
	// features we care about. To guard against accidentally breaking these
	// Safari versions with code they can't parse, we have an eslint rule
	// prohibiting non-BMP characters from being used in identifiers.
	var isES6Supported =
		// Check for Promise support (filters out most non-ES6 browsers)
		typeof Promise === 'function' &&
		// eslint-disable-next-line no-undef
		Promise.prototype.finally &&

		// Check for RegExp.prototype.flags (filters out Android 4.4.4 and Edge <= 18)
		/./g.flags === 'g' &&

		// Test for arrow functions and default arguments, a good proxy for a
		// wide range of ES6 support. Borrowed from Benjamin De Cock's snippet here:
		// https://gist.github.com/bendc/d7f3dbc83d0f65ca0433caf90378cd95
		// This will exclude Safari and Mobile Safari prior to version 10.
		( function () {
			try {
				// eslint-disable-next-line no-new, no-new-func
				new Function( '(a = 0) => a' );
				return true;
			} catch ( e ) {
				return false;
			}
		}() );

	/**
	 * Fired via mw.track on various resource loading errors.
	 *
	 * @event resourceloader_exception
	 * @param {Error|Mixed} e The error that was thrown. Almost always an Error
	 *   object, but in theory module code could manually throw something else, and that
	 *   might also end up here.
	 * @param {string} [module] Name of the module which caused the error. Omitted if the
	 *   error is not module-related or the module cannot be easily identified due to
	 *   batched handling.
	 * @param {string} source Source of the error. Possible values:
	 *
	 *   - load-callback: exception thrown by user callback
	 *   - module-execute: exception thrown by module code
	 *   - resolve: failed to sort dependencies for a module in mw.loader.load
	 *   - store-eval: could not evaluate module code cached in localStorage
	 *   - store-localstorage-json: JSON conversion error in mw.loader.store
	 *   - store-localstorage-update: localStorage conversion error in mw.loader.store.
	 */

	/**
	 * Mapping of registered modules.
	 *
	 * See #implement and #execute for exact details on support for script, style and messages.
	 *
	 *     @example Format:
	 *
	 *     {
	 *         'moduleName': {
	 *             // From mw.loader.register()
	 *             'version': '########' (hash)
	 *             'dependencies': ['required.foo', 'bar.also', ...]
	 *             'group': string, integer, (or) null
	 *             'source': 'local', (or) 'anotherwiki'
	 *             'skip': 'return !!window.Example;', (or) null, (or) boolean result of skip
	 *             'module': export Object
	 *
	 *             // Set from execute() or mw.loader.state()
	 *             'state': 'registered', 'loading', 'loaded', 'executing', 'ready', 'error', or 'missing'
	 *
	 *             // Optionally added at run-time by mw.loader.implement()
	 *             'script': closure, array of urls, or string
	 *             'style': { ... } (see #execute)
	 *             'messages': { 'key': 'value', ... }
	 *         }
	 *     }
	 *
	 * State machine:
	 *
	 * - `registered`:
	 *    The module is known to the system but not yet required.
	 *    Meta data is registered via mw.loader#register. Calls to that method are
	 *    generated server-side by the startup module.
	 * - `loading`:
	 *    The module was required through mw.loader (either directly or as dependency of
	 *    another module). The client will fetch module contents from the server.
	 *    The contents are then stashed in the registry via mw.loader#implement.
	 * - `loaded`:
	 *    The module has been loaded from the server and stashed via mw.loader#implement.
	 *    Once the module has no more dependencies in-flight, the module will be executed,
	 *    controlled via #setAndPropagate and #doPropagation.
	 * - `executing`:
	 *    The module is being executed.
	 * - `ready`:
	 *    The module has been successfully executed.
	 * - `error`:
	 *    The module (or one of its dependencies) produced an error during execution.
	 * - `missing`:
	 *    The module was registered client-side and requested, but the server denied knowledge
	 *    of the module's existence.
	 *
	 * @property {Object}
	 * @private
	 */
	var registry = Object.create( null ),
		// Mapping of sources, keyed by source-id, values are strings.
		//
		// Format:
		//
		//     {
		//         'sourceId': 'http://example.org/w/load.php'
		//     }
		//
		sources = Object.create( null ),

		// For queueModuleScript()
		handlingPendingRequests = false,
		pendingRequests = [],

		// List of modules to be loaded
		queue = [],

		/**
		 * List of callback jobs waiting for modules to be ready.
		 *
		 * Jobs are created by #enqueue() and run by #doPropagation().
		 * Typically when a job is created for a module, the job's dependencies contain
		 * both the required module and all its recursive dependencies.
		 *
		 *     @example Format:
		 *
		 *     {
		 *         'dependencies': [ module names ],
		 *         'ready': Function callback
		 *         'error': Function callback
		 *     }
		 *
		 * @property {Object[]} jobs
		 * @private
		 */
		jobs = [],

		// For #setAndPropagate() and #doPropagation()
		willPropagate = false,
		errorModules = [],

		/**
		 * @private
		 * @property {Array} baseModules
		 */
		baseModules = [
    "jquery",
    "mediawiki.base"
],

		/**
		 * For #addEmbeddedCSS() and #addLink()
		 *
		 * @private
		 * @property {HTMLElement|null} marker
		 */
		marker = document.querySelector( 'meta[name="ResourceLoaderDynamicStyles"]' ),

		// For #addEmbeddedCSS()
		lastCssBuffer,
		rAF = window.requestAnimationFrame || setTimeout;

	/**
	 * Create a new style element and add it to the DOM.
	 *
	 * @private
	 * @param {string} text CSS text
	 * @param {Node|null} [nextNode] The element where the style tag
	 *  should be inserted before
	 * @return {HTMLElement} Reference to the created style element
	 */
	function newStyleTag( text, nextNode ) {
		var el = document.createElement( 'style' );
		el.appendChild( document.createTextNode( text ) );
		if ( nextNode && nextNode.parentNode ) {
			nextNode.parentNode.insertBefore( el, nextNode );
		} else {
			document.head.appendChild( el );
		}
		return el;
	}

	/**
	 * @private
	 * @param {Object} cssBuffer
	 */
	function flushCssBuffer( cssBuffer ) {
		// Make sure the next call to addEmbeddedCSS() starts a new buffer.
		// This must be done before we run the callbacks, as those may end up
		// queueing new chunks which would be lost otherwise (T105973).
		//
		// There can be more than one buffer in-flight (given "@import", and
		// generally due to race conditions). Only tell addEmbeddedCSS() to
		// start a new buffer if we're currently flushing the last one that it
		// started. If we're flushing an older buffer, keep the last one open.
		if ( cssBuffer === lastCssBuffer ) {
			lastCssBuffer = null;
		}
		newStyleTag( cssBuffer.cssText, marker );
		for ( var i = 0; i < cssBuffer.callbacks.length; i++ ) {
			cssBuffer.callbacks[ i ]();
		}
	}

	/**
	 * Add a bit of CSS text to the current browser page.
	 *
	 * The creation and insertion of the `<style>` element is debounced for two reasons:
	 *
	 * - Performing the insertion before the next paint round via requestAnimationFrame
	 *   avoids forced or wasted style recomputations, which are expensive in browsers.
	 * - Reduce how often new stylesheets are inserted by letting additional calls to this
	 *   function accumulate into a buffer for at least one JavaScript tick. Modules are
	 *   received from the server in batches, which means there is likely going to be many
	 *   calls to this function in a row within the same tick / the same call stack.
	 *   See also T47810.
	 *
	 * @private
	 * @param {string} cssText CSS text to be added in a `<style>` tag.
	 * @param {Function} callback Called after the insertion has occurred.
	 */
	function addEmbeddedCSS( cssText, callback ) {
		// Start a new buffer if one of the following is true:
		// - We've never started a buffer before, this will be our first.
		// - The last buffer we created was flushed meanwhile, so start a new one.
		// - The next CSS chunk syntactically needs to be at the start of a stylesheet (T37562).
		//
		// Optimization: Avoid computing the string length each time ('@import'.length === 7)
		if ( !lastCssBuffer || cssText.slice( 0, 7 ) === '@import' ) {
			lastCssBuffer = {
				cssText: '',
				callbacks: []
			};
			rAF( flushCssBuffer.bind( null, lastCssBuffer ) );
		}

		// Linebreak for somewhat distinguishable sections
		lastCssBuffer.cssText += '\n' + cssText;
		lastCssBuffer.callbacks.push( callback );
	}

	/**
	 * See also `ResourceLoader.php#makeVersionQuery` on the server.
	 *
	 * @private
	 * @param {string[]} modules List of module names
	 * @return {string} Hash of concatenated version hashes.
	 */
	function getCombinedVersion( modules ) {
		var hashes = modules.reduce( function ( result, module ) {
			return result + registry[ module ].version;
		}, '' );
		return fnv132( hashes );
	}

	/**
	 * Determine whether all dependencies are in state 'ready', which means we may
	 * execute the module or job now.
	 *
	 * @private
	 * @param {string[]} modules Names of modules to be checked
	 * @return {boolean} True if all modules are in state 'ready', false otherwise
	 */
	function allReady( modules ) { return true;
		for ( var i = 0; i < modules.length; i++ ) {
			if ( mw.loader.getState( modules[ i ] ) !== 'ready' ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Determine whether all direct and base dependencies are in state 'ready'
	 *
	 * @private
	 * @param {string} module Name of the module to be checked
	 * @return {boolean} True if all direct/base dependencies are in state 'ready'; false otherwise
	 */
	function allWithImplicitReady( module ) {
		return allReady( registry[ module ].dependencies ) &&
			( baseModules.indexOf( module ) !== -1 || allReady( baseModules ) );
	}

	/**
	 * Determine whether all dependencies are in state 'ready', which means we may
	 * execute the module or job now.
	 *
	 * @private
	 * @param {string[]} modules Names of modules to be checked
	 * @return {boolean|string} False if no modules are in state 'error' or 'missing';
	 *  failed module otherwise
	 */
	function anyFailed( modules ) {
		for ( var i = 0; i < modules.length; i++ ) {
			var state = mw.loader.getState( modules[ i ] );
			if ( state === 'error' || state === 'missing' ) {
				return modules[ i ];
			}
		}
		return false;
	}

	/**
	 * Handle propagation of module state changes and reactions to them.
	 *
	 * - When a module reaches a failure state, this should be propagated to
	 *   modules that depend on the failed module.
	 * - When a module reaches a final state, pending job callbacks for the
	 *   module from mw.loader.using() should be called.
	 * - When a module reaches the 'ready' state from #execute(), consider
	 *   executing dependent modules now having their dependencies satisfied.
	 * - When a module reaches the 'loaded' state from mw.loader.implement,
	 *   consider executing it, if it has no unsatisfied dependencies.
	 *
	 * @private
	 */
	function doPropagation() {
		var didPropagate = true;
		var module;

		// Keep going until the last iteration performed no actions.
		while ( didPropagate ) {
			didPropagate = false;

			// Stage 1: Propagate failures
			while ( errorModules.length ) {
				var errorModule = errorModules.shift(),
					baseModuleError = baseModules.indexOf( errorModule ) !== -1;
				for ( module in registry ) {
					if ( registry[ module ].state !== 'error' && registry[ module ].state !== 'missing' ) {
						if ( baseModuleError && baseModules.indexOf( module ) === -1 ) {
							// Propate error from base module to all regular (non-base) modules
							registry[ module ].state = 'error';
							didPropagate = true;
						} else if ( registry[ module ].dependencies.indexOf( errorModule ) !== -1 ) {
							// Propagate error from dependency to depending module
							registry[ module ].state = 'error';
							// .. and propagate it further
							errorModules.push( module );
							didPropagate = true;
						}
					}
				}
			}

			// Stage 2: Execute 'loaded' modules with no unsatisfied dependencies
			for ( module in registry ) {
				if ( registry[ module ].state === 'loaded' && allWithImplicitReady( module ) ) {
					// Recursively execute all dependent modules that were already loaded
					// (waiting for execution) and no longer have unsatisfied dependencies.
					// Base modules may have dependencies amongst eachother to ensure correct
					// execution order. Regular modules wait for all base modules.
					execute( module );
					didPropagate = true;
				}
			}

			// Stage 3: Invoke job callbacks that are no longer blocked
			for ( var i = 0; i < jobs.length; i++ ) {
				var job = jobs[ i ];
				var failed = anyFailed( job.dependencies );
				if ( failed !== false || allReady( job.dependencies ) ) {
					jobs.splice( i, 1 );
					i -= 1;
					try {
						if ( failed !== false && job.error ) {
							job.error( new Error( 'Failed dependency: ' + failed ), job.dependencies );
						} else if ( failed === false && job.ready ) {
							job.ready();
						}
					} catch ( e ) {
						// A user-defined callback raised an exception.
						// Swallow it to protect our state machine!
						mw.trackError( 'resourceloader.exception', {
							exception: e,
							source: 'load-callback'
						} );
					}
					didPropagate = true;
				}
			}
		}

		willPropagate = false;
	}

	/**
	 * Update a module's state in the registry and make sure any necessary
	 * propagation will occur, by adding a (debounced) call to doPropagation().
	 * See #doPropagation for more about propagation.
	 * See #registry for more about how states are used.
	 *
	 * @private
	 * @param {string} module
	 * @param {string} state
	 */
	function setAndPropagate( module, state ) {
		registry[ module ].state = state;
		if ( state === 'ready' ) {
			// Queue to later be synced to the local module store.
			store.add( module );
		} else if ( state === 'error' || state === 'missing' ) {
			errorModules.push( module );
		} else if ( state !== 'loaded' ) {
			// We only have something to do in doPropagation for the
			// 'loaded', 'ready', 'error', and 'missing' states.
			// Avoid scheduling and propagation cost for frequent and short-lived
			// transition states, such as 'loading' and 'executing'.
			return;
		}
		if ( willPropagate ) {
			// Already scheduled, or, we're already in a doPropagation stack.
			return;
		}
		willPropagate = true;
		// Yield for two reasons:
		// * Allow successive calls to mw.loader.implement() from the same
		//   load.php response, or from the same asyncEval() to be in the
		//   propagation batch.
		// * Allow the browser to breathe between the reception of
		//   module source code and the execution of it.
		//
		// Use a high priority because the user may be waiting for interactions
		// to start being possible. But, first provide a moment (up to 'timeout')
		// for native input event handling (e.g. scrolling/typing/clicking).
		doPropagation();
	}

	/**
	 * Resolve dependencies and detect circular references.
	 *
	 * @private
	 * @param {string} module Name of the top-level module whose dependencies shall be
	 *  resolved and sorted.
	 * @param {Array} resolved Returns a topological sort of the given module and its
	 *  dependencies, such that later modules depend on earlier modules. The array
	 *  contains the module names. If the array contains already some module names,
	 *  this function appends its result to the pre-existing array.
	 * @param {StringSet} [unresolved] Used to detect loops in the dependency graph.
	 * @throws {Error} If an unknown module or a circular dependency is encountered
	 */
	function sortDependencies( module, resolved, unresolved ) {
		if ( !( module in registry ) ) {
			throw new Error( 'Unknown module: ' + module );
		}

		if ( typeof registry[ module ].skip === 'string' ) {
			// eslint-disable-next-line no-new-func
			var skip = ( new Function( registry[ module ].skip )() );
			registry[ module ].skip = !!skip;
			if ( skip ) {
				registry[ module ].dependencies = [];
				setAndPropagate( module, 'ready' );
				return;
			}
		}

		// Create unresolved if not passed in
		if ( !unresolved ) {
			unresolved = new StringSet();
		}

		// Track down dependencies
		var deps = registry[ module ].dependencies;
		unresolved.add( module );
		for ( var i = 0; i < deps.length; i++ ) {
			if ( resolved.indexOf( deps[ i ] ) === -1 ) {
				if ( unresolved.has( deps[ i ] ) ) {
					throw new Error(
						'Circular reference detected: ' + module + ' -> ' + deps[ i ]
					);
				}

				sortDependencies( deps[ i ], resolved, unresolved );
			}
		}

		resolved.push( module );
	}

	/**
	 * Get names of module that a module depends on, in their proper dependency order.
	 *
	 * @private
	 * @param {string[]} modules Array of string module names
	 * @return {Array} List of dependencies, including 'module'.
	 * @throws {Error} If an unregistered module or a dependency loop is encountered
	 */
	function resolve( modules ) {
		// Always load base modules
		var resolved = baseModules.slice();
		for ( var i = 0; i < modules.length; i++ ) {
			sortDependencies( modules[ i ], resolved );
		}
		return resolved;
	}

	/**
	 * Like #resolve(), except it will silently ignore modules that
	 * are missing or have missing dependencies.
	 *
	 * @private
	 * @param {string[]} modules Array of string module names
	 * @return {Array} List of dependencies.
	 */
	function resolveStubbornly( modules ) {
		// Always load base modules
		var resolved = baseModules.slice();
		for ( var i = 0; i < modules.length; i++ ) {
			var saved = resolved.slice();
			try {
				sortDependencies( modules[ i ], resolved );
			} catch ( err ) {
				resolved = saved;
				// This module is not currently known, or has invalid dependencies.
				//
				// Most likely due to a cached reference after the module was
				// removed, otherwise made redundant, or omitted from the registry
				// by the ResourceLoader "target" system or "requiresES6" flag.
				//
				// These errors can be comon common, e.g. queuing an ES6-only module
				// unconditionally from the server-side is OK and should fail gracefully
				// in ES5 browsers.
				mw.log.warn( 'Skipped unavailable module ' + modules[ i ] );
				// Do not track this error as an exception when the module:
				// - Is valid, but gracefully filtered out by target system.
				// - Is valid, but gracefully filtered out by requiresES6 flag.
				// - Was recently valid, but is still referenced in stale cache.
				//
				// Basically the only reason to track this as exception is when the error
				// was circular or invalid dependencies. What the above scenarios have in
				// common is that they don't register the module client-side.
				if ( modules[ i ] in registry ) {
					mw.trackError( 'resourceloader.exception', {
						exception: err,
						source: 'resolve'
					} );
				}
			}
		}
		return resolved;
	}

	/**
	 * Resolve a relative file path.
	 *
	 * For example, resolveRelativePath( '../foo.js', 'resources/src/bar/bar.js' )
	 * returns 'resources/src/foo.js'.
	 *
	 * @private
	 * @param {string} relativePath Relative file path, starting with ./ or ../
	 * @param {string} basePath Path of the file (not directory) relativePath is relative to
	 * @return {string|null} Resolved path, or null if relativePath does not start with ./ or ../
	 */
	function resolveRelativePath( relativePath, basePath ) {
		var relParts = relativePath.match( /^((?:\.\.?\/)+)(.*)$/ );
		if ( !relParts ) {
			return null;
		}

		var baseDirParts = basePath.split( '/' );
		// basePath looks like 'foo/bar/baz.js', so baseDirParts looks like [ 'foo', 'bar, 'baz.js' ]
		// Remove the file component at the end, so that we are left with only the directory path
		baseDirParts.pop();

		var prefixes = relParts[ 1 ].split( '/' );
		// relParts[ 1 ] looks like '../../', so prefixes looks like [ '..', '..', '' ]
		// Remove the empty element at the end
		prefixes.pop();

		// For every ../ in the path prefix, remove one directory level from baseDirParts
		var prefix;
		while ( ( prefix = prefixes.pop() ) !== undefined ) {
			if ( prefix === '..' ) {
				baseDirParts.pop();
			}
		}

		// If there's anything left of the base path, prepend it to the file path
		return ( baseDirParts.length ? baseDirParts.join( '/' ) + '/' : '' ) + relParts[ 2 ];
	}

	/**
	 * Make a require() function scoped to a package file
	 *
	 * @private
	 * @param {Object} moduleObj Module object from the registry
	 * @param {string} basePath Path of the file this is scoped to. Used for relative paths.
	 * @return {Function}
	 */
	function makeRequireFunction( moduleObj, basePath ) {
		return function require( moduleName ) {
			var fileName = resolveRelativePath( moduleName, basePath );
			if ( fileName === null ) {
				// Not a relative path, so it's a module name
				return mw.loader.require( moduleName );
			}

			if ( hasOwn.call( moduleObj.packageExports, fileName ) ) {
				// File has already been executed, return the cached result
				return moduleObj.packageExports[ fileName ];
			}

			var scriptFiles = moduleObj.script.files;
			if ( !hasOwn.call( scriptFiles, fileName ) ) {
				throw new Error( 'Cannot require undefined file ' + fileName );
			}

			var result,
				fileContent = scriptFiles[ fileName ];
			if ( typeof fileContent === 'function' ) {
				var moduleParam = { exports: {} };
				fileContent( makeRequireFunction( moduleObj, fileName ), moduleParam, moduleParam.exports );
				result = moduleParam.exports;
			} else {
				// fileContent is raw data (such as a JSON object), just pass it through
				result = fileContent;
			}
			moduleObj.packageExports[ fileName ] = result;
			return result;
		};
	}

	/**
	 * Load and execute a script.
	 *
	 * @private
	 * @param {string} src URL to script, will be used as the src attribute in the script tag
	 * @param {Function} [callback] Callback to run after request resolution
	 */
	function addScript( src, callback ) {
		// Use a <script> element rather than XHR. Using XHR changes the request
		// headers (potentially missing a cache hit), and reduces caching in general
		// since browsers cache XHR much less (if at all). And XHR means we retrieve
		// text, so we'd need to eval, which then messes up line numbers.
		// The drawback is that <script> does not offer progress events, feedback is
		// only given after downloading, parsing, and execution have completed.
		var script = document.createElement( 'script' );
		script.src = src;
		script.onload = script.onerror = function () {
			if ( script.parentNode ) {
				script.parentNode.removeChild( script );
			}
			if ( callback ) {
				callback();
				callback = null;
			}
		};
		document.head.appendChild( script );
	}

	/**
	 * Queue the loading and execution of a script for a particular module.
	 *
	 * This does for legacy debug mode what runScript() does for production.
	 *
	 * @private
	 * @param {string} src URL of the script
	 * @param {string} moduleName Name of currently executing module
	 * @param {Function} callback Callback to run after addScript() resolution
	 */
	function queueModuleScript( src, moduleName, callback ) {
		pendingRequests.push( function () {
			// Keep in sync with execute()/runScript().
			if ( moduleName !== 'jquery' ) {
				window.require = mw.loader.require;
				window.module = registry[ moduleName ].module;
			}
			addScript( src, function () {
				// 'module.exports' should not persist after the file is executed to
				// avoid leakage to unrelated code. 'require' should be kept, however,
				// as asynchronous access to 'require' is allowed and expected. (T144879)
				delete window.module;
				callback();
				// Start the next one (if any)
				if ( pendingRequests[ 0 ] ) {
					pendingRequests.shift()();
				} else {
					handlingPendingRequests = false;
				}
			} );
		} );
		if ( !handlingPendingRequests && pendingRequests[ 0 ] ) {
			handlingPendingRequests = true;
			pendingRequests.shift()();
		}
	}

	/**
	 * Utility function for execute()
	 *
	 * @ignore
	 * @param {string} url URL
	 * @param {string} [media] Media attribute
	 * @param {Node|null} [nextNode]
	 */
	function addLink( url, media, nextNode ) {
		var el = document.createElement( 'link' );

		el.rel = 'stylesheet';
		if ( media ) {
			el.media = media;
		}
		// If you end up here from an IE exception "SCRIPT: Invalid property value.",
		// see #addEmbeddedCSS, T33676, T43331, and T49277 for details.
		el.href = url;

		if ( nextNode && nextNode.parentNode ) {
			nextNode.parentNode.insertBefore( el, nextNode );
		} else {
			document.head.appendChild( el );
		}
	}

	/**
	 * @private
	 * @param {string} code JavaScript code
	 */
	function domEval( code ) {
		var script = document.createElement( 'script' );
		if ( mw.config.get( 'wgCSPNonce' ) !== false ) {
			script.nonce = mw.config.get( 'wgCSPNonce' );
		}
		script.text = code;
		document.head.appendChild( script );
		script.parentNode.removeChild( script );
	}

	/**
	 * Add one or more modules to the module load queue.
	 *
	 * See also #work().
	 *
	 * @private
	 * @param {string[]} dependencies Array of module names in the registry
	 * @param {Function} [ready] Callback to execute when all dependencies are ready
	 * @param {Function} [error] Callback to execute when any dependency fails
	 */
	function enqueue( dependencies, ready, error ) {
		if ( allReady( dependencies ) ) {
			// Run ready immediately
			if ( ready ) {
				ready();
			}
			return;
		}

		var failed = anyFailed( dependencies );
		if ( failed !== false ) {
			if ( error ) {
				// Execute error immediately if any dependencies have errors
				error(
					new Error( 'Dependency ' + failed + ' failed to load' ),
					dependencies
				);
			}
			return;
		}

		// Not all dependencies are ready, add to the load queue...

		// Add ready and error callbacks if they were given
		if ( ready || error ) {
			jobs.push( {
				// Narrow down the list to modules that are worth waiting for
				dependencies: dependencies.filter( function ( module ) {
					var state = registry[ module ].state;
					return state === 'registered' || state === 'loaded' || state === 'loading' || state === 'executing';
				} ),
				ready: ready,
				error: error
			} );
		}

		dependencies.forEach( function ( module ) {
			// Only queue modules that are still in the initial 'registered' state
			// (e.g. not ones already loading or loaded etc.).
			if ( registry[ module ].state === 'registered' && queue.indexOf( module ) === -1 ) {
				queue.push( module );
			}
		} );

		mw.loader.work();
	}

	/**
	 * Executes a loaded module, making it ready to use
	 *
	 * @private
	 * @param {string} module Module name to execute
	 */
	function execute( module ) {
		if ( registry[ module ].state !== 'loaded' ) {
			throw new Error( 'Module in state "' + registry[ module ].state + '" may not execute: ' + module );
		}

		registry[ module ].state = 'executing';
		

		var runScript = function () {
			
			var script = registry[ module ].script;
			var markModuleReady = function () {
				
				setAndPropagate( module, 'ready' );
			};
			var nestedAddScript = function ( arr, offset ) {
				// Recursively call queueModuleScript() in its own callback
				// for each element of arr.
				if ( offset >= arr.length ) {
					// We're at the end of the array
					markModuleReady();
					return;
				}

				queueModuleScript( arr[ offset ], module, function () {
					nestedAddScript( arr, offset + 1 );
				} );
			};

			try {
				if ( Array.isArray( script ) ) {
					nestedAddScript( script, 0 );
				} else if ( typeof script === 'function' ) {
					// Keep in sync with queueModuleScript() for debug mode
					if ( module === 'jquery' ) {
						// This is a special case for when 'jquery' itself is being loaded.
						// - The standard jquery.js distribution does not set `window.jQuery`
						//   in CommonJS-compatible environments (Node.js, AMD, RequireJS, etc.).
						// - MediaWiki's 'jquery' module also bundles jquery.migrate.js, which
						//   in a CommonJS-compatible environment, will use require('jquery'),
						//   but that can't work when we're still inside that module.
						script();
					} else {
						// Pass jQuery twice so that the signature of the closure which wraps
						// the script can bind both '$' and 'jQuery'.
						script( window.$, window.$, mw.loader.require, registry[ module ].module );
					}
					markModuleReady();
				} else if ( typeof script === 'object' && script !== null ) {
					var mainScript = script.files[ script.main ];
					if ( typeof mainScript !== 'function' ) {
						throw new Error( 'Main file in module ' + module + ' must be a function' );
					}
					// jQuery parameters are not passed for multi-file modules
					mainScript(
						makeRequireFunction( registry[ module ], script.main ),
						registry[ module ].module,
						registry[ module ].module.exports
					);
					markModuleReady();
				} else if ( typeof script === 'string' ) {
					// Site and user modules are legacy scripts that run in the global scope.
					// This is transported as a string instead of a function to avoid needing
					// to use string manipulation to undo the function wrapper.
					domEval( script );
					markModuleReady();

				} else {
					// Module without script
					markModuleReady();
				}
			} catch ( e ) {
				// Use mw.track instead of mw.log because these errors are common in production mode
				// (e.g. undefined variable), and mw.log is only enabled in debug mode.
				setAndPropagate( module, 'error' );
				
				mw.trackError( 'resourceloader.exception', {
					exception: e,
					module: module,
					source: 'module-execute'
				} );
			}
		};

		// Add localizations to message system
		if ( registry[ module ].messages ) {
			mw.messages.set( registry[ module ].messages );
		}

		// Initialise templates
		if ( registry[ module ].templates ) {
			mw.templates.set( module, registry[ module ].templates );
		}

		// Adding of stylesheets is asynchronous via addEmbeddedCSS().
		// The below function uses a counting semaphore to make sure we don't call
		// runScript() until after this module's stylesheets have been inserted
		// into the DOM.
		var cssPending = 0;
		var cssHandle = function () {
			// Increase semaphore, when creating a callback for addEmbeddedCSS.
			cssPending++;
			return function () {
				// Decrease semaphore, when said callback is invoked.
				cssPending--;
				if ( cssPending === 0 ) {
					// Paranoia:
					// This callback is exposed to addEmbeddedCSS, which is outside the execute()
					// function and is not concerned with state-machine integrity. In turn,
					// addEmbeddedCSS() actually exposes stuff further into the browser (rAF).
					// If increment and decrement callbacks happen in the wrong order, or start
					// again afterwards, then this branch could be reached multiple times.
					// To protect the integrity of the state-machine, prevent that from happening
					// by making runScript() cannot be called more than once.  We store a private
					// reference when we first reach this branch, then deference the original, and
					// call our reference to it.
					var runScriptCopy = runScript;
					runScript = undefined;
					runScriptCopy();
				}
			};
		};

		// Process styles (see also mw.loader.implement)
		// * { "css": [css, ..] }
		// * { "url": { <media>: [url, ..] } }
		if ( registry[ module ].style ) {
			for ( var key in registry[ module ].style ) {
				var value = registry[ module ].style[ key ];

				// Array of CSS strings under key 'css'
				// { "css": [css, ..] }
				if ( key === 'css' ) {
					for ( var i = 0; i < value.length; i++ ) {
						addEmbeddedCSS( value[ i ], cssHandle() );
					}
				// Plain object with array of urls under a media-type key
				// { "url": { <media>: [url, ..] } }
				} else if ( key === 'url' ) {
					for ( var media in value ) {
						var urls = value[ media ];
						for ( var j = 0; j < urls.length; j++ ) {
							addLink( urls[ j ], media, marker );
						}
					}
				}
			}
		}

		// End profiling of execute()-self before we call runScript(),
		// which we want to measure separately without overlap.
		

		if ( module === 'user' ) {
			// Implicit dependency on the site module. Not a real dependency because it should
			// run after 'site' regardless of whether it succeeds or fails.
			// Note: This is a simplified version of mw.loader.using(), inlined here because
			// mw.loader.using() is part of mediawiki.base (depends on jQuery; T192623).
			var siteDeps;
			var siteDepErr;
			try {
				siteDeps = resolve( [ 'site' ] );
			} catch ( e ) {
				siteDepErr = e;
				runScript();
			}
			if ( !siteDepErr ) {
				enqueue( siteDeps, runScript, runScript );
			}
		} else if ( cssPending === 0 ) {
			// Regular module without styles
			runScript();
		}
		// else: runScript will get called via cssHandle()
	}

	function sortQuery( o ) {
		var sorted = {};
		var list = [];

		for ( var key in o ) {
			list.push( key );
		}
		list.sort();
		for ( var i = 0; i < list.length; i++ ) {
			sorted[ list[ i ] ] = o[ list[ i ] ];
		}
		return sorted;
	}

	/**
	 * Converts a module map of the form `{ foo: [ 'bar', 'baz' ], bar: [ 'baz, 'quux' ] }`
	 * to a query string of the form `foo.bar,baz|bar.baz,quux`.
	 *
	 * See `ResourceLoader::makePackedModulesString()` in PHP, of which this is a port.
	 * On the server, unpacking is done by `ResourceLoader::expandModuleNames()`.
	 *
	 * Note: This is only half of the logic, the other half has to be in #batchRequest(),
	 * because its implementation needs to keep track of potential string size in order
	 * to decide when to split the requests due to url size.
	 *
	 * @private
	 * @param {Object} moduleMap Module map
	 * @return {Object}
	 * @return {string} return.str Module query string
	 * @return {Array} return.list List of module names in matching order
	 */
	function buildModulesString( moduleMap ) {
		var str = [];
		var list = [];
		var p;

		function restore( suffix ) {
			return p + suffix;
		}

		for ( var prefix in moduleMap ) {
			p = prefix === '' ? '' : prefix + '.';
			str.push( p + moduleMap[ prefix ].join( ',' ) );
			list.push.apply( list, moduleMap[ prefix ].map( restore ) );
		}
		return {
			str: str.join( '|' ),
			list: list
		};
	}

	/**
	 * @private
	 * @param {Object} params Map of parameter names to values
	 * @return {string}
	 */
	function makeQueryString( params ) {
		// Optimisation: This is a fairly hot code path with batchRequest() loops.
		// Avoid overhead from Object.keys and Array.forEach.
		var chunks = [];
		for ( var key in params ) {
			chunks.push( encodeURIComponent( key ) + '=' + encodeURIComponent( params[ key ] ) );
		}
		return chunks.join( '&' );
	}

	/**
	 * Create network requests for a batch of modules.
	 *
	 * This is an internal method for #work(). This must not be called directly
	 * unless the modules are already registered, and no request is in progress,
	 * and the module state has already been set to `loading`.
	 *
	 * @private
	 * @param {string[]} batch
	 */
	function batchRequest( batch ) {
		if ( !batch.length ) {
			return;
		}

		var sourceLoadScript, currReqBase, moduleMap;

		/**
		 * Start the currently drafted request to the server.
		 *
		 * @ignore
		 */
		function doRequest() {
			// Optimisation: Inherit (Object.create), not copy ($.extend)
			var query = Object.create( currReqBase ),
				packed = buildModulesString( moduleMap );
			query.modules = packed.str;
			// The packing logic can change the effective order, even if the input was
			// sorted. As such, the call to getCombinedVersion() must use this
			// effective order, instead of currReqModules, as otherwise the combined
			// version will not match the hash expected by the server based on
			// combining versions from the module query string in-order. (T188076)
			query.version = getCombinedVersion( packed.list );
			query = sortQuery( query );
			addScript( sourceLoadScript + '?' + makeQueryString( query ) );
		}

		// Always order modules alphabetically to help reduce cache
		// misses for otherwise identical content.
		batch.sort();

		// Query parameters common to all requests
		var reqBase = {
    "lang": "en",
    "skin": "vector",
    "debug": "1"
};

		// Split module list by source and by group.
		var splits = Object.create( null );
		for ( var b = 0; b < batch.length; b++ ) {
			var bSource = registry[ batch[ b ] ].source;
			var bGroup = registry[ batch[ b ] ].group;
			if ( !splits[ bSource ] ) {
				splits[ bSource ] = Object.create( null );
			}
			if ( !splits[ bSource ][ bGroup ] ) {
				splits[ bSource ][ bGroup ] = [];
			}
			splits[ bSource ][ bGroup ].push( batch[ b ] );
		}

		for ( var source in splits ) {
			sourceLoadScript = sources[ source ];

			for ( var group in splits[ source ] ) {

				// Cache access to currently selected list of
				// modules for this group from this source.
				var modules = splits[ source ][ group ];

				// Query parameters common to requests for this module group
				// Optimisation: Inherit (Object.create), not copy ($.extend)
				currReqBase = Object.create( reqBase );
				// User modules require a user name in the query string.
				if ( group === 0 && mw.config.get( 'wgUserName' ) !== null ) {
					currReqBase.user = mw.config.get( 'wgUserName' );
				}

				// In addition to currReqBase, doRequest() will also add 'modules' and 'version'.
				// > '&modules='.length === 9
				// > '&version=12345'.length === 14
				// > 9 + 14 = 23
				var currReqBaseLength = makeQueryString( currReqBase ).length + 23;

				// We may need to split up the request to honor the query string length limit,
				// so build it piece by piece.
				var length = currReqBaseLength;
				var currReqModules = [];
				moduleMap = Object.create( null ); // { prefix: [ suffixes ] }

				for ( var i = 0; i < modules.length; i++ ) {
					// Determine how many bytes this module would add to the query string
					var lastDotIndex = modules[ i ].lastIndexOf( '.' ),
						prefix = modules[ i ].slice( 0, Math.max( 0, lastDotIndex ) ),
						suffix = modules[ i ].slice( lastDotIndex + 1 ),
						bytesAdded = moduleMap[ prefix ] ?
							suffix.length + 3 : // '%2C'.length == 3
							modules[ i ].length + 3; // '%7C'.length == 3

					// If the url would become too long, create a new one, but don't create empty requests
					if ( currReqModules.length && length + bytesAdded > mw.loader.maxQueryLength ) {
						// Dispatch what we've got...
						doRequest();
						// .. and start again.
						length = currReqBaseLength;
						moduleMap = Object.create( null );
						currReqModules = [];
					}
					if ( !moduleMap[ prefix ] ) {
						moduleMap[ prefix ] = [];
					}
					length += bytesAdded;
					moduleMap[ prefix ].push( suffix );
					currReqModules.push( modules[ i ] );
				}
				// If there's anything left in moduleMap, request that too
				if ( currReqModules.length ) {
					doRequest();
				}
			}
		}
	}

	/**
	 * @private
	 * @param {string[]} implementations Array containing pieces of JavaScript code in the
	 *  form of calls to mw.loader#implement().
	 * @param {Function} cb Callback in case of failure
	 * @param {Error} cb.err
	 */
	function asyncEval( implementations, cb ) {
		if ( !implementations.length ) {
			return;
		}
		mw.requestIdleCallback( function () {
			try {
				domEval( implementations.join( ';' ) );
			} catch ( err ) {
				cb( err );
			}
		} );
	}

	/**
	 * Make a versioned key for a specific module.
	 *
	 * @private
	 * @param {string} module Module name
	 * @return {string|null} Module key in format '`[name]@[version]`',
	 *  or null if the module does not exist
	 */
	function getModuleKey( module ) {
		return module in registry ? ( module + '@' + registry[ module ].version ) : null;
	}

	/**
	 * @private
	 * @param {string} key Module name or '`[name]@[version]`'
	 * @return {Object}
	 */
	function splitModuleKey( key ) {
		// Module names may contain '@' but version strings may not, so the last '@' is the delimiter
		var index = key.lastIndexOf( '@' );
		// If the key doesn't contain '@' or starts with it, the whole thing is the module name
		if ( index === -1 || index === 0 ) {
			return {
				name: key,
				version: ''
			};
		}
		return {
			name: key.slice( 0, index ),
			version: key.slice( index + 1 )
		};
	}

	/**
	 * @private
	 * @param {string} module
	 * @param {string|number} [version]
	 * @param {string[]} [dependencies]
	 * @param {string} [group]
	 * @param {string} [source]
	 * @param {string} [skip]
	 */
	function registerOne( module, version, dependencies, group, source, skip ) {
		if ( module in registry ) {
			throw new Error( 'module already registered: ' + module );
		}

		version = String( version || '' );

		// requiresES6 is encoded as a ! at the end of version
		if ( version.slice( -1 ) === '!' ) {
			if ( !isES6Supported ) {
				// Exclude ES6-only modules from the registry in ES5 browsers.
				//
				// These must:
				// - be gracefully skipped if a top-level page module, in resolveStubbornly().
				// - fail hard when otherwise used or depended on, in sortDependencies().
				// - be detectable in the public API, per T299677.
				return;
			}
			// Remove the ! at the end to get the real version
			version = version.slice( 0, -1 );
		}

		registry[ module ] = {
			// Exposed to execute() for mw.loader.implement() closures.
			// Import happens via require().
			module: {
				exports: {}
			},
			// module.export objects for each package file inside this module
			packageExports: {},
			version: version,
			dependencies: dependencies || [],
			group: typeof group === 'undefined' ? null : group,
			source: typeof source === 'string' ? source : 'local',
			state: 'registered',
			skip: typeof skip === 'string' ? skip : null
		};
	}

	/* Public Members */

	mw.loader = {
		/**
		 * The module registry is exposed as an aid for debugging and inspecting page
		 * state; it is not a public interface for modifying the registry.
		 *
		 * @see #registry
		 * @property {Object}
		 * @private
		 */
		moduleRegistry: registry,

		/**
		 * Exposed for testing and debugging only.
		 *
		 * @see #batchRequest
		 * @property {number}
		 * @private
		 */
		maxQueryLength: 5000,

		/**
		 * @inheritdoc #newStyleTag
		 * @method
		 */
		addStyleTag: newStyleTag,

		enqueue: enqueue,

		resolve: resolve,

		/**
		 * Start loading of all queued module dependencies.
		 *
		 * @private
		 */
		work: function () {
			store.init();

			var q = queue.length,
				storedImplementations = [],
				storedNames = [],
				requestNames = [],
				batch = new StringSet();

			// Iterate the list of requested modules, and do one of three things:
			// - 1) Nothing (if already loaded or being loaded).
			// - 2) Eval the cached implementation from the module store.
			// - 3) Request from network.
			while ( q-- ) {
				var module = queue[ q ];
				// Only consider modules which are the initial 'registered' state,
				// and ignore duplicates
				if ( mw.loader.getState( module ) === 'registered' &&
					!batch.has( module )
				) {
					// Progress the state machine
					registry[ module ].state = 'loading';
					batch.add( module );

					var implementation = store.get( module );
					if ( implementation ) {
						// Module store enabled and contains this module/version
						storedImplementations.push( implementation );
						storedNames.push( module );
					} else {
						// Module store disabled or doesn't have this module/version
						requestNames.push( module );
					}
				}
			}

			// Now that the queue has been processed into a batch, clear the queue.
			// This MUST happen before we initiate any eval or network request. Otherwise,
			// it is possible for a cached script to instantly trigger the same work queue
			// again; all before we've cleared it causing each request to include modules
			// which are already loaded.
			queue = [];

			asyncEval( storedImplementations, function ( err ) {
				// Not good, the cached mw.loader.implement calls failed! This should
				// never happen, barring ResourceLoader bugs, browser bugs and PEBKACs.
				// Depending on how corrupt the string is, it is likely that some
				// modules' implement() succeeded while the ones after the error will
				// never run and leave their modules in the 'loading' state forever.
				store.stats.failed++;

				// Since this is an error not caused by an individual module but by
				// something that infected the implement call itself, don't take any
				// risks and clear everything in this cache.
				store.clear();

				mw.trackError( 'resourceloader.exception', {
					exception: err,
					source: 'store-eval'
				} );
				// For any failed ones, fallback to requesting from network
				var failed = storedNames.filter( function ( name ) {
					return registry[ name ].state === 'loading';
				} );
				batchRequest( failed );
			} );

			batchRequest( requestNames );
		},

		/**
		 * Register a source.
		 *
		 * The #work() method will use this information to split up requests by source.
		 *
		 *     @example
		 *     mw.loader.addSource( { mediawikiwiki: 'https://www.mediawiki.org/w/load.php' } );
		 *
		 * @private
		 * @param {Object} ids An object mapping ids to load.php end point urls
		 * @throws {Error} If source id is already registered
		 */
		addSource: function ( ids ) {
			for ( var id in ids ) {
				if ( id in sources ) {
					throw new Error( 'source already registered: ' + id );
				}
				sources[ id ] = ids[ id ];
			}
		},

		/**
		 * Register a module, letting the system know about it and its properties.
		 *
		 * The startup module calls this method.
		 *
		 * When using multiple module registration by passing an array, dependencies that
		 * are specified as references to modules within the array will be resolved before
		 * the modules are registered.
		 *
		 * @param {string|Array} modules Module name or array of arrays, each containing
		 *  a list of arguments compatible with this method
		 * @param {string|number} [version] Module version hash (falls backs to empty string)
		 *  Can also be a number (timestamp) for compatibility with MediaWiki 1.25 and earlier.
		 *  A version string that ends with '!' signifies that the module requires ES6 support.
		 * @param {string[]} [dependencies] Array of module names on which this module depends.
		 * @param {string} [group=null] Group which the module is in
		 * @param {string} [source='local'] Name of the source
		 * @param {string} [skip=null] Script body of the skip function
		 */
		register: function ( modules ) {
			if ( typeof modules !== 'object' ) {
				registerOne.apply( null, arguments );
				return;
			}
			// Need to resolve indexed dependencies:
			// ResourceLoader uses an optimisation to save space which replaces module
			// names in dependency lists with the index of that module within the
			// array of module registration data if it exists. The benefit is a significant
			// reduction in the data size of the startup module. This loop changes
			// those dependency lists back to arrays of strings.
			function resolveIndex( dep ) {
				return typeof dep === 'number' ? modules[ dep ][ 0 ] : dep;
			}

			for ( var i = 0; i < modules.length; i++ ) {
				var deps = modules[ i ][ 2 ];
				if ( deps ) {
					for ( var j = 0; j < deps.length; j++ ) {
						deps[ j ] = resolveIndex( deps[ j ] );
					}
				}
				// Optimisation: Up to 55% faster.
				// Typically register() is called exactly once on a page, and with a batch.
				// See <https://gist.github.com/Krinkle/f06fdb3de62824c6c16f02a0e6ce0e66>
				// Benchmarks taught us that the code for adding an object to `registry`
				// should be in a function that has only one signature and does no arguments
				// manipulation.
				// JS semantics make it hard to optimise recursion to a different
				// signature of itself, hence we moved this out.
				registerOne.apply( null, modules[ i ] );
			}
		},

		/**
		 * Implement a module given the components that make up the module.
		 *
		 * When #load() or #using() requests one or more modules, the server
		 * response contain calls to this function.
		 *
		 * @param {string} module Name of module and current module version. Formatted
		 *  as '`[name]@[version]`". This version should match the requested version
		 *  (from #batchRequest and #registry). This avoids race conditions (T117587).
		 *  For back-compat with MediaWiki 1.27 and earlier, the version may be omitted.
		 * @param {Function|Array|string|Object} [script] Module code. This can be a function,
		 *  a list of URLs to load via `<script src>`, a string for `domEval()`, or an
		 *  object like {"files": {"foo.js":function, "bar.js": function, ...}, "main": "foo.js"}.
		 *  If an object is provided, the main file will be executed immediately, and the other
		 *  files will only be executed if loaded via require(). If a function or string is
		 *  provided, it will be executed/evaluated immediately. If an array is provided, all
		 *  URLs in the array will be loaded immediately, and executed as soon as they arrive.
		 * @param {Object} [style] Should follow one of the following patterns:
		 *
		 *     { "css": [css, ..] }
		 *     { "url": { <media>: [url, ..] } }
		 *
		 * The reason css strings are not concatenated anymore is T33676. We now check
		 * whether it's safe to extend the stylesheet.
		 *
		 * @private
		 * @param {Object} [messages] List of key/value pairs to be added to mw#messages.
		 * @param {Object} [templates] List of key/value pairs to be added to mw#templates.
		 */
		implement: function ( module, script, style, messages, templates ) {
			var split = splitModuleKey( module ),
				name = split.name,
				version = split.version;
			// Automatically register module
			if ( !( name in registry ) ) {
				mw.loader.register( name );
			}
			// Check for duplicate implementation
			if ( registry[ name ].script !== undefined ) {
				throw new Error( 'module already implemented: ' + name );
			}
			if ( version ) {
				// Without this reset, if there is a version mismatch between the
				// requested and received module version, then mw.loader.store would
				// cache the response under the requested key. Thus poisoning the cache
				// indefinitely with a stale value. (T117587)
				registry[ name ].version = version;
			}
			// Attach components
			registry[ name ].script = script || null;
			registry[ name ].style = style || null;
			registry[ name ].messages = messages || null;
			registry[ name ].templates = templates || null;
			// The module may already have been marked as erroneous
			if ( registry[ name ].state !== 'error' && registry[ name ].state !== 'missing' ) {
				setAndPropagate( name, 'loaded' );
			}
		},

		/**
		 * Load an external script or one or more modules.
		 *
		 * This method takes a list of unrelated modules. Use cases:
		 *
		 * - A web page will be composed of many different widgets. These widgets independently
		 *   queue their ResourceLoader modules (`OutputPage::addModules()`). If any of them
		 *   have problems, or are no longer known (e.g. cached HTML), the other modules
		 *   should still be loaded.
		 * - This method is used for preloading, which must not throw. Later code that
		 *   calls #using() will handle the error.
		 *
		 * @param {string|Array} modules Either the name of a module, array of modules,
		 *  or a URL of an external script or style
		 * @param {string} [type='text/javascript'] MIME type to use if calling with a URL of an
		 *  external script or style; acceptable values are "text/css" and
		 *  "text/javascript"; if no type is provided, text/javascript is assumed.
		 * @throws {Error} If type is invalid
		 */
		load: function ( modules, type ) {
			if ( typeof modules === 'string' && /^(https?:)?\/?\//.test( modules ) ) {
				// Called with a url like so:
				// - "https://example.org/x.js"
				// - "http://example.org/x.js"
				// - "//example.org/x.js"
				// - "/x.js"
				if ( type === 'text/css' ) {
					addLink( modules );
				} else if ( type === 'text/javascript' || type === undefined ) {
					addScript( modules );
				} else {
					// Unknown type
					throw new Error( 'Invalid type ' + type );
				}
			} else {
				// One or more modules
				modules = typeof modules === 'string' ? [ modules ] : modules;
				// Resolve modules into flat list for internal queuing.
				// This also filters out unknown modules and modules with
				// unknown dependencies, allowing the rest to continue. (T36853)
				// Omit ready and error parameters, we don't have callbacks
				enqueue( resolveStubbornly( modules ) );
			}
		},

		/**
		 * Change the state of one or more modules.
		 *
		 * @param {Object} states Object of module name/state pairs
		 */
		state: function ( states ) {
			for ( var module in states ) {
				if ( !( module in registry ) ) {
					mw.loader.register( module );
				}
				setAndPropagate( module, states[ module ] );
			}
		},

		/**
		 * Get the state of a module.
		 *
		 * @param {string} module Name of module
		 * @return {string|null} The state, or null if the module (or its state) is not
		 *  in the registry.
		 */
		getState: function ( module ) {
			return module in registry ? registry[ module ].state : null;
		},

		/**
		 * Get the exported value of a module.
		 *
		 * This static method is publicly exposed for debugging purposes
		 * only and must not be used in production code. In production code,
		 * please use the dynamically provided `require()` function instead.
		 *
		 * In case of lazy-loaded modules via mw.loader#using(), the returned
		 * Promise provides the function, see #using() for examples.
		 *
		 * @private
		 * @since 1.27
		 * @param {string} moduleName Module name
		 * @return {Mixed} Exported value
		 */
		require: function ( moduleName ) {
			// Only ready modules can be required
			if ( mw.loader.getState( moduleName ) !== 'ready' ) {
				// Module may've forgotten to declare a dependency
				throw new Error( 'Module "' + moduleName + '" is not loaded' );
			}

			return registry[ moduleName ].module.exports;
		}
	};

	/**
	 * On browsers that implement the localStorage API, the module store serves as a
	 * smart complement to the browser cache. Unlike the browser cache, the module store
	 * can slice a concatenated response from ResourceLoader into its constituent
	 * modules and cache each of them separately, using each module's versioning scheme
	 * to determine when the cache should be invalidated.
	 *
	 * @private
	 * @singleton
	 * @class mw.loader.store
	 */

	// Whether we have already triggered a timer for flushWrites
	var hasPendingWrites = false;

	/**
	 * Actually update the store
	 *
	 * @see #requestUpdate
	 * @private
	 */
	function flushWrites() {
		// Remove anything from the in-memory store that came from previous page
		// loads that no longer corresponds with current module names and versions.
		store.prune();
		// Process queued module names, serialise their contents to the in-memory store.
		while ( store.queue.length ) {
			store.set( store.queue.shift() );
		}

		try {
			// Replacing the content of the module store might fail if the new
			// contents would exceed the browser's localStorage size limit. To
			// avoid clogging the browser with stale data, always remove the old
			// value before attempting to set the new one.
			localStorage.removeItem( store.key );
			var data = JSON.stringify( store );
			localStorage.setItem( store.key, data );
		} catch ( e ) {
			mw.trackError( 'resourceloader.exception', {
				exception: e,
				source: 'store-localstorage-update'
			} );
		}

		// Let the next call to requestUpdate() create a new timer.
		hasPendingWrites = false;
	}

	// We use a local variable `store` so that its easier to access, but also need to set
	// this in mw.loader so its exported - combine the two
	mw.loader.store = store = {
		// Whether the store is in use on this page.
		enabled: null,

		// The contents of the store, mapping '[name]@[version]' keys
		// to module implementations.
		items: {},

		// Names of modules to be stored during the next update.
		// See add() and update().
		queue: [],

		// Cache hit stats
		stats: { hits: 0, misses: 0, expired: 0, failed: 0 },

		/**
		 * Construct a JSON-serializable object representing the content of the store.
		 *
		 * @return {Object} Module store contents.
		 */
		toJSON: function () {
			return {
				items: store.items,
				vary: store.vary,
				// Store with 1e7 ms accuracy (1e4 seconds, or ~ 2.7 hours),
				// which is enough for the purpose of expiring after ~ 30 days.
				asOf: Math.ceil( Date.now() / 1e7 )
			};
		},

		/**
		 * The localStorage key for the entire module store. The key references
		 * $wgDBname to prevent clashes between wikis which share a common host.
		 *
		 * @property {string}
		 */
		key: "MediaWikiModuleStore:ruwiki",

		/**
		 * A string containing various factors by which the module cache should vary.
		 *
		 * Defined by ResourceLoaderStartupModule::getStoreVary() in PHP.
		 *
		 * @property {string}
		 */
		vary: "vector:1-3:en",

		/**
		 * Initialize the store.
		 *
		 * Retrieves store from localStorage and (if successfully retrieved) decoding
		 * the stored JSON value to a plain object.
		 */
		init: function () {
			// Init only once per page
			if ( this.enabled === null ) {
				this.enabled = false;
				if ( false ) {
					this.load();
				} else {
					// Clear any previous store to free up space. (T66721)
					this.clear();
				}

			}
		},

		/**
		 * Internal helper for init(). Separated for ease of testing.
		 */
		load: function () {
			// These are the scenarios to think about:
			//
			// 1. localStorage is disallowed by the browser.
			//    This means `localStorage.getItem` throws.
			//    The store stays disabled.
			//
			// 2. localStorage did not contain our store key.
			//    This usually means the browser has a cold cache for this site,
			//    and thus localStorage.getItem returns null.
			//    The store will be enabled, and `items` starts fresh.
			//
			// 3. localStorage contains parseable data, but it's not usable.
			//    This means the data is too old, or is not valid for mw.loader.store.vary
			//    (e.g. user switched skin or language).
			//    The store will be enabled, and `items` starts fresh.
			//
			// 4. localStorage contains invalid JSON data.
			//    This means the data was corrupted, and `JSON.parse` throws.
			//    The store will be enabled, and `items` starts fresh.
			//
			// 5. localStorage contains valid and usable JSON.
			//    This means we have a warm cache from a previous visit.
			//    The store will be enabled, and `items` starts with the stored data.

			try {
				var raw = localStorage.getItem( this.key );

				// If we make it here, localStorage is enabled and available.
				// The rest of the function may fail, but that only affects what we load from
				// the cache. We'll still enable the store to allow storing new modules.
				this.enabled = true;

				// If getItem returns null, JSON.parse() will cast to string and re-parse, still null.
				var data = JSON.parse( raw );
				if ( data &&
					data.vary === this.vary &&
					data.items &&
					// Only use if it's been less than 30 days since the data was written
					// 30 days = 2,592,000 s = 2,592,000,000 ms = ± 259e7 ms
					Date.now() < ( data.asOf * 1e7 ) + 259e7
				) {
					// The data is not corrupt, matches our vary context, and has not expired.
					this.items = data.items;
				}
			} catch ( e ) {
				// Ignore error from localStorage or JSON.parse.
				// Don't print any warning (T195647).
			}
		},

		/**
		 * Retrieve a module from the store and update cache hit stats.
		 *
		 * @param {string} module Module name
		 * @return {string|boolean} Module implementation or false if unavailable
		 */
		get: function ( module ) {
			if ( this.enabled ) {
				var key = getModuleKey( module );
				if ( key in this.items ) {
					this.stats.hits++;
					return this.items[ key ];
				}

				this.stats.misses++;
			}

			return false;
		},

		/**
		 * Queue the name of a module that the next update should consider storing.
		 *
		 * @since 1.32
		 * @param {string} module Module name
		 */
		add: function ( module ) {
			if ( this.enabled ) {
				this.queue.push( module );
				this.requestUpdate();
			}
		},

		/**
		 * Add the contents of the named module to the in-memory store.
		 *
		 * This method does not guarantee that the module will be stored.
		 * Inspection of the module's meta data and size will ultimately decide that.
		 *
		 * This method is considered internal to mw.loader.store and must only
		 * be called if the store is enabled.
		 *
		 * @private
		 * @param {string} module Module name
		 */
		set: function ( module ) {
			var args,
				encodedScript,
				descriptor = registry[ module ],
				key = getModuleKey( module );

			if (
				// Already stored a copy of this exact version
				key in this.items ||
				// Module failed to load
				!descriptor ||
				descriptor.state !== 'ready' ||
				// Unversioned, private, or site-/user-specific
				!descriptor.version ||
				descriptor.group === 1 ||
				descriptor.group === 0 ||
				// Partial descriptor
				// (e.g. skipped module, or style module with state=ready)
				[ descriptor.script, descriptor.style, descriptor.messages,
					descriptor.templates ].indexOf( undefined ) !== -1
			) {
				// Decline to store
				return;
			}

			try {
				if ( typeof descriptor.script === 'function' ) {
					// Function literal: cast to string
					encodedScript = String( descriptor.script );
				} else if (
					// Plain object: serialise as object literal (not JSON),
					// making sure to preserve the functions.
					typeof descriptor.script === 'object' &&
					descriptor.script &&
					!Array.isArray( descriptor.script )
				) {
					encodedScript = '{' +
						'main:' + JSON.stringify( descriptor.script.main ) + ',' +
						'files:{' +
						Object.keys( descriptor.script.files ).map( function ( file ) {
							var value = descriptor.script.files[ file ];
							return JSON.stringify( file ) + ':' +
								( typeof value === 'function' ? value : JSON.stringify( value ) );
						} ).join( ',' ) +
						'}}';
				} else {
					// Array of urls, or null.
					encodedScript = JSON.stringify( descriptor.script );
				}
				args = [
					JSON.stringify( key ),
					encodedScript,
					JSON.stringify( descriptor.style ),
					JSON.stringify( descriptor.messages ),
					JSON.stringify( descriptor.templates )
				];
			} catch ( e ) {
				mw.trackError( 'resourceloader.exception', {
					exception: e,
					source: 'store-localstorage-json'
				} );
				return;
			}

			var src = 'mw.loader.implement(' + args.join( ',' ) + ');';

			// Modules whose serialised form exceeds 100 kB won't be stored (T66721).
			if ( src.length > 1e5 ) {
				return;
			}
			this.items[ key ] = src;
		},

		/**
		 * Iterate through the module store, removing any item that does not correspond
		 * (in name and version) to an item in the module registry.
		 */
		prune: function () {
			for ( var key in this.items ) {
				// key is in the form [name]@[version], slice to get just the name
				// to provide to getModuleKey, which will return a key in the same
				// form but with the latest version
				if ( getModuleKey( splitModuleKey( key ).name ) !== key ) {
					this.stats.expired++;
					delete this.items[ key ];
				}
			}
		},

		/**
		 * Clear the entire module store right now.
		 */
		clear: function () {
			this.items = {};
			try {
				localStorage.removeItem( this.key );
			} catch ( e ) {}
		},

		/**
		 * Request a sync of the in-memory store back to persisted localStorage.
		 *
		 * This function debounces updates. The debouncing logic should account
		 * for the following factors:
		 *
		 * - Writing to localStorage is an expensive operation that must not happen
		 *   during the critical path of initialising and executing module code.
		 *   Instead, it should happen at a later time after modules have been given
		 *   time and priority to do their thing first.
		 *
		 * - This method is called from mw.loader.store.add(), which will be called
		 *   hundreds of times on a typical page, including within the same call-stack
		 *   and eventloop-tick. This is because responses from load.php happen in
		 *   batches. As such, we want to allow all modules from the same load.php
		 *   response to be written to disk with a single flush, not many.
		 *
		 * - Repeatedly deleting and creating timers is non-trivial.
		 *
		 * - localStorage is shared by all pages from the same origin, if multiple
		 *   pages are loaded with different module sets, the possibility exists that
		 *   modules saved by one page will be clobbered by another. The impact of
		 *   this is minor, it merely causes a less efficient cache use, and the
		 *   problem would be corrected by subsequent page views.
		 *
		 * This method is considered internal to mw.loader.store and must only
		 * be called if the store is enabled.
		 *
		 * @private
		 * @method
		 */
		requestUpdate: function () {
			// On the first call to requestUpdate(), create a timer that
			// waits at least two seconds, then calls onTimeout.
			// The main purpose is to allow the current batch of load.php
			// responses to complete before we do anything. This batch can
			// trigger many hundreds of calls to requestUpdate().
			if ( !hasPendingWrites ) {
				hasPendingWrites = true;
				setTimeout(
					// Defer the actual write via requestIdleCallback
					function () {
						mw.requestIdleCallback( flushWrites );
					},
					2000
				);
			}
		}
	};

}() );
/* global mw */
mw.requestIdleCallbackInternal = function ( callback ) {
	setTimeout( function () {
		var start = mw.now();
		callback( {
			didTimeout: false,
			timeRemaining: function () {
				// Hard a target maximum busy time of 50 milliseconds
				return Math.max( 0, 50 - ( mw.now() - start ) );
			}
		} );
	}, 1 );
};

/**
 * Schedule a deferred task to run in the background.
 *
 * This allows code to perform tasks in the main thread without impacting
 * time-critical operations such as animations and response to input events.
 *
 * Basic logic is as follows:
 *
 * - User input event should be acknowledged within 100ms per [RAIL].
 * - Idle work should be grouped in blocks of upto 50ms so that enough time
 *   remains for the event handler to execute and any rendering to take place.
 * - Whenever a native event happens (e.g. user input), the deadline for any
 *   running idle callback drops to 0.
 * - As long as the deadline is non-zero, other callbacks pending may be
 *   executed in the same idle period.
 *
 * See also:
 *
 * - <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback>
 * - <https://w3c.github.io/requestidlecallback/>
 * - <https://developers.google.com/web/updates/2015/08/using-requestidlecallback>
 * [RAIL]: https://developers.google.com/web/fundamentals/performance/rail
 *
 * @member mw
 * @param {Function} callback
 * @param {Object} [options]
 * @param {number} [options.timeout] If set, the callback will be scheduled for
 *  immediate execution after this amount of time (in milliseconds) if it didn't run
 *  by that time.
 */
mw.requestIdleCallback = window.requestIdleCallback ?
	// Bind because it throws TypeError if context is not window
	window.requestIdleCallback.bind( window ) :
	mw.requestIdleCallbackInternal;
// Note: Polyfill was previously disabled due to
// https://bugs.chromium.org/p/chromium/issues/detail?id=647870
// See also <http://codepen.io/Krinkle/full/XNGEvv>


	/**
	 * The $CODE placeholder is substituted in ResourceLoaderStartUpModule.php.
	 */
	( function () {
		/* global mw */
		var queue;

		mw.loader.addSource({
    "local": "/w/load.php",
    "metawiki": "//meta.wikimedia.org/w/load.php"
});
mw.loader.register([
    [
        "site",
        "",
        [
            1
        ]
    ],
    [
        "site.styles",
        "",
        [],
        2
    ],
    [
        "filepage",
        ""
    ],
    [
        "user",
        "",
        [],
        0
    ],
    [
        "user.styles",
        "",
        [],
        0
    ],
    [
        "user.options",
        "",
        [],
        1
    ],
    [
        "mediawiki.skinning.elements",
        ""
    ],
    [
        "mediawiki.skinning.content",
        ""
    ],
    [
        "mediawiki.skinning.interface",
        ""
    ],
    [
        "jquery.makeCollapsible.styles",
        ""
    ],
    [
        "mediawiki.skinning.content.parsoid",
        ""
    ],
    [
        "mediawiki.skinning.content.externallinks",
        ""
    ],
    [
        "jquery",
        ""
    ],
    [
        "es6-polyfills",
        "",
        [],
        null,
        null,
        "return Array.prototype.find \u0026\u0026\n\tArray.prototype.findIndex \u0026\u0026\n\tArray.prototype.includes \u0026\u0026\n\ttypeof Promise === 'function' \u0026\u0026\n\tPromise.prototype.finally;\n"
    ],
    [
        "web2017-polyfills",
        "",
        [
            13
        ],
        null,
        null,
        "return 'IntersectionObserver' in window \u0026\u0026\n    typeof fetch === 'function' \u0026\u0026\n    // Ensure:\n    // - standards compliant URL\n    // - standards compliant URLSearchParams\n    // - URL#toJSON method (came later)\n    //\n    // Facts:\n    // - All browsers with URL also have URLSearchParams, don't need to check.\n    // - Safari \u003C= 7 and Chrome \u003C= 31 had a buggy URL implementations.\n    // - Firefox 29-43 had an incomplete URLSearchParams implementation. https://caniuse.com/urlsearchparams\n    // - URL#toJSON was released in Firefox 54, Safari 11, and Chrome 71. https://caniuse.com/mdn-api_url_tojson\n    //   Thus we don't need to check for buggy URL or incomplete URLSearchParams.\n    typeof URL === 'function' \u0026\u0026 'toJSON' in URL.prototype;\n"
    ],
    [
        "mediawiki.base",
        "",
        [
            12
        ]
    ],
    [
        "jquery.chosen",
        ""
    ],
    [
        "jquery.client",
        ""
    ],
    [
        "jquery.color",
        ""
    ],
    [
        "jquery.confirmable",
        "",
        [
            113
        ]
    ],
    [
        "jquery.cookie",
        ""
    ],
    [
        "jquery.form",
        ""
    ],
    [
        "jquery.fullscreen",
        ""
    ],
    [
        "jquery.highlightText",
        "",
        [
            87
        ]
    ],
    [
        "jquery.hoverIntent",
        ""
    ],
    [
        "jquery.i18n",
        "",
        [
            112
        ]
    ],
    [
        "jquery.lengthLimit",
        "",
        [
            69
        ]
    ],
    [
        "jquery.makeCollapsible",
        "",
        [
            9
        ]
    ],
    [
        "jquery.spinner",
        "",
        [
            29
        ]
    ],
    [
        "jquery.spinner.styles",
        ""
    ],
    [
        "jquery.suggestions",
        "",
        [
            23
        ]
    ],
    [
        "jquery.tablesorter",
        "",
        [
            32,
            114,
            87
        ]
    ],
    [
        "jquery.tablesorter.styles",
        ""
    ],
    [
        "jquery.textSelection",
        "",
        [
            17
        ]
    ],
    [
        "jquery.throttle-debounce",
        ""
    ],
    [
        "jquery.tipsy",
        ""
    ],
    [
        "jquery.ui",
        ""
    ],
    [
        "moment",
        "",
        [
            110,
            87
        ]
    ],
    [
        "vue",
        "!"
    ],
    [
        "@vue/composition-api",
        "",
        [
            38
        ]
    ],
    [
        "vuex",
        "!",
        [
            38
        ]
    ],
    [
        "wvui",
        "",
        [
            39
        ]
    ],
    [
        "wvui-search",
        "",
        [
            38
        ]
    ],
    [
        "@wikimedia/codex",
        "!",
        [
            38
        ]
    ],
    [
        "mediawiki.template",
        ""
    ],
    [
        "mediawiki.template.mustache",
        "",
        [
            44
        ]
    ],
    [
        "mediawiki.apipretty",
        ""
    ],
    [
        "mediawiki.api",
        "",
        [
            75,
            113
        ]
    ],
    [
        "mediawiki.content.json",
        ""
    ],
    [
        "mediawiki.confirmCloseWindow",
        ""
    ],
    [
        "mediawiki.debug",
        "",
        [
            201
        ]
    ],
    [
        "mediawiki.diff",
        ""
    ],
    [
        "mediawiki.diff.styles",
        ""
    ],
    [
        "mediawiki.feedback",
        "",
        [
            871,
            209
        ]
    ],
    [
        "mediawiki.feedlink",
        ""
    ],
    [
        "mediawiki.filewarning",
        "",
        [
            201,
            213
        ]
    ],
    [
        "mediawiki.ForeignApi",
        "",
        [
            321
        ]
    ],
    [
        "mediawiki.ForeignApi.core",
        "",
        [
            84,
            47,
            197
        ]
    ],
    [
        "mediawiki.helplink",
        ""
    ],
    [
        "mediawiki.hlist",
        ""
    ],
    [
        "mediawiki.htmlform",
        "",
        [
            26,
            87
        ]
    ],
    [
        "mediawiki.htmlform.ooui",
        "",
        [
            201
        ]
    ],
    [
        "mediawiki.htmlform.styles",
        ""
    ],
    [
        "mediawiki.htmlform.ooui.styles",
        ""
    ],
    [
        "mediawiki.icon",
        ""
    ],
    [
        "mediawiki.inspect",
        "",
        [
            69,
            87
        ]
    ],
    [
        "mediawiki.notification",
        "",
        [
            87,
            93
        ]
    ],
    [
        "mediawiki.notification.convertmessagebox",
        "",
        [
            66
        ]
    ],
    [
        "mediawiki.notification.convertmessagebox.styles",
        ""
    ],
    [
        "mediawiki.String",
        ""
    ],
    [
        "mediawiki.pager.styles",
        ""
    ],
    [
        "mediawiki.pager.tablePager",
        ""
    ],
    [
        "mediawiki.pulsatingdot",
        ""
    ],
    [
        "mediawiki.searchSuggest",
        "",
        [
            30,
            47
        ]
    ],
    [
        "mediawiki.storage",
        ""
    ],
    [
        "mediawiki.Title",
        "",
        [
            69,
            87
        ]
    ],
    [
        "mediawiki.Upload",
        "",
        [
            47
        ]
    ],
    [
        "mediawiki.ForeignUpload",
        "",
        [
            56,
            76
        ]
    ],
    [
        "mediawiki.ForeignStructuredUpload",
        "",
        [
            77
        ]
    ],
    [
        "mediawiki.Upload.Dialog",
        "",
        [
            80
        ]
    ],
    [
        "mediawiki.Upload.BookletLayout",
        "",
        [
            76,
            85,
            37,
            204,
            209,
            214,
            215
        ]
    ],
    [
        "mediawiki.ForeignStructuredUpload.BookletLayout",
        "",
        [
            78,
            80,
            117,
            180,
            174
        ]
    ],
    [
        "mediawiki.toc",
        "",
        [
            90
        ]
    ],
    [
        "mediawiki.toc.styles",
        ""
    ],
    [
        "mediawiki.Uri",
        "",
        [
            87
        ]
    ],
    [
        "mediawiki.user",
        "",
        [
            47,
            90
        ]
    ],
    [
        "mediawiki.userSuggest",
        "",
        [
            30,
            47
        ]
    ],
    [
        "mediawiki.util",
        "",
        [
            17
        ]
    ],
    [
        "mediawiki.checkboxtoggle",
        ""
    ],
    [
        "mediawiki.checkboxtoggle.styles",
        ""
    ],
    [
        "mediawiki.cookie",
        "",
        [
            20
        ]
    ],
    [
        "mediawiki.experiments",
        ""
    ],
    [
        "mediawiki.editfont.styles",
        ""
    ],
    [
        "mediawiki.visibleTimeout",
        ""
    ],
    [
        "mediawiki.action.delete",
        "",
        [
            26,
            201
        ]
    ],
    [
        "mediawiki.action.edit",
        "",
        [
            33,
            96,
            47,
            92,
            176
        ]
    ],
    [
        "mediawiki.action.edit.styles",
        ""
    ],
    [
        "mediawiki.action.edit.collapsibleFooter",
        "",
        [
            27,
            64,
            74
        ]
    ],
    [
        "mediawiki.action.edit.preview",
        "",
        [
            28,
            123,
            85
        ]
    ],
    [
        "mediawiki.action.history",
        "",
        [
            27
        ]
    ],
    [
        "mediawiki.action.history.styles",
        ""
    ],
    [
        "mediawiki.action.protect",
        "",
        [
            26,
            201
        ]
    ],
    [
        "mediawiki.action.view.metadata",
        "",
        [
            108
        ]
    ],
    [
        "mediawiki.action.view.categoryPage.styles",
        ""
    ],
    [
        "mediawiki.action.view.postEdit",
        "",
        [
            113,
            66,
            201,
            220
        ]
    ],
    [
        "mediawiki.action.view.redirect",
        "",
        [
            17
        ]
    ],
    [
        "mediawiki.action.view.redirectPage",
        ""
    ],
    [
        "mediawiki.action.edit.editWarning",
        "",
        [
            33,
            49,
            113
        ]
    ],
    [
        "mediawiki.action.view.filepage",
        ""
    ],
    [
        "mediawiki.action.styles",
        ""
    ],
    [
        "mediawiki.language",
        "",
        [
            111
        ]
    ],
    [
        "mediawiki.cldr",
        "",
        [
            112
        ]
    ],
    [
        "mediawiki.libs.pluralruleparser",
        ""
    ],
    [
        "mediawiki.jqueryMsg",
        "",
        [
            69,
            110,
            87,
            5
        ]
    ],
    [
        "mediawiki.language.months",
        "",
        [
            110
        ]
    ],
    [
        "mediawiki.language.names",
        "",
        [
            110
        ]
    ],
    [
        "mediawiki.language.specialCharacters",
        "",
        [
            110
        ]
    ],
    [
        "mediawiki.libs.jpegmeta",
        ""
    ],
    [
        "mediawiki.page.gallery",
        "",
        [
            119,
            87
        ]
    ],
    [
        "mediawiki.page.gallery.styles",
        ""
    ],
    [
        "mediawiki.page.gallery.slideshow",
        "",
        [
            47,
            204,
            223,
            225
        ]
    ],
    [
        "mediawiki.page.ready",
        "",
        [
            47
        ]
    ],
    [
        "mediawiki.page.watch.ajax",
        "",
        [
            47
        ]
    ],
    [
        "mediawiki.page.preview",
        "",
        [
            27,
            33,
            47,
            52,
            201
        ]
    ],
    [
        "mediawiki.page.image.pagination",
        "",
        [
            28,
            87
        ]
    ],
    [
        "mediawiki.rcfilters.filters.base.styles",
        ""
    ],
    [
        "mediawiki.rcfilters.highlightCircles.seenunseen.styles",
        ""
    ],
    [
        "mediawiki.rcfilters.filters.ui",
        "",
        [
            27,
            84,
            85,
            171,
            210,
            217,
            219,
            220,
            221,
            223,
            224
        ]
    ],
    [
        "mediawiki.interface.helpers.styles",
        ""
    ],
    [
        "mediawiki.special",
        ""
    ],
    [
        "mediawiki.special.apisandbox",
        "",
        [
            27,
            84,
            191,
            177,
            200,
            215
        ]
    ],
    [
        "mediawiki.special.block",
        "",
        [
            60,
            174,
            190,
            181,
            191,
            188,
            215,
            217
        ]
    ],
    [
        "mediawiki.misc-authed-ooui",
        "",
        [
            61,
            171,
            176
        ]
    ],
    [
        "mediawiki.misc-authed-pref",
        "",
        [
            5
        ]
    ],
    [
        "mediawiki.misc-authed-curate",
        "",
        [
            19,
            28,
            47
        ]
    ],
    [
        "mediawiki.special.changeslist",
        ""
    ],
    [
        "mediawiki.special.changeslist.watchlistexpiry",
        "",
        [
            129
        ]
    ],
    [
        "mediawiki.special.changeslist.enhanced",
        ""
    ],
    [
        "mediawiki.special.changeslist.legend",
        ""
    ],
    [
        "mediawiki.special.changeslist.legend.js",
        "",
        [
            27,
            90
        ]
    ],
    [
        "mediawiki.special.contributions",
        "",
        [
            27,
            113,
            174,
            200
        ]
    ],
    [
        "mediawiki.special.edittags",
        "",
        [
            16,
            26
        ]
    ],
    [
        "mediawiki.special.import",
        "",
        [
            171
        ]
    ],
    [
        "mediawiki.special.import.styles.ooui",
        ""
    ],
    [
        "mediawiki.special.preferences.ooui",
        "",
        [
            49,
            92,
            67,
            74,
            181,
            176
        ]
    ],
    [
        "mediawiki.special.preferences.styles.ooui",
        ""
    ],
    [
        "mediawiki.special.recentchanges",
        "",
        [
            171
        ]
    ],
    [
        "mediawiki.special.revisionDelete",
        "",
        [
            26
        ]
    ],
    [
        "mediawiki.special.search",
        "",
        [
            193
        ]
    ],
    [
        "mediawiki.special.search.commonsInterwikiWidget",
        "",
        [
            84,
            47
        ]
    ],
    [
        "mediawiki.special.search.interwikiwidget.styles",
        ""
    ],
    [
        "mediawiki.special.search.styles",
        ""
    ],
    [
        "mediawiki.special.unwatchedPages",
        "",
        [
            47
        ]
    ],
    [
        "mediawiki.special.upload",
        "",
        [
            28,
            47,
            49,
            117,
            129,
            44
        ]
    ],
    [
        "mediawiki.special.userlogin.common.styles",
        ""
    ],
    [
        "mediawiki.special.userlogin.login.styles",
        ""
    ],
    [
        "mediawiki.special.createaccount",
        "",
        [
            47
        ]
    ],
    [
        "mediawiki.special.userlogin.signup.styles",
        ""
    ],
    [
        "mediawiki.special.userrights",
        "",
        [
            26,
            67
        ]
    ],
    [
        "mediawiki.special.watchlist",
        "",
        [
            47,
            201,
            220
        ]
    ],
    [
        "mediawiki.special.version",
        ""
    ],
    [
        "mediawiki.legacy.config",
        ""
    ],
    [
        "mediawiki.legacy.commonPrint",
        ""
    ],
    [
        "mediawiki.legacy.shared",
        ""
    ],
    [
        "mediawiki.ui",
        ""
    ],
    [
        "mediawiki.ui.checkbox",
        ""
    ],
    [
        "mediawiki.ui.radio",
        ""
    ],
    [
        "mediawiki.ui.anchor",
        ""
    ],
    [
        "mediawiki.ui.button",
        ""
    ],
    [
        "mediawiki.ui.input",
        ""
    ],
    [
        "mediawiki.ui.icon",
        ""
    ],
    [
        "mediawiki.widgets",
        "",
        [
            47,
            172,
            204,
            214
        ]
    ],
    [
        "mediawiki.widgets.styles",
        ""
    ],
    [
        "mediawiki.widgets.AbandonEditDialog",
        "",
        [
            209
        ]
    ],
    [
        "mediawiki.widgets.DateInputWidget",
        "",
        [
            175,
            37,
            204,
            225
        ]
    ],
    [
        "mediawiki.widgets.DateInputWidget.styles",
        ""
    ],
    [
        "mediawiki.widgets.visibleLengthLimit",
        "",
        [
            26,
            201
        ]
    ],
    [
        "mediawiki.widgets.datetime",
        "",
        [
            87,
            201,
            220,
            224,
            225
        ]
    ],
    [
        "mediawiki.widgets.expiry",
        "",
        [
            177,
            37,
            204
        ]
    ],
    [
        "mediawiki.widgets.CheckMatrixWidget",
        "",
        [
            201
        ]
    ],
    [
        "mediawiki.widgets.CategoryMultiselectWidget",
        "",
        [
            56,
            204
        ]
    ],
    [
        "mediawiki.widgets.SelectWithInputWidget",
        "",
        [
            182,
            204
        ]
    ],
    [
        "mediawiki.widgets.SelectWithInputWidget.styles",
        ""
    ],
    [
        "mediawiki.widgets.SizeFilterWidget",
        "",
        [
            184,
            204
        ]
    ],
    [
        "mediawiki.widgets.SizeFilterWidget.styles",
        ""
    ],
    [
        "mediawiki.widgets.MediaSearch",
        "",
        [
            56,
            204
        ]
    ],
    [
        "mediawiki.widgets.Table",
        "",
        [
            204
        ]
    ],
    [
        "mediawiki.widgets.TagMultiselectWidget",
        "",
        [
            204
        ]
    ],
    [
        "mediawiki.widgets.UserInputWidget",
        "",
        [
            47,
            204
        ]
    ],
    [
        "mediawiki.widgets.UsersMultiselectWidget",
        "",
        [
            47,
            204
        ]
    ],
    [
        "mediawiki.widgets.NamespacesMultiselectWidget",
        "",
        [
            204
        ]
    ],
    [
        "mediawiki.widgets.TitlesMultiselectWidget",
        "",
        [
            171
        ]
    ],
    [
        "mediawiki.widgets.TagMultiselectWidget.styles",
        ""
    ],
    [
        "mediawiki.widgets.SearchInputWidget",
        "",
        [
            73,
            171,
            220
        ]
    ],
    [
        "mediawiki.widgets.SearchInputWidget.styles",
        ""
    ],
    [
        "mediawiki.watchstar.widgets",
        "",
        [
            200
        ]
    ],
    [
        "mediawiki.deflate",
        ""
    ],
    [
        "oojs",
        ""
    ],
    [
        "mediawiki.router",
        "",
        [
            199
        ]
    ],
    [
        "oojs-router",
        "",
        [
            197
        ]
    ],
    [
        "oojs-ui",
        "",
        [
            207,
            204,
            209
        ]
    ],
    [
        "oojs-ui-core",
        "",
        [
            110,
            197,
            203,
            202,
            211
        ]
    ],
    [
        "oojs-ui-core.styles",
        ""
    ],
    [
        "oojs-ui-core.icons",
        ""
    ],
    [
        "oojs-ui-widgets",
        "",
        [
            201,
            206
        ]
    ],
    [
        "oojs-ui-widgets.styles",
        ""
    ],
    [
        "oojs-ui-widgets.icons",
        ""
    ],
    [
        "oojs-ui-toolbars",
        "",
        [
            201,
            208
        ]
    ],
    [
        "oojs-ui-toolbars.icons",
        ""
    ],
    [
        "oojs-ui-windows",
        "",
        [
            201,
            210
        ]
    ],
    [
        "oojs-ui-windows.icons",
        ""
    ],
    [
        "oojs-ui.styles.indicators",
        ""
    ],
    [
        "oojs-ui.styles.icons-accessibility",
        ""
    ],
    [
        "oojs-ui.styles.icons-alerts",
        ""
    ],
    [
        "oojs-ui.styles.icons-content",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-advanced",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-citation",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-core",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-list",
        ""
    ],
    [
        "oojs-ui.styles.icons-editing-styling",
        ""
    ],
    [
        "oojs-ui.styles.icons-interactions",
        ""
    ],
    [
        "oojs-ui.styles.icons-layout",
        ""
    ],
    [
        "oojs-ui.styles.icons-location",
        ""
    ],
    [
        "oojs-ui.styles.icons-media",
        ""
    ],
    [
        "oojs-ui.styles.icons-moderation",
        ""
    ],
    [
        "oojs-ui.styles.icons-movement",
        ""
    ],
    [
        "oojs-ui.styles.icons-user",
        ""
    ],
    [
        "oojs-ui.styles.icons-wikimedia",
        ""
    ],
    [
        "skins.vector.user",
        "",
        [],
        0
    ],
    [
        "skins.vector.user.styles",
        "",
        [],
        0
    ],
    [
        "skins.vector.search",
        "!",
        [
            84,
            42
        ]
    ],
    [
        "skins.vector.styles.legacy",
        ""
    ],
    [
        "skins.vector.styles",
        ""
    ],
    [
        "skins.vector.icons.js",
        ""
    ],
    [
        "skins.vector.icons",
        ""
    ],
    [
        "skins.vector.es6",
        "!",
        [
            91,
            121,
            122,
            85,
            233
        ]
    ],
    [
        "skins.vector.js",
        "",
        [
            121,
            233
        ]
    ],
    [
        "skins.vector.legacy.js",
        "",
        [
            121
        ]
    ],
    [
        "skins.monobook.styles",
        ""
    ],
    [
        "skins.monobook.scripts",
        "",
        [
            85,
            213
        ]
    ],
    [
        "skins.modern",
        ""
    ],
    [
        "skins.cologneblue",
        ""
    ],
    [
        "skins.timeless",
        ""
    ],
    [
        "skins.timeless.js",
        ""
    ],
    [
        "ext.timeline.styles",
        ""
    ],
    [
        "ext.wikihiero",
        ""
    ],
    [
        "ext.wikihiero.special",
        "",
        [
            245,
            28,
            201
        ]
    ],
    [
        "ext.wikihiero.visualEditor",
        "",
        [
            440
        ]
    ],
    [
        "ext.charinsert",
        "",
        [
            33
        ]
    ],
    [
        "ext.charinsert.styles",
        ""
    ],
    [
        "ext.cite.styles",
        ""
    ],
    [
        "ext.cite.style",
        ""
    ],
    [
        "ext.cite.visualEditor.core",
        "",
        [
            448
        ]
    ],
    [
        "ext.cite.visualEditor",
        "",
        [
            251,
            250,
            252,
            213,
            216,
            220
        ]
    ],
    [
        "ext.cite.ux-enhancements",
        ""
    ],
    [
        "ext.citeThisPage",
        ""
    ],
    [
        "ext.inputBox.styles",
        ""
    ],
    [
        "ext.pygments",
        ""
    ],
    [
        "ext.pygments.linenumbers",
        ""
    ],
    [
        "ext.geshi.visualEditor",
        "",
        [
            440
        ]
    ],
    [
        "ext.flaggedRevs.basic",
        ""
    ],
    [
        "ext.flaggedRevs.advanced",
        "",
        [
            87
        ]
    ],
    [
        "ext.flaggedRevs.review",
        "",
        [
            85
        ]
    ],
    [
        "ext.flaggedRevs.icons",
        ""
    ],
    [
        "ext.categoryTree",
        "",
        [
            47
        ]
    ],
    [
        "ext.categoryTree.styles",
        ""
    ],
    [
        "ext.spamBlacklist.visualEditor",
        ""
    ],
    [
        "mediawiki.api.titleblacklist",
        "",
        [
            47
        ]
    ],
    [
        "ext.titleblacklist.visualEditor",
        ""
    ],
    [
        "mw.PopUpMediaTransform",
        "",
        [
            283,
            75,
            286
        ]
    ],
    [
        "mw.TMHGalleryHook.js",
        ""
    ],
    [
        "ext.tmh.embedPlayerIframe",
        "",
        [
            288,
            286
        ]
    ],
    [
        "mw.MediaWikiPlayerSupport",
        "",
        [
            286
        ]
    ],
    [
        "mw.MediaWikiPlayer.loader",
        "",
        [
            288
        ]
    ],
    [
        "ext.tmh.video-js",
        ""
    ],
    [
        "ext.tmh.videojs-ogvjs",
        "",
        [
            284,
            274
        ]
    ],
    [
        "ext.tmh.player",
        "",
        [
            283,
            279,
            75
        ]
    ],
    [
        "ext.tmh.player.dialog",
        "",
        [
            278,
            209
        ]
    ],
    [
        "ext.tmh.player.inline",
        "",
        [
            274,
            75
        ]
    ],
    [
        "ext.tmh.player.styles",
        ""
    ],
    [
        "ext.tmh.thumbnail.styles",
        ""
    ],
    [
        "ext.tmh.transcodetable",
        "",
        [
            47,
            200
        ]
    ],
    [
        "ext.tmh.timedtextpage.styles",
        ""
    ],
    [
        "ext.tmh.OgvJsSupport",
        ""
    ],
    [
        "ext.tmh.OgvJs",
        "",
        [
            283
        ]
    ],
    [
        "embedPlayerIframeStyle",
        ""
    ],
    [
        "mw.MwEmbedSupport",
        "",
        [
            87
        ]
    ],
    [
        "mediawiki.UtilitiesTime",
        ""
    ],
    [
        "jquery.embedPlayer",
        ""
    ],
    [
        "mw.EmbedPlayer",
        "",
        [
            283,
            20,
            24,
            36,
            84,
            287,
            113,
            291,
            286
        ]
    ],
    [
        "mw.EmbedPlayerKplayer",
        ""
    ],
    [
        "mw.EmbedPlayerNative",
        ""
    ],
    [
        "mw.EmbedPlayerVLCApp",
        "",
        [
            84
        ]
    ],
    [
        "mw.EmbedPlayerIEWebMPrompt",
        ""
    ],
    [
        "mw.EmbedPlayerOgvJs",
        "",
        [
            283,
            28
        ]
    ],
    [
        "mw.EmbedPlayerImageOverlay",
        ""
    ],
    [
        "mw.TimedText",
        "",
        [
            115,
            289
        ]
    ],
    [
        "ext.urlShortener.special",
        "",
        [
            84,
            61,
            171,
            200
        ]
    ],
    [
        "ext.urlShortener.toolbar",
        "",
        [
            47
        ]
    ],
    [
        "ext.securepoll.htmlform",
        "",
        [
            28,
            188
        ]
    ],
    [
        "ext.securepoll",
        ""
    ],
    [
        "ext.securepoll.special",
        ""
    ],
    [
        "ext.score.visualEditor",
        "",
        [
            303,
            440
        ]
    ],
    [
        "ext.score.visualEditor.icons",
        ""
    ],
    [
        "ext.score.popup",
        "",
        [
            47
        ]
    ],
    [
        "ext.score.errors",
        ""
    ],
    [
        "ext.cirrus.serp",
        "",
        [
            84,
            198
        ]
    ],
    [
        "ext.cirrus.explore-similar",
        "",
        [
            47,
            45
        ]
    ],
    [
        "ext.nuke.confirm",
        "",
        [
            113
        ]
    ],
    [
        "ext.confirmEdit.editPreview.ipwhitelist.styles",
        ""
    ],
    [
        "ext.confirmEdit.visualEditor",
        "",
        [
            860
        ]
    ],
    [
        "ext.confirmEdit.simpleCaptcha",
        ""
    ],
    [
        "ext.confirmEdit.fancyCaptcha.styles",
        ""
    ],
    [
        "ext.confirmEdit.fancyCaptcha",
        "",
        [
            47
        ]
    ],
    [
        "ext.confirmEdit.fancyCaptchaMobile",
        "",
        [
            495
        ]
    ],
    [
        "ext.centralauth",
        "",
        [
            28,
            87
        ]
    ],
    [
        "ext.centralauth.centralautologin",
        "",
        [
            113
        ]
    ],
    [
        "ext.centralauth.centralautologin.clearcookie",
        ""
    ],
    [
        "ext.centralauth.misc.styles",
        ""
    ],
    [
        "ext.centralauth.globaluserautocomplete",
        "",
        [
            30,
            47
        ]
    ],
    [
        "ext.centralauth.globalrenameuser",
        "",
        [
            87
        ]
    ],
    [
        "ext.centralauth.ForeignApi",
        "",
        [
            57
        ]
    ],
    [
        "ext.widgets.GlobalUserInputWidget",
        "",
        [
            47,
            204
        ]
    ],
    [
        "ext.GlobalUserPage",
        ""
    ],
    [
        "ext.apifeatureusage",
        ""
    ],
    [
        "ext.dismissableSiteNotice",
        "",
        [
            20,
            87
        ]
    ],
    [
        "ext.dismissableSiteNotice.styles",
        ""
    ],
    [
        "ext.centralNotice.startUp",
        "",
        [
            329
        ]
    ],
    [
        "ext.centralNotice.geoIP",
        "",
        [
            20
        ]
    ],
    [
        "ext.centralNotice.choiceData",
        "",
        [
            333
        ]
    ],
    [
        "ext.centralNotice.display",
        "",
        [
            328,
            331,
            588,
            84,
            74
        ]
    ],
    [
        "ext.centralNotice.kvStore",
        ""
    ],
    [
        "ext.centralNotice.bannerHistoryLogger",
        "",
        [
            330
        ]
    ],
    [
        "ext.centralNotice.impressionDiet",
        "",
        [
            330
        ]
    ],
    [
        "ext.centralNotice.largeBannerLimit",
        "",
        [
            330
        ]
    ],
    [
        "ext.centralNotice.legacySupport",
        "",
        [
            330
        ]
    ],
    [
        "ext.centralNotice.bannerSequence",
        "",
        [
            330
        ]
    ],
    [
        "ext.centralNotice.freegeoipLookup",
        "",
        [
            328
        ]
    ],
    [
        "ext.centralNotice.impressionEventsSampleRate",
        "",
        [
            330
        ]
    ],
    [
        "ext.centralNotice.cspViolationAlert",
        ""
    ],
    [
        "ext.wikimediamessages.contactpage.affcomchapthorg",
        ""
    ],
    [
        "ext.wikimediamessages.contactpage.affcomusergroup",
        ""
    ],
    [
        "mediawiki.special.block.feedback.request",
        ""
    ],
    [
        "ext.collection",
        "",
        [
            345,
            36,
            110
        ]
    ],
    [
        "ext.collection.bookcreator.styles",
        ""
    ],
    [
        "ext.collection.bookcreator",
        "",
        [
            344,
            74,
            87
        ]
    ],
    [
        "ext.collection.checkLoadFromLocalStorage",
        "",
        [
            343
        ]
    ],
    [
        "ext.collection.suggest",
        "",
        [
            345
        ]
    ],
    [
        "ext.collection.offline",
        ""
    ],
    [
        "ext.collection.bookcreator.messageBox",
        "",
        [
            351,
            350,
            59
        ]
    ],
    [
        "ext.collection.bookcreator.messageBox.styles",
        ""
    ],
    [
        "ext.collection.bookcreator.messageBox.icons",
        ""
    ],
    [
        "ext.ElectronPdfService.print.styles",
        ""
    ],
    [
        "ext.ElectronPdfService.special.styles",
        ""
    ],
    [
        "ext.ElectronPdfService.special.selectionImages",
        ""
    ],
    [
        "ext.advancedSearch.initialstyles",
        ""
    ],
    [
        "ext.advancedSearch.styles",
        ""
    ],
    [
        "ext.advancedSearch.searchtoken",
        "",
        [],
        1
    ],
    [
        "ext.advancedSearch.elements",
        "",
        [
            356,
            84,
            85,
            204,
            220,
            221
        ]
    ],
    [
        "ext.advancedSearch.init",
        "",
        [
            358,
            357
        ]
    ],
    [
        "ext.advancedSearch.SearchFieldUI",
        "",
        [
            75,
            204
        ]
    ],
    [
        "ext.abuseFilter",
        ""
    ],
    [
        "ext.abuseFilter.edit",
        "",
        [
            28,
            33,
            47,
            49,
            204
        ]
    ],
    [
        "ext.abuseFilter.tools",
        "",
        [
            28,
            47
        ]
    ],
    [
        "ext.abuseFilter.examine",
        "",
        [
            28,
            47
        ]
    ],
    [
        "ext.abuseFilter.ace",
        "",
        [
            568
        ]
    ],
    [
        "ext.abuseFilter.visualEditor",
        ""
    ],
    [
        "pdfhandler.messages",
        ""
    ],
    [
        "ext.wikiEditor",
        "",
        [
            33,
            36,
            116,
            85,
            171,
            215,
            216,
            217,
            218,
            219,
            223,
            44
        ],
        3
    ],
    [
        "ext.wikiEditor.styles",
        "",
        [],
        3
    ],
    [
        "ext.wikiEditor.images",
        ""
    ],
    [
        "ext.wikiEditor.realtimepreview",
        "",
        [
            368,
            370,
            123,
            220
        ]
    ],
    [
        "ext.CodeMirror",
        "",
        [
            373,
            33,
            36,
            85,
            219
        ]
    ],
    [
        "ext.CodeMirror.data",
        ""
    ],
    [
        "ext.CodeMirror.lib",
        ""
    ],
    [
        "ext.CodeMirror.addons",
        "",
        [
            374
        ]
    ],
    [
        "ext.CodeMirror.mode.mediawiki",
        "",
        [
            374
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.css",
        "",
        [
            374
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.javascript",
        "",
        [
            374
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.xml",
        "",
        [
            374
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.htmlmixed",
        "",
        [
            377,
            378,
            379
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.clike",
        "",
        [
            374
        ]
    ],
    [
        "ext.CodeMirror.lib.mode.php",
        "",
        [
            381,
            380
        ]
    ],
    [
        "ext.CodeMirror.visualEditor.init",
        ""
    ],
    [
        "ext.CodeMirror.visualEditor",
        "",
        [
            440
        ]
    ],
    [
        "ext.MassMessage.styles",
        ""
    ],
    [
        "ext.MassMessage.special.js",
        "",
        [
            26,
            34,
            36,
            113
        ]
    ],
    [
        "ext.MassMessage.content.js",
        "",
        [
            19,
            36,
            47
        ]
    ],
    [
        "ext.MassMessage.create",
        "",
        [
            36,
            61,
            113
        ]
    ],
    [
        "ext.MassMessage.edit",
        "",
        [
            176,
            200
        ]
    ],
    [
        "ext.betaFeatures",
        "",
        [
            17,
            201
        ]
    ],
    [
        "ext.betaFeatures.styles",
        ""
    ],
    [
        "mmv",
        "",
        [
            18,
            22,
            35,
            84,
            397
        ]
    ],
    [
        "mmv.ui.ondemandshareddependencies",
        "",
        [
            392,
            200
        ]
    ],
    [
        "mmv.ui.download.pane",
        "",
        [
            164,
            171,
            393
        ]
    ],
    [
        "mmv.ui.reuse.shareembed",
        "",
        [
            171,
            393
        ]
    ],
    [
        "mmv.ui.tipsyDialog",
        "",
        [
            392
        ]
    ],
    [
        "mmv.bootstrap",
        "",
        [
            168,
            170,
            399,
            199
        ]
    ],
    [
        "mmv.bootstrap.autostart",
        "",
        [
            397
        ]
    ],
    [
        "mmv.head",
        "",
        [
            74,
            85
        ]
    ],
    [
        "ext.popups.icons",
        ""
    ],
    [
        "ext.popups.images",
        ""
    ],
    [
        "ext.popups",
        ""
    ],
    [
        "ext.popups.main",
        "",
        [
            400,
            401,
            84,
            91,
            74,
            168,
            165,
            170,
            85
        ]
    ],
    [
        "ext.linter.edit",
        "",
        [
            33
        ]
    ],
    [
        "socket.io",
        ""
    ],
    [
        "dompurify",
        ""
    ],
    [
        "color-picker",
        ""
    ],
    [
        "unicodejs",
        ""
    ],
    [
        "papaparse",
        ""
    ],
    [
        "rangefix",
        ""
    ],
    [
        "spark-md5",
        ""
    ],
    [
        "ext.visualEditor.supportCheck",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.sanitize",
        "",
        [
            406,
            429
        ],
        4
    ],
    [
        "ext.visualEditor.progressBarWidget",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.tempWikitextEditorWidget",
        "",
        [
            92,
            85
        ],
        4
    ],
    [
        "ext.visualEditor.desktopArticleTarget.init",
        "",
        [
            414,
            412,
            415,
            426,
            33,
            84,
            121,
            74
        ],
        4
    ],
    [
        "ext.visualEditor.desktopArticleTarget.noscript",
        ""
    ],
    [
        "ext.visualEditor.targetLoader",
        "",
        [
            428,
            426,
            33,
            84,
            74,
            85
        ],
        4
    ],
    [
        "ext.visualEditor.desktopTarget",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.desktopArticleTarget",
        "",
        [
            432,
            437,
            419,
            442
        ],
        4
    ],
    [
        "ext.visualEditor.collabTarget",
        "",
        [
            430,
            436,
            92,
            171,
            220,
            221
        ],
        4
    ],
    [
        "ext.visualEditor.collabTarget.desktop",
        "",
        [
            421,
            437,
            419,
            442
        ],
        4
    ],
    [
        "ext.visualEditor.collabTarget.init",
        "",
        [
            412,
            171,
            200
        ],
        4
    ],
    [
        "ext.visualEditor.collabTarget.init.styles",
        ""
    ],
    [
        "ext.visualEditor.ve",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.track",
        "",
        [
            425
        ],
        4
    ],
    [
        "ext.visualEditor.core.utils",
        "",
        [
            426,
            200
        ],
        4
    ],
    [
        "ext.visualEditor.core.utils.parsing",
        "",
        [
            425
        ],
        4
    ],
    [
        "ext.visualEditor.base",
        "",
        [
            427,
            428,
            408
        ],
        4
    ],
    [
        "ext.visualEditor.mediawiki",
        "",
        [
            429,
            418,
            31,
            615
        ],
        4
    ],
    [
        "ext.visualEditor.mwsave",
        "",
        [
            440,
            26,
            28,
            52,
            220
        ],
        4
    ],
    [
        "ext.visualEditor.articleTarget",
        "",
        [
            441,
            431,
            173
        ],
        4
    ],
    [
        "ext.visualEditor.data",
        "",
        [
            430
        ]
    ],
    [
        "ext.visualEditor.core",
        "",
        [
            413,
            412,
            17,
            409,
            410,
            411
        ],
        4
    ],
    [
        "ext.visualEditor.commentAnnotation",
        "",
        [
            434
        ],
        4
    ],
    [
        "ext.visualEditor.rebase",
        "",
        [
            407,
            451,
            435,
            226,
            405
        ],
        4
    ],
    [
        "ext.visualEditor.core.desktop",
        "",
        [
            434
        ],
        4
    ],
    [
        "ext.visualEditor.welcome",
        "",
        [
            200
        ],
        4
    ],
    [
        "ext.visualEditor.switching",
        "",
        [
            47,
            200,
            212,
            215,
            217
        ],
        4
    ],
    [
        "ext.visualEditor.mwcore",
        "",
        [
            452,
            430,
            439,
            438,
            128,
            72,
            10,
            171
        ],
        4
    ],
    [
        "ext.visualEditor.mwextensions",
        "",
        [
            433,
            463,
            456,
            458,
            443,
            460,
            445,
            457,
            446,
            448
        ],
        4
    ],
    [
        "ext.visualEditor.mwextensions.desktop",
        "",
        [
            441,
            447,
            81
        ],
        4
    ],
    [
        "ext.visualEditor.mwformatting",
        "",
        [
            440
        ],
        4
    ],
    [
        "ext.visualEditor.mwimage.core",
        "",
        [
            440
        ],
        4
    ],
    [
        "ext.visualEditor.mwimage",
        "",
        [
            444,
            185,
            37,
            223,
            227
        ],
        4
    ],
    [
        "ext.visualEditor.mwlink",
        "",
        [
            440
        ],
        4
    ],
    [
        "ext.visualEditor.mwmeta",
        "",
        [
            446,
            106
        ],
        4
    ],
    [
        "ext.visualEditor.mwtransclusion",
        "",
        [
            440,
            188
        ],
        4
    ],
    [
        "treeDiffer",
        ""
    ],
    [
        "diffMatchPatch",
        ""
    ],
    [
        "ext.visualEditor.checkList",
        "",
        [
            434
        ],
        4
    ],
    [
        "ext.visualEditor.diffing",
        "",
        [
            450,
            434,
            449
        ],
        4
    ],
    [
        "ext.visualEditor.diffPage.init.styles",
        ""
    ],
    [
        "ext.visualEditor.diffLoader",
        "",
        [
            418
        ],
        4
    ],
    [
        "ext.visualEditor.diffPage.init",
        "",
        [
            454,
            200,
            212,
            215
        ],
        4
    ],
    [
        "ext.visualEditor.language",
        "",
        [
            434,
            615,
            115
        ],
        4
    ],
    [
        "ext.visualEditor.mwlanguage",
        "",
        [
            434
        ],
        4
    ],
    [
        "ext.visualEditor.mwalienextension",
        "",
        [
            440
        ],
        4
    ],
    [
        "ext.visualEditor.mwwikitext",
        "",
        [
            446,
            92
        ],
        4
    ],
    [
        "ext.visualEditor.mwgallery",
        "",
        [
            440,
            119,
            185,
            223
        ],
        4
    ],
    [
        "ext.visualEditor.mwsignature",
        "",
        [
            448
        ],
        4
    ],
    [
        "ext.visualEditor.experimental",
        "",
        [],
        4
    ],
    [
        "ext.visualEditor.icons",
        "",
        [
            464,
            465,
            213,
            214,
            215,
            217,
            218,
            219,
            220,
            221,
            224,
            225,
            226,
            211
        ],
        4
    ],
    [
        "ext.visualEditor.moduleIcons",
        ""
    ],
    [
        "ext.visualEditor.moduleIndicators",
        ""
    ],
    [
        "ext.citoid.visualEditor",
        "",
        [
            253,
            467
        ]
    ],
    [
        "ext.citoid.visualEditor.data",
        "",
        [
            430
        ]
    ],
    [
        "ext.citoid.wikibase.init",
        ""
    ],
    [
        "ext.citoid.wikibase",
        "",
        [
            468,
            36,
            200
        ]
    ],
    [
        "ext.templateData",
        ""
    ],
    [
        "ext.templateDataGenerator.editPage",
        ""
    ],
    [
        "ext.templateDataGenerator.data",
        "",
        [
            197
        ]
    ],
    [
        "ext.templateDataGenerator.editTemplatePage",
        "",
        [
            470,
            474,
            472,
            33,
            615,
            47,
            204,
            209,
            220,
            221,
            224
        ]
    ],
    [
        "ext.templateData.images",
        ""
    ],
    [
        "ext.TemplateWizard",
        "",
        [
            33,
            171,
            174,
            188,
            207,
            209,
            220
        ]
    ],
    [
        "mediawiki.libs.guiders",
        ""
    ],
    [
        "ext.guidedTour.styles",
        "",
        [
            476,
            168
        ]
    ],
    [
        "ext.guidedTour.lib.internal",
        "",
        [
            87
        ]
    ],
    [
        "ext.guidedTour.lib",
        "",
        [
            588,
            478,
            477
        ]
    ],
    [
        "ext.guidedTour.launcher",
        ""
    ],
    [
        "ext.guidedTour",
        "",
        [
            479
        ]
    ],
    [
        "ext.guidedTour.tour.firstedit",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.test",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.onshow",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.uprightdownleft",
        "",
        [
            481
        ]
    ],
    [
        "mobile.pagelist.styles",
        ""
    ],
    [
        "mobile.pagesummary.styles",
        ""
    ],
    [
        "mobile.placeholder.images",
        ""
    ],
    [
        "mobile.userpage.styles",
        ""
    ],
    [
        "mobile.startup.images",
        ""
    ],
    [
        "mobile.init.styles",
        ""
    ],
    [
        "mobile.init",
        "",
        [
            84,
            495
        ]
    ],
    [
        "mobile.ooui.icons",
        ""
    ],
    [
        "mobile.user.icons",
        ""
    ],
    [
        "mobile.startup",
        "",
        [
            122,
            198,
            74,
            45,
            168,
            170,
            85,
            493,
            486,
            487,
            488,
            490
        ]
    ],
    [
        "mobile.editor.overlay",
        "",
        [
            49,
            92,
            66,
            169,
            173,
            497,
            495,
            494,
            200,
            217
        ]
    ],
    [
        "mobile.editor.images",
        ""
    ],
    [
        "mobile.talk.overlays",
        "",
        [
            167,
            496
        ]
    ],
    [
        "mobile.mediaViewer",
        "",
        [
            495
        ]
    ],
    [
        "mobile.languages.structured",
        "",
        [
            495
        ]
    ],
    [
        "mobile.special.mobileoptions.styles",
        ""
    ],
    [
        "mobile.special.mobileoptions.scripts",
        "",
        [
            495
        ]
    ],
    [
        "mobile.special.nearby.styles",
        ""
    ],
    [
        "mobile.special.userlogin.scripts",
        ""
    ],
    [
        "mobile.special.nearby.scripts",
        "",
        [
            84,
            503,
            495
        ]
    ],
    [
        "mobile.special.mobilediff.images",
        ""
    ],
    [
        "skins.minerva.base.styles",
        ""
    ],
    [
        "skins.minerva.content.styles.images",
        ""
    ],
    [
        "skins.minerva.icons.loggedin",
        ""
    ],
    [
        "skins.minerva.amc.styles",
        ""
    ],
    [
        "skins.minerva.overflow.icons",
        ""
    ],
    [
        "skins.minerva.icons.wikimedia",
        ""
    ],
    [
        "skins.minerva.icons.images.scripts.misc",
        ""
    ],
    [
        "skins.minerva.icons.page.issues.uncolored",
        ""
    ],
    [
        "skins.minerva.icons.page.issues.default.color",
        ""
    ],
    [
        "skins.minerva.icons.page.issues.medium.color",
        ""
    ],
    [
        "skins.minerva.mainPage.styles",
        ""
    ],
    [
        "skins.minerva.userpage.styles",
        ""
    ],
    [
        "skins.minerva.talk.styles",
        ""
    ],
    [
        "skins.minerva.personalMenu.icons",
        ""
    ],
    [
        "skins.minerva.mainMenu.advanced.icons",
        ""
    ],
    [
        "skins.minerva.mainMenu.icons",
        ""
    ],
    [
        "skins.minerva.mainMenu.styles",
        ""
    ],
    [
        "skins.minerva.loggedin.styles",
        ""
    ],
    [
        "skins.minerva.scripts",
        "",
        [
            84,
            91,
            167,
            495,
            513,
            515,
            516,
            514,
            522,
            523,
            526
        ]
    ],
    [
        "skins.minerva.messageBox.styles",
        ""
    ],
    [
        "skins.minerva.categories.styles",
        ""
    ],
    [
        "ext.math.styles",
        ""
    ],
    [
        "ext.math.scripts",
        ""
    ],
    [
        "mw.widgets.MathWbEntitySelector",
        "",
        [
            56,
            171,
            751,
            209
        ]
    ],
    [
        "ext.math.visualEditor",
        "",
        [
            528,
            440
        ]
    ],
    [
        "ext.math.visualEditor.mathSymbolsData",
        "",
        [
            531
        ]
    ],
    [
        "ext.math.visualEditor.mathSymbols",
        "",
        [
            532
        ]
    ],
    [
        "ext.math.visualEditor.chemSymbolsData",
        "",
        [
            531
        ]
    ],
    [
        "ext.math.visualEditor.chemSymbols",
        "",
        [
            534
        ]
    ],
    [
        "ext.babel",
        ""
    ],
    [
        "ext.vipsscaler",
        "",
        [
            538
        ]
    ],
    [
        "jquery.ucompare",
        ""
    ],
    [
        "ext.interwiki.specialpage",
        ""
    ],
    [
        "ext.echo.logger",
        "",
        [
            85,
            197
        ]
    ],
    [
        "ext.echo.ui.desktop",
        "",
        [
            547,
            542
        ]
    ],
    [
        "ext.echo.ui",
        "",
        [
            543,
            540,
            756,
            204,
            213,
            214,
            220,
            224,
            225,
            226
        ]
    ],
    [
        "ext.echo.dm",
        "",
        [
            546,
            37
        ]
    ],
    [
        "ext.echo.api",
        "",
        [
            56
        ]
    ],
    [
        "ext.echo.mobile",
        "",
        [
            542,
            198,
            45
        ]
    ],
    [
        "ext.echo.init",
        "",
        [
            544
        ]
    ],
    [
        "ext.echo.styles.badge",
        ""
    ],
    [
        "ext.echo.styles.notifications",
        ""
    ],
    [
        "ext.echo.styles.alert",
        ""
    ],
    [
        "ext.echo.special",
        "",
        [
            551,
            542
        ]
    ],
    [
        "ext.echo.styles.special",
        ""
    ],
    [
        "ext.thanks.images",
        ""
    ],
    [
        "ext.thanks",
        "",
        [
            47,
            90
        ]
    ],
    [
        "ext.thanks.corethank",
        "",
        [
            553,
            19,
            209
        ]
    ],
    [
        "ext.thanks.mobilediff",
        "",
        [
            552,
            495
        ]
    ],
    [
        "ext.thanks.flowthank",
        "",
        [
            553,
            209
        ]
    ],
    [
        "ext.disambiguator",
        "!",
        [
            47,
            66
        ]
    ],
    [
        "ext.disambiguator.visualEditor",
        "",
        [
            447
        ]
    ],
    [
        "ext.discussionTools.init.styles",
        ""
    ],
    [
        "ext.discussionTools.init",
        "",
        [
            559,
            428,
            74,
            85,
            37,
            209,
            410,
            14
        ]
    ],
    [
        "ext.discussionTools.debug",
        "",
        [
            560
        ]
    ],
    [
        "ext.discussionTools.ReplyWidget",
        "",
        [
            860,
            560,
            173,
            176,
            204
        ]
    ],
    [
        "ext.discussionTools.ReplyWidgetPlain",
        "",
        [
            562,
            439,
            92
        ]
    ],
    [
        "ext.discussionTools.ReplyWidgetVisual",
        "",
        [
            562,
            432,
            461,
            459
        ]
    ],
    [
        "ext.codeEditor",
        "",
        [
            566
        ],
        3
    ],
    [
        "jquery.codeEditor",
        "",
        [
            568,
            567,
            368,
            209
        ],
        3
    ],
    [
        "ext.codeEditor.icons",
        ""
    ],
    [
        "ext.codeEditor.ace",
        "",
        [],
        5
    ],
    [
        "ext.codeEditor.ace.modes",
        "",
        [
            568
        ],
        5
    ],
    [
        "ext.scribunto.errors",
        "",
        [
            36
        ]
    ],
    [
        "ext.scribunto.logs",
        ""
    ],
    [
        "ext.scribunto.edit",
        "",
        [
            28,
            47
        ]
    ],
    [
        "ext.relatedArticles.styles",
        ""
    ],
    [
        "ext.relatedArticles.readMore.bootstrap",
        "!",
        [
            84,
            85
        ]
    ],
    [
        "ext.relatedArticles.readMore",
        "!",
        [
            87,
            197
        ]
    ],
    [
        "ext.RevisionSlider.lazyCss",
        ""
    ],
    [
        "ext.RevisionSlider.lazyJs",
        "",
        [
            580,
            225
        ]
    ],
    [
        "ext.RevisionSlider.init",
        "",
        [
            580,
            581,
            224
        ]
    ],
    [
        "ext.RevisionSlider.noscript",
        ""
    ],
    [
        "ext.RevisionSlider.Settings",
        "",
        [
            74,
            85
        ]
    ],
    [
        "ext.RevisionSlider.Slider",
        "",
        [
            582,
            36,
            84,
            37,
            200,
            220,
            225
        ]
    ],
    [
        "ext.RevisionSlider.dialogImages",
        ""
    ],
    [
        "ext.TwoColConflict.SplitJs",
        "",
        [
            585,
            586,
            72,
            74,
            85,
            200,
            220
        ]
    ],
    [
        "ext.TwoColConflict.SplitCss",
        ""
    ],
    [
        "ext.TwoColConflict.Split.TourImages",
        ""
    ],
    [
        "ext.TwoColConflict.Util",
        ""
    ],
    [
        "ext.TwoColConflict.JSCheck",
        ""
    ],
    [
        "ext.eventLogging",
        "",
        [
            85
        ]
    ],
    [
        "ext.eventLogging.debug",
        ""
    ],
    [
        "ext.eventLogging.jsonSchema",
        ""
    ],
    [
        "ext.eventLogging.jsonSchema.styles",
        ""
    ],
    [
        "ext.wikimediaEvents",
        "",
        [
            588,
            84,
            91,
            74,
            93
        ]
    ],
    [
        "ext.wikimediaEvents.wikibase",
        "",
        [
            588,
            91
        ]
    ],
    [
        "ext.navigationTiming",
        "",
        [
            588
        ]
    ],
    [
        "ext.uls.common",
        "",
        [
            615,
            74,
            85
        ]
    ],
    [
        "ext.uls.compactlinks",
        "",
        [
            595,
            168
        ]
    ],
    [
        "ext.uls.ime",
        "",
        [
            605,
            613
        ]
    ],
    [
        "ext.uls.displaysettings",
        "",
        [
            597,
            604,
            165,
            166
        ]
    ],
    [
        "ext.uls.geoclient",
        "",
        [
            90
        ]
    ],
    [
        "ext.uls.i18n",
        "",
        [
            25,
            87
        ]
    ],
    [
        "ext.uls.interface",
        "",
        [
            611,
            204,
            220
        ]
    ],
    [
        "ext.uls.interlanguage",
        ""
    ],
    [
        "ext.uls.languagenames",
        ""
    ],
    [
        "ext.uls.languagesettings",
        "",
        [
            606,
            607,
            616,
            168
        ]
    ],
    [
        "ext.uls.mediawiki",
        "",
        [
            595,
            603,
            606,
            611,
            614
        ]
    ],
    [
        "ext.uls.messages",
        "",
        [
            600
        ]
    ],
    [
        "ext.uls.preferences",
        "",
        [
            74,
            85
        ]
    ],
    [
        "ext.uls.preferencespage",
        ""
    ],
    [
        "ext.uls.pt",
        ""
    ],
    [
        "ext.uls.setlang",
        "",
        [
            84,
            47,
            168
        ]
    ],
    [
        "ext.uls.webfonts",
        "",
        [
            607
        ]
    ],
    [
        "ext.uls.webfonts.repository",
        ""
    ],
    [
        "jquery.ime",
        ""
    ],
    [
        "jquery.uls",
        "",
        [
            25,
            615,
            616
        ]
    ],
    [
        "jquery.uls.data",
        ""
    ],
    [
        "jquery.uls.grid",
        ""
    ],
    [
        "rangy.core",
        ""
    ],
    [
        "ext.cx.contributions",
        "",
        [
            87,
            201,
            214,
            215
        ]
    ],
    [
        "ext.cx.model",
        ""
    ],
    [
        "ext.cx.icons",
        ""
    ],
    [
        "ext.cx.dashboard",
        "",
        [
            639,
            30,
            171,
            37,
            624,
            649,
            625,
            215,
            217,
            223,
            224
        ]
    ],
    [
        "sx.publishing.followup",
        "",
        [
            624,
            623,
            38
        ]
    ],
    [
        "mw.cx.util",
        "",
        [
            619,
            85
        ]
    ],
    [
        "mw.cx.SiteMapper",
        "",
        [
            619,
            56,
            85
        ]
    ],
    [
        "mw.cx.ui.LanguageFilter",
        "",
        [
            605,
            168,
            643,
            623,
            220
        ]
    ],
    [
        "ext.cx.wikibase.link",
        ""
    ],
    [
        "ext.cx.eventlogging.campaigns",
        "",
        [
            85
        ]
    ],
    [
        "ext.cx.interlanguagelink.init",
        "",
        [
            595
        ]
    ],
    [
        "ext.cx.interlanguagelink",
        "",
        [
            595,
            624,
            204,
            220
        ]
    ],
    [
        "ext.cx.translation.conflict",
        "",
        [
            113
        ]
    ],
    [
        "ext.cx.stats",
        "",
        [
            632,
            640,
            639,
            615,
            37,
            624
        ]
    ],
    [
        "chart.js",
        ""
    ],
    [
        "ext.cx.entrypoints.newarticle",
        "",
        [
            640,
            113,
            168,
            201
        ]
    ],
    [
        "ext.cx.entrypoints.newarticle.veloader",
        ""
    ],
    [
        "ext.cx.entrypoints.ulsrelevantlanguages",
        "",
        [
            595,
            624,
            38
        ]
    ],
    [
        "ext.cx.entrypoints.newbytranslation",
        "",
        [
            624,
            623,
            204,
            214,
            220
        ]
    ],
    [
        "ext.cx.betafeature.init",
        ""
    ],
    [
        "ext.cx.entrypoints.contributionsmenu",
        "",
        [
            620,
            640,
            113,
            170
        ]
    ],
    [
        "ext.cx.widgets.spinner",
        "",
        [
            619
        ]
    ],
    [
        "ext.cx.widgets.callout",
        ""
    ],
    [
        "mw.cx.dm",
        "",
        [
            619,
            197
        ]
    ],
    [
        "mw.cx.dm.Translation",
        "",
        [
            641
        ]
    ],
    [
        "mw.cx.ui",
        "",
        [
            619,
            200
        ]
    ],
    [
        "mw.cx.visualEditor",
        "",
        [
            253,
            437,
            419,
            442,
            645,
            646
        ]
    ],
    [
        "ve.ce.CXLintableNode",
        "",
        [
            434
        ]
    ],
    [
        "ve.dm.CXLintableNode",
        "",
        [
            434,
            641
        ]
    ],
    [
        "mw.cx.init",
        "",
        [
            639,
            447,
            196,
            653,
            649,
            645,
            646,
            648
        ]
    ],
    [
        "ve.init.mw.CXTarget",
        "",
        [
            437,
            624,
            642,
            643,
            623
        ]
    ],
    [
        "mw.cx.ui.Infobar",
        "",
        [
            643,
            623,
            213,
            220
        ]
    ],
    [
        "mw.cx.ui.CaptchaDialog",
        "",
        [
            758,
            643
        ]
    ],
    [
        "mw.cx.ui.LoginDialog",
        "",
        [
            87,
            643
        ]
    ],
    [
        "mw.cx.tools.InstructionsTool",
        "",
        [
            113,
            653,
            45
        ]
    ],
    [
        "mw.cx.tools.TranslationTool",
        "",
        [
            643
        ]
    ],
    [
        "mw.cx.ui.FeatureDiscoveryWidget",
        "",
        [
            72,
            643
        ]
    ],
    [
        "mw.cx.skin",
        ""
    ],
    [
        "mw.externalguidance.init",
        "",
        [
            84
        ]
    ],
    [
        "mw.externalguidance",
        "",
        [
            56,
            495,
            658,
            217
        ]
    ],
    [
        "mw.externalguidance.icons",
        ""
    ],
    [
        "mw.externalguidance.special",
        "",
        [
            615,
            56,
            166,
            495,
            658
        ]
    ],
    [
        "wikibase.client.init",
        ""
    ],
    [
        "wikibase.client.miscStyles",
        ""
    ],
    [
        "wikibase.client.linkitem.init",
        "",
        [
            28
        ]
    ],
    [
        "jquery.wikibase.linkitem",
        "",
        [
            28,
            35,
            36,
            56,
            751,
            750,
            866
        ]
    ],
    [
        "wikibase.client.action.edit.collapsibleFooter",
        "",
        [
            27,
            64,
            74
        ]
    ],
    [
        "ext.wikimediaBadges",
        ""
    ],
    [
        "ext.TemplateSandbox.top",
        ""
    ],
    [
        "ext.TemplateSandbox",
        "",
        [
            666
        ]
    ],
    [
        "ext.TemplateSandbox.visualeditor",
        "",
        [
            171,
            200
        ]
    ],
    [
        "ext.jsonConfig",
        ""
    ],
    [
        "ext.jsonConfig.edit",
        "",
        [
            33,
            186,
            209
        ]
    ],
    [
        "ext.graph.styles",
        ""
    ],
    [
        "ext.graph.data",
        ""
    ],
    [
        "ext.graph.loader",
        "",
        [
            47
        ]
    ],
    [
        "ext.graph.vega1",
        "",
        [
            672,
            84
        ]
    ],
    [
        "ext.graph.vega2",
        "",
        [
            672,
            84
        ]
    ],
    [
        "ext.graph.sandbox",
        "",
        [
            565,
            675,
            49
        ]
    ],
    [
        "ext.graph.visualEditor",
        "",
        [
            672,
            444,
            186
        ]
    ],
    [
        "ext.MWOAuth.styles",
        ""
    ],
    [
        "ext.MWOAuth.AuthorizeDialog",
        "",
        [
            36
        ]
    ],
    [
        "ext.oath.totp.showqrcode",
        ""
    ],
    [
        "ext.oath.totp.showqrcode.styles",
        ""
    ],
    [
        "ext.webauthn.ui.base",
        "",
        [
            113,
            200
        ]
    ],
    [
        "ext.webauthn.register",
        "",
        [
            682,
            47
        ]
    ],
    [
        "ext.webauthn.login",
        "",
        [
            682
        ]
    ],
    [
        "ext.webauthn.manage",
        "",
        [
            682,
            47
        ]
    ],
    [
        "ext.webauthn.disable",
        "",
        [
            682
        ]
    ],
    [
        "ext.ores.highlighter",
        ""
    ],
    [
        "ext.ores.styles",
        ""
    ],
    [
        "ext.ores.api",
        ""
    ],
    [
        "ext.checkUser",
        "",
        [
            31,
            84,
            70,
            74,
            171,
            215,
            217,
            220,
            222,
            224,
            226
        ]
    ],
    [
        "ext.checkUser.styles",
        ""
    ],
    [
        "ext.guidedTour.tour.checkuserinvestigateform",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.checkuserinvestigate",
        "",
        [
            690,
            481
        ]
    ],
    [
        "ext.quicksurveys.lib",
        "",
        [
            588,
            28,
            84,
            91,
            74
        ]
    ],
    [
        "ext.quicksurveys.lib.vue",
        "",
        [
            694,
            41
        ]
    ],
    [
        "ext.quicksurveys.init",
        "",
        [
            694
        ]
    ],
    [
        "ext.kartographer",
        ""
    ],
    [
        "ext.kartographer.style",
        ""
    ],
    [
        "ext.kartographer.site",
        ""
    ],
    [
        "mapbox",
        ""
    ],
    [
        "leaflet.draw",
        "",
        [
            700
        ]
    ],
    [
        "ext.kartographer.link",
        "",
        [
            704,
            198
        ]
    ],
    [
        "ext.kartographer.box",
        "",
        [
            705,
            716,
            699,
            698,
            708,
            84,
            47,
            223
        ]
    ],
    [
        "ext.kartographer.linkbox",
        "",
        [
            708
        ]
    ],
    [
        "ext.kartographer.data",
        ""
    ],
    [
        "ext.kartographer.dialog",
        "",
        [
            700,
            198,
            204,
            209,
            220
        ]
    ],
    [
        "ext.kartographer.dialog.sidebar",
        "",
        [
            74,
            220,
            225
        ]
    ],
    [
        "ext.kartographer.util",
        "",
        [
            697
        ]
    ],
    [
        "ext.kartographer.frame",
        "",
        [
            703,
            198
        ]
    ],
    [
        "ext.kartographer.staticframe",
        "",
        [
            704,
            198,
            223
        ]
    ],
    [
        "ext.kartographer.preview",
        ""
    ],
    [
        "ext.kartographer.editing",
        "",
        [
            47
        ]
    ],
    [
        "ext.kartographer.editor",
        "",
        [
            703,
            701
        ]
    ],
    [
        "ext.kartographer.visualEditor",
        "",
        [
            708,
            440,
            222
        ]
    ],
    [
        "ext.kartographer.lib.prunecluster",
        "",
        [
            700
        ]
    ],
    [
        "ext.kartographer.lib.topojson",
        "",
        [
            700
        ]
    ],
    [
        "ext.kartographer.wv",
        "",
        [
            715,
            217
        ]
    ],
    [
        "ext.kartographer.specialMap",
        ""
    ],
    [
        "ext.pageviewinfo",
        "",
        [
            675,
            200
        ]
    ],
    [
        "ext.3d",
        "",
        [
            28
        ]
    ],
    [
        "ext.3d.styles",
        ""
    ],
    [
        "mmv.3d",
        "",
        [
            720,
            392
        ]
    ],
    [
        "mmv.3d.head",
        "",
        [
            720,
            201,
            212,
            214
        ]
    ],
    [
        "ext.3d.special.upload",
        "",
        [
            725,
            153
        ]
    ],
    [
        "ext.3d.special.upload.styles",
        ""
    ],
    [
        "ext.GlobalPreferences.global",
        "",
        [
            171,
            179,
            189
        ]
    ],
    [
        "ext.GlobalPreferences.global-nojs",
        ""
    ],
    [
        "ext.GlobalPreferences.local-nojs",
        ""
    ],
    [
        "ext.growthExperiments.mobileMenu.icons",
        ""
    ],
    [
        "ext.growthExperiments.SuggestedEditSession",
        "",
        [
            84,
            74,
            85,
            197
        ]
    ],
    [
        "ext.growthExperiments.HelpPanelCta.styles",
        ""
    ],
    [
        "ext.growthExperiments.HomepageDiscovery.styles",
        ""
    ],
    [
        "ext.growthExperiments.Homepage",
        "",
        [
            84,
            85,
            209
        ]
    ],
    [
        "ext.growthExperiments.Homepage.Mentorship",
        "",
        [
            740,
            730,
            198
        ]
    ],
    [
        "ext.growthExperiments.Homepage.SuggestedEdits",
        "",
        [
            730,
            72,
            198,
            204,
            209,
            214,
            217,
            223
        ]
    ],
    [
        "ext.growthExperiments.Homepage.styles",
        ""
    ],
    [
        "ext.growthExperiments.StructuredTask",
        "",
        [
            739,
            746,
            446,
            198,
            223,
            224,
            225
        ]
    ],
    [
        "ext.growthExperiments.StructuredTask.desktop",
        "",
        [
            737,
            420
        ]
    ],
    [
        "ext.growthExperiments.StructuredTask.PreEdit",
        "",
        [
            730,
            204,
            209
        ]
    ],
    [
        "ext.growthExperiments.Help",
        "",
        [
            746,
            84,
            74,
            85,
            204,
            209,
            213,
            215,
            216,
            217,
            220,
            226
        ]
    ],
    [
        "ext.growthExperiments.HelpPanel",
        "",
        [
            740,
            731,
            739,
            72,
            225
        ]
    ],
    [
        "ext.growthExperiments.HelpPanel.init",
        "",
        [
            730
        ]
    ],
    [
        "ext.growthExperiments.PostEdit",
        "",
        [
            730,
            746,
            209,
            223
        ]
    ],
    [
        "ext.growthExperiments.Account",
        "",
        [
            198,
            204
        ]
    ],
    [
        "ext.growthExperiments.Account.styles",
        ""
    ],
    [
        "ext.growthExperiments.icons",
        ""
    ],
    [
        "ext.growthExperiments.MentorDashboard",
        "",
        [
            746,
            188,
            209,
            216,
            217,
            220,
            223,
            224,
            225,
            226
        ]
    ],
    [
        "ext.growthExperiments.MentorDashboard.styles",
        ""
    ],
    [
        "ext.growthExperiments.MentorDashboard.Discovery",
        "",
        [
            72
        ]
    ],
    [
        "mw.config.values.wbSiteDetails",
        ""
    ],
    [
        "mw.config.values.wbRepo",
        ""
    ],
    [
        "ext.centralauth.globalrenamequeue",
        ""
    ],
    [
        "ext.centralauth.globalrenamequeue.styles",
        ""
    ],
    [
        "ext.guidedTour.tour.firsteditve",
        "",
        [
            481
        ]
    ],
    [
        "ext.echo.emailicons",
        ""
    ],
    [
        "ext.echo.secondaryicons",
        ""
    ],
    [
        "ext.wikimediaEvents.visualEditor",
        "",
        [
            418
        ]
    ],
    [
        "mw.cx.externalmessages",
        ""
    ],
    [
        "ext.quicksurveys.survey.perceived-performance-survey",
        "",
        [
            695
        ]
    ],
    [
        "ext.gadget.common-action-delete",
        "",
        [],
        2
    ],
    [
        "ext.gadget.common-action-edit",
        "",
        [
            5
        ],
        2
    ],
    [
        "ext.gadget.common-action-history",
        "",
        [],
        2
    ],
    [
        "ext.gadget.common-namespace-file",
        "",
        [],
        2
    ],
    [
        "ext.gadget.common-special-abusefilter",
        "",
        [],
        2
    ],
    [
        "ext.gadget.common-special-block",
        "",
        [
            0
        ],
        2
    ],
    [
        "ext.gadget.common-special-log",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.common-special-movepage",
        "",
        [],
        2
    ],
    [
        "ext.gadget.common-special-newpages",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.common-special-search",
        "",
        [
            0
        ],
        2
    ],
    [
        "ext.gadget.common-special-upload",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.common-special-watchlist-helperStyles",
        "",
        [],
        2
    ],
    [
        "ext.gadget.common-special-watchlist",
        "",
        [
            0,
            20
        ],
        2
    ],
    [
        "ext.gadget.libJQuery",
        "",
        [],
        2
    ],
    [
        "ext.gadget.SettingsManager",
        "",
        [
            85
        ],
        2
    ],
    [
        "ext.gadget.registerTool",
        "",
        [
            87,
            5
        ],
        2
    ],
    [
        "ext.gadget.BKL",
        "",
        [
            0
        ],
        2
    ],
    [
        "ext.gadget.collapserefs",
        "",
        [
            90,
            87
        ],
        2
    ],
    [
        "ext.gadget.directLinkToCommons",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.referenceTooltips",
        "",
        [
            17,
            90
        ],
        2
    ],
    [
        "ext.gadget.logo",
        "",
        [],
        2
    ],
    [
        "ext.gadget.edittop",
        "",
        [
            0,
            87
        ],
        2
    ],
    [
        "ext.gadget.blpEditNotice",
        "",
        [
            0,
            416
        ],
        2
    ],
    [
        "ext.gadget.wikibugs",
        "",
        [],
        2
    ],
    [
        "ext.gadget.sidebarRelated",
        "",
        [
            0
        ],
        2
    ],
    [
        "ext.gadget.navboxNavigation",
        "",
        [
            0,
            87
        ],
        2
    ],
    [
        "ext.gadget.preview",
        "",
        [
            47,
            52
        ],
        2
    ],
    [
        "ext.gadget.urldecoder",
        "",
        [
            775
        ],
        2
    ],
    [
        "ext.gadget.HotCat",
        "",
        [],
        2
    ],
    [
        "ext.gadget.refToolbar",
        "",
        [
            5,
            87
        ],
        2
    ],
    [
        "ext.gadget.ProveIt",
        "",
        [],
        2
    ],
    [
        "ext.gadget.Wikilinker",
        "",
        [
            775
        ],
        2
    ],
    [
        "ext.gadget.DotsSyntaxHighlighter",
        "",
        [
            17
        ],
        2
    ],
    [
        "ext.gadget.convenientDiscussions",
        "",
        [
            18,
            128,
            66,
            85,
            176,
            200,
            213,
            214,
            217,
            218,
            220,
            225
        ],
        2
    ],
    [
        "ext.gadget.refToolbarBase",
        "",
        [],
        2
    ],
    [
        "ext.gadget.wikificator",
        "",
        [
            775
        ],
        2
    ],
    [
        "ext.gadget.summaryButtons",
        "",
        [
            168,
            87
        ],
        2
    ],
    [
        "ext.gadget.newTopicOnTop",
        "",
        [
            33
        ],
        2
    ],
    [
        "ext.gadget.HighlightRedirects",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.HighlightUnpatrolledLinks",
        "",
        [],
        2
    ],
    [
        "ext.gadget.popups",
        "",
        [],
        2
    ],
    [
        "ext.gadget.addThisArticles",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.HideWikimediaNavigation",
        "",
        [],
        2
    ],
    [
        "ext.gadget.HideExternalLinks",
        "",
        [],
        2
    ],
    [
        "ext.gadget.OpaqueInfoboxReferences",
        "",
        [],
        2
    ],
    [
        "ext.gadget.shiftrefs",
        "",
        [],
        2
    ],
    [
        "ext.gadget.imgToggle",
        "",
        [],
        2
    ],
    [
        "ext.gadget.wdRedLinks",
        "",
        [
            56
        ],
        2
    ],
    [
        "ext.gadget.markadmins",
        "",
        [],
        2
    ],
    [
        "ext.gadget.markblocked",
        "",
        [
            47
        ],
        2
    ],
    [
        "ext.gadget.watchlist-helperStyles",
        "",
        [],
        2
    ],
    [
        "ext.gadget.watchlist",
        "",
        [
            47
        ],
        2
    ],
    [
        "ext.gadget.disableUpdatedMarker",
        "",
        [],
        2
    ],
    [
        "ext.gadget.OldDiff",
        "",
        [],
        2
    ],
    [
        "ext.gadget.HideFlaggedRevs",
        "",
        [],
        2
    ],
    [
        "ext.gadget.UTCLiveClock-helperStyles",
        "",
        [],
        2
    ],
    [
        "ext.gadget.UTCLiveClock",
        "",
        [
            0,
            47
        ],
        2
    ],
    [
        "ext.gadget.dropdown-menus",
        "",
        [
            47
        ],
        2
    ],
    [
        "ext.gadget.dropdown-menus-pagestyles",
        "",
        [],
        2
    ],
    [
        "ext.gadget.ajaxQuickDelete",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.addThisMain",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.DelKeepVis",
        "",
        [],
        2
    ],
    [
        "ext.gadget.hideSandboxLinkFromPersonalToolbar",
        "",
        [],
        2
    ],
    [
        "ext.gadget.osm",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.search-extraTooltips",
        "",
        [
            73
        ],
        2
    ],
    [
        "ext.gadget.wfTypos",
        "",
        [],
        2
    ],
    [
        "ext.gadget.wfTyposUpdate",
        "",
        [],
        2
    ],
    [
        "ext.gadget.wfIsbnLite",
        "",
        [],
        2
    ],
    [
        "ext.gadget.toReasonator",
        "",
        [],
        2
    ],
    [
        "ext.gadget.useWD",
        "",
        [],
        2
    ],
    [
        "ext.gadget.wikidataInfoboxExport",
        "",
        [
            56,
            204,
            209
        ],
        2
    ],
    [
        "ext.gadget.wefcore",
        "",
        [
            36,
            615,
            56
        ],
        2
    ],
    [
        "ext.gadget.wikidataHeaderLink",
        "",
        [
            87
        ],
        2
    ],
    [
        "ext.gadget.iwcore",
        "",
        [],
        2
    ],
    [
        "ext.gadget.iwhints",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwlocalnames",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.relatedIcons",
        "",
        [],
        2
    ],
    [
        "ext.gadget.iwen",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwde",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwfr",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwpl",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwit",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwes",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwpt",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwnl",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwhe",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwja",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwzh",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwuk",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwbe",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.iwrussia",
        "",
        [
            833
        ],
        2
    ],
    [
        "ext.gadget.qualityArticles",
        "",
        [
            36,
            47
        ],
        2
    ],
    [
        "ext.gadget.DYK",
        "",
        [],
        2
    ],
    [
        "ext.gadget.articleStats",
        "",
        [
            47
        ],
        2
    ],
    [
        "ext.gadget.iwrm",
        "",
        [],
        2
    ],
    [
        "ext.gadget.navboxFeaturedArticles",
        "",
        [
            0,
            56,
            27
        ],
        2
    ],
    [
        "ext.gadget.mobile-sidebar",
        "",
        [],
        2
    ],
    [
        "ext.gadget.yandex-tts",
        "",
        [],
        2
    ],
    [
        "ext.gadget.yandex-speechrecognition",
        "",
        [],
        2
    ],
    [
        "ext.gadget.GeoBox",
        "",
        [],
        2
    ],
    [
        "ext.confirmEdit.CaptchaInputWidget",
        "",
        [
            201
        ]
    ],
    [
        "ext.globalCssJs.user",
        "",
        [],
        0,
        "metawiki"
    ],
    [
        "ext.globalCssJs.user.styles",
        "",
        [],
        0,
        "metawiki"
    ],
    [
        "ext.guidedTour.tour.RcFiltersIntro",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.WlFiltersIntro",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.RcFiltersHighlight",
        "",
        [
            481
        ]
    ],
    [
        "wikibase.Site",
        "",
        [
            605
        ]
    ],
    [
        "ext.guidedTour.tour.helppanel",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.homepage_mentor",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.homepage_welcome",
        "",
        [
            481
        ]
    ],
    [
        "ext.guidedTour.tour.homepage_discovery",
        "",
        [
            481
        ]
    ],
    [
        "mediawiki.messagePoster",
        "",
        [
            56
        ]
    ]
]);

		// First set page-specific config needed by mw.loader (wgCSPNonce, wgUserName)
		mw.config.set( window.RLCONF || {} );
		mw.loader.state( window.RLSTATE || {} );
		mw.loader.load( window.RLPAGEMODULES || [] );

		// Process RLQ callbacks
		//
		// The code in these callbacks could've been exposed from load.php and
		// requested client-side. Instead, they are pushed by the server directly
		// (from ResourceLoaderClientHtml and other parts of MediaWiki). This
		// saves the need for additional round trips. It also allows load.php
		// to remain stateless and sending personal data in the HTML instead.
		//
		// The HTML inline script lazy-defines the 'RLQ' array. Now that we are
		// processing it, replace it with an implementation where 'push' actually
		// considers executing the code directly. This is to ensure any late
		// arrivals will also be processed. Late arrival can happen because
		// startup.js is executed asynchronously, concurrently with the streaming
		// response of the HTML.
		queue = window.RLQ || [];
		// Replace RLQ with an empty array, then process the things that were
		// in RLQ previously. We have to do this to avoid an infinite loop:
		// non-function items are added back to RLQ by the processing step.
		RLQ = [];
		RLQ.push = function ( fn ) {
			if ( typeof fn === 'function' ) {
				fn();
			} else {
				// If the first parameter is not a function, then it is an array
				// containing a list of required module names and a function.
				// Do an actual push for now, as this signature is handled
				// later by mediawiki.base.js.
				RLQ[ RLQ.length ] = fn;
			}
		};
		while ( queue[ 0 ] ) {
			// Process all values gathered so far
			RLQ.push( queue.shift() );
		}

		// Clear and disable the basic (Grade C) queue.
		NORLQ = {
			push: function () {}
		};
	}() );
}
mw.loader.state({
    "startup": "ready"
});