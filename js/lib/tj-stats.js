( function(){

	'use strict';

	var statValuesFolders = document.querySelectorAll( '.stats dd' );

	PubSub.subscribe( 'road.stats', function( msg, stats ){
		var key;
		for ( key in stats ) {
			if ( stats.hasOwnProperty( key ) ) {
				let statValueProgressBar = document.querySelector( '.stats [data-stat="' + key + '"]' );
				if ( statValueProgressBar ) {
					statValueProgressBar.value = utils.round( stats[key], 3 );
				}
			}
		}
	} );

} )();