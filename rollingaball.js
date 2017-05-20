	var gl, Score, ctx;
//----------------------------------SHADER-------------------------
    function initGL(canvas) {
        try {
            gl = canvas.getContext("experimental-webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
			Score = document.getElementById('Score');
			ctx = Score.getContext("2d");
        } catch (e) {
        }
        if (!gl) {
            alert("Could not initialise WebGL, sorry :-(");
        }
    }


    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }


    var shaderProgram;

    function initShaders() {
        var fragmentShader = getShader(gl, "shader-fs");
        var vertexShader = getShader(gl, "shader-vs");

        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

        shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
		
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
		
        shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
		
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
    }
//-------------------TEXTURE--------------------------------------------------------------------------------------------
    function handleLoadedTexture(texture) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    var boardTexture, cubeTexture, ballTexture;
    function initTexture() {
        boardTexture = gl.createTexture();
        boardTexture.image = new Image();
        boardTexture.image.onload = function () {
            handleLoadedTexture(boardTexture)
        }
        boardTexture.image.src = "src/board.jpg";

        cubeTexture = gl.createTexture();
        cubeTexture.image = new Image();
        cubeTexture.image.onload = function () {
            handleLoadedTexture(cubeTexture)
        }
        cubeTexture.image.src = "src/cube.jpg";
		
        ballTexture = gl.createTexture();
        ballTexture.image = new Image();
        ballTexture.image.onload = function () {
            handleLoadedTexture(ballTexture)
        }
        ballTexture.image.src = "src/ball.jpg";
    }

    var mvMatrix = mat4.create();
    var pMatrix = mat4.create();
	
    function setMatrixUniforms() {
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

        var normalMatrix = mat3.create();
        mat4.toInverseMat3(mvMatrix, normalMatrix);
        mat3.transpose(normalMatrix);
        gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
    }

    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
	
	//----------------------------LIGHT-----------------------------------
	function light(){
		var lighting = document.getElementById("lighting").checked;
			gl.uniform1i(shaderProgram.useLightingUniform, lighting);
			if (lighting) {
				gl.uniform3f(
					shaderProgram.ambientColorUniform,
					parseFloat(0.2),
					parseFloat(0.2),
					parseFloat(0.2)
				);

				var lightingDirection = [
					parseFloat(-0.25),
					parseFloat(-0.25),
					parseFloat(-1.0)
				];
				var adjustedLD = vec3.create();
				vec3.normalize(lightingDirection, adjustedLD);
				vec3.scale(adjustedLD, -1);
				gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);

				gl.uniform3f(
					shaderProgram.directionalColorUniform,
					parseFloat(0.8),
					parseFloat(0.8),
					parseFloat(0.8)
				);
			}
	}
	//-----------------------------HANDLE------------------------------------------
	var x1 = 0;
	var z1 = 0;

    var Rot = 0;
	var stop = 0;

	var x = 0.0;
    var z = -5.0;
	var rCube = 0;
	var flag = 1;
	
	var check_rot = 0;
    var currentlyPressedKeys = {};

    function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
    }

    function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
    }

	var Speed = 0;

    function handleKeys() {
        if (currentlyPressedKeys[38]) {
            //Up
			if(z > -9.7){
				z -= 0.02;
				z1 += 0.02;
			}
			Speed = -90;
			check_rot = -1;
			stop = 1;
        }
        else if (currentlyPressedKeys[40]) {
            //Down
			if(z < -0.6){
				z += 0.02;
				z1 -= 0.02;
			}
            Speed = 90;
			check_rot = -1;
			stop = 1;
        }
        if (currentlyPressedKeys[37]) {
            // Left cursor key
			if(x > -3.4){
				x -= 0.02;
				x1 += 0.02;
			}
			Speed = 90;
			check_rot = 1;
			stop = 1;
        }
        else if (currentlyPressedKeys[39]) {
            // Right cursor key
			if(x < 3.4){
				x += 0.02;
				x1 -= 0.02;
			}
			Speed = -90;
			check_rot = 1;
			stop = 1;
        }
    }
