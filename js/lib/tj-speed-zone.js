(function(){

    /* global window, document, utils, TJ */

	'use strict';

    /**
	 * Speed limited zone constructor
     * @extends RoadObject
	 */
	var SpeedZone = function(params){
		// Constructor
		TJ.RoadObject.call(this, params);
		this.pos = this.getPos();
		this.render();
	};
	SpeedZone.prototype = Object.create(TJ.RoadObject.prototype);
	utils.extend(SpeedZone.prototype, {
		constructor: SpeedZone,
		render: function(){
			this.node = document.createElement('s');
			this.node.style.width = this.params.size[0] + 'px';
			this.node.style.height = this.params.size[1] + 'px';
			this.node.style.left = this.params.pos[0] + 'px';
			this.node.style.top = this.params.pos[1] + 'px';
		}
	});
    
    window.TJ.SpeedZone = SpeedZone;

})();