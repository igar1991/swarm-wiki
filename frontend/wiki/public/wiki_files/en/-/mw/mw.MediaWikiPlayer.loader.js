/**
* EmbedPlayer loader
*/
( function () {
	var assignedIndex = 0,
		config = mw.config.get( 'wgTimedMediaHandler' );

	/**
	* Add a DOM ready check for player tags
	* @param {jQuery}
	*/
	function embedPlayerInit( $content ) {
		var inx, checkSetDone,
			$selected = $content.find( config[ 'EmbedPlayer.RewriteSelector' ] );

		if ( $selected.length ) {
			$selected.each( function ( index, playerElement ) {
				var $playerElement = $( playerElement ),
					$parent = $playerElement.parent();
				// eslint-disable-next-line no-jquery/no-class-state
				if ( !$playerElement.hasClass( 'kskin' ) ) {
					// Hack for parsoid-style output without the styles
					// Needed for NWE preview mode, which is parsoid-rendered.
					// Note none of this is needed for videojs mode in future.
					$parent.css( {
						width: $( playerElement ).attr( 'width' ) + 'px',
						height: $( playerElement ).attr( 'height' ) + 'px',
						display: 'block'
					} ).addClass( 'mediaContainer' );
					$playerElement
						.addClass( 'kskin' );
				}

				if ( !playerElement.id ) {
					// Parsoid doesn't give ids to videos in galleries, which confuses
					// mwembed's spinners. Workaround needed for NWE preview mode.
					playerElement.id = 'mwvid_noid' + ( ++assignedIndex );
				}
			} );

			inx = 0;
			checkSetDone = function () {
				if ( inx < $selected.length ) {
					// put in timeout to avoid browser lockup, and function stack
					$selected.eq( inx ).embedPlayer( function () {
						setTimeout( function () {
							checkSetDone();
						}, 5 );
					} );
				}
				inx++;
			};

			checkSetDone();
		}
	}
	mw.hook( 'wikipage.content' ).add( embedPlayerInit );

}() );
/**
* TimedText loader.
*/
// Scope everything in "mw" ( keeps the global namespace clean )
( function () {
	var config = mw.config.get( 'wgTimedMediaHandler' );

	/**
	* Check if the video tags in the page support timed text
	* this way we can add our timed text libraries to the player
	* library request.
	*/
	// Update the player loader request with timedText library if the embedPlayer
	// includes timedText tracks.
	$( mw ).on( 'EmbedPlayerUpdateDependencies', function ( event, playerElement, classRequest ) {
		if ( mw.isTimedTextSupported( playerElement ) ) {
			$.merge( classRequest, [ 'mw.TimedText' ] );
		}
	} );
	// On new embed player check if we need to add timedText
	$( mw ).on( 'EmbedPlayerNewPlayer', function ( event, embedPlayer ) {
		if ( mw.isTimedTextSupported( embedPlayer ) ) {
			mw.loader.using( 'mw.TimedText', function () {
				embedPlayer.timedText = new mw.TimedText( embedPlayer );
			} );
		}
	} );

	/**
	 * Check timedText is active for a given embedPlayer
	 * @param {Object} embedPlayer The player to be checked for timedText properties
	 * @return {boolean}
	 */
	mw.isTimedTextSupported = function ( embedPlayer ) {
		// EmbedPlayerNewPlayer passes a div with data-mwprovider set,
		// EmbedPlayerUpdateDependencies passes video element with data attribute
		// catch both
		var mwprovider = embedPlayer[ 'data-mwprovider' ] || $( embedPlayer ).data( 'mwprovider' ),
			showInterface = config[ 'TimedText.ShowInterface.' + mwprovider ] ||
				config[ 'TimedText.ShowInterface' ];

		if ( showInterface === 'always' ) {
			return true;
		} else if ( showInterface === 'off' ) {
			return false;
		}

		// Check for standard 'track' attribute:
		if ( $( embedPlayer ).find( 'track' ).length !== 0 ) {
			return true;
		} else {
			return false;
		}
	};

}() );
( function () {
	// Add MediaWikiSupportPlayer dependency on players with a mediaWiki title
	$( mw ).on( 'EmbedPlayerUpdateDependencies', function ( event, embedPlayer, dependencySet ) {
		if ( $( embedPlayer ).attr( 'data-mwtitle' ) ) {
			$.merge( dependencySet, [ 'mw.MediaWikiPlayerSupport' ] );
		}
	} );
}() );
mw.loader.state({
    "mw.MediaWikiPlayer.loader": "ready"
});