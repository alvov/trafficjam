(function() {
    
    /* global window, document, utils, TJ */

	'use strict';

	var Road,
        
        MIN_VEHICLE_SPEED = 3,
        MIN_VEHICLE_WIDTH = 30,
        MAX_VEHICLE_WIDTH = 45,
        NEW_VEHICLE_PERIOD = 1250;

	/**
	 * Main road object
	 */
	Road = function(node, params){
		this.node = node;
        this.node.style.width = this.node.style.outerWidth + 'px';
		this.roadLength = node.offsetWidth;
		this.params = utils.extend({
            visibleLength: this.roadLength,
            maxSpeed: 7,
            minDistance: 100
        }, params);
		this.layers = {
            lanes: this.node.querySelector('.lanes'),
			obstacles: this.node.querySelector('.obstacles'),
			vehicles: this.node.querySelector('.vehicles')
		};
        this.lanes = [];
		this.vehicles = [];
		this.obstacles = [];
		this.trafficLights = [];
		this.enabled = false;
		utils.pubsub.subscribe('roadobj.destroy', this.remove.bind(this));
	};
    
    // Adds a lane to the road
    Road.prototype.addLane = function(params){
        var lane = new TJ.RoadLane(params);
        if (params.dir === 'right' || !this.lanes.length) {
            this.layers.lanes.appendChild(lane.node);
            this.lanes.push(lane);
        } else {
            this.layers.lanes.insertBefore(lane.node, this.layers.lanes.childNodes[0]);
            this.lanes.unshift(lane);
        }
        this.node.style.marginTop = - Math.floor(this.layers.lanes.offsetHeight / 2) + 'px';
    };
    
    // Adds road object to the road
    Road.prototype.add = function(roadObj){
		if (roadObj instanceof TJ.Vehicle) {
			this.layers.vehicles.appendChild(roadObj.node);
			this.vehicles.push(roadObj);
		} else if (roadObj instanceof TJ.TrafficLights) {
			this.layers.obstacles.appendChild(roadObj.node);
			this.trafficLights.push(roadObj);
		} else if (roadObj instanceof TJ.SpeedZone) {
			this.layers.obstacles.appendChild(roadObj.node);
			this.obstacles.push(roadObj);
		}
	};
    
    // Removes road object from the road
	Road.prototype.remove = function(roadObj){
		var i = -1, l,
            roadObjects = [];
        
        roadObj.node.remove();
        
		if (roadObj instanceof TJ.Vehicle) {
            roadObjects = this.vehicles;
		} else if (roadObj instanceof TJ.TrafficLights) {
            roadObjects = this.trafficLights;
		} else if (roadObj instanceof TJ.SpeedZone) {
            roadObjects = this.obstacles;
		}
        l = roadObjects.length;
        for (; ++i < l;) {
            if (roadObjects[i] === roadObj) {
                roadObjects.splice(i, 1);
                break;
            }
        }
	};

    // Returns maximum speed allowed concidering a given obstacle
	Road.prototype.countSafeSpeed = function(v, o) {
		return v.isOverlaying(o) ? o.params.speedLimit : v.params.maxSpeed;
	};
    
    // Repeatedly generates new vehicles on the road
	Road.prototype.generateVehicles = function(){
		var that = this,
			safePosX,
            laneIndex = utils.random.number(0, that.lanes.length - 1),
            curLane = that.lanes[laneIndex],
            laneCenter,
			props = {
                lanes: [laneIndex],
                dir: curLane.params.dir,
                size: [utils.random.number(MIN_VEHICLE_WIDTH, MAX_VEHICLE_WIDTH), utils.random.number(20, 25)],
				speed: 0,
				maxSpeed: utils.random.number(MIN_VEHICLE_SPEED, that.params.maxSpeed),
				boost: utils.random.number(1, 10) / 100
			},
			lastVehicle = that.getLastVehicle(props.lanes[0]);

		props.braking = -utils.random.number(2, 5) * props.boost;
        
        switch(curLane.params.dir){
            case 'right':
                props.rotate = 0;
                if (lastVehicle) {
                    safePosX = Math.min(0, lastVehicle.pos.l - that.params.minDistance - props.size[0]);
                } else {
                    safePosX = 0;
                }
                break;
            case 'left':
                props.rotate = 180;
                if (lastVehicle) {
                    safePosX = Math.max(that.roadLength, lastVehicle.pos.r + that.params.minDistance);
                } else {
                    safePosX = that.roadLength;
                }
                break;
            default:
                props.rotate = 0;
                safePosX = 0;
        }

        laneCenter = Math.ceil(curLane.node.offsetHeight / 2) + curLane.node.offsetTop;
        props.pos = [safePosX, laneCenter];

		that.add(new TJ.Vehicle(props));
        
		if (that.enabled) {
			setTimeout(function(){
				that.generateVehicles();
			}, Math.round(utils.random.number(NEW_VEHICLE_PERIOD, NEW_VEHICLE_PERIOD + 500) / that.lanes.length));
		}
	};
    
    // Generates given amount of obstacles
	Road.prototype.generateObstacles = function(amount){
		var that = this,
			safePos,
			props,
            laneIndex;
		while (that.obstacles.length && that.obstacles.length > amount) {
			that.obstacles[that.obstacles.length - 1].destroy();
		}
		while (that.obstacles.length < amount) {
            laneIndex = utils.random.number(0, that.lanes.length - 1);
			props = {
                lanes: [laneIndex],
				size: [5, that.lanes[laneIndex].params.width - 2],
				speedLimit: utils.random.number(5, 15) / 10
			};
			props.pos = [utils.random.number(0, that.params.visibleLength - props.size[1]), that.lanes[laneIndex].node.offsetTop];

			that.add(new TJ.SpeedZone(props));
		}
	};
    
    // Returns last vehicle on a given lane
	Road.prototype.getLastVehicle = function(laneIndex){
		var i = this.vehicles.length,
			lastVehicle = null;
		for (; i--;) {
			if (this.vehicles[i].params.lanes.indexOf(laneIndex) !== -1) {
				lastVehicle = this.vehicles[i];
				break;
			}
		}
		return lastVehicle;
	};
    
    // Updates traffic statistics
	Road.prototype.publishStats = function(){
		var that = this,
			stats = {
				avSpeed: {
                    value: 0,
                    max: that.params.maxSpeed
                },
				density: {
                    value: Math.round(
                        100 * that.vehicles.length * ((MAX_VEHICLE_WIDTH - MIN_VEHICLE_WIDTH) / 2 + that.params.minDistance) / 
                        (that.roadLength * that.lanes.length)
                    ),
                    max: Math.floor(
                        (that.roadLength * that.lanes.length) / ((MAX_VEHICLE_WIDTH - MIN_VEHICLE_WIDTH) / 2 + that.params.minDistance)
                    )
                }
			};
		that.vehicles.forEach(function(v, i){
			stats.avSpeed.value = ((stats.avSpeed.value * i) + v.params.speed) / (i + 1);
		});
		stats.avSpeed.value = Math.round(100 * stats.avSpeed.value / stats.avSpeed.max);

		utils.pubsub.publish('road.stats', stats);
	};
    
    // Toggles road vehicles
	Road.prototype.toggleTraffic = function(on){
		var that = this;
		if (on === that.enabled) {
			return;
		} else {
			this.enabled = on;
			if (on) {
				that.generateVehicles();
			}
		}
	};
    
    // Toggles road traffic lights
	Road.prototype.toggleTrafficLights = function(on){
		var that = this,
            trafficLightsHeight,
            i = -1, l,
            lanes = (function(){
                var result = [],
                    i = -1,
                    l = that.lanes.length;
                for (; ++i < l;) {
                    result.push(i);
                }
                return result;
            })(),
            DISTANCE_BETWEEN_LIGHTS = 60;
		if (on) {
			if (!that.trafficLights.length) {
                trafficLightsHeight = that.layers.lanes.offsetHeight - 2;
				that.add(new TJ.TrafficLights({
                    lanes: lanes,
					size: [5, trafficLightsHeight],
					pos: [Math.floor((that.roadLength - DISTANCE_BETWEEN_LIGHTS) / 2), 0]
				}));
                
                that.add(new TJ.TrafficLights({
					lanes: lanes,
                    size: [5, trafficLightsHeight],
					pos: [Math.floor((that.roadLength + DISTANCE_BETWEEN_LIGHTS) / 2), 0]
				}));
			}
		} else {
            while(that.trafficLights.length) {
                that.trafficLights[0].destroy();
            }
		}
	};
    
    // Returns closest vehicle ahead of a given vehicle on a given lane
    Road.prototype.getClosestVehicle = function(curVehicle, laneIndex){
        var closestVehicle = null,
            i = this.vehicles.length;
		for (; i--;) {
            if (
                curVehicle === this.vehicles[i] ||
                !utils.vectors.intersect(curVehicle.params.lanes, this.vehicles[i].params.lanes)
            ) continue;
            
            // if vehicle is left behind
            if (curVehicle.pos.l > this.vehicles[i].pos.r && curVehicle.params.dir === 'right' ||
                curVehicle.pos.r < this.vehicles[i].pos.l && curVehicle.params.dir === 'left') {
                continue;
            }
            
            if (!closestVehicle ||
                (curVehicle.params.dir === 'right' && (this.vehicles[i].pos.l - curVehicle.pos.r) < (closestVehicle.pos.l - curVehicle.pos.r)) ||
                (curVehicle.params.dir === 'left' && (curVehicle.pos.l - this.vehicles[i].pos.r) < (curVehicle.pos.l - closestVehicle.pos.r))
           ) {
                closestVehicle = this.vehicles[i];
            }
        }
        return closestVehicle;
    };

	window.TJ.Road = Road;

})();