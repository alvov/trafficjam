(function() {
    
    /* global window, document, utils, TJ */

	'use strict';

    /**
	 * Road object constructor
	 */
	var RoadObject = function(params){
		this.params = params;
        this.state = (function(){
            var states = {};
            return {
                set: function(name, value, callback) {
                    if (undefined === states[name]) {
                        states[name] = {
                            value: value,
                            callback: callback
                        };
                    } else {
                        states[name].value = value;
                        if (typeof callback === 'function') {
                            states[name].callback = callback;
                        }
                    }
                    if (typeof states[name].callback === 'function') {
                        states[name].callback(value);
                    }
                },
                get: function(name){
                    return states[name];
                }
            };
        })();
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
			utils.pubsub.publish('roadobj.destroy', this);
		}
	};

	window.TJ.RoadObject = RoadObject;
    
})();