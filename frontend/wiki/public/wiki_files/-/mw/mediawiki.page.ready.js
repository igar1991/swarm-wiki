mw.loader.implement( "mediawiki.page.ready@", {
    "main": "ready.js",
    "files": {
    "ready.js": function ( require, module, exports ) {
var checkboxShift = require( './checkboxShift.js' );
var config = require( './config.json' );

// Break out of framesets
if ( mw.config.get( 'wgBreakFrames' ) ) {
	// Note: In IE < 9 strict comparison to window is non-standard (the standard didn't exist yet)
	// it works only comparing to window.self or window.window (https://stackoverflow.com/q/4850978/319266)
	if ( window.top !== window.self ) {
		// Un-trap us from framesets
		window.top.location.href = location.href;
	}
}

mw.hook( 'wikipage.content' ).add( function ( $content ) {
	var $sortable, $collapsible,
		dependencies = [];
	if ( config.collapsible ) {
		$collapsible = $content.find( '.mw-collapsible' );
		if ( $collapsible.length ) {
			dependencies.push( 'jquery.makeCollapsible' );
		}
	}
	if ( config.sortable ) {
		$sortable = $content.find( 'table.sortable' );
		if ( $sortable.length ) {
			dependencies.push( 'jquery.tablesorter' );
		}
	}
	if ( dependencies.length ) {
		// Both modules are preloaded by Skin::getDefaultModules()
		mw.loader.using( dependencies ).then( function () {
			// For tables that are both sortable and collapsible,
			// it must be made sortable first and collapsible second.
			// This is because jquery.tablesorter stumbles on the
			// elements inserted by jquery.makeCollapsible (T64878)
			if ( $sortable && $sortable.length ) {
				$sortable.tablesorter();
			}
			if ( $collapsible && $collapsible.length ) {
				$collapsible.makeCollapsible();
			}
		} );
	}

	checkboxShift( $content.find( 'input[type="checkbox"]:not(.noshiftselect)' ) );
} );

// Handle elements outside the wikipage content
$( function () {
	var $nodes;

	// Add accesskey hints to the tooltips
	$( '[accesskey]' ).updateTooltipAccessKeys();

	var node = document.querySelector( '.mw-indicators' );
	if ( node && node.children.length ) {
		/**
		 * Fired when indicators are being added to the DOM
		 *
		 * @event wikipage_indicators
		 * @member mw.hook
		 * @param {jQuery} $content jQuery object with the elements of the indicators
		 */
		mw.hook( 'wikipage.indicators' ).fire( $( node.children ) );
	}

	var $content = $( '#mw-content-text' );
	// Avoid unusable events, and the errors they cause, for custom skins that
	// do not display any content (T259577).
	if ( $content.length ) {
		/**
		 * Fired when wiki content is being added to the DOM
		 *
		 * It is encouraged to fire it before the main DOM is changed (when $content
		 * is still detached).  However, this order is not defined either way, so you
		 * should only rely on $content itself.
		 *
		 * This includes the ready event on a page load (including post-edit loads)
		 * and when content has been previewed with LivePreview.
		 *
		 * @event wikipage_content
		 * @member mw.hook
		 * @param {jQuery} $content The most appropriate element containing the content,
		 *   such as #mw-content-text (regular content root) or #wikiPreview (live preview
		 *   root)
		 */
		mw.hook( 'wikipage.content' ).fire( $content );
	}

	$nodes = $( '.catlinks[data-mw="interface"]' );
	if ( $nodes.length ) {
		/**
		 * Fired when categories are being added to the DOM
		 *
		 * It is encouraged to fire it before the main DOM is changed (when $content
		 * is still detached).  However, this order is not defined either way, so you
		 * should only rely on $content itself.
		 *
		 * This includes the ready event on a page load (including post-edit loads)
		 * and when content has been previewed with LivePreview.
		 *
		 * @event wikipage_categories
		 * @member mw.hook
		 * @param {jQuery} $content The most appropriate element containing the content,
		 *   such as .catlinks
		 */
		mw.hook( 'wikipage.categories' ).fire( $nodes );
	}

	$nodes = $( 'table.diff[data-mw="interface"]' );
	if ( $nodes.length ) {
		/**
		 * Fired when the diff is added to a page containing a diff
		 *
		 * Similar to the {@link mw.hook#event-wikipage_content wikipage.content hook}
		 * $diff may still be detached when the hook is fired.
		 *
		 * @event wikipage_diff
		 * @member mw.hook
		 * @param {jQuery} $diff The root element of the MediaWiki diff (`table.diff`).
		 */
		mw.hook( 'wikipage.diff' ).fire( $nodes.eq( 0 ) );
	}

	$( '#t-print a' ).on( 'click', function ( e ) {
		window.print();
		e.preventDefault();
	} );

	// Turn logout to a POST action
	$( config.selectorLogoutLink ).on( 'click', function ( e ) {
		var api = new mw.Api(),
			url = this.href;
		mw.notify(
			mw.message( 'logging-out-notify' ),
			{ tag: 'logout', autoHide: false }
		);
		api.postWithToken( 'csrf', {
			action: 'logout'
		} ).then(
			function () {
				location.href = url;
			},
			function ( err, data ) {
				mw.notify(
					api.getErrorMessage( data ),
					{ type: 'error', tag: 'logout', autoHide: false }
				);
			}
		);
		e.preventDefault();
	} );
} );

/**
 * @class mw.plugin.page.ready
 * @singleton
 */

/**
 * @private
 * @param {HTMLElement} element
 * @return {boolean} Whether the element is a search input.
 */
function isSearchInput( element ) {
	return element.id === 'searchInput' ||
		/(^|\s)mw-searchInput($|\s)/.test( element.className );
}

/**
 * Load a given module when a search input is focused.
 *
 * @param {string} moduleName Name of a module
 */
function loadSearchModule( moduleName ) {
	// T251544: Collect search performance metrics to compare Vue search with
	// mediawiki.searchSuggest performance. Marks and Measures will only be
	// recorded on the Vector skin.
	//
	// Vue search isn't loaded through this function so we are only collecting
	// legacy search performance metrics here.

	/* eslint-disable compat/compat */
	var shouldTestSearch = !!( moduleName === 'mediawiki.searchSuggest' &&
		mw.config.get( 'skin' ) === 'vector' &&
		window.performance &&
		performance.mark &&
		performance.measure &&
		performance.getEntriesByName ),
		loadStartMark = 'mwVectorLegacySearchLoadStart',
		loadEndMark = 'mwVectorLegacySearchLoadEnd';
	/* eslint-enable compat/compat */

	function requestSearchModule() {
		if ( shouldTestSearch ) {
			performance.mark( loadStartMark );
		}
		mw.loader.using( moduleName, function () {
			if ( shouldTestSearch && performance.getEntriesByName( loadStartMark ).length ) {
				performance.mark( loadEndMark );
				performance.measure( 'mwVectorLegacySearchLoadStartToLoadEnd', loadStartMark, loadEndMark );
			}
		} );
	}

	// Load the module once a search input is focussed.
	function eventListener( e ) {
		if ( isSearchInput( e.target ) ) {
			requestSearchModule();

			document.removeEventListener( 'focusin', eventListener );
		}
	}

	// Load the module now if the search input is already focused,
	// because the user started typing before the JavaScript arrived.
	if ( document.activeElement && isSearchInput( document.activeElement ) ) {
		requestSearchModule();
		return;
	}

	document.addEventListener( 'focusin', eventListener );
}

// Skins may decide to disable this behaviour or use an alternative module.
if ( config.search ) {
	loadSearchModule( 'mediawiki.searchSuggest' );
}

module.exports = {
	loadSearchModule: loadSearchModule,
	checkboxHack: require( './checkboxHack.js' )
};
},
    "checkboxShift.js": function ( require, module, exports ) {
/**
 * @private
 * @class mw.plugin.page.ready
 */
/**
 * Enable checkboxes to be checked or unchecked in a row by clicking one,
 * holding shift and clicking another one.
 *
 * @method checkboxShift
 * @param {jQuery} $box
 */
module.exports = function ( $box ) {
	var prev;
	// When our boxes are clicked..
	$box.on( 'click', function ( e ) {
		// And one has been clicked before...
		if ( prev && e.shiftKey ) {
			// Check or uncheck this one and all in-between checkboxes,
			// except for disabled ones
			$box
				.slice(
					Math.min( $box.index( prev ), $box.index( e.target ) ),
					Math.max( $box.index( prev ), $box.index( e.target ) ) + 1
				)
				.filter( function () {
					return !this.disabled;
				} )
				.prop( 'checked', e.target.checked );
		}
		// Either way, remember this as the last clicked one
		prev = e.target;
	} );
};
},
    "checkboxHack.js": function ( require, module, exports ) {
/*!
 * The checkbox hack works without JavaScript for graphical user-interface users, but relies on
 * enhancements to work well for screen reader users. This module provides required a11y
 * interactivity for updating the `aria-expanded` accessibility state, and optional enhancements
 * for avoiding the distracting focus ring when using a pointing device, and target dismissal on
 * focus loss or external click.
 *
 * The checkbox hack is a prevalent pattern in MediaWiki similar to disclosure widgets[0]. Although
 * dated and out-of-fashion, it's surprisingly flexible allowing for both `details` / `summary`-like
 * patterns, menu components, and more complex structures (to be used sparingly) where the toggle
 * button and target are in different parts of the Document without an enclosing element, so long as
 * they can be described as a sibling to the input. It's complicated and frequent enough to warrant
 * single implementation.
 *
 * In time, proper disclosure widgets should replace checkbox hacks. However, the second pattern has
 * no equivalent so the checkbox hack may have a continued use case for some time to come.
 *
 * When the abstraction is leaky, the underlying implementation is simpler than anything built to
 * hide it. Attempts to abstract the functionality for the second pattern failed so all related code
 * celebrates the implementation as directly as possible.
 *
 * All the code assumes that when the input is checked, the target is in an expanded state.
 *
 * Consider the disclosure widget pattern first mentioned:
 *
 * ```html
 * <details>                                              <!-- Container -->
 *     <summary>Click to expand navigation menu</summary> <!-- Button -->
 *     <ul>                                               <!-- Target -->
 *         <li>Main page</li>
 *         <li>Random article</li>
 *         <li>Donate to Wikipedia</li>
 *     </ul>
 * </details>
 * ```
 *
 * Which is represented verbosely by a checkbox hack as such:
 *
 * ```html
 * <div>                                                 <!-- Container -->
 *     <input                                            <!-- Visually hidden checkbox -->
 *         type="checkbox"
 *         id="sidebar-checkbox"
 *         class="mw-checkbox-hack-checkbox"
 *         {{#visible}}checked{{/visible}}
 *         role="button"
 *         aria-labelledby="sidebar-button"
 *         aria-expanded="true||false"
 *         aria-haspopup="true">                         <!-- Optional attribute -->
 *     <label                                            <!-- Button -->
 *         id="sidebar-button"
 *         class="mw-checkbox-hack-button"
 *         for="sidebar-checkbox"
 *         aria-hidden="true">
 *         Click to expand navigation menu
 *     </label>
 *     <ul id="sidebar" class="mw-checkbox-hack-target"> <!-- Target -->
 *         <li>Main page</li>
 *         <li>Random article</li>
 *         <li>Donate to Wikipedia</li>
 *     </ul>
 * </div>
 * ```
 *
 * Where the checkbox is the input, the label is the button, and the target is the unordered list.
 * `aria-haspopup` is an optional attribute that can be applied when dealing with popup elements (i.e. menus).
 *
 * Note that while the label acts as a button for visual users (i.e. it's usually styled as a button and is clicked),
 * the checkbox is what's actually interacted with for keyboard and screenreader users. Many of the HTML attributes
 * and JS enhancements serve to give the checkbox the behavior and semantics of a button.
 * For this reason any hover/focus/active state styles for the button should be applied based on the checkbox state
 * (i.e. https://github.com/wikimedia/mediawiki/blob/master/resources/src/mediawiki.ui.button/button.less#L90)
 *
 * Consider the disparate pattern:
 *
 * ```html
 * <!-- ... -->
 * <!-- The only requirement is that the button and target can be described as a sibling to the
 *      checkbox. -->
 * <input
 *     type="checkbox"
 *     id="sidebar-checkbox"
 *     class="mw-checkbox-hack-checkbox"
 *     {{#visible}}checked{{/visible}}
 *     role="button"
 *     aria-labelledby="sidebar-button"
 *     aria-expanded="true||false"
 *     aria-haspopup="true">
 * <!-- ... -->
 * <label
 *     id="sidebar-button"
 *     class="mw-checkbox-hack-button"
 *     for="sidebar-checkbox"
 *     aria-hidden="true">
 *     Toggle navigation menu
 * </label>
 * <!-- ... -->
 * <ul id="sidebar" class="mw-checkbox-hack-target">
 *     <li>Main page</li>
 *     <li>Random article</li>
 *     <li>Donate to Wikipedia</li>
 * </ul>
 * <!-- ... -->
 * ```
 *
 * Which is the same as the disclosure widget but without the enclosing container and the input only
 * needs to be a preceding sibling of the button and target. It's possible to bend the checkbox hack
 * further to allow the button and target to be at an arbitrary depth so long as a parent can be
 * described as a succeeding sibling of the input, but this requires a mixin implementation that
 * duplicates the rules for each relation selector.
 *
 * Exposed APIs should be considered stable. @ignore is used for JSDoc compatibility (see T138401).
 *
 * Accompanying checkbox hack styles are tracked in T252774.
 *
 * [0]: https://developer.mozilla.org/docs/Web/HTML/Element/details
 */

/**
 * Revise the button's `aria-expanded` state to match the checked state.
 *
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement} button
 * @return {void}
 * @ignore
 */
function updateAriaExpanded( checkbox, button ) {
	if ( button ) {
		mw.log.warn( '[1.38] The button parameter in updateAriaExpanded is deprecated, aria-expanded will be applied to the checkbox going forward. View the updated checkbox hack documentation for more details.' );
		button.setAttribute( 'aria-expanded', checkbox.checked.toString() );
		return;
	}

	checkbox.setAttribute( 'aria-expanded', checkbox.checked.toString() );
}

/**
 * Set the checked state and fire the 'input' event.
 * Programmatic changes to checkbox.checked do not trigger an input or change event.
 * The input event in turn will call updateAriaExpanded().
 *
 * setCheckedState() is called when a user event on some element other than the checkbox
 * should result in changing the checkbox state.
 *
 * Per https://html.spec.whatwg.org/multipage/indices.html#event-input
 * Input event is fired at controls when the user changes the value.
 * Per https://html.spec.whatwg.org/multipage/input.html#checkbox-state-(type=checkbox):event-input
 * Fire an event named input at the element with the bubbles attribute initialized to true.
 *
 * https://html.spec.whatwg.org/multipage/indices.html#event-change
 * For completeness the 'change' event should be fired too,
 * however we make no use of the 'change' event,
 * nor expect it to be used, thus firing it
 * would be unnecessary load.
 *
 * @param {HTMLInputElement} checkbox
 * @param {boolean} checked
 * @return {void}
 * @ignore
 */
function setCheckedState( checkbox, checked ) {
	/** @type {Event} @ignore */
	var e;
	checkbox.checked = checked;
	// Chrome and Firefox sends the builtin Event with .bubbles == true and .composed == true.
	if ( typeof Event === 'function' ) {
		e = new Event( 'input', { bubbles: true, composed: true } );
	} else {
		// IE 9-11, FF 6-10, Chrome 9-14, Safari 5.1, Opera 11.5, Android 3-4.3
		e = document.createEvent( 'CustomEvent' );
		if ( !e ) {
			return;
		}
		e.initCustomEvent( 'input', true /* canBubble */, false, false );
	}
	checkbox.dispatchEvent( e );
}

/**
 * Returns true if the Event's target is an inclusive descendant of any the checkbox hack's
 * constituents (checkbox, button, or target), and false otherwise.
 *
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement} button
 * @param {Node} target
 * @param {Event} event
 * @return {boolean}
 * @ignore
 */
function containsEventTarget( checkbox, button, target, event ) {
	return event.target instanceof Node && (
		checkbox.contains( event.target ) ||
		button.contains( event.target ) ||
		target.contains( event.target )
	);
}

/**
 * Dismiss the target when event is outside the checkbox, button, and target.
 * In simple terms this closes the target (menu, typically) when clicking somewhere else.
 *
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement} button
 * @param {Node} target
 * @param {Event} event
 * @return {void}
 * @ignore
 */
function dismissIfExternalEventTarget( checkbox, button, target, event ) {
	if ( checkbox.checked && !containsEventTarget( checkbox, button, target, event ) ) {
		setCheckedState( checkbox, false );
	}
}

/**
 * Update the `aria-expanded` attribute based on checkbox state (target visibility) changes.
 *
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement} button
 * @return {function(): void} Cleanup function that removes the added event listeners.
 * @ignore
 */
function bindUpdateAriaExpandedOnInput( checkbox, button ) {
	if ( button ) {
		mw.log.warn( '[1.38] The button parameter in bindUpdateAriaExpandedOnInput is deprecated, aria-expanded will be applied to the checkbox going forward. View the updated checkbox hack documentation for more details.' );
	}

	var listener = updateAriaExpanded.bind( undefined, checkbox, button );
	// Whenever the checkbox state changes, update the `aria-expanded` state.
	checkbox.addEventListener( 'input', listener );

	return function () {
		checkbox.removeEventListener( 'input', listener );
	};
}

/**
 * Manually change the checkbox state to avoid a focus change when using a pointing device.
 *
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement} button
 * @return {function(): void} Cleanup function that removes the added event listeners.
 * @ignore
 */
function bindToggleOnClick( checkbox, button ) {
	function listener( event ) {
		// Do not allow the browser to handle the checkbox. Instead, manually toggle it which does
		// not alter focus.
		event.preventDefault();
		setCheckedState( checkbox, !checkbox.checked );
	}
	button.addEventListener( 'click', listener, true );

	return function () {
		button.removeEventListener( 'click', listener, true );
	};
}

/**
 * Manually change the checkbox state when the button is focused and SPACE is pressed.
 *
 * @deprecated
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement} button
 * @return {function(): void} Cleanup function that removes the added event listeners.
 * @ignore
 */
function bindToggleOnSpaceEnter( checkbox, button ) {
	mw.log.warn( '[1.38] bindToggleOnSpaceEnter is deprecated. Use `bindToggleOnEnter` instead.' );

	function isEnterOrSpace( /** @type {KeyboardEvent} @ignore */ event ) {
		return event.key === ' ' || event.key === 'Enter';
	}

	function onKeydown( /** @type {KeyboardEvent} @ignore */ event ) {
		// Only handle SPACE and ENTER.
		if ( !isEnterOrSpace( event ) ) {
			return;
		}
		// Prevent the browser from scrolling when pressing space. The browser will
		// try to do this unless the "button" element is a button or a checkbox.
		// Depending on the actual "button" element, this also possibly prevents a
		// native click event from being triggered so we programatically trigger a
		// click event in the keyup handler.
		event.preventDefault();
	}

	function onKeyup( /** @type {KeyboardEvent} @ignore */ event ) {
		// Only handle SPACE and ENTER.
		if ( !isEnterOrSpace( event ) ) {
			return;
		}

		// A native button element triggers a click event when the space or enter
		// keys are pressed. Since the passed in "button" may or may not be a
		// button, programmatically trigger a click event to make it act like a
		// button.
		button.click();
	}

	button.addEventListener( 'keydown', onKeydown );
	button.addEventListener( 'keyup', onKeyup );

	return function () {
		button.removeEventListener( 'keydown', onKeydown );
		button.removeEventListener( 'keyup', onKeyup );
	};
}

/**
 * Manually change the checkbox state when the button is focused and Enter is pressed.
 *
 * @param {HTMLInputElement} checkbox
 * @return {function(): void} Cleanup function that removes the added event listeners.
 * @ignore
 */
function bindToggleOnEnter( checkbox ) {
	function onKeyup( /** @type {KeyboardEvent} @ignore */ event ) {
		// Only handle ENTER.
		if ( event.key !== 'Enter' ) {
			return;
		}

		setCheckedState( checkbox, !checkbox.checked );
	}

	checkbox.addEventListener( 'keyup', onKeyup );

	return function () {
		checkbox.removeEventListener( 'keyup', onKeyup );
	};
}

/**
 * Dismiss the target when clicking elsewhere and update the `aria-expanded` attribute based on
 * checkbox state (target visibility).
 *
 * @param {Window} window
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement} button
 * @param {Node} target
 * @return {function(): void} Cleanup function that removes the added event listeners.
 * @ignore
 */
function bindDismissOnClickOutside( window, checkbox, button, target ) {
	var listener = dismissIfExternalEventTarget.bind( undefined, checkbox, button, target );
	window.addEventListener( 'click', listener, true );

	return function () {
		window.removeEventListener( 'click', listener, true );
	};
}

/**
 * Dismiss the target when focusing elsewhere and update the `aria-expanded` attribute based on
 * checkbox state (target visibility).
 *
 * @param {Window} window
 * @param {HTMLInputElement} checkbox
 * @param {HTMLElement} button
 * @param {Node} target
 * @return {function(): void} Cleanup function that removes the added event listeners.
 * @ignore
 */
function bindDismissOnFocusLoss( window, checkbox, button, target ) {
	// If focus is given to any element outside the target, dismiss the target. Setting a focusout
	// listener on the target would be preferable, but this interferes with the click listener.
	var listener = dismissIfExternalEventTarget.bind( undefined, checkbox, button, target );
	window.addEventListener( 'focusin', listener, true );

	return function () {
		window.removeEventListener( 'focusin', listener, true );
	};
}

/**
 * Dismiss the target when clicking or focusing elsewhere and update the `aria-expanded` attribute
 * based on checkbox state (target visibility) changes made by **the user.** When tapping the button
 * itself, clear the focus outline.
 *
 * This function calls the other bind* functions and is the only expected interaction for most use
 * cases. It's constituents are provided distinctly for the other use cases.
 *
 * @param {Window} window
 * @param {HTMLInputElement} checkbox The underlying hidden checkbox that controls target
 *   visibility.
 * @param {HTMLElement} button The visible label icon associated with the checkbox. This button
 *   toggles the state of the underlying checkbox.
 * @param {Node} target The Node to toggle visibility of based on checkbox state.
 * @return {function(): void} Cleanup function that removes the added event listeners.
 * @ignore
 */
function bind( window, checkbox, button, target ) {
	var cleanups = [
		bindUpdateAriaExpandedOnInput( checkbox ),
		bindToggleOnClick( checkbox, button ),
		bindToggleOnEnter( checkbox ),
		bindDismissOnClickOutside( window, checkbox, button, target ),
		bindDismissOnFocusLoss( window, checkbox, button, target )
	];

	return function () {
		cleanups.forEach( function ( cleanup ) {
			cleanup();
		} );
	};
}

module.exports = {
	updateAriaExpanded: updateAriaExpanded,
	bindUpdateAriaExpandedOnInput: bindUpdateAriaExpandedOnInput,
	bindToggleOnClick: bindToggleOnClick,
	bindToggleOnSpaceEnter: bindToggleOnSpaceEnter,
	bindToggleOnEnter: bindToggleOnEnter,
	bindDismissOnClickOutside: bindDismissOnClickOutside,
	bindDismissOnFocusLoss: bindDismissOnFocusLoss,
	bind: bind
};
},
    "config.json": {
    "search": false,
    "collapsible": true,
    "sortable": true,
    "selectorLogoutLink": "#pt-logout a[data-mw=\"interface\"]"
}
}
} );
mw.loader.state({
    "mediawiki.page.ready": "ready"
});