//------------------------------BUFFER---------------------------------------------

    var boardVertexPositionBuffer;
    var boardVertexNormalBuffer;
    var boardVertexTextureCoordBuffer;
    var boardVertexIndexBuffer;

	var cubeVertexPositionBuffer;
    var cubeVertexNormalBuffer;
    var cubeVertexTextureCoordBuffer;
    var cubeVertexIndexBuffer;

	var ballVertexPositionBuffer;
    var ballVertexNormalBuffer;
    var ballVertexTextureCoordBuffer;
    var ballVertexIndexBuffer;

	
//-----------------------------------------CUBE------------------------------------
    function initBuffers() {
        cubeVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
        vertices = [
// Front face
            -0.1, 0.2, 0.1,
             0.1, 0.2, 0.1,
             0.1, 0.4, 0.1,
            -0.1, 0.4, 0.1,

            // Back face
            -0.1, 0.2, -0.1,
             0.1, 0.2, -0.1,
             0.1, 0.4, -0.1,
            -0.1, 0.4, -0.1,
			
            // Top face
			-0.1, 0.4, -0.1,
			 0.1, 0.4, -0.1,
             0.1, 0.4,  0.1,
			-0.1, 0.4,  0.1,

            // Bottom face
			-0.1, 0.2, -0.1,
			 0.1, 0.2, -0.1,
             0.1, 0.2,  0.1,
			-0.1, 0.2,  0.1,

            // Right face
             0.1, 0.4, -0.1,
			 0.1, 0.2, -0.1,
             0.1, 0.2,  0.1,
			 0.1, 0.4,  0.1,  
			
            // Left face
             -0.1, 0.4, -0.1,
			 -0.1, 0.2, -0.1,
             -0.1, 0.2,  0.1,
			 -0.1, 0.4,  0.1,  
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        cubeVertexPositionBuffer.itemSize = 3;
        cubeVertexPositionBuffer.numItems = 24;

        cubeVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
        var vertexNormals = [
            // Front face
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,

            // Back face
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,

            // Top face
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,

            // Bottom face
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,

            // Right face
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,

            // Left face
             -1.0,  0.0,  0.0,
             -1.0,  0.0,  0.0,
             -1.0,  0.0,  0.0,
             -1.0,  0.0,  0.0,

        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
        cubeVertexNormalBuffer.itemSize = 3;
        cubeVertexNormalBuffer.numItems = 24;

        cubeVertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
        var textureCoords = [
            // Front face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,

            // Back face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,

            // Top face
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,

            // Bottom face
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,

            // Right face
			0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,

            // Left face
			0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        cubeVertexTextureCoordBuffer.itemSize = 2;
        cubeVertexTextureCoordBuffer.numItems = 24;

        cubeVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
        var cubeVertexIndices = [
            0,  1,  2,    0,  2,  3,    // Front face
            4,  5,  6,    4,  6,  7,    // Back face
            8,  9,  10,   8,  10, 11,  // Top face
            12, 13, 14,   12, 14, 15, // Bottom face
            16, 17, 18,   16, 18, 19, // Right face
            20, 21, 22,   20, 22, 23  // Left face
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
        cubeVertexIndexBuffer.itemSize = 1;
        cubeVertexIndexBuffer.numItems = 36;

//-----------------------------------BOARD-------------------------------------------------
        boardVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, boardVertexPositionBuffer);
        vertices = [
		    // Front face
            -4.0, -1.0, 5.0,
             4.0, -1.0, 5.0,
             4.0, -0.5, 5.0,
            -4.0, -0.5, 5.0,

            // Back face
            -4.0, -1.0, -5.0,
             4.0, -1.0, -5.0,
             4.0, -0.5, -5.0,
            -4.0, -0.5, -5.0,

            // Top-front face
            -4.0, -0.5, 4.7,
            -4.0, -0.5, 5.0,
             4.0, -0.5, 5.0,
             4.0, -0.5, 4.7,
			 
			//top-back face
            -4.0, -0.5, -4.7,
            -4.0, -0.5, -5.0,
             4.0, -0.5, -5.0,
             4.0, -0.5, -4.7,
			 
			 //top-left face
			-4.0, -0.5, -4.7,
            -4.0, -0.5,  4.7,
            -3.7, -0.5,  4.7,
            -3.7, -0.5, -4.7,
			 
			 //top-right face
			 3.7, -0.5, -4.7,
             3.7, -0.5,  4.7,
             4.0, -0.5,  4.7,
             4.0, -0.5, -4.7,
			 
			 //fond-fond
			-4.0, -1.0, 4.7,
             4.0, -1.0, 4.7,
             4.0, -0.5, 4.7,
            -4.0, -0.5, 4.7,
			
			//back-back
			-4.0, -1.0, 4.7,
             4.0, -1.0, 4.7,
             4.0, -0.5, 4.7,
            -4.0, -0.5, 4.7,
			
            // Bottom face
            -4.0, -1.0, -5.0,
             4.0, -1.0, -5.0,
             4.0, -1.0,  5.0,
            -4.0, -1.0,  5.0,

            // Right face
             4.0, -1.0, -5.0,
             4.0, -0.5, -5.0,
             4.0, -0.5,  5.0,
             4.0, -1.0,  5.0,
			 
			 //right-right
             3.7, -1.0,-5.0,
             3.7, -0.5,-5.0,
             3.7, -0.5, 5.0,
             3.7, -1.0, 5.0,

            // Left face
             -4.0, -1.0, -5.0,
             -4.0, -0.5, -5.0,
             -4.0, -0.5,  5.0,
             -4.0, -1.0,  5.0,
			 
			//left-left
             -3.7, -1.0,-5.0,
             -3.7, -0.5,-5.0,
             -3.7, -0.5, 5.0,
             -3.7, -1.0, 5.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        boardVertexPositionBuffer.itemSize = 3;
        boardVertexPositionBuffer.numItems = 52;

        boardVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, boardVertexNormalBuffer);
        var vertexNormals = [
            // Front face
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,

            // Back-back
             0.0, 1.0,  0.0,
             0.0, 1.0,  0.0,
			 0.0, 1.0,  0.0,
             0.0, 1.0,  0.0,

            // Top-front face
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
			 
			 //top-back face
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
			 
			 //top-left face
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
			 
			 //Top-right face
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
			 
			 // Front-fond
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,

            // Back face
			 0.0, 1.0,  0.0,
             0.0, 1.0,  0.0,
			 0.0, 1.0,  0.0,
             0.0, 1.0,  0.0,

            // Bottom face
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
			 0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,

            // Right face
             1.0, 0.0,  0.0,
             1.0, 0.0,  0.0,
             1.0, 0.0,  0.0,
             1.0, 0.0,  0.0,

			 //right-right
			 0.0, 1.0,  0.0,
             0.0, 1.0,  0.0,
			 0.0, 1.0,  0.0,
             0.0, 1.0,  0.0,
			 
            // Left face
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
	
			//left-left
			 0.0, 1.0,  0.0,
             0.0, 1.0,  0.0,
			 0.0, 1.0,  0.0,
             0.0, 1.0,  0.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
        boardVertexNormalBuffer.itemSize = 3;
        boardVertexNormalBuffer.numItems = 52;

        boardVertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, boardVertexTextureCoordBuffer);
      
		var textureCoords = [];
		for(var i = 0; i < 13; i++)
			textureCoords = textureCoords.concat([
			0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
			]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        boardVertexTextureCoordBuffer.itemSize = 2;
        boardVertexTextureCoordBuffer.numItems = 52;

        boardVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boardVertexIndexBuffer);
        var boardVertexIndices = [
            0, 1, 2,      0, 2, 3,    // Front face
            4, 5, 6,      4, 6, 7,    // Back face
            8, 9, 10,     8, 10, 11,  // Top face
            12, 13, 14,   12, 14, 15, // Bottom face
            16, 17, 18,   16, 18, 19, // Right face
            20, 21, 22,   20, 22, 23, // Left face
			24, 25, 26,   24, 26, 27,
			28, 29, 30,   28, 30, 31,
			32, 33, 34,   32, 34, 35,
			36, 37, 38,   36, 38, 39,
			40, 41, 42,   40, 42, 43,
			44, 45, 46,   44, 46, 47,
			48, 49, 50,   48, 50, 51
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boardVertexIndices), gl.STATIC_DRAW);
        boardVertexIndexBuffer.itemSize = 1;
        boardVertexIndexBuffer.numItems = 78;
		
//-----------------------------------BALL-----------------------------
		var latitudeBands = 30;
        var longitudeBands = 30;
        var radius = 0.3;

        var vertexPositionData = [];
        var normalData = [];
        var textureCoordData = [];
        for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
            var theta = latNumber * Math.PI / latitudeBands;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
                var phi = longNumber * 2 * Math.PI / longitudeBands;
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = cosPhi * sinTheta;
                var y = cosTheta;
                var z = sinPhi * sinTheta;
                var u = 1 - (longNumber / longitudeBands);
                var v = 1 - (latNumber / latitudeBands);

                normalData.push(x);
                normalData.push(y);
                normalData.push(z);
                textureCoordData.push(u);
                textureCoordData.push(v);
                vertexPositionData.push(radius * x);
                vertexPositionData.push(radius * y);
                vertexPositionData.push(radius * z);
            }
        }

        var indexData = [];
        for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
            for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
                var first = (latNumber * (longitudeBands + 1)) + longNumber;
                var second = first + longitudeBands + 1;
                indexData.push(first);
                indexData.push(second);
                indexData.push(first + 1);

                indexData.push(second);
                indexData.push(second + 1);
                indexData.push(first + 1);
            }
        }

        ballVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
        ballVertexNormalBuffer.itemSize = 3;
        ballVertexNormalBuffer.numItems = normalData.length / 3;

        ballVertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
        ballVertexTextureCoordBuffer.itemSize = 2;
        ballVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

        ballVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
        ballVertexPositionBuffer.itemSize = 3;
        ballVertexPositionBuffer.numItems = vertexPositionData.length / 3;

        ballVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballVertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
        ballVertexIndexBuffer.itemSize = 1;
        ballVertexIndexBuffer.numItems = indexData.length;
    }

	
	//-------------------------------------DRAW BOARD--------------------------------
    function drawboard(pos, nor, tex, ind) {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		
        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
		
		mat4.translate(mvMatrix, [x1, 0, z1]);
        
		gl.bindBuffer(gl.ARRAY_BUFFER, pos);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, pos.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, nor);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, nor.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, tex);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, tex.itemSize, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, boardTexture);
		gl.uniform1i(shaderProgram.samplerUniform, 0);
		light();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ind);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, ind.numItems, gl.UNSIGNED_SHORT, 0);
    }
	
	//---------------------------------DRAW CUBE-----------------------
	function drawCube(pos, nor, tex, ind) {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

		mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
		mat4.translate(mvMatrix, [-0.1, -1.9, -9]);
		mat4.translate(mvMatrix, [x1, 0, z1]);
        mat4.rotate(mvMatrix, degToRad(rCube), [0.5, 2, 0]);
		
        gl.bindBuffer(gl.ARRAY_BUFFER, pos);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, pos.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, nor);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, nor.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, tex);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, tex.itemSize, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
		gl.uniform1i(shaderProgram.samplerUniform, 0);
		light();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ind);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, ind.numItems, gl.UNSIGNED_SHORT, 0);
    }
	
	//--------------------------------------DRAW BALL------------------------
	    function drawball() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
       
        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
		light();
        mat4.identity(mvMatrix);
		if(stop == 0)
			Rot = 0;
        mat4.translate(mvMatrix, [0, -1.6, -9]);
		if(check_rot == -1){
		mat4.rotate(mvMatrix, degToRad(Rot), [1, 0, 0]);
		}
		if(check_rot == 1){
		mat4.rotate(mvMatrix, degToRad(Rot), [0, 0, 1]);
		}
		stop = 0;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, ballTexture);
        gl.uniform1i(shaderProgram.samplerUniform, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, ballVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexTextureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, ballVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, ballVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballVertexIndexBuffer);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, ballVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
	
	//----------------------------ANIMATE-----------------------------
    var lastTime = 0;
    function animate() {
        var timeNow = new Date().getTime();
        if (lastTime != 0) {
            var elapsed = timeNow - lastTime;
			rCube += (90 * elapsed) / 1000.0;
            Rot += (Speed * elapsed) / 1000.0;
        }
        lastTime = timeNow;
    }	

