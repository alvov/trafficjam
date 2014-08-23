(function(){
    
    /* global window, document, utils, TJ */

	'use strict';

    /**
	 * Vehicle constructor
     * @extends RoadObject
	 */
	var Vehicle = function(params){
		// Constructor
		TJ.RoadObject.call(this, params);

		if (!this.params.color) {
			this.params.color = utils.random.color();
		}
		this.render();
	};
	Vehicle.prototype = Object.create(TJ.RoadObject.prototype);
	utils.extend(Vehicle.prototype, {
		constructor: Vehicle,
        // Returns offset of the vehicle
        // @overrides RoadObject.getPos
        getPos: function() {
			return {
				t: this.params.pos[1] - Math.ceil(this.params.size[1] / 2),
				r: this.params.pos[0] + this.params.size[0],
				b: this.params.pos[1] + Math.ceil(this.params.size[1] / 2),
				l: this.params.pos[0]
			};
		},
        
        // Creates node object for vehicle
		render: function(){
			this.node = document.createElement('div');
			
            this.vehicleBody = document.createElement('b');
            this.vehicleBody.style.width = this.params.size[0] + 'px';
			this.vehicleBody.style.height = this.params.size[1] + 'px';
            this.vehicleBody.style.fontSize = this.params.size[1] + 'px';
            this.vehicleBody.style.marginTop =  - Math.ceil(this.params.size[1] / 2) + 'px';
			this.vehicleBody.style.backgroundColor = this.params.color;
            
			this.node.appendChild(this.vehicleBody);
			this.node.className = 'v';
			this.drive({});
		},
        
        // Moves the vehicle according to its speed
		drive: function(params){
            var shift,
                distance;
            
            this.state.set('isStopped', false);
            
            params = utils.extend({
                isWayFree: true
            }, params);

            // boost if needed
			if (params.isWayFree) {
                if (this.params.speed < this.params.maxSpeed) {
                    this.params.speed = Math.min(this.params.speed + this.params.boost, this.params.maxSpeed);
                }
			} else {
                this.params.speed = Math.max(0, this.params.speed + this.params.braking);
            }
            
			// move according to current speed
			shift = [this.params.speed * (this.params.dir === 'right' ? 1 : -1), 0];
            
			if (undefined !== shift) {
                if (shift[0] && shift[1]) {
                    distance = Math.sqrt(Math.pow(shift[0], 2) + Math.pow(shift[1], 2));
                    this.params.rotate = Math.asin(shift[1] / distance) * 180 / Math.PI;
                }

				this.params.pos = utils.vectors.add(this.params.pos, shift);
				this.pos = this.getPos();
                this.node.style.transform = 'translate(' + this.params.pos[0] + 'px,' + this.params.pos[1] + 'px)';
                this.vehicleBody.style.transform = 'rotateZ(' + this.params.rotate + 'deg)';
			}
		},
        
		// Stops the vehicle
        stop: function(){
        	this.state.set('isStopped', true);
            this.params.speed = 0;
		},
        
        // Returns distance required to lower speed to a given limit
		getBrakingDistance: function(speedLimit){
			var brakingTime;
			if (this.params.speed <= speedLimit) return -Infinity;
			brakingTime = (speedLimit - this.params.speed) / this.params.braking;
			return brakingTime * (this.params.speed + (this.params.braking * (1 + brakingTime)) / 2);
		},
        
        // Returns true if vehicle is overlaying given object
		isOverlaying: function(roadObj) {
			return ((this.pos.r < roadObj.pos.r && this.pos.r > roadObj.pos.l) || (roadObj.pos.r < this.pos.r && roadObj.pos.r > this.pos.l));
		},
        
        // Stops the vehicle and marks it as crashed
		crash: function(){
			if (this.state.get('isStopped') && this.state.get('isStopped').value) return;
			this.stop();
			this.node.classList.add('crashed');
			setTimeout((function(){
				this.destroy();
			}).bind(this), 10000);
		}
	});
    
	window.TJ.Vehicle = Vehicle;
    
})();