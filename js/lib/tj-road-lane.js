(function(){

    /* global window, document, utils, TJ */

	'use strict';

    /**
     * Road lane constructor
     */
    var RoadLane = function(params){
        this.params = utils.extend({
            dir: 'right',
            width: 25
		}, params);
		this.render();
    };
    
    // Renders lane node
    RoadLane.prototype.render = function(){
        this.node = document.createElement('div');
        this.node.className = 'lane';
        this.node.style.height = this.params.width + 'px';
    };
    
    window.TJ.RoadLane = RoadLane;

})();