//----------------------------------------SCORE----------------------
	var score = 0;
	var n = 0;
	function drawCtx(){
		score = 0;
		for(var i = 0; i < 12; i++){
			if(flag[i] == 0)
				score +=10;
		}
		
		ctx.clearRect(0, 0, 500, 200);
		ctx.font = '30px "Times New Roman"';    
		ctx.fillStyle = "white";
		ctx.fillText('Score: ' + score.toString(), 200, 50);
		if (score == 120){
			ctx.fillStyle = 'rgba(255, 255, 255, 1)';
			ctx.font = '100px "Times New Roman"';    
			ctx.fillText('You win!', 80, 200);
			ctx.font = '50px "Times New Roman"';   
			ctx.fillText('Congratulation!', 100, 270);
		}
	}

	//---------------------------------DRAW-------------------------------------
	var flag = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
	function draw(){
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	//---hinh 1---
		if(z < -1.6 && z > -2.4 && x > -0.4 && x < 0.4)
			flag[0] = 0;
		if(flag[0] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [0.0, 0, 3]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 2---
		if(z < -7.6 && z > -8.4 && x > -0.4 && x < 0.4)
			flag[1] = 0;
		if(flag[1] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [0.0, 0, -3]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 3---
		if(x < -1.6 && x > -2.4 && z > -5.4 && z < -4.6)
			flag[2] = 0;
		if(flag[2] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [-2,0, 0]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 4---
		if(x > 1.6 && x < 2.4 && z > -5.4 && z < -4.6)
			flag[3] = 0;
		if(flag[3] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [2, 0, 0]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
	//---hinh 5---
		if(x > -1.7 && x < -0.9 && z > -8.1 && z < -7.3)
			flag[4] = 0;
		if(flag[4] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [-1.3, 0, -2.7]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 6---
		if(x > 0.9 && x < 1.7 && z > -8.1 && z < -7.3)
			flag[5] = 0;
		if(flag[5] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [1.3, 0, -2.7]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 7---
		if(x > -1.7 && x < -0.9 && z > -2.7 && z < -1.9)
			flag[6] = 0;
		if(flag[6] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [-1.3, 0, 2.7]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 8---
		if(x > 0.9 && x < 1.7 && z > -2.7 && z < -1.9)
			flag[7] = 0;
		if(flag[7] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [1.3, 0, 2.7]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//--- hinh 9---
		if(x < -1.6 && x > -2.4 && z > -6.9 && z < -6.1)
			flag[8] = 0;
		if(flag[8] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [-2, 0, -1.5]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 10---
		if(x > 1.6 && x < 2.4 && z > -6.9 && z < -6.1)
			flag[9] = 0;
		if(flag[9] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [2, 0, -1.5]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 11---
		if(x < -1.6 && x > -2.4 && z > -3.9 && z < -3.1)
			flag[10] = 0;
		if(flag[10] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [-2, 0, 1.5]);
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		
	//---hinh 12---
		if(x > 1.6 && x < 2.4 && z > -3.9 && z < -3.1)
			flag[11] = 0;
		if(flag[11] == 1){
			mat4.identity(mvMatrix);
			mat4.translate(mvMatrix, [2, 0, 1.5])
			drawCube(cubeVertexPositionBuffer, cubeVertexNormalBuffer, cubeVertexTextureCoordBuffer, cubeVertexIndexBuffer);
		}
		mat4.identity(mvMatrix);
		mat4.translate(mvMatrix, [0, -1.0, -9]);
		drawboard(boardVertexPositionBuffer, boardVertexNormalBuffer, boardVertexTextureCoordBuffer, boardVertexIndexBuffer);
		mat4.identity(mvMatrix);
		drawball();
	}
    function tick() {
        requestAnimFrame(tick);
        handleKeys();
		draw();
		drawCtx();		
        animate();
    }
    function webGLStart() {
		var canvas = document.getElementById("lesson07-canvas");
        initGL(canvas);
        initShaders();
        initBuffers();
        initTexture();
		
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        tick();
    }
