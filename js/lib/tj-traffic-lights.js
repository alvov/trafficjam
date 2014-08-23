(function(){

    /* global window, document, utils, TJ */

	'use strict';

    /**
     * Traffic lights zone constructor
     * @extends SpeedZone
     */
	var TrafficLights = function(params){
        var that = this,
            lights = [
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
		// Constructor
		TJ.SpeedZone.call(this, params);
		if (undefined === this.params.currentLight) {
			this.params.currentLight = 0;
		}
		this.changeLightsTimer = null;
        
        this.state.set('light', this.params.currentLight, function(value){
            var nextLight;

			that.params.currentLight = value;
			that.params.speedLimit = lights[value].speedLimit;
			that.node.className = lights[value].type;
			nextLight = (value + 1 >= lights.length) ? 0 : value + 1;

			that.changeLightsTimer = setTimeout(function(){
				that.state.set('light', nextLight);
			}, lights[value].duration);
        });
	};
	TrafficLights.prototype = Object.create(TJ.SpeedZone.prototype);
	utils.extend(TrafficLights.prototype, {
		constructor: TrafficLights,
		destroy: function(){
			if (this.changeLightsTimer) {
				clearTimeout(this.changeLightsTimer);
				this.changeLightsTimer = null;
			}
			utils.pubsub.publish('roadobj.destroy', this);
		}
	});
    
    window.TJ.TrafficLights = TrafficLights;

})();