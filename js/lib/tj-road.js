( function() {

	'use strict';

	var Road,
        RoadLane,
		RoadObject,
		SpeedZone,
		Vehicle,
		TrafficLights,
        
        MIN_VEHICLE_WIDTH = 30,
        MAX_VEHICLE_WIDTH = 45;

	/**
	 * Road object constructor
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
			utils.pubsub.publish( 'roadobj.destroy', this );
		}
	};

	/**
	 * Speed limited zone constructor
     * @extends RoadObject
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

    /**
     * Traffic lights zone constructor
     * @extends SpeedZone
     */
	TrafficLights = function( params ){
		// Constructor
		SpeedZone.call( this, params );
		this.lights = [
			{
				type: 'stop',
				speedLimit: 0,
				duration: 10000
			},
			{
				type: 'go',
				speedLimit: Infinity,
				duration: 10000
			},
			{
				type: 'ready',
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
			that.node.className = that.lights[light].type;
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
			utils.pubsub.publish( 'roadobj.destroy', this );
		}
	} );

	/**
	 * Vehicle constructor
     * @extends RoadObject
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
        getPos: function() {
			return {
				t: this.params.pos[1] - Math.ceil( this.params.size[1] / 2 ),
				r: this.params.pos[0] + this.params.size[0],
				b: this.params.pos[1] + Math.ceil( this.params.size[1] / 2 ),
				l: this.params.pos[0]
			};
		},
		render: function(){
			this.node = document.createElement( 'div' );
			
            this.vehicleBody = document.createElement( 'b' );
            this.vehicleBody.style.width = this.params.size[0] + 'px';
			this.vehicleBody.style.height = this.params.size[1] + 'px';
            this.vehicleBody.style.fontSize = this.params.size[1] + 'px';
            this.vehicleBody.style.marginTop =  - Math.ceil( this.params.size[1] / 2 ) + 'px';
			this.vehicleBody.style.backgroundColor = this.params.color;
            
			this.node.appendChild( this.vehicleBody );
			this.node.className = 'v';
			this.drive( [0, 0] );
		},
		drive: function( shift ){
            var distance;
			this.isStopped = false;
			if ( undefined !== shift ) {
                if ( shift[0] && shift[1] ) {
                    distance = Math.sqrt( Math.pow( shift[0], 2 ) + Math.pow( shift[1], 2 ) );
                    this.params.rotate = Math.asin( shift[1] / distance );
                }
				this.params.pos = utils.vectors.add( this.params.pos, shift );
				this.pos = this.getPos();
                this.node.style.transform = 'translate(' + this.params.pos[0] + 'px,' + this.params.pos[1] + 'px)';
                this.vehicleBody.style.transform = 'rotateZ(' + this.params.rotate + 'deg)';
			}
		},
		stop: function(){
			this.isStopped = true;
            this.params.speed = 0;
		},
		getBrakingDistance: function( speedLimit ){
			var brakingTime;
			if ( this.params.speed <= speedLimit ) return -Infinity;
			brakingTime = ( speedLimit - this.params.speed ) / this.params.braking;
			return brakingTime * ( this.params.speed + ( this.params.braking * ( 1 + brakingTime ) ) / 2 );
		},
		isOverlaying: function( roadObj ) {
			return ( ( this.pos.r < roadObj.pos.r && this.pos.r > roadObj.pos.l ) || ( roadObj.pos.r < this.pos.r && roadObj.pos.r > this.pos.l ) );
		},
		crash: function(){
			if ( this.isStopped ) return;
			this.stop();
			this.node.classList.add( 'crashed' );
			setTimeout( ( function(){
				this.destroy();
			} ).bind( this ), 10000 );
		},
        toggleState: function( state, on ){
            switch ( state ) {
                case 'braking':
                    if ( on ) {
                        this.vehicleBody.classList.add( 'is-braking' );
                    } else {
                        this.vehicleBody.classList.remove( 'is-braking' );
                    }
                    break;
            }
        }
	} );

	/**
     * Road lane constructor
     */
    RoadLane = function( params ){
        this.params = utils.extend( {
            dir: 'right',
            width: 25,
			minDistance: 30,
			maxSpeed: 7
		}, params );
		this.render();
    };
    RoadLane.prototype.render = function(){
        this.node = document.createElement( 'div' );
        this.node.className = 'lane';
        this.node.style.height = this.params.width + 'px';
    };
    
	/**
	 * Main road object
	 */
	Road = function( node, params ){
		this.node = node;
        this.node.style.width = this.node.style.outerWidth + 'px';
		this.roadLength = node.offsetWidth;
		this.params = utils.extend( {
            visibleLength: this.roadLength
        }, params );
		this.layers = {
            lanes: this.node.querySelector( '.lanes' ),
			obstacles: this.node.querySelector( '.obstacles' ),
			vehicles: this.node.querySelector( '.vehicles' )
		};
        this.lanes = [];
		this.vehicles = [];
		this.obstacles = [];
		this.trafficLights = [];
		this.enabled = false;
		utils.pubsub.subscribe( 'roadobj.destroy', this.remove.bind( this ) );
	};
    
    Road.prototype.addLane = function( params ){
        var lane = new RoadLane( params );
        if ( params.dir === 'right' || !this.lanes.length ) {
            this.layers.lanes.appendChild( lane.node );
            this.lanes.push( lane );
        } else {
            this.layers.lanes.insertBefore( lane.node, this.layers.lanes.childNodes[0] );
            this.lanes.unshift( lane );
        }
        this.node.style.marginTop = - Math.floor( this.layers.lanes.offsetHeight / 2 ) + 'px';
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
	Road.prototype.remove = function( roadObj ){
		var i = -1, l,
            roadObjects = [];
        
        roadObj.node.remove();
        
		if ( roadObj instanceof Vehicle ) {
            roadObjects = this.vehicles;
		} else if ( roadObj instanceof TrafficLights ) {
            roadObjects = this.trafficLights;
		} else if ( roadObj instanceof SpeedZone ) {
            roadObjects = this.obstacles;
		}
        l = roadObjects.length;
        for ( ; ++i < l; ) {
            if ( roadObjects[i] === roadObj ) {
                roadObjects.splice( i, 1 );
                break;
            }
        }
	};
	Road.prototype.countSafeSpeed = function( v, o ) {
		return v.isOverlaying( o ) ? o.params.speedLimit : v.params.maxSpeed;
	};
	Road.prototype.generateVehicles = function(){
		var that = this,
			safePosX,
            laneIndex = utils.random.number( 0, that.lanes.length - 1 ),
            curLane = that.lanes[laneIndex],
            laneCenter,
			props = {
                lanes: [laneIndex],
                dir: curLane.params.dir,
                size: [utils.random.number( MIN_VEHICLE_WIDTH, MAX_VEHICLE_WIDTH ), utils.random.number( 20, 25 )],
				speed: 0,
				maxSpeed: utils.random.number( 3, curLane.params.maxSpeed ),
				boost: utils.random.number( 1, 10 ) / 100,
				mass: utils.random.number( 1000, 3000 )
			},
			lastVehicle = that.getLastVehicle( props.lanes[0] );

		props.braking = -utils.random.number( 2, 5 ) * props.boost;
        
        switch( curLane.params.dir ){
            case 'right':
                props.rotate = 0;
                if ( lastVehicle ) {
				    safePosX = Math.min( 0, lastVehicle.pos.l - curLane.params.minDistance - props.size[0] );
                } else {
				    safePosX = 0;
                }
                break;
            case 'left':
                props.rotate = 180;
                if ( lastVehicle ) {
				    safePosX = Math.max( that.roadLength, lastVehicle.pos.r + curLane.params.minDistance );
                } else {
				    safePosX = that.roadLength;
                }
                break;
            default:
                props.rotate = 0;
                safePosX = 0;
        }

        laneCenter = Math.ceil( curLane.node.offsetHeight / 2 ) + curLane.node.offsetTop;
        props.pos = [safePosX, laneCenter];

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
			props,
            laneIndex;
		while ( that.obstacles.length && that.obstacles.length > amount ) {
			that.obstacles[that.obstacles.length - 1].destroy();
		}
		while ( that.obstacles.length < amount ) {
            laneIndex = utils.random.number( 0, that.lanes.length - 1 );
			props = {
                lanes: [laneIndex],
				size: [5, that.lanes[laneIndex].params.width - 2],
				speedLimit: utils.random.number( 5, 15 ) / 10
			};
			props.pos = [utils.random.number( 0, that.params.visibleLength - props.size[1] ), that.lanes[laneIndex].node.offsetTop];

			that.add( new SpeedZone( props ) );
		}
	};
	Road.prototype.getLastVehicle = function( lane ){
		var that = this,
			i = that.vehicles.length,
			lastVehicle = null;
		for ( ; i--; ) {
			if ( that.vehicles[i].params.lanes.indexOf( lane ) !== -1 ) {
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
				density: Math.round( 100 * that.vehicles.length * ( ( MAX_VEHICLE_WIDTH - MIN_VEHICLE_WIDTH ) / 2 + 30 ) / ( that.roadLength * that.lanes.length ) )
			},
			maxVehicleSpeed = 0;
		that.vehicles.forEach( function( v, i ){
			stats.avSpeed = ( ( stats.avSpeed * i ) + v.params.speed ) / ( i + 1 );
			maxVehicleSpeed = Math.max( maxVehicleSpeed, v.params.speed );
		} );
		stats.avSpeed = Math.round( 100 * stats.avSpeed / maxVehicleSpeed );

		utils.pubsub.publish( 'road.stats', stats );
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
		var that = this,
            trafficLightsHeight,
            i = -1, l,
            lanes = ( function(){
                var result = [],
                    i = -1,
                    l = that.lanes.length;
                for ( ; ++i < l; ) {
                    result.push( i );
                }
                return result;
            } )(),
            DISTANCE_BETWEEN_LIGHTS = 60;
		if ( on ) {
			if ( !that.trafficLights.length ) {
                trafficLightsHeight = that.layers.lanes.offsetHeight - 2;
				that.add( new TrafficLights( {
                    lanes: lanes,
					size: [5, trafficLightsHeight],
					pos: [Math.floor( ( that.roadLength - DISTANCE_BETWEEN_LIGHTS ) / 2 ), 0]
				} ) );
                
                that.add( new TrafficLights( {
					lanes: lanes,
                    size: [5, trafficLightsHeight],
					pos: [Math.floor( ( that.roadLength + DISTANCE_BETWEEN_LIGHTS ) / 2 ), 0]
				} ) );
			}
		} else {
            while( that.trafficLights.length ) {
                that.trafficLights[0].destroy();
            }
		}
	};

	window.TJRoad = Road;

} )();