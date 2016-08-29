

// create
// render
// update
// updateSensors
// collideSensors
// collideCheckpoints



// create
// render

define(
	[
          '../gl-context.js'

        , 'webgl/gl-matrix-2.1.0' // in /lib

		, 'cannon.min' // in /lib

		, './world.js'

        , '../geometries/geometryColor.js'
        , '../geometries/createCubeVertices.js'

        , '../utils/keyboardHandler.js'
	],
	function(
          gl

        , glm

		, unused_CANNON // <- use CANNON

		, world

        , createGeometryColor
        , createCubeVertices

        , createKeyboardHandler
	)
{
	function createCar()
	{

		//
		//
		//
		// UTILS

	    glm.post_mult = function (in_mat, in_v)
	    {
	        var d = 1.0 / ( in_mat[ 3] * in_v[0] +
	                        in_mat[ 7] * in_v[1] +
	                        in_mat[11] * in_v[2] +
	                        in_mat[15] );

	        return [
	            (in_mat[ 0] * in_v[0] + in_mat[ 4] * in_v[1] + in_mat[ 8] * in_v[2] + in_mat[12]) * d,
	            (in_mat[ 1] * in_v[0] + in_mat[ 5] * in_v[1] + in_mat[ 9] * in_v[2] + in_mat[13]) * d,
	            (in_mat[ 2] * in_v[0] + in_mat[ 6] * in_v[1] + in_mat[10] * in_v[2] + in_mat[14]) * d
	        ];
	    }

		//
		//
		//
		// PHYSIC

	    var mass = 150;
	    // var vehicle;

	    var chassisShape;
	    chassisShape = new CANNON.Box(new CANNON.Vec3(2, 1,0.5));
	    this._chassisBody = new CANNON.Body({ mass: mass });
	    this._chassisBody.addShape(chassisShape);
	    this._chassisBody.position.set(-10, 5, 7);
	    // this._chassisBody.position.set(0, 0, 14);
	    this._chassisBody.angularVelocity.set(0, 0, 0.5);

	    this._chassisBody.collisionFilterGroup = 0;
	    this._chassisBody.collisionFilterMask = 0;



	    var options = {
	        radius: 0.5,
	        directionLocal: new CANNON.Vec3(0, 0, -1),
	        suspensionStiffness: 30,
	        suspensionRestLength: 0.3,
	        frictionSlip: 5,
	        dampingRelaxation: 2.3,
	        dampingCompression: 4.4,
	        maxSuspensionForce: 100000,
	        rollInfluence:  0.01,
	        axleLocal: new CANNON.Vec3(0, 1, 0),
	        chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
	        maxSuspensionTravel: 0.3,
	        customSlidingRotationalSpeed: -30,
	        useCustomSlidingRotationalSpeed: true
	    };

	    // Create the vehicle
	    this._vehicle = new CANNON.RaycastVehicle({ chassisBody: this._chassisBody });

	    options.chassisConnectionPointLocal.set(1, 1, 0);
	    this._vehicle.addWheel(options);

	    options.chassisConnectionPointLocal.set(1, -1, 0);
	    this._vehicle.addWheel(options);

	    options.chassisConnectionPointLocal.set(-1, 1, 0);
	    this._vehicle.addWheel(options);

	    options.chassisConnectionPointLocal.set(-1, -1, 0);
	    this._vehicle.addWheel(options);

	    this._vehicle.addToWorld(world);

	    this._wheelBodies = [];
	    for (var i = 0; i < this._vehicle.wheelInfos.length; i++)
	    {
	        var wheel = this._vehicle.wheelInfos[i];
	        var cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
	        var wheelBody = new CANNON.Body({ mass: 0 });
	        wheelBody.type = CANNON.Body.KINEMATIC;
	        wheelBody.collisionFilterGroup = 0; // turn off collisions

	        // var q = new CANNON.Quaternion();
	        // q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
	        // wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
	        this._wheelBodies.push(wheelBody);

	        world.addBody(wheelBody);
	    }

		//
		//
		//
		// RENDER

        var vertices = createCubeVertices([4,2,1],[1,0,0]);
	    this._geom_cube = new createGeometryColor(vertices, gl.LINES);

	    var vertices = createCubeVertices([1,0.5,1],[1,1,0]);
	    this._geom_cubeWheel = new createGeometryColor(vertices, gl.LINES);

		//
		//
		//
		// EVENT

        this._keybrdHdl = new createKeyboardHandler();
    	this._keybrdHdl.activate();

        //
        //
        //
        // SENSORS

        this._sensors = [];

        // var angles = [
        //     -Math.PI/2.0,
        //     -Math.PI/4.0,
        //     0.0,
        //     Math.PI/4.0,
        //     Math.PI/2.0
        // ];

        var angles = [
            -Math.PI/4.0,
            -Math.PI/8.0,
            0.0,
            Math.PI/8.0,
            Math.PI/4.0,
        ];

        // var angles = [
        //     -Math.PI/8.0,
        //     -Math.PI/16.0,
        //     0.0,
        //     Math.PI/16.0,
        //     Math.PI/8.0,
        // ];

        var elevations = [-3, 0, 3];

        for (var j = 0; j < elevations.length; ++j)
            for (var i = 0; i < angles.length; ++i)
            {
                var sensor = {
                      angle: angles[i]
                    , elevation: elevations[j]
                    , value: 1
                    , from: [0,0,0]
                    , to: [0,0,0]
                };

                this._sensors.push(sensor);
            }

        //
        //
        //
        // LOGIC

        this.reset();
	}

	//
	//

	//
	//

	//
	//

	//
	//

	createCar.prototype.processEvent = function()
	{
        var maxSteerVal = 0.5;
        var maxForce = 1000;
        var brakeForce = 1000000;


        if (this._keybrdHdl.isPressed( this._keybrdHdl.keyCodes.KEY_R ))
        {
            this.reset();
        }


        // look up
        if (this._keybrdHdl.isPressed( this._keybrdHdl.keyCodes.ARROW_UP ))
        {
            this._vehicle.applyEngineForce(-maxForce, 0);
            this._vehicle.applyEngineForce(-maxForce, 1);
        }
        // look down
        else if (this._keybrdHdl.isPressed( this._keybrdHdl.keyCodes.ARROW_DOWN ))
        {
            this._vehicle.applyEngineForce(maxForce, 0);
            this._vehicle.applyEngineForce(maxForce, 1);
        }
        else
        {
            this._vehicle.applyEngineForce(0, 0);
            this._vehicle.applyEngineForce(0, 1);
        }

        // look left
        if (this._keybrdHdl.isPressed( this._keybrdHdl.keyCodes.ARROW_LEFT ))
        {
            this._vehicle.setSteeringValue(maxSteerVal, 0);
            this._vehicle.setSteeringValue(maxSteerVal, 1);
        }
        // look right
        else if (this._keybrdHdl.isPressed( this._keybrdHdl.keyCodes.ARROW_RIGHT ))
        {
            this._vehicle.setSteeringValue(-maxSteerVal, 0);
            this._vehicle.setSteeringValue(-maxSteerVal, 1);
        }
        else
        {
            this._vehicle.setSteeringValue(0, 0);
            this._vehicle.setSteeringValue(0, 1);
        }
    }

    //
    //

    createCar.prototype.processANN = function(in_ANN)
    {
        var input = [];

        for (var i = 0; i < this._sensors.length; ++i)
        // for (var i = 5; i < 10; ++i)
            input.push( this._sensors[i].value );

        var output = in_ANN.process( input );

        var steerValue = output[0];
        var speedValue = output[1];

        //
        //
        //

        var maxSteerVal = 0.5;
        var maxForce = 1000;
        var brakeForce = 1000000;


        // look up
        if (speedValue > 0.1)
        {
            this._vehicle.applyEngineForce(-maxForce, 0);
            this._vehicle.applyEngineForce(-maxForce, 1);
        }
        // look down
        else if (speedValue < -0.1)
        {
            this._vehicle.applyEngineForce(maxForce, 0);
            this._vehicle.applyEngineForce(maxForce, 1);
        }
        else
        {
            this._vehicle.applyEngineForce(0, 0);
            this._vehicle.applyEngineForce(0, 1);
        }

        // look left
        if (steerValue < -0.1)
        {
            this._vehicle.setSteeringValue(maxSteerVal, 0);
            this._vehicle.setSteeringValue(maxSteerVal, 1);
        }
        // look right
        else if (steerValue > 0.1)
        {
            this._vehicle.setSteeringValue(-maxSteerVal, 0);
            this._vehicle.setSteeringValue(-maxSteerVal, 1);
        }
        else
        {
            this._vehicle.setSteeringValue(0, 0);
            this._vehicle.setSteeringValue(0, 1);
        }
    }

    //
    //

    createCar.prototype.update = function()
    {
        if (!this._alive)
            return;

        var tmp_checkpoint_id = -1;

        { // raycast to get the checkpoints validation

            var pos = this._chassisBody.position;

            var result = new CANNON.RaycastResult();
            world.raycastClosest(
                new CANNON.Vec3(pos.x,pos.y,pos.z),
                new CANNON.Vec3(pos.x,pos.y,pos.z-10),
                { skipBackfaces: true },
                result
            );

            if (result.hasHit && result.body)
            {
                tmp_checkpoint_id = result.body.id;
                // result.body.id
            }

            // console.log(result.body.id);
            // console.log(result);
            // result.hasHit
            // result.hitPointWorld
        }

        {
            if (this._current_checkpoint_id < tmp_checkpoint_id)
            {
                this._min_update = 100;
                this._current_checkpoint_id = tmp_checkpoint_id;
                this._fitness++;
            }
            else
            {
                --this._min_update;
                if (tmp_checkpoint_id == -1)
                    --this._min_update

                if (this._min_update <= 0)
                    this._alive = false;
            }
        }

        this._updateModelMatrix();
        this._updateSensors();
	}

	//
	//

	//
	//

    createCar.prototype._updateModelMatrix = function()
    {
        this._modelMatrix = glm.mat4.create();

        var pos = this._chassisBody.position;
        glm.mat4.translate(this._modelMatrix,this._modelMatrix, [pos.x,pos.y,pos.z]);

        axisAndAngle = this._chassisBody.quaternion.toAxisAngle();
        axis = axisAndAngle[0];
        angle = axisAndAngle[1];
        glm.mat4.rotate(this._modelMatrix,this._modelMatrix, angle, [axis.x,axis.y,axis.z]);
    }

    createCar.prototype._updateSensors = function()
    {
        for (var i = 0; i < this._sensors.length; ++i)
        {
            var angle = this._sensors[i].angle;
            var elevation = this._sensors[i].elevation;

            var pos1 = [0, 0, 0];
            // var pos2 = [20*Math.cos(angle), 20*Math.sin(angle), 0];
            var pos2 = [20*Math.cos(angle), 20*Math.sin(angle), elevation];

            var pos_from = glm.post_mult(this._modelMatrix, pos1)
            var pos_to = glm.post_mult(this._modelMatrix, pos2)

            var pos = this._chassisBody.position;

            var result = new CANNON.RaycastResult();
            world.raycastClosest(
                new CANNON.Vec3(pos_from[0],pos_from[1],pos_from[2]),
                new CANNON.Vec3(pos_to[0],pos_to[1],pos_to[2]),
                {
                    skipBackfaces: false,
                    collisionFilterGroup: world._GROUP_sensor,
                    collisionFilterMask: world._GROUP_wall
                },
                result
            );

            if (result.hasHit)
                pos_to = [result.hitPointWorld.x, result.hitPointWorld.y, result.hitPointWorld.z];

            //
            //

            var diff = [
                pos_to[0]-pos_from[0],
                pos_to[1]-pos_from[1],
                pos_to[2]-pos_from[2]
            ];

            var length = Math.sqrt(diff[0]*diff[0] + diff[1]*diff[1] + diff[2]*diff[2]);

            this._sensors[i].value = length / 20;
            this._sensors[i].from = pos_from;
            this._sensors[i].to = pos_to;
        }
    }

	//
	//

	//
	//

	createCar.prototype.render = function(in_shader_color, in_viewMatrix)
	{
        if (!this._alive)
            return;

        //
        //
        // render chassis

        var tmp_modelViewMatrix = glm.mat4.create();
        glm.mat4.mul(tmp_modelViewMatrix, in_viewMatrix, this._modelMatrix);

        gl.uniformMatrix4fv(in_shader_color.uMVMatrix, false, tmp_modelViewMatrix);

        this._geom_cube.render(in_shader_color);

        //
        //
        // render wheel

        for (var i = 0; i < this._vehicle.wheelInfos.length; i++)
        {
			//
			//
			// update wheelBody

            this._vehicle.updateWheelTransform(i);
            var t = this._vehicle.wheelInfos[i].worldTransform;
            var wheelBody = this._wheelBodies[i];
            wheelBody.position.copy(t.position);
            wheelBody.quaternion.copy(t.quaternion);

			//
			//
			// render wheel

            var tmp_mvMatrix2 = glm.mat4.create();

            var pos = wheelBody.position;
            glm.mat4.translate(tmp_mvMatrix2,in_viewMatrix, [pos.x,pos.y,pos.z]);

            axisAndAngle = wheelBody.quaternion.toAxisAngle();
            axis = axisAndAngle[0];
            angle = axisAndAngle[1];
            glm.mat4.rotate(tmp_mvMatrix2,tmp_mvMatrix2, angle, [axis.x,axis.y,axis.z]);

            gl.uniformMatrix4fv(in_shader_color.uMVMatrix, false, tmp_mvMatrix2);

            this._geom_cubeWheel.render(in_shader_color);
        }
    }

    //
    //

    //
    //

    createCar.prototype.render_sensors = function(in_shader_color)
    {
        if (!this._alive)
            return;

        { // raycast to get the checkpoints validation

            for (var i = 0; i < this._sensors.length; ++i)
            {
                render_line(this._sensors[i].from, this._sensors[i].to);

                // render_cross(this._sensors[i].to);
            }
        }

        function render_cross(in_pos)
        {
            var vertices = [];

            var cross_size = 2;

            vertices.push(in_pos[0]-cross_size,in_pos[1],in_pos[2],  0,1,0);
            vertices.push(in_pos[0]+cross_size,in_pos[1],in_pos[2],  0,1,0);
            vertices.push(in_pos[0],in_pos[1]-cross_size,in_pos[2],  0,1,0);
            vertices.push(in_pos[0],in_pos[1]+cross_size,in_pos[2],  0,1,0);
            vertices.push(in_pos[0],in_pos[1],in_pos[2]-cross_size,  0,1,0);
            vertices.push(in_pos[0],in_pos[1],in_pos[2]+cross_size,  0,1,0);

            var cross_geom = new createGeometryColor(vertices, gl.LINES);

            cross_geom.render(in_shader_color);

            cross_geom.dispose();
        }

        function render_line(in_from, in_to)
        {
            var vertices = [];

            var cross_size = 2;

            vertices.push(in_from[0],in_from[1],in_from[2],  0,1,0);
            vertices.push(in_to[0],in_to[1],in_to[2],  0,1,0);

            var cross_geom = new createGeometryColor(vertices, gl.LINES);

            cross_geom.render(in_shader_color);

            cross_geom.dispose();
        }
	}

    //
    //

    createCar.prototype.reset = function()
    {
        this._chassisBody.position.set(-10, 5, 7);
        this._chassisBody.quaternion.set(0,0,0,1);

        this._chassisBody.velocity.set(0, 0, 0);
        this._chassisBody.angularVelocity.set(0, 0, 0);

        this._chassisBody.force.set(0, 0, 0);
        this._chassisBody.torque.set(0, 0, 0);

        this._alive = true;
        this._current_checkpoint_id = -1;
        this._min_update = 100;
        this._fitness = 0;
    }


	return createCar;
});