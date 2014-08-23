(function(){

    /* global window, document, utils, TJ */
    
	'use strict';

    // Meter object constructor
	var Meter = function(el){
			var type = el.dataset.stat,
				scaleNode = el.querySelector('i'),
                maxNode = el.querySelector('.max');
			utils.pubsub.subscribe('road.stats', function(stats){
				var key;
				for (key in stats) {
					if (stats.hasOwnProperty(key) && key === type) {
						scaleNode.style.width = stats[key].value + '%';
                        if (maxNode && stats[key].max) {
                            maxNode.innerHTML = stats[key].max;
                        }
					}
				}
			});
		},
        
        field = document.querySelector('.field'),
        // initialize road object
		road = new TJ.Road(document.querySelector('.road') , {
            visibleLength: field.offsetWidth
        });
    
    road.addLane({ dir: 'right' });
    road.addLane({ dir: 'right' });
    road.addLane({ dir: 'left' });
    road.addLane({ dir: 'left' });
    
	// initialize controls
    (function controlsInit(container){

		var controls = container.querySelectorAll('[data-control]');
		
		container.addEventListener('change', function(e){
			var control = e.target,
				type = control.dataset.control;
			switch (type) {
				case 'start':
					road.toggleTraffic(control.checked);
					if (control.checked) {
						animationLoop();
					} else {
                        control.disabled = true;
                        utils.pubsub.subscribe('road.isEmpty', handleEmptyRoad.bind(control));
                    }
					break;
				case 'obstacles':
					road.generateObstacles(parseInt(control.value, 10));
					break;
				case 'trafficLights':
					road.toggleTrafficLights(control.checked);
					break;
			}
		});
        
        function handleEmptyRoad(){
            utils.pubsub.unsubscribe('road.isEmpty', handleEmptyRoad);
            this.disabled = false;
        }

	})(document.querySelector('.controls'));

	// create Meter objects
	[].forEach.call(document.querySelectorAll('.stats .meter'), function(el){
		el.dataset.Meter = new Meter(el);
	});

    // controls road objects animation
	function animationLoop(){
		
		var obstacles = road.obstacles.concat(road.trafficLights);

		// loop through vehicles
        road.vehicles.forEach(function(v, i){
			var isWayFree = true;

			if (v.state.get('isStopped') && v.state.get('isStopped').value) return;

			// checks if way is free of obstacles
			obstacles.forEach(function(o){
                if (!utils.vectors.intersect(v.params.lanes, o.params.lanes)) return;
                
				// if obstacle is left behind
				if (v.pos.l > o.pos.r && v.params.dir === 'right' ||
					v.pos.r < o.pos.l && v.params.dir === 'left') {
					return;
				} else if (
                    v.getBrakingDistance(o.params.speedLimit) >= (
                        v.params.dir === 'right' ?
                            (o.pos.l - v.pos.r) :
                            (v.pos.l - o.pos.r)
                    )
                ){
					// if obstacle is right ahead
					isWayFree = false;
				} else if (v.params.speed + v.params.boost > road.countSafeSpeed(v, o)) {
					// if vehicle is just over obstacle
					isWayFree = false;
				}
			});
            
            // checks if way is free of vehicles
            (function handleOtherVehicles() {
                var i,
                    closestVehicle,
                    brakingDistance;

                if (v.state.get('isStopped') && v.state.get('isStopped').value) return;
                
                closestVehicle = road.getClosestVehicle(v);

                if (!closestVehicle) return;
                // check for crash
                if (v.isOverlaying(closestVehicle)) {
                    closestVehicle.crash();
                    v.crash();
                } else {
                    brakingDistance = v.getBrakingDistance(closestVehicle.params.speed + closestVehicle.params.braking);
                    if (brakingDistance + road.params.minDistance >= (v.params.dir === 'right' ?
                            (closestVehicle.pos.l - v.pos.r) :
                            (v.pos.l - closestVehicle.pos.r))
                   ) {
                        // if vehicle is right ahead
                        isWayFree = false;
                    }
                }
            })();
                
            if (v.state.get('isStopped') && v.state.get('isStopped').value) return;
            
            v.drive({
                isWayFree: isWayFree
            });

			// destroy if out of screen
			if (v.pos.l > road.roadLength && v.params.dir === 'right' ||
				v.pos.r < 0 && v.params.dir === 'left') {
				v.destroy();
			}

		});
        
        road.publishStats();

		if (road.enabled || road.vehicles.length) {
			window.requestAnimationFrame(animationLoop);
		} else {
            utils.pubsub.publish('road.isEmpty');
        }
	}
    
})();