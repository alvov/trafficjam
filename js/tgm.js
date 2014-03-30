( function(){

	'use strict';

	var RoadObject = function( params ){
		this.params = params;
	};
	RoadObject.prototype = {
		getPos: function() {
			return {
				f: this.params.dir === 'up' ? this.params.pos[1] : this.params.pos[1] + this.params.size[1],
				r: this.params.dir === 'up' ? this.params.pos[0] + this.params.size[0] : this.params.pos[0],
				b: this.params.dir === 'up' ? this.params.pos[1] + this.params.size[1] : this.params.pos[1],
				l: this.params.dir === 'up' ? this.params.pos[0] : this.params.pos[0] + this.params.size[0]
			};
		}
	};

	var SpeedZone = function( params ){
		// Constructor
		RoadObject.call( this, params );
		
		this.pos = this.getPos();

		this.render();
	};
	SpeedZone.prototype = Object.create( RoadObject.prototype );
	utils.extend( SpeedZone.prototype, {
		constructor: SpeedZone,
		render: function(){
			this.node = document.createElement( 's' );
			this.node.style.width = this.params.size[0] + 'px';
			this.node.style.height = this.params.size[1] + 'px';
			this.node.style.left = this.params.pos[0] + 'px';
			this.node.style.top = this.params.pos[1] + 'px';
		}
	} );

	var Vehicle = function( params ){
		// Constructor
		RoadObject.call( this, params );

		if ( !this.params.color ) {
			this.params.color = utils.random.color();
		}
		this.render();
	};
	Vehicle.prototype = Object.create( RoadObject.prototype );
	utils.extend( Vehicle.prototype, {
		constructor: Vehicle,
		render: function(){
			var vehicleBody = document.createElement( 'b' );
			this.node = document.createElement( 'div' );
			vehicleBody.style.width = this.params.size[0] + 'px';
			vehicleBody.style.height = this.params.size[1] + 'px';
			vehicleBody.style.backgroundColor = this.params.color;
			this.node.className = 'v';
			this.node.appendChild( vehicleBody );
			this.drive( [0, 0] );
		},
		drive: function( distance ){
			this.isStopped = false;
			if ( undefined !== distance ) {
				this.params.pos = utils.addVectors( this.params.pos, distance );
				this.pos = this.getPos();
				this.node.style.left = this.params.pos[0] + 'px';
				this.node.style.top = this.params.pos[1] + 'px';
			}
		},
		stop: function(){
			this.isStopped = true;
		},
		getBrakingDistance: function( speedLimit ){
			var brakingTime;
			if ( this.params.speed <= speedLimit ) return -Infinity;
			brakingTime = ( speedLimit - this.params.speed ) / this.params.braking;
			return brakingTime * ( this.params.speed + ( this.params.braking * ( 1 + brakingTime ) ) / 2 );
		},
		isOver: function( roadObj ) {
			return this.params.dir === 'down' ?
				( ( this.pos.f < roadObj.pos.f && this.pos.f > roadObj.pos.b ) || ( this.pos.b > roadObj.pos.b && this.pos.b < roadObj.pos.f ) ) :
				( ( this.pos.f > roadObj.pos.f && this.pos.f < roadObj.pos.b ) || ( this.pos.b < roadObj.pos.b && this.pos.b > roadObj.pos.f ) );
		},
		crash: function(){
			if ( this.isStopped ) return;
			this.stop();
			// setTimeout( ( function(){
			// 	this.drive( 0 );
			// } ).bind( this ), utils.random.number( 1000, 3000 ) );
		},
		destroy: function(){
			this.node.parentNode.removeChild( this.node );
		}
	} );

	var Road = function( node ){
		this.node = node;
		this.height = node.offsetHeight;
		this.layers = {
			obstacles: this.node.querySelector( '.obstacles' ),
			vehicles: this.node.querySelector( '.vehicles' )
		};
		this.vehicles = [];
		this.obstacles = [];
		this.crashables = [];
	};
	Road.prototype = {
		add: function( roadObj ){
			if ( 'function' === typeof roadObj.crash ) {
				this.crashables.push( roadObj );
			}
			if ( roadObj instanceof Vehicle ) {
				this.layers.vehicles.appendChild( roadObj.node );
				this.vehicles.push( roadObj );
			} else if ( roadObj instanceof SpeedZone ) {
				this.layers.obstacles.appendChild( roadObj.node );
				this.obstacles.push( roadObj );
			}
		},
		remove: function( node ){
			this.removeChild( node );
		},
		countSafeSpeed: function( v, o ) {
			return v.isOver( o ) ? o.params.speedLimit : v.params.maxSpeed;
		}
	};

	var road = new Road( document.querySelector( '.road' ) );

	road.add( new Vehicle( {
			pos: [2, 0],
			dir: 'down',
			speed: 4,
			maxSpeed: 6,
			boost: 0.05,
			braking: -0.1,
			size: [20, 30],
			mass: 1000
		} )
	);

	setTimeout( function(){
		road.add( new Vehicle( {
				pos: [2, 0],
				dir: 'down',
				speed: 10,
				maxSpeed: 10,
				boost: 0.1,
				braking: -0.5,
				size: [20, 30],
				mass: 1500
			} )
		);
	}, 500 );

	road.add( new SpeedZone( {
		pos: [0, 600],
		size: [48, 30],
		speedLimit: 2
	} ) );

	road.add( new SpeedZone( {
		pos: [0, 250],
		size: [48, 10],
		speedLimit: 0.5
	} ) );

	( function animationLoop(){
		// return;
		road.vehicles.forEach( function( v, i ){
			var isWayFree = true;

			if ( v.isStopped ) return;

			// count safe speed depending on obstacles
			road.obstacles.forEach( function( o ){
				// if obstacle is left behind
				if ( v.pos.b > o.pos.f && v.params.dir === 'down' ||
					v.pos.b < o.pos.f && v.params.dir === 'up' ) {
					return;
				} else if ( v.getBrakingDistance( o.params.speedLimit ) >= ( v.params.dir === 'down' ? ( o.pos.b - v.pos.f ) : ( v.pos.f - o.pos.b ) ) ){
					// if obstacle is right ahead
					v.params.speed += v.params.braking;
					isWayFree = false;
				} else if ( v.params.speed > road.countSafeSpeed( v, o ) - v.params.boost ) {
					// if vehicle is just over obstacle
					isWayFree = false;
				}
			} );

			// count safe speed depending on vehicles
			road.vehicles.forEach( function( otherV ){
				if ( v === otherV ) return;
				if ( v.pos.b > otherV.pos.f && v.params.dir === 'down' ||
					v.pos.b < otherV.pos.f && v.params.dir === 'up' ) {
					return;
				} else if ( v.getBrakingDistance( otherV.params.speed + otherV.params.braking ) >= ( v.params.dir === 'down' ? 
					( otherV.pos.b - v.pos.f ) : 
					( v.pos.f - otherV.pos.b ) ) - 30 ) {
					// if vehicle is right ahead
					v.params.speed += v.params.braking;
					isWayFree = false;
				}
			} );

			// boost if needed
			if ( isWayFree && v.params.speed < v.params.maxSpeed ) {
				v.params.speed = Math.min( v.params.speed + v.params.boost, v.params.maxSpeed );
			}

			// move according to surrent speed
			v.drive( [0, v.params.speed] );

			// destroy if out of screen
			if ( v.params.pos[1] > road.height && v.params.dir === 'down' ||
				v.params.pos[0] < 0 && v.params.dir === 'up' ) {
				v.destroy();
				road.vehicles.splice( i, 1 );
			}

		} );

		road.crashables.forEach( function( c ){
			road.crashables.forEach( function( otherC ){
				if ( c === otherC ) return;
				if ( c.isOver( otherC ) ) {
					otherC.crash( c.params.mass );
					c.crash( otherC.params.mass );
				}
			} );
		} );

		// continue until there's no vehicle left on the road
		if ( road.vehicles.length ) {
			window.requestAnimationFrame( animationLoop );
		}
	} )();

} )();