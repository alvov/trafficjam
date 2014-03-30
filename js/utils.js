( function(){

	'use strict';

	var utils = {
		extend: function(){
			var i = 0,
				l = arguments.length,
				result = arguments[0];
			for ( ;++i < l; ) {
				let key;
				for ( key in arguments[i] ) {
					if ( arguments[i].hasOwnProperty( key ) ) {
						result[key] = arguments[i][key];
					}
				}
			}
			return result;
		},
		random: {
			number: function( min, max ) {
				min = undefined === min ? 0: min;
				max = undefined === max ? 1: max;
				return Math.floor( Math.random() * ( max - min + 1 ) ) + min;
			},
			color: function(){
				var color = [],
					i = -1;
				for ( ;++i < 3; ) {
					color.push( utils.random.number( 0, 255 ) );
				}
				return 'rgb(' + color.join() + ')';
			}
		},
		addVectors: function( v1, v2 ){
			return v1.map( function( value, i ){
				return value + v2[i];
			} )
		}
	};

	if ( !window.utils ) {
		window.utils = utils;
	} else {
		throw 'Utils initialization namespace conflict';
	}

} )();