( function(){

	'use strict';

	var Meter = function( el ){
			var type = el.dataset.stat,
				scale = el.querySelector( 'i' );
			PubSub.subscribe( 'road.stats', function( msg, stats ){
				var key;
				for ( key in stats ) {
					if ( stats.hasOwnProperty( key ) && key === type ) {
						scale.style.width = stats[key] + '%';
					}
				}
			} );
		},
		road = new TJRoad( document.querySelector( '.road' ) );

	( function controlsInit( container ){

		var controls = container.querySelectorAll( '[data-control]' );
		
		container.addEventListener( 'change', function( e ){
			var control = e.target,
				type = control.dataset.control;
			switch ( type ) {
				case 'start':
					road.toggleTraffic( control.checked );
					if ( control.checked ) {
						animationLoop();
					}
					break;
				case 'obstacles':
					road.generateObstacles( parseInt( control.value, 10 ) );
					break;
				case 'trafficLights':
					road.toggleTrafficLights( control.checked );
					break;
			}
		} );

	} )( document.querySelector( '.controls' ) );

	
	[].forEach.call( document.querySelectorAll( '.stats .meter' ), function( el ){
		el.dataset.Meter = new Meter( el );
	} );


	function animationLoop(){
		
		var obstacles = road.obstacles.concat( road.trafficLights );

		road.vehicles.forEach( function( v, i ){
			var isWayFree = true;

			if ( v.isStopped ) return;

			// count safe speed depending on obstacles
			obstacles.forEach( function( o ){
				// if obstacle is left behind
				if ( v.pos.t > o.pos.b && v.params.dir === 'down' ||
					v.pos.b < o.pos.t && v.params.dir === 'up' ) {
					return;
				} else if ( v.getBrakingDistance( o.params.speedLimit ) >= ( v.params.dir === 'down' ? ( o.pos.t - v.pos.b ) : ( v.pos.t - o.pos.b ) ) ){
					// if obstacle is right ahead
					v.params.speed = Math.max( 0, v.params.speed + v.params.braking );
					isWayFree = false;
				} else if ( v.params.speed > road.countSafeSpeed( v, o ) - v.params.boost ) {
					// if vehicle is just over obstacle
					isWayFree = false;
				}
			} );

			// count safe speed depending on vehicles
			road.vehicles.forEach( function( otherV ){
				if ( v === otherV || v.params.dir !== otherV.params.dir ) return;
				// check for crash
				if ( v.isOver( otherV ) ) {
					otherV.crash( v.params.mass );
					v.crash( otherV.params.mass );
				}

				if ( v.pos.t > otherV.pos.b && v.params.dir === 'down' ||
					v.pos.b < otherV.pos.t && v.params.dir === 'up' ) {
					return;
				} else if ( v.getBrakingDistance( otherV.params.speed + otherV.params.braking ) >= 
								( v.params.dir === 'down' ? 
									( otherV.pos.t - v.pos.b ) : 
									( v.pos.t - otherV.pos.b ) ) - road.params.minDistance 
				) {
					// if vehicle is right ahead
					v.params.speed = Math.max( 0, v.params.speed + v.params.braking );
					isWayFree = false;
				}
			} );

			// boost if needed
			if ( isWayFree && v.params.speed < v.params.maxSpeed ) {
				v.params.speed = Math.min( v.params.speed + v.params.boost, v.params.maxSpeed );
			}

			// move according to current speed
			v.drive( [0, v.params.speed * ( v.params.dir === 'down' ? 1 : -1 )] );

			// destroy if out of screen
			if ( v.pos.t > road.height && v.params.dir === 'down' ||
				v.pos.b < 0 && v.params.dir === 'up' ) {
				v.destroy();
			}

			road.publishStats();

		} );

		if ( road.enabled || road.vehicles.length ) {
			window.requestAnimationFrame( animationLoop );
		}
	};

} )();