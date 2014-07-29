( function(){

	'use strict';

    // Meter object constructor
	var Meter = function( el ){
			var type = el.dataset.stat,
				scale = el.querySelector( 'i' );
			utils.pubsub.subscribe( 'road.stats', function( stats ){
				var key;
				for ( key in stats ) {
					if ( stats.hasOwnProperty( key ) && key === type ) {
						scale.style.width = stats[key] + '%';
					}
				}
			} );
		},
        
        field = document.querySelector( '.field' ),
        // initialize road object
		road = new TJRoad( document.querySelector( '.road' ) , {
            visibleLength: field.offsetWidth
        } );
    
    road.addLane( { dir: 'right' } );
    road.addLane( { dir: 'right' } );
    road.addLane( { dir: 'left' } );
    road.addLane( { dir: 'left' } );

	// initialize controls
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
					} else {
                        control.disabled = true;
                        utils.pubsub.subscribe( 'road.isEmpty', handleEmptyRoad.bind( control ) );
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
        
        function handleEmptyRoad(){
            utils.pubsub.unsubscribe( 'road.isEmpty', handleEmptyRoad );
            this.disabled = false;
        }

	} )( document.querySelector( '.controls' ) );

	// create Meter objects
	[].forEach.call( document.querySelectorAll( '.stats .meter' ), function( el ){
		el.dataset.Meter = new Meter( el );
	} );

    // controls road objects animation
	function animationLoop(){
		
		var obstacles = road.obstacles.concat( road.trafficLights );

		road.vehicles.forEach( function( v, i ){
			var isWayFree = true;

			if ( v.isStopped ) return;

			// count safe speed depending on obstacles
			obstacles.forEach( function( o ){
                if ( !utils.vectors.intersect( v.params.lanes, o.params.lanes ) ) return;
                
				// if obstacle is left behind
				if ( v.pos.l > o.pos.r && v.params.dir === 'right' ||
					v.pos.r < o.pos.l && v.params.dir === 'left' ) {
					return;
				} else if ( v.getBrakingDistance( o.params.speedLimit ) >= ( v.params.dir === 'right' ? ( o.pos.l - v.pos.r ) : ( v.pos.l - o.pos.r ) ) ){
					// if obstacle is right ahead
					v.params.speed = Math.max( 0, v.params.speed + v.params.braking );
					isWayFree = false;
				} else if ( v.params.speed + v.params.boost > road.countSafeSpeed( v, o ) ) {
					// if vehicle is just over obstacle
					isWayFree = false;
				}
			} );

			// count safe speed depending on vehicles
			road.vehicles.forEach( function( otherV ){
				if ( v === otherV || !utils.vectors.intersect( v.params.lanes, otherV.params.lanes ) ) return;
				// check for crash
				if ( v.isOverlaying( otherV ) ) {
					otherV.crash();
					v.crash();
                    return;
				}
                if ( v.isStopped ) return;

				if ( v.pos.l > otherV.pos.r && v.params.dir === 'right' ||
					v.pos.r < otherV.pos.l && v.params.dir === 'left' ) {
					return;
				} else if ( v.getBrakingDistance( otherV.params.speed + otherV.params.braking ) >= 
								( v.params.dir === 'right' ? ( otherV.pos.l - v.pos.r ) : ( v.pos.l - otherV.pos.r ) ) -
                                road.lanes[v.params.lanes[0]].params.minDistance 
				) {
					// if vehicle is right ahead
					v.params.speed = Math.max( 0, v.params.speed + v.params.braking );
					isWayFree = false;
				}
			} );
            
            if ( v.isStopped ) return;

			// boost if needed
			if ( isWayFree && v.params.speed < v.params.maxSpeed ) {
				v.params.speed = Math.min( v.params.speed + v.params.boost, v.params.maxSpeed );
			}
            
//            v.toggleState( 'braking', !isWayFree );

			// move according to current speed
			v.drive( [v.params.speed * ( v.params.dir === 'right' ? 1 : -1 ), 0] );

			// destroy if out of screen
			if ( v.pos.l > road.roadLength && v.params.dir === 'right' ||
				v.pos.r < 0 && v.params.dir === 'left' ) {
				v.destroy();
			}

			road.publishStats();

		} );

		if ( road.enabled || road.vehicles.length ) {
			window.requestAnimationFrame( animationLoop );
		} else {
            utils.pubsub.publish( 'road.isEmpty' );
        }
	}
    
} )();