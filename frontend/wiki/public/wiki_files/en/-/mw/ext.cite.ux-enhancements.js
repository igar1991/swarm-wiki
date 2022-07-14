/**
 * Main JavaScript for the Cite extension. The main purpose of this file
 * is to add accessibility attributes to the citation links as that can
 * hardly be done server side (T40141).
 *
 * @author Marius Hoch <hoo@online.de>
 */
( function () {
	'use strict';

	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var accessibilityLabelOne = mw.msg( 'cite_references_link_accessibility_label' ),
			accessibilityLabelMany = mw.msg( 'cite_references_link_many_accessibility_label' );

		$content.find( '.mw-cite-backlink' ).each( function () {
			var $links = $( this ).find( 'a' );

			if ( $links.length > 1 ) {
				// This citation is used multiple times. Let's only set the accessibility label on the first link, the
				// following ones should then be self-explaining. This is needed to make sure this isn't getting
				// too wordy.
				$links.eq( 0 ).prepend(
					$( '<span>' )
						.addClass( 'cite-accessibility-label' )
						// Also make sure we have at least one space between the accessibility label and the visual one
						.text( accessibilityLabelMany + ' ' )
				);
			} else {
				$links
					.attr( 'aria-label', accessibilityLabelOne )
					.attr( 'title', accessibilityLabelOne );
			}
		} );
	} );
}() );
/**
 * @author Thiemo Kreuz
 */
( function () {
	'use strict';

	/**
	 * Checks if the ID uses a composite format that does not only consist of a sequential number,
	 * as specified in "cite_reference_link_key_with_num".
	 *
	 * @param {string} id
	 * @return {boolean}
	 */
	function isNamedReference( id ) {
		var prefix = mw.msg( 'cite_reference_link_prefix' );

		// Note: This assumes IDs start with the prefix; this is guaranteed by the parser function
		return /\D/.test( id.slice( prefix.length ) );
	}

	/**
	 * @param {string} id
	 * @param {jQuery} $content
	 * @return {boolean}
	 */
	function isReusedNamedReference( id, $content ) {
		if ( !isNamedReference( id ) ) {
			return false;
		}

		// Either the ID is already a reuse, or at least one reuse exists somewhere else on the page
		return id.slice( -2 ) !== '-0' ||
			$content.find( '.references a[href="#' + $.escapeSelector( id.slice( 0, -1 ) ) + '1"]' ).length;
	}

	/**
	 * @param {jQuery} $backlinkWrapper
	 * @return {jQuery}
	 */
	function makeUpArrowLink( $backlinkWrapper ) {
		var textNode = $backlinkWrapper[ 0 ].firstChild,
			accessibilityLabel = mw.msg( 'cite_references_link_accessibility_back_label' ),
			$upArrowLink = $( '<a>' )
				.addClass( 'mw-cite-up-arrow-backlink' )
				.attr( 'aria-label', accessibilityLabel )
				.attr( 'title', accessibilityLabel );

		if ( !textNode ) {
			return $upArrowLink;
		}

		// Skip additional, custom HTML wrappers, if any.
		while ( textNode.firstChild ) {
			textNode = textNode.firstChild;
		}

		if ( textNode.nodeType !== Node.TEXT_NODE || textNode.data.trim() === '' ) {
			return $upArrowLink;
		}

		var upArrow = textNode.data.trim();
		// The text node typically contains "↑ ", and we need to keep the space.
		textNode.data = textNode.data.replace( upArrow, '' );

		// Create a plain text and a clickable "↑". CSS :target selectors make sure only
		// one is visible at a time.
		$backlinkWrapper.prepend(
			$( '<span>' )
				.addClass( 'mw-cite-up-arrow' )
				.text( upArrow ),
			$upArrowLink
				.text( upArrow )
		);

		return $upArrowLink;
	}

	/**
	 * @param {jQuery} $backlink
	 */
	function updateUpArrowLink( $backlink ) {
		// It's convenient to stop at the class name, but it's not guaranteed to be there.
		var $backlinkWrapper = $backlink.closest( '.mw-cite-backlink, li' ),
			$upArrowLink = $backlinkWrapper.find( '.mw-cite-up-arrow-backlink' );

		if ( !$upArrowLink.length && $backlinkWrapper.length ) {
			$upArrowLink = makeUpArrowLink( $backlinkWrapper );
		}

		$upArrowLink.attr( 'href', $backlink.attr( 'href' ) );
	}

	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		// We are going to use the ID in the code below, so better be sure one is there.
		$content.find( '.reference[id] > a' ).on( 'click', function () {
			var id = $( this ).parent().attr( 'id' );

			$content.find( '.mw-cite-targeted-backlink' ).removeClass( 'mw-cite-targeted-backlink' );

			// Bail out if there is not at least a second backlink ("cite_references_link_many").
			if ( !isReusedNamedReference( id, $content ) ) {
				return;
			}

			// The :not() skips the duplicate link created below. Relevant when double clicking.
			var $backlink = $content.find( '.references a[href="#' + $.escapeSelector( id ) + '"]:not(.mw-cite-up-arrow-backlink)' )
				.first()
				.addClass( 'mw-cite-targeted-backlink' );

			if ( $backlink.length ) {
				updateUpArrowLink( $backlink );
			}
		} );
	} );
}() );
/**
 * @file Temporary tracking to evaluate the impact of Reference Previews on users' interaction with references.
 *
 * The baseline metrics are for a sample of users who don't have ReferencePreviews enabled.
 *
 * Users with the feature enabled are not sampled, and events are logged using the ReferencePreviewsCite schema.
 *
 * @see https://phabricator.wikimedia.org/T214493
 * @see https://phabricator.wikimedia.org/T231529
 * @see https://meta.wikimedia.org/wiki/Schema:ReferencePreviewsBaseline
 * @see https://meta.wikimedia.org/wiki/Schema:ReferencePreviewsCite
 */

// EventLogging may not be installed
mw.loader.using( 'ext.eventLogging' ).then( function () {
	'use strict';

	$( function () {
		var isReferencePreviewsEnabled = mw.config.get( 'wgPopupsReferencePreviews', false ),
			samplingRate = isReferencePreviewsEnabled ? 1 : 1000;

		if ( !navigator.sendBeacon ||
			!mw.config.get( 'wgIsArticle' ) ||
			!mw.eventLog ||
			!mw.eventLog.eventInSample( samplingRate )
		) {
			return;
		}

		var loggingTopic = isReferencePreviewsEnabled ?
			'event.ReferencePreviewsCite' :
			'event.ReferencePreviewsBaseline';
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '#mw-content-text' ).on(
			'click',
			// Footnote links, references block in VisualEditor, and reference content links.
			'.reference a[ href*="#" ], .mw-reference-text a, .reference-text a',
			function () {
				var isInReferenceBlock = $( this ).parents( '.references' ).length > 0;
				mw.track( loggingTopic, {
					action: ( isInReferenceBlock ?
						'clickedReferenceContentLink' :
						'clickedFootnote' )
				} );
			}
		);

		mw.track( loggingTopic, { action: 'pageview' } );
	} );
} );
mw.loader.state({
    "ext.cite.ux-enhancements": "ready"
});