( function() {

	'use strict';

	var Road,
		RoadObject,
		SpeedZone,
		Vehicle,
		TrafficLights;

	/*
	 * Road object prototype
	 */
	RoadObject = function( params ){
		this.params = params;
	};
	RoadObject.prototype = {
		getPos: function() {
			return {
				t: this.params.pos[1],
				r: this.params.pos[0] + this.params.size[0],
				b: this.params.pos[1] + this.params.size[1],
				l: this.params.pos[0]
			};
		},
		destroy: function(){
			PubSub.publishSync( 'roadobj.destroy', this );
		}
	};

	/*
	 * Speed limited zone prototype
	 */
	SpeedZone = function( params ){
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

	TrafficLights = function( params ){
		// Constructor
		SpeedZone.call( this, params );
		this.lights = [
			{
				color: 'red',
				speedLimit: 0,
				duration: 10000
			},
			{
				color: 'green',
				speedLimit: Infinity,
				duration: 10000
			},
			{
				color: 'yellow',
				speedLimit: 0,
				duration: 3000
			}
		];
		if ( undefined === this.params.currentLight ) {
			this.params.currentLight = 0;
		}
		this.changeLightsTimer = null;
		this.changeLights( this.params.currentLight );
	};
	TrafficLights.prototype = Object.create( SpeedZone.prototype );
	utils.extend( TrafficLights.prototype, {
		constructor: TrafficLights,
		changeLights: function( light ){
			var that = this,
				nextLight;

			that.params.currentLight = light;
			that.params.speedLimit = that.lights[light].speedLimit;
			that.node.className = that.lights[light].color;
			nextLight = ( light + 1 >= that.lights.length ) ? 0 : light + 1;

			that.changeLightsTimer = setTimeout( function(){
				that.changeLights( nextLight );
			}, that.lights[light].duration );
		},
		destroy: function(){
			if ( this.changeLightsTimer ) {
				clearTimeout( this.changeLightsTimer );
				this.changeLightsTimer = null;
			}
			PubSub.publishSync( 'roadobj.destroy', this );
		}
	} );

	/*
	 * Vehicle prototype
	 */
	Vehicle = function( params ){
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
			var isOver;
			isOver = ( ( this.pos.b < roadObj.pos.b && this.pos.b > roadObj.pos.t ) || ( this.pos.t > roadObj.pos.t && this.pos.t < roadObj.pos.b ) );
			return isOver;
		},
		crash: function(){
			if ( this.isStopped ) return;
			this.stop();
			setTimeout( ( function(){
				this.destroy();
			} ).bind( this ), 3000 );
		}
	} );

	/*
	 * Main road object
	 */
	Road = function( node, params ){
		this.node = node;
		this.params = utils.extend( {
			width: 50,
			height: 700,
			minDistance: 30,
			maxSpeed: 7
		}, params );
		this.height = node.offsetHeight;
		this.layers = {
			obstacles: this.node.querySelector( '.obstacles' ),
			vehicles: this.node.querySelector( '.vehicles' )
		};
		this.vehicles = [];
		this.obstacles = [];
		this.trafficLights = [];
		this.enabled = false;
		PubSub.subscribe( 'roadobj.destroy', this.remove.bind( this ) );
	};
	Road.prototype.add = function( roadObj ){
		if ( roadObj instanceof Vehicle ) {
			this.layers.vehicles.appendChild( roadObj.node );
			this.vehicles.push( roadObj );
		} else if ( roadObj instanceof TrafficLights ) {
			this.layers.obstacles.appendChild( roadObj.node );
			this.trafficLights.push( roadObj );
		} else if ( roadObj instanceof SpeedZone ) {
			this.layers.obstacles.appendChild( roadObj.node );
			this.obstacles.push( roadObj );
		}
	};
	Road.prototype.remove = function( msg, roadObj ){
		var i = -1, l;
		if ( roadObj instanceof Vehicle ) {
			this.layers.vehicles.removeChild( roadObj.node );
			l = this.vehicles.length;
			for ( ; i++ < l; ) {
				if ( this.vehicles[i] === roadObj ) {
					this.vehicles.splice( i, 1 );
					break;
				}
			}
		} else if ( roadObj instanceof TrafficLights ) {
			this.layers.obstacles.removeChild( roadObj.node );
			this.trafficLights = [];
		} else if ( roadObj instanceof SpeedZone ) {
			this.layers.obstacles.removeChild( roadObj.node );
			l = this.obstacles.length;
			for ( ; i++ < l; ) {
				if ( this.obstacles[i] === roadObj ) {
					this.obstacles.splice( i, 1 );
					break;
				}
			}
		}
	};
	Road.prototype.countSafeSpeed = function( v, o ) {
		return v.isOver( o ) ? o.params.speedLimit : v.params.maxSpeed;
	};
	Road.prototype.generateVehicles = function(){
		var that = this,
			safePos,
			props = {
				dir: utils.random.number( 0, 1 ) ? 'down' : 'up',
				size: [20, utils.random.number( 30, 45 )],
				speed: 0,
				maxSpeed: utils.random.number( 3, that.params.maxSpeed ),
				boost: utils.random.number( 1, 10 ) / 100,
				mass: utils.random.number( 1000, 3000 )
			},
			lastVehicle = that.getLastVehicle( props.dir );

		props.braking = -utils.random.number( 2, 5 ) * props.boost;

		if ( lastVehicle ) {
			if ( props.dir === 'down' ) {
				safePos = Math.min( 0, lastVehicle.pos.t - that.params.minDistance - props.size[1] );
			} else {
				safePos = Math.max( that.params.height, lastVehicle.pos.b + that.params.minDistance );
			}
		} else {
			if ( props.dir === 'down' ) {
				safePos = 0;
			} else {
				safePos = that.params.height;
			}
		}

		if ( props.dir === 'down' ) {
			props.pos = [2, safePos];
		} else {
			props.pos = [that.params.width - props.size[0] - 2, safePos];
		}

		that.add( new Vehicle( props ) );

		if ( that.enabled ) {
			setTimeout( function(){
				that.generateVehicles();
			}, utils.random.number( 500, 1000 ) );
		}
	};
	Road.prototype.generateObstacles = function( amount ){
		var that = this,
			safePos,
			props;
		while ( that.obstacles.length && that.obstacles.length > amount ) {
			that.obstacles[that.obstacles.length - 1].destroy();
		}
		while ( that.obstacles.length < amount ) {
			props = {
				size: [48, 5],
				speedLimit: utils.random.number( 5, 15 ) / 10
			};
			props.pos = [0, utils.random.number( 0, that.params.height - props.size[1] )];

			that.add( new SpeedZone( props ) );
		}
	};
	Road.prototype.getLastVehicle = function( dir ){
		var that = this,
			i = that.vehicles.length,
			lastVehicle = null;
		for ( ; i--; ) {
			if ( that.vehicles[i].params.dir === dir ) {
				lastVehicle = that.vehicles[i];
				break;
			}
		}
		return lastVehicle;
	};
	Road.prototype.publishStats = function(){
		var that = this,
			stats = {
				avSpeed: 0,
				density: Math.round( 100 * that.vehicles.length * ( 38 + that.params.minDistance ) / ( 2 * that.params.height ) )
			},
			maxVehicleSpeed = 0;
		that.vehicles.forEach( function( v, i ){
			stats.avSpeed = ( ( stats.avSpeed * i ) + v.params.speed ) / ( i + 1 );
			maxVehicleSpeed = Math.max( maxVehicleSpeed, v.params.speed );
		} );
		stats.avSpeed = Math.round( 100 * stats.avSpeed / maxVehicleSpeed );

		PubSub.publishSync( 'road.stats', stats );
	};
	Road.prototype.toggleTraffic = function( on ){
		var that = this;
		if ( on === that.enabled ) {
			return;
		} else {
			this.enabled = on;
			if ( on ) {
				that.generateVehicles();
			}
		}
	};
	Road.prototype.toggleTrafficLights = function( on ){
		var that = this;
		if ( on ) {
			if ( !that.trafficLights.length ) {
				that.add( new TrafficLights( {
					size: [48, 5],
					pos: [0, Math.floor( that.params.height / 2 )]
				} ) );
			}
		} else {
			if ( that.trafficLights.length ) {
				that.trafficLights[0].destroy();
			}
		}
	};

	window.TJRoad = Road;

} )();