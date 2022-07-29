/*
MediaWiki:Common.js
*/
/**
 * Keep code in MediaWiki:Common.js to a minimum as it is unconditionally
 * loaded for all users on every wiki page. If possible create a gadget that is
 * enabled by default instead of adding it here (since gadgets are fully
 * optimized ResourceLoader modules with possibility to add dependencies etc.)
 *
 * Since Common.js isn't a gadget, there is no place to declare its
 * dependencies, so we have to lazy load them with mw.loader.using on demand and
 * then execute the rest in the callback. In most cases these dependencies will
 * be loaded (or loading) already and the callback will not be delayed. In case a
 * dependency hasn't arrived yet it'll make sure those are loaded before this.
 */

/* global mw, $ */
/* jshint strict:false, browser:true */

mw.loader.using( [ 'mediawiki.util' ] ).done( function () {
	/* Begin of mw.loader.using callback */

	/**
	 * Map addPortletLink to mw.util
	 * @deprecated: Use mw.util.addPortletLink instead.
	 */
	// mw.log.deprecate( window, 'addPortletLink', mw.util.addPortletLink, 'Use mw.util.addPortletLink instead' );

	/**
	 * Test if an element has a certain class
	 * @deprecated:  Use $(element).hasClass() instead.
	 */
	mw.log.deprecate( window, 'hasClass', function ( element, className ) {
		return $( element ).hasClass( className );
	}, 'Use jQuery.hasClass() instead' );

	/**
	 * @source www.mediawiki.org/wiki/Snippets/Load_JS_and_CSS_by_URL
	 * @rev 6
	 */
	var extraCSS = mw.util ? mw.util.getParamValue( 'withCSS' ) : () => {},
		extraJS = mw.util ? mw.util.getParamValue( 'withJS' ) : () => {};

	if ( extraCSS ) {
		if ( extraCSS.match( /^MediaWiki:[^&<>=%#]*\.css$/ ) ) {
			mw.loader.load( '/w/index.php?title=' + extraCSS + '&action=raw&ctype=text/css', 'text/css' );
		} else {
			mw.notify( 'Only pages from the MediaWiki namespace are allowed.', { title: 'Invalid withCSS value' } );
		}
	}

	if ( extraJS ) {
		if ( extraJS.match( /^MediaWiki:[^&<>=%#]*\.js$/ ) ) {
			mw.loader.load( '/w/index.php?title=' + extraJS + '&action=raw&ctype=text/javascript' );
		} else {
			mw.notify( 'Only pages from the MediaWiki namespace are allowed.', { title: 'Invalid withJS value' } );
		}
	}

	/**
	 * WikiMiniAtlas
	 *
	 * Description: WikiMiniAtlas is a popup click and drag world map.
	 *              This script causes all of our coordinate links to display the WikiMiniAtlas popup button.
	 *              The script itself is located on the Meta-Wiki because it is used by many projects.
	 *              See [[Meta:WikiMiniAtlas]] for more information.
	 * Note - use of this service is recommended to be replaced with mw:Help:Extension:Kartographer
	 */
	$( function () {
		var requireWikiminiatlas = $( 'a.external.text[href*="geohack"]' ).length || $( 'div.kmldata' ).length;
		if ( requireWikiminiatlas ) {
			mw.loader.load( '//meta.wikimedia.org/w/index.php?title=MediaWiki:Wikiminiatlas.js&action=raw&ctype=text/javascript' );
		}
	} );

	/**
	 * Collapsible tables; reimplemented with mw-collapsible
	 * Styling is also in place to avoid FOUC
	 *
	 * Allows tables to be collapsed, showing only the header. See [[Help:Collapsing]].
	 * @version 3.0.0 (2018-05-20)
	 * @source https://www.mediawiki.org/wiki/MediaWiki:Gadget-collapsibleTables.js
	 * @author [[User:R. Koot]]
	 * @author [[User:Krinkle]]
	 * @author [[User:TheDJ]]
	 * @deprecated Since MediaWiki 1.20: Use class="mw-collapsible" instead which
	 * is supported in MediaWiki core. Shimmable since MediaWiki 1.32
	 *
	 * @param {jQuery} $content
	 */
	function makeCollapsibleMwCollapsible( $content ) {
		var $tables = $content
			.find( 'table.collapsible:not(.mw-collapsible)' )
			.addClass( 'mw-collapsible' );

		$.each( $tables, function ( index, table ) {
			// mw.log.warn( 'This page is using the deprecated class collapsible. Please replace it with mw-collapsible.');
			if ( $( table ).hasClass( 'collapsed' ) ) {
				$( table ).addClass( 'mw-collapsed' );
				// mw.log.warn( 'This page is using the deprecated class collapsed. Please replace it with mw-collapsed.');
			}
		} );
		if ( $tables.length > 0 ) {
			mw.loader.using( 'jquery.makeCollapsible' ).then( function () {
				$tables.makeCollapsible();
			} );
		}
	}
	mw.hook( 'wikipage.content' ).add( makeCollapsibleMwCollapsible );

	/**
	 * Add support to mw-collapsible for autocollapse, innercollapse and outercollapse
	 *
	 * Maintainers: TheDJ
	 */
	function mwCollapsibleSetup( $collapsibleContent ) {
		var $element,
			$toggle,
			autoCollapseThreshold = 2;
		$.each( $collapsibleContent, function ( index, element ) {
			$element = $( element );
			if ( $element.hasClass( 'collapsible' ) ) {
				$element.find( 'tr:first > th:first' ).prepend( $element.find( 'tr:first > * > .mw-collapsible-toggle' ) );
			}
			if ( $collapsibleContent.length >= autoCollapseThreshold && $element.hasClass( 'autocollapse' ) ) {
				$element.data( 'mw-collapsible' ).collapse();
			} else if ( $element.hasClass( 'innercollapse' ) ) {
				if ( $element.parents( '.outercollapse' ).length > 0 ) {
					$element.data( 'mw-collapsible' ).collapse();
				}
			}
			// because of colored backgrounds, style the link in the text color
			// to ensure accessible contrast
			$toggle = $element.find( '.mw-collapsible-toggle' );
			if ( $toggle.length ) {
				// Make the toggle inherit text color
				if ( $toggle.parent()[ 0 ].style.color ) {
					$toggle.find( 'a' ).css( 'color', 'inherit' );
				}
			}
		} );
	}

	mw.hook( 'wikipage.collapsibleContent' ).add( mwCollapsibleSetup );

	/**
	 * Magic editintros ****************************************************
	 *
	 * Description: Adds editintros on disambiguation pages and BLP pages.
	 * Maintainers: [[User:RockMFR]]
	 *
	 * @param {string} name
	 */
	function addEditIntro( name ) {
		$( '.mw-editsection, #ca-edit, #ca-ve-edit' ).find( 'a' ).each( function ( i, el ) {
			el.href = $( this ).attr( 'href' ) + '&editintro=' + name;
		} );
	}

	if ( mw.config.get( 'wgNamespaceNumber' ) === 0 ) {
		$( function () {
			if ( document.getElementById( 'disambigbox' ) ) {
				addEditIntro( 'Template:Disambig_editintro' );
			}
		} );

		$( function () {
			var cats = mw.config.get( 'wgCategories' );
			if ( !cats ) {
				return;
			}
			if ( $.inArray( 'Living people', cats ) !== -1 || $.inArray( 'Possibly living people', cats ) !== -1 ) {
				addEditIntro( 'Template:BLP_editintro' );
			}
		} );
	}

	/* Actions specific to the edit page */
	if ( mw.config.get( 'wgAction' ) === 'edit' || mw.config.get( 'wgAction' ) === 'submit' ) {
		/**
		 * Fix edit summary prompt for undo
		 *
		 *  Fixes the fact that the undo function combined with the "no edit summary prompter"
		 *  complains about missing editsummary, if leaving the edit summary unchanged.
		 *  Added by [[User:Deskana]], code by [[User:Tra]].
		 *  See also [[phab:T10912]].
		 */
		$( function () {
			if ( document.location.search.indexOf( 'undo=' ) !== -1 && document.getElementsByName( 'wpAutoSummary' )[ 0 ] ) {
				document.getElementsByName( 'wpAutoSummary' )[ 0 ].value = '1';
			}
		} );
	}

	/* End of mw.loader.using callback */
} );
/* DO NOT ADD CODE BELOW THIS LINE */
mw.loader.state({
    "site": "ready"
});