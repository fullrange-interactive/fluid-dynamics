(function (console, $global) { "use strict";
var $hxClasses = {},$estr = function() { return js_Boot.__string_rec(this,''); };
function $extend(from, fields) {
	function Inherit() {} Inherit.prototype = from; var proto = new Inherit();
	for (var name in fields) proto[name] = fields[name];
	if( fields.toString !== Object.prototype.toString ) proto.toString = fields.toString;
	return proto;
}
var EReg = function(r,opt) {
	opt = opt.split("u").join("");
	this.r = new RegExp(r,opt);
};
$hxClasses["EReg"] = EReg;
EReg.__name__ = ["EReg"];
EReg.prototype = {
	match: function(s) {
		if(this.r.global) this.r.lastIndex = 0;
		this.r.m = this.r.exec(s);
		this.r.s = s;
		return this.r.m != null;
	}
	,matched: function(n) {
		if(this.r.m != null && n >= 0 && n < this.r.m.length) return this.r.m[n]; else throw new js__$Boot_HaxeError("EReg::matched");
	}
	,matchedLeft: function() {
		if(this.r.m == null) throw new js__$Boot_HaxeError("No string matched");
		return HxOverrides.substr(this.r.s,0,this.r.m.index);
	}
	,matchedRight: function() {
		if(this.r.m == null) throw new js__$Boot_HaxeError("No string matched");
		var sz = this.r.m.index + this.r.m[0].length;
		return HxOverrides.substr(this.r.s,sz,this.r.s.length - sz);
	}
	,matchedPos: function() {
		if(this.r.m == null) throw new js__$Boot_HaxeError("No string matched");
		return { pos : this.r.m.index, len : this.r.m[0].length};
	}
	,replace: function(s,by) {
		return s.replace(this.r,by);
	}
	,__class__: EReg
};
var GPUFluid = function(width,height,cellSize,solverIterations) {
	if(solverIterations == null) solverIterations = 18;
	if(cellSize == null) cellSize = 8;
	this.pressureGradientSubstractShader = new PressureGradientSubstract();
	this.pressureSolveShader = new PressureSolve();
	this.divergenceShader = new Divergence();
	this.advectShader = new Advect();
	this.width = width;
	this.height = height;
	this.solverIterations = solverIterations;
	this.aspectRatio = this.width / this.height;
	this.cellSize = cellSize;
	this.advectShader.rdx.set(1 / this.cellSize);
	this.divergenceShader.halfrdx.set(0.5 * (1 / this.cellSize));
	this.pressureGradientSubstractShader.halfrdx.set(0.5 * (1 / this.cellSize));
	this.pressureSolveShader.alpha.set(-this.cellSize * this.cellSize);
	this.cellSize;
	var texture_float_linear_supported = true;
	if(snow_modules_opengl_web_GL.gl.getExtension("OES_texture_float_linear") == null) texture_float_linear_supported = false;
	if(snow_modules_opengl_web_GL.gl.getExtension("OES_texture_float") == null) null;
	this.textureQuad = gltoolbox_GeometryTools.getCachedUnitQuad();
	var nearestFactory = gltoolbox_TextureTools.createTextureFactory({ channelType : 6407, dataType : 5126, filter : 9728});
	this.velocityRenderTarget = new gltoolbox_render_RenderTarget2Phase(width,height,gltoolbox_TextureTools.createTextureFactory({ channelType : 6407, dataType : 5126, filter : texture_float_linear_supported?9729:9728}));
	this.pressureRenderTarget = new gltoolbox_render_RenderTarget2Phase(width,height,nearestFactory);
	this.divergenceRenderTarget = new gltoolbox_render_RenderTarget(width,height,nearestFactory);
	this.dyeRenderTarget = new gltoolbox_render_RenderTarget2Phase(width,height,gltoolbox_TextureTools.createTextureFactory({ channelType : 6407, dataType : 5126, filter : texture_float_linear_supported?9729:9728}));
	this.updateCoreShaderUniforms(this.advectShader);
	this.updateCoreShaderUniforms(this.divergenceShader);
	this.updateCoreShaderUniforms(this.pressureSolveShader);
	this.updateCoreShaderUniforms(this.pressureGradientSubstractShader);
};
$hxClasses["GPUFluid"] = GPUFluid;
GPUFluid.__name__ = ["GPUFluid"];
GPUFluid.prototype = {
	step: function(dt) {
		snow_modules_opengl_web_GL.gl.viewport(0,0,this.width,this.height);
		snow_modules_opengl_web_GL.gl.bindBuffer(34962,this.textureQuad);
		this.advect(this.velocityRenderTarget,dt);
		if(this.applyForcesShader == null) null; else {
			this.applyForcesShader.dt.set(dt);
			this.applyForcesShader.velocity.set(this.velocityRenderTarget.readFromTexture);
			this.renderShaderTo(this.applyForcesShader,this.velocityRenderTarget);
			this.velocityRenderTarget.swap();
		}
		this.divergenceShader.velocity.set(this.velocityRenderTarget.readFromTexture);
		this.renderShaderTo(this.divergenceShader,this.divergenceRenderTarget);
		this.solvePressure();
		this.pressureGradientSubstractShader.pressure.set(this.pressureRenderTarget.readFromTexture);
		this.pressureGradientSubstractShader.velocity.set(this.velocityRenderTarget.readFromTexture);
		this.renderShaderTo(this.pressureGradientSubstractShader,this.velocityRenderTarget);
		this.velocityRenderTarget.swap();
		if(this.updateDyeShader == null) null; else {
			this.updateDyeShader.dt.set(dt);
			this.updateDyeShader.dye.set(this.dyeRenderTarget.readFromTexture);
			this.renderShaderTo(this.updateDyeShader,this.dyeRenderTarget);
			this.dyeRenderTarget.swap();
		}
		this.advect(this.dyeRenderTarget,dt);
	}
	,resize: function(width,height) {
		this.velocityRenderTarget.resize(width,height);
		this.pressureRenderTarget.resize(width,height);
		this.divergenceRenderTarget.resize(width,height);
		this.dyeRenderTarget.resize(width,height);
		this.width = width;
		this.height = height;
	}
	,clear: function() {
		this.velocityRenderTarget.clear(16384);
		this.pressureRenderTarget.clear(16384);
		this.dyeRenderTarget.clear(16384);
	}
	,advect: function(target,dt) {
		this.advectShader.dt.set(dt);
		this.advectShader.target.set(target.readFromTexture);
		this.advectShader.velocity.set(this.velocityRenderTarget.readFromTexture);
		this.renderShaderTo(this.advectShader,target);
		target.tmpFBO = target.writeFrameBufferObject;
		target.writeFrameBufferObject = target.readFrameBufferObject;
		target.readFrameBufferObject = target.tmpFBO;
		target.tmpTex = target.writeToTexture;
		target.writeToTexture = target.readFromTexture;
		target.readFromTexture = target.tmpTex;
	}
	,applyForces: function(dt) {
		if(this.applyForcesShader == null) return;
		this.applyForcesShader.dt.set(dt);
		this.applyForcesShader.velocity.set(this.velocityRenderTarget.readFromTexture);
		this.renderShaderTo(this.applyForcesShader,this.velocityRenderTarget);
		this.velocityRenderTarget.swap();
	}
	,computeDivergence: function() {
		this.divergenceShader.velocity.set(this.velocityRenderTarget.readFromTexture);
		this.renderShaderTo(this.divergenceShader,this.divergenceRenderTarget);
	}
	,solvePressure: function() {
		this.pressureSolveShader.divergence.set(this.divergenceRenderTarget.texture);
		this.pressureSolveShader.activate(true,true);
		var _g1 = 0;
		var _g = this.solverIterations;
		while(_g1 < _g) {
			var i = _g1++;
			this.pressureSolveShader.pressure.set(this.pressureRenderTarget.readFromTexture);
			this.pressureSolveShader.setUniforms();
			snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.pressureRenderTarget.writeFrameBufferObject);
			snow_modules_opengl_web_GL.gl.drawArrays(5,0,4);
			this.pressureRenderTarget.swap();
		}
		this.pressureSolveShader.deactivate();
	}
	,subtractPressureGradient: function() {
		this.pressureGradientSubstractShader.pressure.set(this.pressureRenderTarget.readFromTexture);
		this.pressureGradientSubstractShader.velocity.set(this.velocityRenderTarget.readFromTexture);
		this.renderShaderTo(this.pressureGradientSubstractShader,this.velocityRenderTarget);
		this.velocityRenderTarget.swap();
	}
	,updateDye: function(dt) {
		if(this.updateDyeShader == null) return;
		this.updateDyeShader.dt.set(dt);
		this.updateDyeShader.dye.set(this.dyeRenderTarget.readFromTexture);
		this.renderShaderTo(this.updateDyeShader,this.dyeRenderTarget);
		this.dyeRenderTarget.swap();
	}
	,renderShaderTo: function(shader,target) {
		if(shader._active) {
			shader.setUniforms();
			shader.setAttributes();
			null;
		} else {
			if(!shader._ready) shader.create();
			snow_modules_opengl_web_GL.gl.useProgram(shader._prog);
			shader.setUniforms();
			shader.setAttributes();
			shader._active = true;
		}
		target.activate();
		snow_modules_opengl_web_GL.gl.drawArrays(5,0,4);
		shader.deactivate();
	}
	,updateCoreShaderUniforms: function(shader) {
		if(shader == null) return;
		shader.aspectRatio.set(this.aspectRatio);
		shader.invresolution.data.x = 1 / this.width;
		shader.invresolution.data.y = 1 / this.height;
	}
	,set_applyForcesShader: function(v) {
		this.applyForcesShader = v;
		this.applyForcesShader.dx.set_data(this.cellSize);
		this.updateCoreShaderUniforms(this.applyForcesShader);
		return this.applyForcesShader;
	}
	,set_updateDyeShader: function(v) {
		this.updateDyeShader = v;
		this.updateDyeShader.dx.set_data(this.cellSize);
		this.updateCoreShaderUniforms(this.updateDyeShader);
		return this.updateDyeShader;
	}
	,set_cellSize: function(v) {
		this.cellSize = v;
		this.advectShader.rdx.set(1 / this.cellSize);
		this.divergenceShader.halfrdx.set(0.5 * (1 / this.cellSize));
		this.pressureGradientSubstractShader.halfrdx.set(0.5 * (1 / this.cellSize));
		this.pressureSolveShader.alpha.set(-this.cellSize * this.cellSize);
		return this.cellSize;
	}
	,clipToAspectSpaceX: function(clipX) {
		return clipX * this.aspectRatio;
	}
	,clipToAspectSpaceY: function(clipY) {
		return clipY;
	}
	,__class__: GPUFluid
};
var shaderblox_ShaderBase = function() {
	this._textures = [];
	this._attributes = [];
	this._uniforms = [];
	this._name = ("" + Std.string(js_Boot.getClass(this))).split(".").pop();
	this.initSources();
	this.createProperties();
};
$hxClasses["shaderblox.ShaderBase"] = shaderblox_ShaderBase;
shaderblox_ShaderBase.__name__ = ["shaderblox","ShaderBase"];
shaderblox_ShaderBase.prototype = {
	initSources: function() {
	}
	,createProperties: function() {
	}
	,create: function() {
		this.compile(this._vertSource,this._fragSource);
		this._ready = true;
	}
	,destroy: function() {
		snow_modules_opengl_web_GL.gl.deleteShader(this._vert);
		snow_modules_opengl_web_GL.gl.deleteShader(this._frag);
		snow_modules_opengl_web_GL.gl.deleteProgram(this._prog);
		this._prog = null;
		this._vert = null;
		this._frag = null;
		this._ready = false;
	}
	,compile: function(vertSource,fragSource) {
		var vertexShader = snow_modules_opengl_web_GL.gl.createShader(35633);
		snow_modules_opengl_web_GL.gl.shaderSource(vertexShader,vertSource);
		snow_modules_opengl_web_GL.gl.compileShader(vertexShader);
		if(snow_modules_opengl_web_GL.gl.getShaderParameter(vertexShader,35713) == 0) {
			haxe_Log.trace("Error compiling vertex shader: " + snow_modules_opengl_web_GL.gl.getShaderInfoLog(vertexShader),{ fileName : "ShaderBase.hx", lineNumber : 74, className : "shaderblox.ShaderBase", methodName : "compile"});
			haxe_Log.trace("\n" + vertSource,{ fileName : "ShaderBase.hx", lineNumber : 75, className : "shaderblox.ShaderBase", methodName : "compile"});
			throw new js__$Boot_HaxeError("Error compiling vertex shader");
		}
		var fragmentShader = snow_modules_opengl_web_GL.gl.createShader(35632);
		snow_modules_opengl_web_GL.gl.shaderSource(fragmentShader,fragSource);
		snow_modules_opengl_web_GL.gl.compileShader(fragmentShader);
		if(snow_modules_opengl_web_GL.gl.getShaderParameter(fragmentShader,35713) == 0) {
			haxe_Log.trace("Error compiling fragment shader: " + snow_modules_opengl_web_GL.gl.getShaderInfoLog(fragmentShader) + "\n",{ fileName : "ShaderBase.hx", lineNumber : 84, className : "shaderblox.ShaderBase", methodName : "compile"});
			var lines = fragSource.split("\n");
			var i = 0;
			var _g = 0;
			while(_g < lines.length) {
				var l = lines[_g];
				++_g;
				haxe_Log.trace(i++ + " - " + l,{ fileName : "ShaderBase.hx", lineNumber : 88, className : "shaderblox.ShaderBase", methodName : "compile"});
			}
			throw new js__$Boot_HaxeError("Error compiling fragment shader");
		}
		var shaderProgram = snow_modules_opengl_web_GL.gl.createProgram();
		snow_modules_opengl_web_GL.gl.attachShader(shaderProgram,vertexShader);
		snow_modules_opengl_web_GL.gl.attachShader(shaderProgram,fragmentShader);
		snow_modules_opengl_web_GL.gl.linkProgram(shaderProgram);
		if(snow_modules_opengl_web_GL.gl.getProgramParameter(shaderProgram,35714) == 0) throw new js__$Boot_HaxeError("Unable to initialize the shader program.\n" + snow_modules_opengl_web_GL.gl.getProgramInfoLog(shaderProgram));
		var numUniforms = snow_modules_opengl_web_GL.gl.getProgramParameter(shaderProgram,35718);
		var uniformLocations = new haxe_ds_StringMap();
		while(numUniforms-- > 0) {
			var uInfo = snow_modules_opengl_web_GL.gl.getActiveUniform(shaderProgram,numUniforms);
			var loc = snow_modules_opengl_web_GL.gl.getUniformLocation(shaderProgram,uInfo.name);
			{
				uniformLocations.set(uInfo.name,loc);
				loc;
			}
		}
		var numAttributes = snow_modules_opengl_web_GL.gl.getProgramParameter(shaderProgram,35721);
		var attributeLocations = new haxe_ds_StringMap();
		while(numAttributes-- > 0) {
			var aInfo = snow_modules_opengl_web_GL.gl.getActiveAttrib(shaderProgram,numAttributes);
			var loc1 = snow_modules_opengl_web_GL.gl.getAttribLocation(shaderProgram,aInfo.name);
			{
				attributeLocations.set(aInfo.name,loc1);
				loc1;
			}
		}
		this._vert = vertexShader;
		this._frag = fragmentShader;
		this._prog = shaderProgram;
		var count = this._uniforms.length;
		var removeList = [];
		this._numTextures = 0;
		this._textures = [];
		var _g1 = 0;
		var _g11 = this._uniforms;
		while(_g1 < _g11.length) {
			var u = _g11[_g1];
			++_g1;
			var loc2 = uniformLocations.get(u.name);
			if(js_Boot.__instanceof(u,shaderblox_uniforms_UTexture)) {
				var t = u;
				t.samplerIndex = this._numTextures++;
				this._textures[t.samplerIndex] = t;
			}
			if(loc2 != null) u.location = loc2; else removeList.push(u);
		}
		while(removeList.length > 0) {
			var x = removeList.pop();
			HxOverrides.remove(this._uniforms,x);
		}
		var _g2 = 0;
		var _g12 = this._attributes;
		while(_g2 < _g12.length) {
			var a = _g12[_g2];
			++_g2;
			var loc3 = attributeLocations.get(a.name);
			if(loc3 == null) a.location = -1; else a.location = loc3;
		}
	}
	,activate: function(initUniforms,initAttribs) {
		if(initAttribs == null) initAttribs = false;
		if(initUniforms == null) initUniforms = true;
		if(this._active) {
			if(initUniforms) this.setUniforms();
			if(initAttribs) this.setAttributes();
			return;
		}
		if(!this._ready) this.create();
		snow_modules_opengl_web_GL.gl.useProgram(this._prog);
		if(initUniforms) this.setUniforms();
		if(initAttribs) this.setAttributes();
		this._active = true;
	}
	,deactivate: function() {
		if(!this._active) return;
		this._active = false;
		this.disableAttributes();
	}
	,setUniforms: function() {
		var _g = 0;
		var _g1 = this._uniforms;
		while(_g < _g1.length) {
			var u = _g1[_g];
			++_g;
			u.apply();
		}
	}
	,setAttributes: function() {
		var offset = 0;
		var _g1 = 0;
		var _g = this._attributes.length;
		while(_g1 < _g) {
			var i = _g1++;
			var att = this._attributes[i];
			var location = att.location;
			if(location != -1) {
				snow_modules_opengl_web_GL.gl.enableVertexAttribArray(location);
				snow_modules_opengl_web_GL.gl.vertexAttribPointer(location,att.itemCount,att.type,false,this._aStride,offset);
			}
			offset += att.byteSize;
		}
	}
	,disableAttributes: function() {
		var _g1 = 0;
		var _g = this._attributes.length;
		while(_g1 < _g) {
			var i = _g1++;
			var idx = this._attributes[i].location;
			if(idx == -1) continue;
			snow_modules_opengl_web_GL.gl.disableVertexAttribArray(idx);
		}
	}
	,toString: function() {
		return "[Shader(" + this._name + ", attributes:" + this._attributes.length + ", uniforms:" + this._uniforms.length + ")]";
	}
	,__class__: shaderblox_ShaderBase
};
var FluidBase = function() {
	shaderblox_ShaderBase.call(this);
};
$hxClasses["FluidBase"] = FluidBase;
FluidBase.__name__ = ["FluidBase"];
FluidBase.__super__ = shaderblox_ShaderBase;
FluidBase.prototype = $extend(shaderblox_ShaderBase.prototype,{
	createProperties: function() {
		shaderblox_ShaderBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UFloat("aspectRatio",null);
		this.aspectRatio = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UVec2("invresolution",null);
		this.invresolution = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_attributes_FloatAttribute("vertexPosition",0,2);
		this.vertexPosition = instance2;
		this._attributes.push(instance2);
		this._aStride += 8;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n";
	}
	,__class__: FluidBase
});
var Advect = function() {
	FluidBase.call(this);
};
$hxClasses["Advect"] = Advect;
Advect.__name__ = ["Advect"];
Advect.__super__ = FluidBase;
Advect.prototype = $extend(FluidBase.prototype,{
	createProperties: function() {
		FluidBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("velocity",null,false);
		this.velocity = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UTexture("target",null,false);
		this.target = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_uniforms_UFloat("dt",null);
		this.dt = instance2;
		this._uniforms.push(instance2);
		var instance3 = new shaderblox_uniforms_UFloat("rdx",null);
		this.rdx = instance3;
		this._uniforms.push(instance3);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n\nuniform sampler2D velocity;\nuniform sampler2D target;\nuniform float dt;\nuniform float rdx; \n\nvarying vec2 texelCoord;\nvarying vec2 p;\n\nvoid main(void){\n  \n  \n  vec2 tracedPos = p - dt * rdx * texture2D(velocity, texelCoord ).xy; \n\n  \n  \n  tracedPos = aspectToTexelSpace(tracedPos);\n\n  gl_FragColor = texture2D(target, tracedPos);\n}\n";
	}
	,__class__: Advect
});
var Divergence = function() {
	FluidBase.call(this);
};
$hxClasses["Divergence"] = Divergence;
Divergence.__name__ = ["Divergence"];
Divergence.__super__ = FluidBase;
Divergence.prototype = $extend(FluidBase.prototype,{
	createProperties: function() {
		FluidBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("velocity",null,false);
		this.velocity = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UFloat("halfrdx",null);
		this.halfrdx = instance1;
		this._uniforms.push(instance1);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n\nuniform sampler2D velocity;\t\nuniform float halfrdx;\t\n\r\nvarying vec2 texelCoord;\r\n\r\nvoid main(void){\r\n\t\n \t\n\tvec2 L = sampleVelocity(velocity, texelCoord - vec2(invresolution.x, 0));\r\n\tvec2 R = sampleVelocity(velocity, texelCoord + vec2(invresolution.x, 0));\r\n\tvec2 B = sampleVelocity(velocity, texelCoord - vec2(0, invresolution.y));\r\n\tvec2 T = sampleVelocity(velocity, texelCoord + vec2(0, invresolution.y));\r\n\r\n\tgl_FragColor = vec4( halfrdx * ((R.x - L.x) + (T.y - B.y)), 0, 0, 1);\r\n}\r\n\n";
	}
	,__class__: Divergence
});
var PressureSolve = function() {
	FluidBase.call(this);
};
$hxClasses["PressureSolve"] = PressureSolve;
PressureSolve.__name__ = ["PressureSolve"];
PressureSolve.__super__ = FluidBase;
PressureSolve.prototype = $extend(FluidBase.prototype,{
	createProperties: function() {
		FluidBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("pressure",null,false);
		this.pressure = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UTexture("divergence",null,false);
		this.divergence = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_uniforms_UFloat("alpha",null);
		this.alpha = instance2;
		this._uniforms.push(instance2);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n\nuniform sampler2D pressure;\nuniform sampler2D divergence;\nuniform float alpha;\n\nvarying vec2 texelCoord;\n\nvoid main(void){\n  \n  \n  float L = samplePressue(pressure, texelCoord - vec2(invresolution.x, 0));\n  float R = samplePressue(pressure, texelCoord + vec2(invresolution.x, 0));\n  float B = samplePressue(pressure, texelCoord - vec2(0, invresolution.y));\n  float T = samplePressue(pressure, texelCoord + vec2(0, invresolution.y));\n\n  float bC = texture2D(divergence, texelCoord).x;\n\n  gl_FragColor = vec4( (L + R + B + T + alpha * bC) * .25, 0, 0, 1 );\n}\n";
	}
	,__class__: PressureSolve
});
var PressureGradientSubstract = function() {
	FluidBase.call(this);
};
$hxClasses["PressureGradientSubstract"] = PressureGradientSubstract;
PressureGradientSubstract.__name__ = ["PressureGradientSubstract"];
PressureGradientSubstract.__super__ = FluidBase;
PressureGradientSubstract.prototype = $extend(FluidBase.prototype,{
	createProperties: function() {
		FluidBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("pressure",null,false);
		this.pressure = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UTexture("velocity",null,false);
		this.velocity = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_uniforms_UFloat("halfrdx",null);
		this.halfrdx = instance2;
		this._uniforms.push(instance2);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n\nuniform sampler2D pressure;\r\nuniform sampler2D velocity;\r\nuniform float halfrdx;\r\n\r\nvarying vec2 texelCoord;\r\n\r\nvoid main(void){\r\n  float L = samplePressue(pressure, texelCoord - vec2(invresolution.x, 0));\r\n  float R = samplePressue(pressure, texelCoord + vec2(invresolution.x, 0));\r\n  float B = samplePressue(pressure, texelCoord - vec2(0, invresolution.y));\r\n  float T = samplePressue(pressure, texelCoord + vec2(0, invresolution.y));\r\n\r\n  vec2 v = texture2D(velocity, texelCoord).xy;\r\n\r\n  gl_FragColor = vec4(v - halfrdx*vec2(R-L, T-B), 0, 1);\r\n}\r\n\r\n\n";
	}
	,__class__: PressureGradientSubstract
});
var ApplyForces = function() {
	FluidBase.call(this);
};
$hxClasses["ApplyForces"] = ApplyForces;
ApplyForces.__name__ = ["ApplyForces"];
ApplyForces.__super__ = FluidBase;
ApplyForces.prototype = $extend(FluidBase.prototype,{
	createProperties: function() {
		FluidBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("velocity",null,false);
		this.velocity = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UFloat("dt",null);
		this.dt = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_uniforms_UFloat("dx",null);
		this.dx = instance2;
		this._uniforms.push(instance2);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n\nuniform sampler2D velocity;\n\tuniform float dt;\n\tuniform float dx;\n\tvarying vec2 texelCoord;\n\tvarying vec2 p;\n";
	}
	,__class__: ApplyForces
});
var UpdateDye = function() {
	FluidBase.call(this);
};
$hxClasses["UpdateDye"] = UpdateDye;
UpdateDye.__name__ = ["UpdateDye"];
UpdateDye.__super__ = FluidBase;
UpdateDye.prototype = $extend(FluidBase.prototype,{
	createProperties: function() {
		FluidBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("dye",null,false);
		this.dye = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UFloat("dt",null);
		this.dt = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_uniforms_UFloat("dx",null);
		this.dx = instance2;
		this._uniforms.push(instance2);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n\nuniform sampler2D dye;\n\tuniform float dt;\n\tuniform float dx;\n\tvarying vec2 texelCoord;\n\tvarying vec2 p;\n";
	}
	,__class__: UpdateDye
});
var GPUParticles = function(count) {
	snow_modules_opengl_web_GL.gl.getExtension("OES_texture_float");
	this.textureQuad = gltoolbox_GeometryTools.getCachedUnitQuad();
	this.inititalConditionsShader = new InitialConditions();
	this.stepParticlesShader = new StepParticles();
	this.stepParticlesShader.dragCoefficient.set_data(1);
	this.stepParticlesShader.flowScale.data.x = 1;
	this.stepParticlesShader.flowScale.data.y = 1;
	this.setCount(count);
	this.renderShaderTo(this.inititalConditionsShader,this.particleData);
};
$hxClasses["GPUParticles"] = GPUParticles;
GPUParticles.__name__ = ["GPUParticles"];
GPUParticles.prototype = {
	step: function(dt) {
		this.stepParticlesShader.dt.set_data(dt);
		this.stepParticlesShader.particleData.set_data(this.particleData.readFromTexture);
		this.renderShaderTo(this.stepParticlesShader,this.particleData);
	}
	,reset: function() {
		this.renderShaderTo(this.inititalConditionsShader,this.particleData);
	}
	,setCount: function(newCount) {
		var dataWidth = Math.ceil(Math.sqrt(newCount));
		var dataHeight = dataWidth;
		if(this.particleData != null) this.particleData.resize(dataWidth,dataHeight); else this.particleData = new gltoolbox_render_RenderTarget2Phase(dataWidth,dataHeight,gltoolbox_TextureTools.createFloatTextureRGBA);
		if(this.particleUVs != null) snow_modules_opengl_web_GL.gl.deleteBuffer(this.particleUVs);
		this.particleUVs = snow_modules_opengl_web_GL.gl.createBuffer();
		var arrayUVs = new Float32Array(dataWidth * dataHeight * 2);
		var index;
		var _g = 0;
		while(_g < dataWidth) {
			var i = _g++;
			var _g1 = 0;
			while(_g1 < dataHeight) {
				var j = _g1++;
				index = (i * dataHeight + j) * 2;
				arrayUVs[index] = i / dataWidth;
				var idx = ++index;
				arrayUVs[idx] = j / dataHeight;
			}
		}
		snow_modules_opengl_web_GL.gl.bindBuffer(34962,this.particleUVs);
		snow_modules_opengl_web_GL.gl.bufferData(34962,arrayUVs,35044);
		snow_modules_opengl_web_GL.gl.bindBuffer(34962,null);
		return this.count = newCount;
	}
	,renderShaderTo: function(shader,target) {
		snow_modules_opengl_web_GL.gl.viewport(0,0,target.width,target.height);
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,target.writeFrameBufferObject);
		snow_modules_opengl_web_GL.gl.bindBuffer(34962,this.textureQuad);
		if(shader._active) {
			shader.setUniforms();
			shader.setAttributes();
			null;
		} else {
			if(!shader._ready) shader.create();
			snow_modules_opengl_web_GL.gl.useProgram(shader._prog);
			shader.setUniforms();
			shader.setAttributes();
			shader._active = true;
		}
		snow_modules_opengl_web_GL.gl.drawArrays(5,0,4);
		shader.deactivate();
		target.tmpFBO = target.writeFrameBufferObject;
		target.writeFrameBufferObject = target.readFrameBufferObject;
		target.readFrameBufferObject = target.tmpFBO;
		target.tmpTex = target.writeToTexture;
		target.writeToTexture = target.readFromTexture;
		target.readFromTexture = target.tmpTex;
	}
	,get_dragCoefficient: function() {
		return this.stepParticlesShader.dragCoefficient.data;
	}
	,get_flowScaleX: function() {
		return this.stepParticlesShader.flowScale.data.x;
	}
	,get_flowScaleY: function() {
		return this.stepParticlesShader.flowScale.data.y;
	}
	,get_flowVelocityField: function() {
		return this.stepParticlesShader.flowVelocityField.data;
	}
	,set_dragCoefficient: function(v) {
		return this.stepParticlesShader.dragCoefficient.set_data(v);
	}
	,set_flowScaleX: function(v) {
		return this.stepParticlesShader.flowScale.data.x = v;
	}
	,set_flowScaleY: function(v) {
		return this.stepParticlesShader.flowScale.data.y = v;
	}
	,set_flowVelocityField: function(v) {
		return this.stepParticlesShader.flowVelocityField.set_data(v);
	}
	,__class__: GPUParticles
};
var PlaneTexture = function() {
	shaderblox_ShaderBase.call(this);
};
$hxClasses["PlaneTexture"] = PlaneTexture;
PlaneTexture.__name__ = ["PlaneTexture"];
PlaneTexture.__super__ = shaderblox_ShaderBase;
PlaneTexture.prototype = $extend(shaderblox_ShaderBase.prototype,{
	createProperties: function() {
		shaderblox_ShaderBase.prototype.createProperties.call(this);
		var instance = new shaderblox_attributes_FloatAttribute("vertexPosition",0,2);
		this.vertexPosition = instance;
		this._attributes.push(instance);
		this._aStride += 8;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nattribute vec2 vertexPosition;\n\tvarying vec2 texelCoord;\n\tvoid main(){\n\t\ttexelCoord = vertexPosition;\n\t\tgl_Position = vec4(vertexPosition*2.0 - vec2(1.0, 1.0), 0.0, 1.0 );\n\t}\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nvarying vec2 texelCoord;\n";
	}
	,__class__: PlaneTexture
});
var InitialConditions = function() {
	PlaneTexture.call(this);
};
$hxClasses["InitialConditions"] = InitialConditions;
InitialConditions.__name__ = ["InitialConditions"];
InitialConditions.__super__ = PlaneTexture;
InitialConditions.prototype = $extend(PlaneTexture.prototype,{
	createProperties: function() {
		PlaneTexture.prototype.createProperties.call(this);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nattribute vec2 vertexPosition;\n\tvarying vec2 texelCoord;\n\tvoid main(){\n\t\ttexelCoord = vertexPosition;\n\t\tgl_Position = vec4(vertexPosition*2.0 - vec2(1.0, 1.0), 0.0, 1.0 );\n\t}\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nvarying vec2 texelCoord;\n\nvoid main(){\n\t\tvec2 ip = vec2((texelCoord.x), (texelCoord.y)) * 2.0 - 1.0;\n\t\tvec2 iv = vec2(0,0);\n\t\tgl_FragColor = vec4(ip, iv);\n\t}\n";
	}
	,__class__: InitialConditions
});
var ParticleBase = function() {
	PlaneTexture.call(this);
};
$hxClasses["ParticleBase"] = ParticleBase;
ParticleBase.__name__ = ["ParticleBase"];
ParticleBase.__super__ = PlaneTexture;
ParticleBase.prototype = $extend(PlaneTexture.prototype,{
	createProperties: function() {
		PlaneTexture.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UFloat("dt",null);
		this.dt = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UTexture("particleData",null,false);
		this.particleData = instance1;
		this._uniforms.push(instance1);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nattribute vec2 vertexPosition;\n\tvarying vec2 texelCoord;\n\tvoid main(){\n\t\ttexelCoord = vertexPosition;\n\t\tgl_Position = vec4(vertexPosition*2.0 - vec2(1.0, 1.0), 0.0, 1.0 );\n\t}\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nvarying vec2 texelCoord;\n\nuniform float dt;\n\tuniform sampler2D particleData;\n";
	}
	,__class__: ParticleBase
});
var StepParticles = function() {
	ParticleBase.call(this);
};
$hxClasses["StepParticles"] = StepParticles;
StepParticles.__name__ = ["StepParticles"];
StepParticles.__super__ = ParticleBase;
StepParticles.prototype = $extend(ParticleBase.prototype,{
	createProperties: function() {
		ParticleBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UFloat("dragCoefficient",null);
		this.dragCoefficient = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UVec2("flowScale",null);
		this.flowScale = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_uniforms_UTexture("flowVelocityField",null,false);
		this.flowVelocityField = instance2;
		this._uniforms.push(instance2);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nattribute vec2 vertexPosition;\n\tvarying vec2 texelCoord;\n\tvoid main(){\n\t\ttexelCoord = vertexPosition;\n\t\tgl_Position = vec4(vertexPosition*2.0 - vec2(1.0, 1.0), 0.0, 1.0 );\n\t}\n\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nvarying vec2 texelCoord;\n\nuniform float dt;\n\tuniform sampler2D particleData;\n\nuniform float dragCoefficient;\n\tuniform vec2 flowScale;\n\tuniform sampler2D flowVelocityField;\n\tvoid main(){\n\t\tvec2 p = texture2D(particleData, texelCoord).xy;\n\t\tvec2 v = texture2D(particleData, texelCoord).zw;\n\t\tvec2 vf = texture2D(flowVelocityField, (p+1.)*.5).xy * flowScale;\n\t\tv += (vf - v) * dragCoefficient;\n\t\tp += dt*v;\n\t\tgl_FragColor = vec4(p, v);\n\t}\n";
	}
	,__class__: StepParticles
});
var RenderParticles = function() {
	shaderblox_ShaderBase.call(this);
};
$hxClasses["RenderParticles"] = RenderParticles;
RenderParticles.__name__ = ["RenderParticles"];
RenderParticles.__super__ = shaderblox_ShaderBase;
RenderParticles.prototype = $extend(shaderblox_ShaderBase.prototype,{
	createProperties: function() {
		shaderblox_ShaderBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("particleData",null,false);
		this.particleData = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_attributes_FloatAttribute("particleUV",0,2);
		this.particleUV = instance1;
		this._attributes.push(instance1);
		this._aStride += 8;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nuniform sampler2D particleData;\n\tattribute vec2 particleUV;\n\tvarying vec4 color;\n\t\n\tvoid main(){\n\t\tvec2 p = texture2D(particleData, particleUV).xy;\n\t\tvec2 v = texture2D(particleData, particleUV).zw;\n\t\tgl_PointSize = 1.0;\n\t\tgl_Position = vec4(p, 0.0, 1.0);\n\t\tcolor = vec4(1.0, 1.0, 1.0, 1.0);\n\t}\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nvarying vec4 color;\n\tvoid main(){\n\t\tgl_FragColor = vec4(color);\n\t}\n";
	}
	,__class__: RenderParticles
});
var HxOverrides = function() { };
$hxClasses["HxOverrides"] = HxOverrides;
HxOverrides.__name__ = ["HxOverrides"];
HxOverrides.strDate = function(s) {
	var _g = s.length;
	switch(_g) {
	case 8:
		var k = s.split(":");
		var d = new Date();
		d.setTime(0);
		d.setUTCHours(k[0]);
		d.setUTCMinutes(k[1]);
		d.setUTCSeconds(k[2]);
		return d;
	case 10:
		var k1 = s.split("-");
		return new Date(k1[0],k1[1] - 1,k1[2],0,0,0);
	case 19:
		var k2 = s.split(" ");
		var y = k2[0].split("-");
		var t = k2[1].split(":");
		return new Date(y[0],y[1] - 1,y[2],t[0],t[1],t[2]);
	default:
		throw new js__$Boot_HaxeError("Invalid date format : " + s);
	}
};
HxOverrides.cca = function(s,index) {
	var x = s.charCodeAt(index);
	if(x != x) return undefined;
	return x;
};
HxOverrides.substr = function(s,pos,len) {
	if(pos != null && pos != 0 && len != null && len < 0) return "";
	if(len == null) len = s.length;
	if(pos < 0) {
		pos = s.length + pos;
		if(pos < 0) pos = 0;
	} else if(len < 0) len = s.length + len - pos;
	return s.substr(pos,len);
};
HxOverrides.indexOf = function(a,obj,i) {
	var len = a.length;
	if(i < 0) {
		i += len;
		if(i < 0) i = 0;
	}
	while(i < len) {
		if(a[i] === obj) return i;
		i++;
	}
	return -1;
};
HxOverrides.remove = function(a,obj) {
	var i = HxOverrides.indexOf(a,obj,0);
	if(i == -1) return false;
	a.splice(i,1);
	return true;
};
HxOverrides.iter = function(a) {
	return { cur : 0, arr : a, hasNext : function() {
		return this.cur < this.arr.length;
	}, next : function() {
		return this.arr[this.cur++];
	}};
};
var Lambda = function() { };
$hxClasses["Lambda"] = Lambda;
Lambda.__name__ = ["Lambda"];
Lambda.fold = function(it,f,first) {
	var $it0 = $iterator(it)();
	while( $it0.hasNext() ) {
		var x = $it0.next();
		first = f(x,first);
	}
	return first;
};
var List = function() {
	this.length = 0;
};
$hxClasses["List"] = List;
List.__name__ = ["List"];
List.prototype = {
	add: function(item) {
		var x = [item];
		if(this.h == null) this.h = x; else this.q[1] = x;
		this.q = x;
		this.length++;
	}
	,push: function(item) {
		var x = [item,this.h];
		this.h = x;
		if(this.q == null) this.q = x;
		this.length++;
	}
	,remove: function(v) {
		var prev = null;
		var l = this.h;
		while(l != null) {
			if(l[0] == v) {
				if(prev == null) this.h = l[1]; else prev[1] = l[1];
				if(this.q == l) this.q = prev;
				this.length--;
				return true;
			}
			prev = l;
			l = l[1];
		}
		return false;
	}
	,__class__: List
};
var snow_App = function() {
	this.next_tick = 0;
	this.fixed_overflow = 0.0;
	this.fixed_frame_time = 0.0167;
	this.fixed_timestep = false;
	this.fixed_alpha = 1.0;
	this.sim_time = 0;
	this.sim_delta = 0.0166666666666666664;
	this.frame_max_delta = 0.25;
	this.frame_delta = 0.0166666666666666664;
	this.frame_start_prev = 0.0;
	this.frame_start = 0.0166666666666666664;
	this.tick_delta = 0.0166666666666666664;
	this.tick_start_prev = 0.0;
	this.tick_start = 0.0166666666666666664;
	this.update_rate = 0;
	this.fixed_delta = 0;
	this.timescale = 1;
};
$hxClasses["snow.App"] = snow_App;
snow_App.__name__ = ["snow","App"];
snow_App.main = function() {
	new snow_Snow(new Main());
};
snow_App.prototype = {
	config: function(_config) {
		return _config;
	}
	,ready: function() {
	}
	,update: function(dt) {
	}
	,tick: function(dt) {
	}
	,ondestroy: function() {
	}
	,onevent: function(event) {
	}
	,ontickstart: function() {
	}
	,ontickend: function() {
	}
	,onkeydown: function(keycode,scancode,repeat,mod,timestamp,window_id) {
	}
	,onkeyup: function(keycode,scancode,repeat,mod,timestamp,window_id) {
	}
	,ontextinput: function(text,start,length,type,timestamp,window_id) {
	}
	,onmousedown: function(x,y,button,timestamp,window_id) {
	}
	,onmouseup: function(x,y,button,timestamp,window_id) {
	}
	,onmousewheel: function(x,y,timestamp,window_id) {
	}
	,onmousemove: function(x,y,xrel,yrel,timestamp,window_id) {
	}
	,ontouchdown: function(x,y,dx,dy,touch_id,timestamp) {
	}
	,ontouchup: function(x,y,dx,dy,touch_id,timestamp) {
	}
	,ontouchmove: function(x,y,dx,dy,touch_id,timestamp) {
	}
	,ongamepadaxis: function(gamepad,axis,value,timestamp) {
	}
	,ongamepaddown: function(gamepad,button,value,timestamp) {
	}
	,ongamepadup: function(gamepad,button,value,timestamp) {
	}
	,ongamepaddevice: function(gamepad,id,type,timestamp) {
	}
	,internal_init: function() {
		this.sim_time = 0;
		this.fixed_frame_time = 0.0166666666666666664;
		this.tick_start = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
		this.tick_start_prev = this.tick_start - this.fixed_frame_time;
		this.tick_delta = this.fixed_frame_time;
		this.frame_start = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
		this.frame_start_prev = this.frame_start - this.fixed_frame_time;
		this.frame_delta = this.sim_delta = this.fixed_frame_time;
	}
	,internal_tick: function() {
		this.ontickstart();
		this.tick_start = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
		this.tick_delta = this.tick_start - this.tick_start_prev;
		this.tick_start_prev = this.tick_start;
		if(this.fixed_timestep) this.internal_tick_fixed_timestep(); else this.internal_tick_default();
		this.tick(this.tick_delta);
		this.ontickend();
	}
	,internal_tick_default: function() {
		if(this.update_rate != 0) {
			if(window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start < this.next_tick) return;
			this.next_tick = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start + this.update_rate;
		}
		this.frame_start = this.tick_start;
		this.frame_delta = this.frame_start - this.frame_start_prev;
		this.frame_start_prev = this.frame_start;
		if(this.frame_delta > this.frame_max_delta) this.frame_delta = this.frame_max_delta;
		var _used_delta;
		if(this.fixed_delta == 0) _used_delta = this.frame_delta; else _used_delta = this.fixed_delta;
		_used_delta *= this.timescale;
		this.sim_delta = _used_delta;
		this.sim_time += _used_delta;
		this.update(_used_delta);
	}
	,internal_tick_fixed_timestep: function() {
		this.frame_start = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
		this.frame_delta = this.frame_start - this.frame_start_prev;
		this.frame_start_prev = this.frame_start;
		this.sim_delta = this.frame_delta * this.timescale;
		if(this.sim_delta > this.frame_max_delta) this.sim_delta = this.frame_max_delta;
		this.fixed_overflow += this.sim_delta;
		var _slice = this.fixed_frame_time * this.timescale;
		while(this.fixed_overflow >= this.fixed_frame_time) {
			this.update(_slice);
			this.sim_time += _slice;
			this.fixed_overflow -= _slice;
		}
		this.fixed_alpha = this.fixed_overflow / this.fixed_frame_time;
	}
	,__class__: snow_App
};
var Main = function() {
	this.rshiftDown = false;
	this.lshiftDown = false;
	this.qualityDirection = 0;
	this.renderFluidEnabled = true;
	this.renderParticlesEnabled = true;
	this.lastMouseFluid = new shaderblox_uniforms_Vector2();
	this.lastMouse = new shaderblox_uniforms_Vector2();
	this.mouseFluid = new shaderblox_uniforms_Vector2();
	this.mouse = new shaderblox_uniforms_Vector2();
	this.lastMousePointKnown = false;
	this.mousePointKnown = false;
	this.isMouseDown = false;
	this.mousePositionsXY = [];
	this.userIds = new haxe_ds_StringMap();
	this.lastMousePositions = [];
	this.mousePositions = [];
	this.isMouseDowns = [];
	this.screenBuffer = null;
	this.textureQuad = null;
	var _g = this;
	snow_App.call(this);
	var _g1 = 0;
	while(_g1 < 30) {
		var i = _g1++;
		this.isMouseDowns.push(false);
		this.mousePositions.push(new shaderblox_uniforms_Vector2(0,0));
		this.lastMousePositions.push(new shaderblox_uniforms_Vector2(0,0));
		this.mousePositionsXY.push({ x : 0, y : 0});
	}
	this.connection = new WebsocketConnection("192.168.1.103",8000,function(connection) {
		haxe_Log.trace("Opened",{ fileName : "Main.hx", lineNumber : 77, className : "Main", methodName : "new"});
		connection.sendMessage({ type : "saveState", data : { mood : "Happy"}});
	},function(connection1,parsedMessage) {
		var messageType = parsedMessage.type;
		var messageData = parsedMessage.data;
		if(messageType == "ping") return;
		var userId = messageData.userId;
		var x = messageData.x;
		var y = messageData.y;
		var transY = -(y * 2 - 1);
		var transX = x * 2 - 1;
		switch(messageType) {
		case "touch-start":
			haxe_Log.trace("touch start",{ fileName : "Main.hx", lineNumber : 100, className : "Main", methodName : "new"});
			if(!_g.userIds.exists(userId)) {
				var _g2 = 0;
				var _g11 = _g.isMouseDowns.length;
				while(_g2 < _g11) {
					var i1 = _g2++;
					haxe_Log.trace("checking " + i1,{ fileName : "Main.hx", lineNumber : 103, className : "Main", methodName : "new"});
					haxe_Log.trace(_g.isMouseDowns[i1],{ fileName : "Main.hx", lineNumber : 104, className : "Main", methodName : "new"});
					if(!_g.isMouseDowns[i1]) {
						_g.userIds.set(userId,i1);
						_g.isMouseDowns[i1] = true;
						_g.lastMousePositions[i1].set(transX * _g.fluid.aspectRatio,transY);
						_g.mousePositions[i1].set(transX * _g.fluid.aspectRatio,transY);
						_g.mousePositionsXY[i1] = { x : transX * _g.fluid.aspectRatio, y : transY};
						haxe_Log.trace("Found at " + i1,{ fileName : "Main.hx", lineNumber : 117, className : "Main", methodName : "new"});
						break;
					}
				}
			}
			break;
		case "touch-end":
			haxe_Log.trace("touch end",{ fileName : "Main.hx", lineNumber : 123, className : "Main", methodName : "new"});
			if(_g.userIds.exists(userId)) {
				var i2 = _g.userIds.get(userId);
				_g.isMouseDowns[i2] = false;
				_g.userIds.remove(userId);
			}
			break;
		case "touch-move":
			haxe_Log.trace("touch move",{ fileName : "Main.hx", lineNumber : 130, className : "Main", methodName : "new"});
			if(_g.userIds.exists(userId)) {
				var i3 = _g.userIds.get(userId);
				_g.lastMousePositions[i3].set(_g.mousePositionsXY[i3].x,_g.mousePositionsXY[i3].y);
				_g.mousePositions[i3].set(transX * _g.fluid.aspectRatio,transY);
				_g.mousePositionsXY[i3] = { x : transX * _g.fluid.aspectRatio, y : transY};
				haxe_Log.trace("moved at " + i3,{ fileName : "Main.hx", lineNumber : 142, className : "Main", methodName : "new"});
			}
			break;
		}
	});
	this.performanceMonitor = new PerformanceMonitor(35,null,2000);
	this.set_simulationQuality(SimulationQuality.Medium);
	this.performanceMonitor.fpsTooLowCallback = $bind(this,this.lowerQualityRequired);
	var urlParams = js_Web.getParams();
	if(__map_reserved.q != null?urlParams.existsReserved("q"):urlParams.h.hasOwnProperty("q")) {
		var q = StringTools.trim((__map_reserved.q != null?urlParams.getReserved("q"):urlParams.h["q"]).toLowerCase());
		var _g3 = 0;
		var _g12 = Type.allEnums(SimulationQuality);
		while(_g3 < _g12.length) {
			var e = _g12[_g3];
			++_g3;
			var name = e[0].toLowerCase();
			if(q == name) {
				this.set_simulationQuality(e);
				this.performanceMonitor.fpsTooLowCallback = null;
				break;
			}
		}
	}
	if(__map_reserved.iterations != null?urlParams.existsReserved("iterations"):urlParams.h.hasOwnProperty("iterations")) {
		var iterationsParam = Std.parseInt(__map_reserved.iterations != null?urlParams.getReserved("iterations"):urlParams.h["iterations"]);
		if(((iterationsParam | 0) === iterationsParam)) this.set_fluidIterations(iterationsParam);
	}
};
$hxClasses["Main"] = Main;
Main.__name__ = ["Main"];
Main.__super__ = snow_App;
Main.prototype = $extend(snow_App.prototype,{
	config: function(config) {
		config.runtime.prevent_default_context_menu = false;
		config.window.borderless = true;
		config.window.fullscreen = true;
		config.window.title = "GPU Fluid";
		config.window.width = window.innerWidth;
		config.window.height = window.innerHeight;
		config.render.antialiasing = 0;
		return config;
	}
	,ready: function() {
		this.init();
	}
	,init: function() {
		snow_modules_opengl_web_GL.gl.disable(2929);
		snow_modules_opengl_web_GL.gl.disable(2884);
		snow_modules_opengl_web_GL.gl.disable(3024);
		this.textureQuad = gltoolbox_GeometryTools.createQuad(0,0,1,1);
		this.offScreenTarget = new gltoolbox_render_RenderTarget(Math.round(this.app.runtime.window.width * this.offScreenScale),Math.round(this.app.runtime.window.height * this.offScreenScale),gltoolbox_TextureTools.createTextureFactory({ channelType : 6407, dataType : 5121, filter : this.offScreenFilter}));
		this.screenTextureShader = new ScreenTexture();
		this.renderParticlesShader = new ColorParticleMotion();
		this.updateDyeShader = new MouseDye();
		this.mouseForceShader = new MouseForce();
		this.updateDyeShader.mousePosition0.set_data(this.mousePositions[0]);
		this.updateDyeShader.lastMousePosition0.set_data(this.lastMousePositions[0]);
		this.mouseForceShader.mousePosition0.set_data(this.mousePositions[0]);
		this.mouseForceShader.lastMousePosition0.set_data(this.lastMousePositions[0]);
		this.updateDyeShader.mousePosition1.set_data(this.mousePositions[1]);
		this.updateDyeShader.lastMousePosition1.set_data(this.lastMousePositions[1]);
		this.mouseForceShader.mousePosition1.set_data(this.mousePositions[1]);
		this.mouseForceShader.lastMousePosition1.set_data(this.lastMousePositions[1]);
		this.updateDyeShader.mousePosition2.set_data(this.mousePositions[2]);
		this.updateDyeShader.lastMousePosition2.set_data(this.lastMousePositions[2]);
		this.mouseForceShader.mousePosition2.set_data(this.mousePositions[2]);
		this.mouseForceShader.lastMousePosition2.set_data(this.lastMousePositions[2]);
		this.updateDyeShader.mousePosition3.set_data(this.mousePositions[3]);
		this.updateDyeShader.lastMousePosition3.set_data(this.lastMousePositions[3]);
		this.mouseForceShader.mousePosition3.set_data(this.mousePositions[3]);
		this.mouseForceShader.lastMousePosition3.set_data(this.lastMousePositions[3]);
		this.updateDyeShader.mousePosition4.set_data(this.mousePositions[4]);
		this.updateDyeShader.lastMousePosition4.set_data(this.lastMousePositions[4]);
		this.mouseForceShader.mousePosition4.set_data(this.mousePositions[4]);
		this.mouseForceShader.lastMousePosition4.set_data(this.lastMousePositions[4]);
		this.updateDyeShader.mousePosition5.set_data(this.mousePositions[5]);
		this.updateDyeShader.lastMousePosition5.set_data(this.lastMousePositions[5]);
		this.mouseForceShader.mousePosition5.set_data(this.mousePositions[5]);
		this.mouseForceShader.lastMousePosition5.set_data(this.lastMousePositions[5]);
		this.updateDyeShader.mousePosition6.set_data(this.mousePositions[6]);
		this.updateDyeShader.lastMousePosition6.set_data(this.lastMousePositions[6]);
		this.mouseForceShader.mousePosition6.set_data(this.mousePositions[6]);
		this.mouseForceShader.lastMousePosition6.set_data(this.lastMousePositions[6]);
		this.updateDyeShader.mousePosition7.set_data(this.mousePositions[7]);
		this.updateDyeShader.lastMousePosition7.set_data(this.lastMousePositions[7]);
		this.mouseForceShader.mousePosition7.set_data(this.mousePositions[7]);
		this.mouseForceShader.lastMousePosition7.set_data(this.lastMousePositions[7]);
		this.updateDyeShader.mousePosition8.set_data(this.mousePositions[8]);
		this.updateDyeShader.lastMousePosition8.set_data(this.lastMousePositions[8]);
		this.mouseForceShader.mousePosition8.set_data(this.mousePositions[8]);
		this.mouseForceShader.lastMousePosition8.set_data(this.lastMousePositions[8]);
		this.updateDyeShader.mousePosition9.set_data(this.mousePositions[9]);
		this.updateDyeShader.lastMousePosition9.set_data(this.lastMousePositions[9]);
		this.mouseForceShader.mousePosition9.set_data(this.mousePositions[9]);
		this.mouseForceShader.lastMousePosition9.set_data(this.lastMousePositions[9]);
		this.updateDyeShader.mousePosition10.set_data(this.mousePositions[10]);
		this.updateDyeShader.lastMousePosition10.set_data(this.lastMousePositions[10]);
		this.mouseForceShader.mousePosition10.set_data(this.mousePositions[10]);
		this.mouseForceShader.lastMousePosition10.set_data(this.lastMousePositions[10]);
		this.updateDyeShader.mousePosition11.set_data(this.mousePositions[11]);
		this.updateDyeShader.lastMousePosition11.set_data(this.lastMousePositions[11]);
		this.mouseForceShader.mousePosition11.set_data(this.mousePositions[11]);
		this.mouseForceShader.lastMousePosition11.set_data(this.lastMousePositions[11]);
		this.updateDyeShader.mousePosition12.set_data(this.mousePositions[12]);
		this.updateDyeShader.lastMousePosition12.set_data(this.lastMousePositions[12]);
		this.mouseForceShader.mousePosition12.set_data(this.mousePositions[12]);
		this.mouseForceShader.lastMousePosition12.set_data(this.lastMousePositions[12]);
		this.updateDyeShader.mousePosition13.set_data(this.mousePositions[13]);
		this.updateDyeShader.lastMousePosition13.set_data(this.lastMousePositions[13]);
		this.mouseForceShader.mousePosition13.set_data(this.mousePositions[13]);
		this.mouseForceShader.lastMousePosition13.set_data(this.lastMousePositions[13]);
		this.updateDyeShader.mousePosition14.set_data(this.mousePositions[14]);
		this.updateDyeShader.lastMousePosition14.set_data(this.lastMousePositions[14]);
		this.mouseForceShader.mousePosition14.set_data(this.mousePositions[14]);
		this.mouseForceShader.lastMousePosition14.set_data(this.lastMousePositions[14]);
		this.updateDyeShader.mousePosition15.set_data(this.mousePositions[15]);
		this.updateDyeShader.lastMousePosition15.set_data(this.lastMousePositions[15]);
		this.mouseForceShader.mousePosition15.set_data(this.mousePositions[15]);
		this.mouseForceShader.lastMousePosition15.set_data(this.lastMousePositions[15]);
		this.updateDyeShader.mousePosition16.set_data(this.mousePositions[16]);
		this.updateDyeShader.lastMousePosition16.set_data(this.lastMousePositions[16]);
		this.mouseForceShader.mousePosition16.set_data(this.mousePositions[16]);
		this.mouseForceShader.lastMousePosition16.set_data(this.lastMousePositions[16]);
		this.updateDyeShader.mousePosition17.set_data(this.mousePositions[17]);
		this.updateDyeShader.lastMousePosition17.set_data(this.lastMousePositions[17]);
		this.mouseForceShader.mousePosition17.set_data(this.mousePositions[17]);
		this.mouseForceShader.lastMousePosition17.set_data(this.lastMousePositions[17]);
		this.updateDyeShader.mousePosition18.set_data(this.mousePositions[18]);
		this.updateDyeShader.lastMousePosition18.set_data(this.lastMousePositions[18]);
		this.mouseForceShader.mousePosition18.set_data(this.mousePositions[18]);
		this.mouseForceShader.lastMousePosition18.set_data(this.lastMousePositions[18]);
		this.updateDyeShader.mousePosition19.set_data(this.mousePositions[19]);
		this.updateDyeShader.lastMousePosition19.set_data(this.lastMousePositions[19]);
		this.mouseForceShader.mousePosition19.set_data(this.mousePositions[19]);
		this.mouseForceShader.lastMousePosition19.set_data(this.lastMousePositions[19]);
		this.updateDyeShader.mousePosition20.set_data(this.mousePositions[20]);
		this.updateDyeShader.lastMousePosition20.set_data(this.lastMousePositions[20]);
		this.mouseForceShader.mousePosition20.set_data(this.mousePositions[20]);
		this.mouseForceShader.lastMousePosition20.set_data(this.lastMousePositions[20]);
		this.updateDyeShader.mousePosition21.set_data(this.mousePositions[21]);
		this.updateDyeShader.lastMousePosition21.set_data(this.lastMousePositions[21]);
		this.mouseForceShader.mousePosition21.set_data(this.mousePositions[21]);
		this.mouseForceShader.lastMousePosition21.set_data(this.lastMousePositions[21]);
		this.updateDyeShader.mousePosition22.set_data(this.mousePositions[22]);
		this.updateDyeShader.lastMousePosition22.set_data(this.lastMousePositions[22]);
		this.mouseForceShader.mousePosition22.set_data(this.mousePositions[22]);
		this.mouseForceShader.lastMousePosition22.set_data(this.lastMousePositions[22]);
		this.updateDyeShader.mousePosition23.set_data(this.mousePositions[23]);
		this.updateDyeShader.lastMousePosition23.set_data(this.lastMousePositions[23]);
		this.mouseForceShader.mousePosition23.set_data(this.mousePositions[23]);
		this.mouseForceShader.lastMousePosition23.set_data(this.lastMousePositions[23]);
		this.updateDyeShader.mousePosition24.set_data(this.mousePositions[24]);
		this.updateDyeShader.lastMousePosition24.set_data(this.lastMousePositions[24]);
		this.mouseForceShader.mousePosition24.set_data(this.mousePositions[24]);
		this.mouseForceShader.lastMousePosition24.set_data(this.lastMousePositions[24]);
		this.updateDyeShader.mousePosition25.set_data(this.mousePositions[25]);
		this.updateDyeShader.lastMousePosition25.set_data(this.lastMousePositions[25]);
		this.mouseForceShader.mousePosition25.set_data(this.mousePositions[25]);
		this.mouseForceShader.lastMousePosition25.set_data(this.lastMousePositions[25]);
		this.updateDyeShader.mousePosition26.set_data(this.mousePositions[26]);
		this.updateDyeShader.lastMousePosition26.set_data(this.lastMousePositions[26]);
		this.mouseForceShader.mousePosition26.set_data(this.mousePositions[26]);
		this.mouseForceShader.lastMousePosition26.set_data(this.lastMousePositions[26]);
		this.updateDyeShader.mousePosition27.set_data(this.mousePositions[27]);
		this.updateDyeShader.lastMousePosition27.set_data(this.lastMousePositions[27]);
		this.mouseForceShader.mousePosition27.set_data(this.mousePositions[27]);
		this.mouseForceShader.lastMousePosition27.set_data(this.lastMousePositions[27]);
		this.updateDyeShader.mousePosition28.set_data(this.mousePositions[28]);
		this.updateDyeShader.lastMousePosition28.set_data(this.lastMousePositions[28]);
		this.mouseForceShader.mousePosition28.set_data(this.mousePositions[28]);
		this.mouseForceShader.lastMousePosition28.set_data(this.lastMousePositions[28]);
		this.updateDyeShader.mousePosition29.set_data(this.mousePositions[29]);
		this.updateDyeShader.lastMousePosition29.set_data(this.lastMousePositions[29]);
		this.mouseForceShader.mousePosition29.set_data(this.mousePositions[29]);
		this.mouseForceShader.lastMousePosition29.set_data(this.lastMousePositions[29]);
		var cellScale = 32;
		this.fluid = new GPUFluid(Math.round(this.app.runtime.window.width * this.fluidScale),Math.round(this.app.runtime.window.height * this.fluidScale),cellScale,this.fluidIterations);
		this.fluid.set_updateDyeShader(this.updateDyeShader);
		this.fluid.set_applyForcesShader(this.mouseForceShader);
		this.particles = new GPUParticles(this.particleCount);
		this.particles.stepParticlesShader.flowScale.data.x = 1 / (this.fluid.cellSize * this.fluid.aspectRatio);
		this.particles.stepParticlesShader.flowScale.data.y = 1 / this.fluid.cellSize;
		this.particles.stepParticlesShader.dragCoefficient.set_data(1);
		this.lastTime = haxe_Timer.stamp();
	}
	,update: function(dt) {
		dt = 0.016;
		this.updateDyeShader.isMouseDown0.set_data(this.isMouseDowns[0]);
		this.mouseForceShader.isMouseDown0.set_data(this.isMouseDowns[0]);
		this.updateDyeShader.isMouseDown1.set_data(this.isMouseDowns[1]);
		this.mouseForceShader.isMouseDown1.set_data(this.isMouseDowns[1]);
		this.updateDyeShader.isMouseDown2.set_data(this.isMouseDowns[2]);
		this.mouseForceShader.isMouseDown2.set_data(this.isMouseDowns[2]);
		this.updateDyeShader.isMouseDown3.set_data(this.isMouseDowns[3]);
		this.mouseForceShader.isMouseDown3.set_data(this.isMouseDowns[3]);
		this.updateDyeShader.isMouseDown4.set_data(this.isMouseDowns[4]);
		this.mouseForceShader.isMouseDown4.set_data(this.isMouseDowns[4]);
		this.updateDyeShader.isMouseDown5.set_data(this.isMouseDowns[5]);
		this.mouseForceShader.isMouseDown5.set_data(this.isMouseDowns[5]);
		this.updateDyeShader.isMouseDown6.set_data(this.isMouseDowns[6]);
		this.mouseForceShader.isMouseDown6.set_data(this.isMouseDowns[6]);
		this.updateDyeShader.isMouseDown7.set_data(this.isMouseDowns[7]);
		this.mouseForceShader.isMouseDown7.set_data(this.isMouseDowns[7]);
		this.updateDyeShader.isMouseDown8.set_data(this.isMouseDowns[8]);
		this.mouseForceShader.isMouseDown8.set_data(this.isMouseDowns[8]);
		this.updateDyeShader.isMouseDown9.set_data(this.isMouseDowns[9]);
		this.mouseForceShader.isMouseDown9.set_data(this.isMouseDowns[9]);
		this.updateDyeShader.isMouseDown10.set_data(this.isMouseDowns[10]);
		this.mouseForceShader.isMouseDown10.set_data(this.isMouseDowns[10]);
		this.updateDyeShader.isMouseDown11.set_data(this.isMouseDowns[11]);
		this.mouseForceShader.isMouseDown11.set_data(this.isMouseDowns[11]);
		this.updateDyeShader.isMouseDown12.set_data(this.isMouseDowns[12]);
		this.mouseForceShader.isMouseDown12.set_data(this.isMouseDowns[12]);
		this.updateDyeShader.isMouseDown13.set_data(this.isMouseDowns[13]);
		this.mouseForceShader.isMouseDown13.set_data(this.isMouseDowns[13]);
		this.updateDyeShader.isMouseDown14.set_data(this.isMouseDowns[14]);
		this.mouseForceShader.isMouseDown14.set_data(this.isMouseDowns[14]);
		this.updateDyeShader.isMouseDown15.set_data(this.isMouseDowns[15]);
		this.mouseForceShader.isMouseDown15.set_data(this.isMouseDowns[15]);
		this.updateDyeShader.isMouseDown16.set_data(this.isMouseDowns[16]);
		this.mouseForceShader.isMouseDown16.set_data(this.isMouseDowns[16]);
		this.updateDyeShader.isMouseDown17.set_data(this.isMouseDowns[17]);
		this.mouseForceShader.isMouseDown17.set_data(this.isMouseDowns[17]);
		this.updateDyeShader.isMouseDown18.set_data(this.isMouseDowns[18]);
		this.mouseForceShader.isMouseDown18.set_data(this.isMouseDowns[18]);
		this.updateDyeShader.isMouseDown19.set_data(this.isMouseDowns[19]);
		this.mouseForceShader.isMouseDown19.set_data(this.isMouseDowns[19]);
		this.updateDyeShader.isMouseDown20.set_data(this.isMouseDowns[20]);
		this.mouseForceShader.isMouseDown20.set_data(this.isMouseDowns[20]);
		this.updateDyeShader.isMouseDown21.set_data(this.isMouseDowns[21]);
		this.mouseForceShader.isMouseDown21.set_data(this.isMouseDowns[21]);
		this.updateDyeShader.isMouseDown22.set_data(this.isMouseDowns[22]);
		this.mouseForceShader.isMouseDown22.set_data(this.isMouseDowns[22]);
		this.updateDyeShader.isMouseDown23.set_data(this.isMouseDowns[23]);
		this.mouseForceShader.isMouseDown23.set_data(this.isMouseDowns[23]);
		this.updateDyeShader.isMouseDown24.set_data(this.isMouseDowns[24]);
		this.mouseForceShader.isMouseDown24.set_data(this.isMouseDowns[24]);
		this.updateDyeShader.isMouseDown25.set_data(this.isMouseDowns[25]);
		this.mouseForceShader.isMouseDown25.set_data(this.isMouseDowns[25]);
		this.updateDyeShader.isMouseDown26.set_data(this.isMouseDowns[26]);
		this.mouseForceShader.isMouseDown26.set_data(this.isMouseDowns[26]);
		this.updateDyeShader.isMouseDown27.set_data(this.isMouseDowns[27]);
		this.mouseForceShader.isMouseDown27.set_data(this.isMouseDowns[27]);
		this.updateDyeShader.isMouseDown28.set_data(this.isMouseDowns[28]);
		this.mouseForceShader.isMouseDown28.set_data(this.isMouseDowns[28]);
		this.updateDyeShader.isMouseDown29.set_data(this.isMouseDowns[29]);
		this.mouseForceShader.isMouseDown29.set_data(this.isMouseDowns[29]);
		this.fluid.step(dt);
		this.particles.stepParticlesShader.flowVelocityField.set_data(this.fluid.velocityRenderTarget.readFromTexture);
		if(this.renderParticlesEnabled) this.particles.step(dt);
		null;
	}
	,tick: function(delta) {
		snow_modules_opengl_web_GL.gl.viewport(0,0,this.offScreenTarget.width,this.offScreenTarget.height);
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.offScreenTarget.frameBufferObject);
		snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
		snow_modules_opengl_web_GL.gl.clear(16384);
		snow_modules_opengl_web_GL.gl.enable(3042);
		snow_modules_opengl_web_GL.gl.blendFunc(770,770);
		snow_modules_opengl_web_GL.gl.blendEquation(32774);
		if(this.renderParticlesEnabled) {
			snow_modules_opengl_web_GL.gl.bindBuffer(34962,this.particles.particleUVs);
			this.renderParticlesShader.particleData.set_data(this.particles.particleData.readFromTexture);
			this.renderParticlesShader.activate(true,true);
			snow_modules_opengl_web_GL.gl.drawArrays(0,0,this.particles.count);
			this.renderParticlesShader.deactivate();
		}
		if(this.renderFluidEnabled) {
			snow_modules_opengl_web_GL.gl.bindBuffer(34962,this.textureQuad);
			this.screenTextureShader.texture.set_data(this.fluid.dyeRenderTarget.readFromTexture);
			this.screenTextureShader.activate(true,true);
			snow_modules_opengl_web_GL.gl.drawArrays(5,0,4);
			this.screenTextureShader.deactivate();
		}
		snow_modules_opengl_web_GL.gl.disable(3042);
		snow_modules_opengl_web_GL.gl.viewport(0,0,this.app.runtime.window.width,this.app.runtime.window.height);
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.screenBuffer);
		snow_modules_opengl_web_GL.gl.bindBuffer(34962,this.textureQuad);
		this.screenTextureShader.texture.set_data(this.offScreenTarget.texture);
		this.screenTextureShader.activate(true,true);
		snow_modules_opengl_web_GL.gl.drawArrays(5,0,4);
		this.screenTextureShader.deactivate();
	}
	,renderTexture: function(texture) {
		snow_modules_opengl_web_GL.gl.bindBuffer(34962,this.textureQuad);
		this.screenTextureShader.texture.set_data(texture);
		this.screenTextureShader.activate(true,true);
		snow_modules_opengl_web_GL.gl.drawArrays(5,0,4);
		this.screenTextureShader.deactivate();
	}
	,renderParticles: function() {
		snow_modules_opengl_web_GL.gl.bindBuffer(34962,this.particles.particleUVs);
		this.renderParticlesShader.particleData.set_data(this.particles.particleData.readFromTexture);
		this.renderParticlesShader.activate(true,true);
		snow_modules_opengl_web_GL.gl.drawArrays(0,0,this.particles.count);
		this.renderParticlesShader.deactivate();
	}
	,updateSimulationTextures: function() {
		var w;
		var h;
		w = Math.round(this.app.runtime.window.width * this.fluidScale);
		h = Math.round(this.app.runtime.window.height * this.fluidScale);
		if(w != this.fluid.width || h != this.fluid.height) this.fluid.resize(w,h);
		w = Math.round(this.app.runtime.window.width * this.offScreenScale);
		h = Math.round(this.app.runtime.window.height * this.offScreenScale);
		if(w != this.offScreenTarget.width || h != this.offScreenTarget.height) this.offScreenTarget.resize(w,h);
		if(this.particleCount != this.particles.count) this.particles.setCount(this.particleCount);
	}
	,set_simulationQuality: function(quality) {
		switch(quality[1]) {
		case 0:
			this.particleCount = 1048576;
			this.fluidScale = 0.5;
			this.set_fluidIterations(30);
			this.offScreenScale = 1.;
			this.offScreenFilter = 9728;
			break;
		case 1:
			this.particleCount = 1048576;
			this.fluidScale = 0.25;
			this.set_fluidIterations(20);
			this.offScreenScale = 1.;
			this.offScreenFilter = 9728;
			break;
		case 2:
			this.particleCount = 262144;
			this.fluidScale = 0.25;
			this.set_fluidIterations(18);
			this.offScreenScale = 1.;
			this.offScreenFilter = 9728;
			break;
		case 3:
			this.particleCount = 65536;
			this.fluidScale = 0.2;
			this.set_fluidIterations(14);
			this.offScreenScale = 1.;
			this.offScreenFilter = 9728;
			break;
		case 4:
			this.particleCount = 16384;
			this.fluidScale = 0.166666666666666657;
			this.set_fluidIterations(12);
			this.offScreenScale = 0.5;
			this.offScreenFilter = 9728;
			break;
		case 5:
			this.particleCount = 16384;
			this.fluidScale = 0.1;
			this.set_fluidIterations(6);
			this.offScreenScale = 0.5;
			this.offScreenFilter = 9729;
			break;
		}
		return this.simulationQuality = quality;
	}
	,set_fluidIterations: function(v) {
		this.fluidIterations = v;
		if(this.fluid != null) this.fluid.solverIterations = v;
		return v;
	}
	,lowerQualityRequired: function(magnitude) {
		if(this.qualityDirection > 0) return;
		this.qualityDirection = -1;
		var qualityIndex = this.simulationQuality[1];
		var maxIndex = Type.allEnums(SimulationQuality).length - 1;
		if(qualityIndex >= maxIndex) return;
		if(magnitude < 0.5) qualityIndex += 1; else qualityIndex += 2;
		if(qualityIndex > maxIndex) qualityIndex = maxIndex;
		var newQuality = Type.createEnumIndex(SimulationQuality,qualityIndex);
		haxe_Log.trace("Average FPS: " + this.performanceMonitor.fpsSample.average + ", lowering quality to: " + Std.string(newQuality),{ fileName : "Main.hx", lineNumber : 586, className : "Main", methodName : "lowerQualityRequired"});
		this.set_simulationQuality(newQuality);
		this.updateSimulationTextures();
	}
	,higherQualityRequired: function(magnitude) {
		if(this.qualityDirection < 0) return;
		this.qualityDirection = 1;
		var qualityIndex = this.simulationQuality[1];
		var minIndex = 0;
		if(qualityIndex <= minIndex) return;
		if(magnitude < 0.5) qualityIndex -= 1; else qualityIndex -= 2;
		if(qualityIndex < minIndex) qualityIndex = minIndex;
		var newQuality = Type.createEnumIndex(SimulationQuality,qualityIndex);
		haxe_Log.trace("Raising quality to: " + Std.string(newQuality),{ fileName : "Main.hx", lineNumber : 606, className : "Main", methodName : "higherQualityRequired"});
		this.set_simulationQuality(newQuality);
		this.updateSimulationTextures();
	}
	,reset: function() {
		this.particles.reset();
		this.fluid.clear();
	}
	,windowToClipSpaceX: function(x) {
		return x / this.app.runtime.window.width * 2 - 1;
	}
	,windowToClipSpaceY: function(y) {
		return (this.app.runtime.window.height - y) / this.app.runtime.window.height * 2 - 1;
	}
	,onmousedown: function(x,y,button,_,_1) {
		this.isMouseDowns[0] = true;
	}
	,onmouseup: function(x,y,button,_,_1) {
		this.isMouseDowns[0] = false;
	}
	,onmousemove: function(x,y,xrel,yrel,_,_1) {
	}
	,updateLastMouse: function() {
	}
	,onkeydown: function(keyCode,_,_1,_2,_3,_4) {
		switch(keyCode) {
		case snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.lshift):
			this.lshiftDown = true;
			break;
		case snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.rshift):
			this.rshiftDown = true;
			break;
		}
	}
	,onkeyup: function(keyCode,_,_1,_2,_3,_4) {
		switch(keyCode) {
		case 114:
			if(this.lshiftDown || this.rshiftDown) this.particles.reset(); else this.reset();
			break;
		case 112:
			this.renderParticlesEnabled = !this.renderParticlesEnabled;
			break;
		case 100:
			this.renderFluidEnabled = !this.renderFluidEnabled;
			break;
		case 115:
			this.fluid.clear();
			break;
		case snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.lshift):
			this.lshiftDown = false;
			break;
		case snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.rshift):
			this.rshiftDown = false;
			break;
		}
	}
	,__class__: Main
});
var SimulationQuality = $hxClasses["SimulationQuality"] = { __ename__ : ["SimulationQuality"], __constructs__ : ["UltraHigh","High","Medium","Low","UltraLow","iOS"] };
SimulationQuality.UltraHigh = ["UltraHigh",0];
SimulationQuality.UltraHigh.toString = $estr;
SimulationQuality.UltraHigh.__enum__ = SimulationQuality;
SimulationQuality.High = ["High",1];
SimulationQuality.High.toString = $estr;
SimulationQuality.High.__enum__ = SimulationQuality;
SimulationQuality.Medium = ["Medium",2];
SimulationQuality.Medium.toString = $estr;
SimulationQuality.Medium.__enum__ = SimulationQuality;
SimulationQuality.Low = ["Low",3];
SimulationQuality.Low.toString = $estr;
SimulationQuality.Low.__enum__ = SimulationQuality;
SimulationQuality.UltraLow = ["UltraLow",4];
SimulationQuality.UltraLow.toString = $estr;
SimulationQuality.UltraLow.__enum__ = SimulationQuality;
SimulationQuality.iOS = ["iOS",5];
SimulationQuality.iOS.toString = $estr;
SimulationQuality.iOS.__enum__ = SimulationQuality;
SimulationQuality.__empty_constructs__ = [SimulationQuality.UltraHigh,SimulationQuality.High,SimulationQuality.Medium,SimulationQuality.Low,SimulationQuality.UltraLow,SimulationQuality.iOS];
var ScreenTexture = function() {
	shaderblox_ShaderBase.call(this);
};
$hxClasses["ScreenTexture"] = ScreenTexture;
ScreenTexture.__name__ = ["ScreenTexture"];
ScreenTexture.__super__ = shaderblox_ShaderBase;
ScreenTexture.prototype = $extend(shaderblox_ShaderBase.prototype,{
	createProperties: function() {
		shaderblox_ShaderBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("texture",null,false);
		this.texture = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_attributes_FloatAttribute("vertexPosition",0,2);
		this.vertexPosition = instance1;
		this._attributes.push(instance1);
		this._aStride += 8;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nattribute vec2 vertexPosition;\nvarying vec2 texelCoord;\n\nvoid main() {\n\ttexelCoord = vertexPosition;\n\tgl_Position = vec4(vertexPosition*2.0 - vec2(1.0, 1.0), 0.0, 1.0 );\n}\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nuniform sampler2D texture;\nvarying vec2 texelCoord;\n\nvoid main(void){\n\tgl_FragColor = abs(texture2D(texture, texelCoord));\n}\n";
	}
	,__class__: ScreenTexture
});
var ColorParticleMotion = function() {
	RenderParticles.call(this);
};
$hxClasses["ColorParticleMotion"] = ColorParticleMotion;
ColorParticleMotion.__name__ = ["ColorParticleMotion"];
ColorParticleMotion.__super__ = RenderParticles;
ColorParticleMotion.prototype = $extend(RenderParticles.prototype,{
	set_POINT_SIZE: function(value) {
		this.POINT_SIZE = value;
		this._vertSource = shaderblox_glsl_GLSLTools.injectConstValue(this._vertSource,"POINT_SIZE",value);
		if(this._ready) this.destroy();
		return value;
	}
	,createProperties: function() {
		RenderParticles.prototype.createProperties.call(this);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nuniform sampler2D particleData;\n\tattribute vec2 particleUV;\n\tvarying vec4 color;\n\t\n\n\nconst float POINT_SIZE = 1.0;\n\tvoid main(){\n\t\tvec2 p = texture2D(particleData, particleUV).xy;\n\t\tvec2 v = texture2D(particleData, particleUV).zw;\n\t\tgl_PointSize = POINT_SIZE;\n\t\tgl_Position = vec4(p, 0.0, 1.0);\n\t\tfloat speed = length(v);\n\t\tfloat x = clamp(speed * 2.0, 0., 1.);\n\t\tcolor.rgb = (\n\t\t\t\tmix(vec3(40.4, 0.0, 35.0) / 300.0, vec3(0.2, 47.8, 100) / 100.0, x)\n\t\t\t\t+ (vec3(63.1, 92.5, 100) / 100.) * x*x*x * .1\n\t\t);\n\t\tcolor.a = 1.0;\n\t}\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nvarying vec4 color;\n\tvoid main(){\n\t\tgl_FragColor = vec4(color);\n\t}\n\n\n";
	}
	,__class__: ColorParticleMotion
});
var MouseDye = function() {
	UpdateDye.call(this);
};
$hxClasses["MouseDye"] = MouseDye;
MouseDye.__name__ = ["MouseDye"];
MouseDye.__super__ = UpdateDye;
MouseDye.prototype = $extend(UpdateDye.prototype,{
	createProperties: function() {
		UpdateDye.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UVec2("mousePosition0",null);
		this.mousePosition0 = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UVec2("mousePosition1",null);
		this.mousePosition1 = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_uniforms_UVec2("mousePosition2",null);
		this.mousePosition2 = instance2;
		this._uniforms.push(instance2);
		var instance3 = new shaderblox_uniforms_UVec2("mousePosition3",null);
		this.mousePosition3 = instance3;
		this._uniforms.push(instance3);
		var instance4 = new shaderblox_uniforms_UVec2("mousePosition4",null);
		this.mousePosition4 = instance4;
		this._uniforms.push(instance4);
		var instance5 = new shaderblox_uniforms_UVec2("mousePosition5",null);
		this.mousePosition5 = instance5;
		this._uniforms.push(instance5);
		var instance6 = new shaderblox_uniforms_UVec2("mousePosition6",null);
		this.mousePosition6 = instance6;
		this._uniforms.push(instance6);
		var instance7 = new shaderblox_uniforms_UVec2("mousePosition7",null);
		this.mousePosition7 = instance7;
		this._uniforms.push(instance7);
		var instance8 = new shaderblox_uniforms_UVec2("mousePosition8",null);
		this.mousePosition8 = instance8;
		this._uniforms.push(instance8);
		var instance9 = new shaderblox_uniforms_UVec2("mousePosition9",null);
		this.mousePosition9 = instance9;
		this._uniforms.push(instance9);
		var instance10 = new shaderblox_uniforms_UVec2("mousePosition10",null);
		this.mousePosition10 = instance10;
		this._uniforms.push(instance10);
		var instance11 = new shaderblox_uniforms_UVec2("mousePosition11",null);
		this.mousePosition11 = instance11;
		this._uniforms.push(instance11);
		var instance12 = new shaderblox_uniforms_UVec2("mousePosition12",null);
		this.mousePosition12 = instance12;
		this._uniforms.push(instance12);
		var instance13 = new shaderblox_uniforms_UVec2("mousePosition13",null);
		this.mousePosition13 = instance13;
		this._uniforms.push(instance13);
		var instance14 = new shaderblox_uniforms_UVec2("mousePosition14",null);
		this.mousePosition14 = instance14;
		this._uniforms.push(instance14);
		var instance15 = new shaderblox_uniforms_UVec2("mousePosition15",null);
		this.mousePosition15 = instance15;
		this._uniforms.push(instance15);
		var instance16 = new shaderblox_uniforms_UVec2("mousePosition16",null);
		this.mousePosition16 = instance16;
		this._uniforms.push(instance16);
		var instance17 = new shaderblox_uniforms_UVec2("mousePosition17",null);
		this.mousePosition17 = instance17;
		this._uniforms.push(instance17);
		var instance18 = new shaderblox_uniforms_UVec2("mousePosition18",null);
		this.mousePosition18 = instance18;
		this._uniforms.push(instance18);
		var instance19 = new shaderblox_uniforms_UVec2("mousePosition19",null);
		this.mousePosition19 = instance19;
		this._uniforms.push(instance19);
		var instance20 = new shaderblox_uniforms_UVec2("mousePosition20",null);
		this.mousePosition20 = instance20;
		this._uniforms.push(instance20);
		var instance21 = new shaderblox_uniforms_UVec2("mousePosition21",null);
		this.mousePosition21 = instance21;
		this._uniforms.push(instance21);
		var instance22 = new shaderblox_uniforms_UVec2("mousePosition22",null);
		this.mousePosition22 = instance22;
		this._uniforms.push(instance22);
		var instance23 = new shaderblox_uniforms_UVec2("mousePosition23",null);
		this.mousePosition23 = instance23;
		this._uniforms.push(instance23);
		var instance24 = new shaderblox_uniforms_UVec2("mousePosition24",null);
		this.mousePosition24 = instance24;
		this._uniforms.push(instance24);
		var instance25 = new shaderblox_uniforms_UVec2("mousePosition25",null);
		this.mousePosition25 = instance25;
		this._uniforms.push(instance25);
		var instance26 = new shaderblox_uniforms_UVec2("mousePosition26",null);
		this.mousePosition26 = instance26;
		this._uniforms.push(instance26);
		var instance27 = new shaderblox_uniforms_UVec2("mousePosition27",null);
		this.mousePosition27 = instance27;
		this._uniforms.push(instance27);
		var instance28 = new shaderblox_uniforms_UVec2("mousePosition28",null);
		this.mousePosition28 = instance28;
		this._uniforms.push(instance28);
		var instance29 = new shaderblox_uniforms_UVec2("mousePosition29",null);
		this.mousePosition29 = instance29;
		this._uniforms.push(instance29);
		var instance30 = new shaderblox_uniforms_UVec2("lastMousePosition0",null);
		this.lastMousePosition0 = instance30;
		this._uniforms.push(instance30);
		var instance31 = new shaderblox_uniforms_UVec2("lastMousePosition1",null);
		this.lastMousePosition1 = instance31;
		this._uniforms.push(instance31);
		var instance32 = new shaderblox_uniforms_UVec2("lastMousePosition2",null);
		this.lastMousePosition2 = instance32;
		this._uniforms.push(instance32);
		var instance33 = new shaderblox_uniforms_UVec2("lastMousePosition3",null);
		this.lastMousePosition3 = instance33;
		this._uniforms.push(instance33);
		var instance34 = new shaderblox_uniforms_UVec2("lastMousePosition4",null);
		this.lastMousePosition4 = instance34;
		this._uniforms.push(instance34);
		var instance35 = new shaderblox_uniforms_UVec2("lastMousePosition5",null);
		this.lastMousePosition5 = instance35;
		this._uniforms.push(instance35);
		var instance36 = new shaderblox_uniforms_UVec2("lastMousePosition6",null);
		this.lastMousePosition6 = instance36;
		this._uniforms.push(instance36);
		var instance37 = new shaderblox_uniforms_UVec2("lastMousePosition7",null);
		this.lastMousePosition7 = instance37;
		this._uniforms.push(instance37);
		var instance38 = new shaderblox_uniforms_UVec2("lastMousePosition8",null);
		this.lastMousePosition8 = instance38;
		this._uniforms.push(instance38);
		var instance39 = new shaderblox_uniforms_UVec2("lastMousePosition9",null);
		this.lastMousePosition9 = instance39;
		this._uniforms.push(instance39);
		var instance40 = new shaderblox_uniforms_UVec2("lastMousePosition10",null);
		this.lastMousePosition10 = instance40;
		this._uniforms.push(instance40);
		var instance41 = new shaderblox_uniforms_UVec2("lastMousePosition11",null);
		this.lastMousePosition11 = instance41;
		this._uniforms.push(instance41);
		var instance42 = new shaderblox_uniforms_UVec2("lastMousePosition12",null);
		this.lastMousePosition12 = instance42;
		this._uniforms.push(instance42);
		var instance43 = new shaderblox_uniforms_UVec2("lastMousePosition13",null);
		this.lastMousePosition13 = instance43;
		this._uniforms.push(instance43);
		var instance44 = new shaderblox_uniforms_UVec2("lastMousePosition14",null);
		this.lastMousePosition14 = instance44;
		this._uniforms.push(instance44);
		var instance45 = new shaderblox_uniforms_UVec2("lastMousePosition15",null);
		this.lastMousePosition15 = instance45;
		this._uniforms.push(instance45);
		var instance46 = new shaderblox_uniforms_UVec2("lastMousePosition16",null);
		this.lastMousePosition16 = instance46;
		this._uniforms.push(instance46);
		var instance47 = new shaderblox_uniforms_UVec2("lastMousePosition17",null);
		this.lastMousePosition17 = instance47;
		this._uniforms.push(instance47);
		var instance48 = new shaderblox_uniforms_UVec2("lastMousePosition18",null);
		this.lastMousePosition18 = instance48;
		this._uniforms.push(instance48);
		var instance49 = new shaderblox_uniforms_UVec2("lastMousePosition19",null);
		this.lastMousePosition19 = instance49;
		this._uniforms.push(instance49);
		var instance50 = new shaderblox_uniforms_UVec2("lastMousePosition20",null);
		this.lastMousePosition20 = instance50;
		this._uniforms.push(instance50);
		var instance51 = new shaderblox_uniforms_UVec2("lastMousePosition21",null);
		this.lastMousePosition21 = instance51;
		this._uniforms.push(instance51);
		var instance52 = new shaderblox_uniforms_UVec2("lastMousePosition22",null);
		this.lastMousePosition22 = instance52;
		this._uniforms.push(instance52);
		var instance53 = new shaderblox_uniforms_UVec2("lastMousePosition23",null);
		this.lastMousePosition23 = instance53;
		this._uniforms.push(instance53);
		var instance54 = new shaderblox_uniforms_UVec2("lastMousePosition24",null);
		this.lastMousePosition24 = instance54;
		this._uniforms.push(instance54);
		var instance55 = new shaderblox_uniforms_UVec2("lastMousePosition25",null);
		this.lastMousePosition25 = instance55;
		this._uniforms.push(instance55);
		var instance56 = new shaderblox_uniforms_UVec2("lastMousePosition26",null);
		this.lastMousePosition26 = instance56;
		this._uniforms.push(instance56);
		var instance57 = new shaderblox_uniforms_UVec2("lastMousePosition27",null);
		this.lastMousePosition27 = instance57;
		this._uniforms.push(instance57);
		var instance58 = new shaderblox_uniforms_UVec2("lastMousePosition28",null);
		this.lastMousePosition28 = instance58;
		this._uniforms.push(instance58);
		var instance59 = new shaderblox_uniforms_UVec2("lastMousePosition29",null);
		this.lastMousePosition29 = instance59;
		this._uniforms.push(instance59);
		var instance60 = new shaderblox_uniforms_UBool("isMouseDown0",null);
		this.isMouseDown0 = instance60;
		this._uniforms.push(instance60);
		var instance61 = new shaderblox_uniforms_UBool("isMouseDown1",null);
		this.isMouseDown1 = instance61;
		this._uniforms.push(instance61);
		var instance62 = new shaderblox_uniforms_UBool("isMouseDown2",null);
		this.isMouseDown2 = instance62;
		this._uniforms.push(instance62);
		var instance63 = new shaderblox_uniforms_UBool("isMouseDown3",null);
		this.isMouseDown3 = instance63;
		this._uniforms.push(instance63);
		var instance64 = new shaderblox_uniforms_UBool("isMouseDown4",null);
		this.isMouseDown4 = instance64;
		this._uniforms.push(instance64);
		var instance65 = new shaderblox_uniforms_UBool("isMouseDown5",null);
		this.isMouseDown5 = instance65;
		this._uniforms.push(instance65);
		var instance66 = new shaderblox_uniforms_UBool("isMouseDown6",null);
		this.isMouseDown6 = instance66;
		this._uniforms.push(instance66);
		var instance67 = new shaderblox_uniforms_UBool("isMouseDown7",null);
		this.isMouseDown7 = instance67;
		this._uniforms.push(instance67);
		var instance68 = new shaderblox_uniforms_UBool("isMouseDown8",null);
		this.isMouseDown8 = instance68;
		this._uniforms.push(instance68);
		var instance69 = new shaderblox_uniforms_UBool("isMouseDown9",null);
		this.isMouseDown9 = instance69;
		this._uniforms.push(instance69);
		var instance70 = new shaderblox_uniforms_UBool("isMouseDown10",null);
		this.isMouseDown10 = instance70;
		this._uniforms.push(instance70);
		var instance71 = new shaderblox_uniforms_UBool("isMouseDown11",null);
		this.isMouseDown11 = instance71;
		this._uniforms.push(instance71);
		var instance72 = new shaderblox_uniforms_UBool("isMouseDown12",null);
		this.isMouseDown12 = instance72;
		this._uniforms.push(instance72);
		var instance73 = new shaderblox_uniforms_UBool("isMouseDown13",null);
		this.isMouseDown13 = instance73;
		this._uniforms.push(instance73);
		var instance74 = new shaderblox_uniforms_UBool("isMouseDown14",null);
		this.isMouseDown14 = instance74;
		this._uniforms.push(instance74);
		var instance75 = new shaderblox_uniforms_UBool("isMouseDown15",null);
		this.isMouseDown15 = instance75;
		this._uniforms.push(instance75);
		var instance76 = new shaderblox_uniforms_UBool("isMouseDown16",null);
		this.isMouseDown16 = instance76;
		this._uniforms.push(instance76);
		var instance77 = new shaderblox_uniforms_UBool("isMouseDown17",null);
		this.isMouseDown17 = instance77;
		this._uniforms.push(instance77);
		var instance78 = new shaderblox_uniforms_UBool("isMouseDown18",null);
		this.isMouseDown18 = instance78;
		this._uniforms.push(instance78);
		var instance79 = new shaderblox_uniforms_UBool("isMouseDown19",null);
		this.isMouseDown19 = instance79;
		this._uniforms.push(instance79);
		var instance80 = new shaderblox_uniforms_UBool("isMouseDown20",null);
		this.isMouseDown20 = instance80;
		this._uniforms.push(instance80);
		var instance81 = new shaderblox_uniforms_UBool("isMouseDown21",null);
		this.isMouseDown21 = instance81;
		this._uniforms.push(instance81);
		var instance82 = new shaderblox_uniforms_UBool("isMouseDown22",null);
		this.isMouseDown22 = instance82;
		this._uniforms.push(instance82);
		var instance83 = new shaderblox_uniforms_UBool("isMouseDown23",null);
		this.isMouseDown23 = instance83;
		this._uniforms.push(instance83);
		var instance84 = new shaderblox_uniforms_UBool("isMouseDown24",null);
		this.isMouseDown24 = instance84;
		this._uniforms.push(instance84);
		var instance85 = new shaderblox_uniforms_UBool("isMouseDown25",null);
		this.isMouseDown25 = instance85;
		this._uniforms.push(instance85);
		var instance86 = new shaderblox_uniforms_UBool("isMouseDown26",null);
		this.isMouseDown26 = instance86;
		this._uniforms.push(instance86);
		var instance87 = new shaderblox_uniforms_UBool("isMouseDown27",null);
		this.isMouseDown27 = instance87;
		this._uniforms.push(instance87);
		var instance88 = new shaderblox_uniforms_UBool("isMouseDown28",null);
		this.isMouseDown28 = instance88;
		this._uniforms.push(instance88);
		var instance89 = new shaderblox_uniforms_UBool("isMouseDown29",null);
		this.isMouseDown29 = instance89;
		this._uniforms.push(instance89);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n\nuniform sampler2D dye;\n\tuniform float dt;\n\tuniform float dx;\n\tvarying vec2 texelCoord;\n\tvarying vec2 p;\n\n\nfloat distanceToSegment(vec2 a, vec2 b, vec2 p, out float fp){\n\tvec2 d = p - a;\n\tvec2 x = b - a;\n\n\tfp = 0.0; \n\tfloat lx = length(x);\n\t\n\tif(lx <= 0.0001) return length(d);\n\n\tfloat projection = dot(d, x / lx); \n\n\tfp = projection / lx;\n\n\tif(projection < 0.0)            return length(d);\n\telse if(projection > length(x)) return length(p - b);\n\treturn sqrt(abs(dot(d,d) - projection*projection));\n}\nfloat distanceToSegment(vec2 a, vec2 b, vec2 p){\n\tfloat fp;\n\treturn distanceToSegment(a, b, p, fp);\n}\nuniform vec2 mousePosition0;\nuniform vec2 mousePosition1;\nuniform vec2 mousePosition2;\nuniform vec2 mousePosition3;\nuniform vec2 mousePosition4;\nuniform vec2 mousePosition5;\nuniform vec2 mousePosition6;\nuniform vec2 mousePosition7;\nuniform vec2 mousePosition8;\nuniform vec2 mousePosition9;\nuniform vec2 mousePosition10;\nuniform vec2 mousePosition11;\nuniform vec2 mousePosition12;\nuniform vec2 mousePosition13;\nuniform vec2 mousePosition14;\nuniform vec2 mousePosition15;\nuniform vec2 mousePosition16;\nuniform vec2 mousePosition17;\nuniform vec2 mousePosition18;\nuniform vec2 mousePosition19;\nuniform vec2 mousePosition20;\nuniform vec2 mousePosition21;\nuniform vec2 mousePosition22;\nuniform vec2 mousePosition23;\nuniform vec2 mousePosition24;\nuniform vec2 mousePosition25;\nuniform vec2 mousePosition26;\nuniform vec2 mousePosition27;\nuniform vec2 mousePosition28;\nuniform vec2 mousePosition29;\nuniform vec2 lastMousePosition0;\nuniform vec2 lastMousePosition1;\nuniform vec2 lastMousePosition2;\nuniform vec2 lastMousePosition3;\nuniform vec2 lastMousePosition4;\nuniform vec2 lastMousePosition5;\nuniform vec2 lastMousePosition6;\nuniform vec2 lastMousePosition7;\nuniform vec2 lastMousePosition8;\nuniform vec2 lastMousePosition9;\nuniform vec2 lastMousePosition10;\nuniform vec2 lastMousePosition11;\nuniform vec2 lastMousePosition12;\nuniform vec2 lastMousePosition13;\nuniform vec2 lastMousePosition14;\nuniform vec2 lastMousePosition15;\nuniform vec2 lastMousePosition16;\nuniform vec2 lastMousePosition17;\nuniform vec2 lastMousePosition18;\nuniform vec2 lastMousePosition19;\nuniform vec2 lastMousePosition20;\nuniform vec2 lastMousePosition21;\nuniform vec2 lastMousePosition22;\nuniform vec2 lastMousePosition23;\nuniform vec2 lastMousePosition24;\nuniform vec2 lastMousePosition25;\nuniform vec2 lastMousePosition26;\nuniform vec2 lastMousePosition27;\nuniform vec2 lastMousePosition28;\nuniform vec2 lastMousePosition29;\nuniform bool isMouseDown0;\nuniform bool isMouseDown1;\nuniform bool isMouseDown2;\nuniform bool isMouseDown3;\nuniform bool isMouseDown4;\nuniform bool isMouseDown5;\nuniform bool isMouseDown6;\nuniform bool isMouseDown7;\nuniform bool isMouseDown8;\nuniform bool isMouseDown9;\nuniform bool isMouseDown10;\nuniform bool isMouseDown11;\nuniform bool isMouseDown12;\nuniform bool isMouseDown13;\nuniform bool isMouseDown14;\nuniform bool isMouseDown15;\nuniform bool isMouseDown16;\nuniform bool isMouseDown17;\nuniform bool isMouseDown18;\nuniform bool isMouseDown19;\nuniform bool isMouseDown20;\nuniform bool isMouseDown21;\nuniform bool isMouseDown22;\nuniform bool isMouseDown23;\nuniform bool isMouseDown24;\nuniform bool isMouseDown25;\nuniform bool isMouseDown26;\nuniform bool isMouseDown27;\nuniform bool isMouseDown28;\nuniform bool isMouseDown29;\n\n  void main(){\n    int i = 0;\n    vec4 color = texture2D(dye, texelCoord);\n    color.r *= (0.9797);\n    color.g *= (0.9494);\n    color.b *= (0.9696);\n    vec2 mouseVelocity;\n    float projection;\n    float l;\n    float taperFactor;\n    float projectedFraction;\n    float R;\n    float m;\n    float speed;\n    float x;\n\n\n      if(isMouseDown0){      \n        vec2 mouseVelocity = (mousePosition0 - lastMousePosition0)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition0, lastMousePosition0, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown1){      \n        vec2 mouseVelocity = (mousePosition1 - lastMousePosition1)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition1, lastMousePosition1, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown2){      \n        vec2 mouseVelocity = (mousePosition2 - lastMousePosition2)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition2, lastMousePosition2, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown3){      \n        vec2 mouseVelocity = (mousePosition3 - lastMousePosition3)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition3, lastMousePosition3, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown4){      \n        vec2 mouseVelocity = (mousePosition4 - lastMousePosition4)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition4, lastMousePosition4, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown5){      \n        vec2 mouseVelocity = (mousePosition5 - lastMousePosition5)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition5, lastMousePosition5, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown6){      \n        vec2 mouseVelocity = (mousePosition6 - lastMousePosition6)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition6, lastMousePosition6, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown7){      \n        vec2 mouseVelocity = (mousePosition7 - lastMousePosition7)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition7, lastMousePosition7, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown8){      \n        vec2 mouseVelocity = (mousePosition8 - lastMousePosition8)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition8, lastMousePosition8, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown9){      \n        vec2 mouseVelocity = (mousePosition9 - lastMousePosition9)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition9, lastMousePosition9, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown10){      \n        vec2 mouseVelocity = (mousePosition10 - lastMousePosition10)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition10, lastMousePosition10, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown11){      \n        vec2 mouseVelocity = (mousePosition11 - lastMousePosition11)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition11, lastMousePosition11, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown12){      \n        vec2 mouseVelocity = (mousePosition12 - lastMousePosition12)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition12, lastMousePosition12, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown13){      \n        vec2 mouseVelocity = (mousePosition13 - lastMousePosition13)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition13, lastMousePosition13, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown14){      \n        vec2 mouseVelocity = (mousePosition14 - lastMousePosition14)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition14, lastMousePosition14, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown15){      \n        vec2 mouseVelocity = (mousePosition15 - lastMousePosition15)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition15, lastMousePosition15, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown16){      \n        vec2 mouseVelocity = (mousePosition16 - lastMousePosition16)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition16, lastMousePosition16, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown17){      \n        vec2 mouseVelocity = (mousePosition17 - lastMousePosition17)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition17, lastMousePosition17, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown18){      \n        vec2 mouseVelocity = (mousePosition18 - lastMousePosition18)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition18, lastMousePosition18, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown19){      \n        vec2 mouseVelocity = (mousePosition19 - lastMousePosition19)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition19, lastMousePosition19, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown20){      \n        vec2 mouseVelocity = (mousePosition20 - lastMousePosition20)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition20, lastMousePosition20, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown21){      \n        vec2 mouseVelocity = (mousePosition21 - lastMousePosition21)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition21, lastMousePosition21, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown22){      \n        vec2 mouseVelocity = (mousePosition22 - lastMousePosition22)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition22, lastMousePosition22, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown23){      \n        vec2 mouseVelocity = (mousePosition23 - lastMousePosition23)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition23, lastMousePosition23, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown24){      \n        vec2 mouseVelocity = (mousePosition24 - lastMousePosition24)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition24, lastMousePosition24, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown25){      \n        vec2 mouseVelocity = (mousePosition25 - lastMousePosition25)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition25, lastMousePosition25, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown26){      \n        vec2 mouseVelocity = (mousePosition26 - lastMousePosition26)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition26, lastMousePosition26, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown27){      \n        vec2 mouseVelocity = (mousePosition27 - lastMousePosition27)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition27, lastMousePosition27, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown28){      \n        vec2 mouseVelocity = (mousePosition28 - lastMousePosition28)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition28, lastMousePosition28, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n      if(isMouseDown29){      \n        vec2 mouseVelocity = (mousePosition29 - lastMousePosition29)/dt;\n        \n        \n        float projection;\n        float l = distanceToSegment(mousePosition29, lastMousePosition29, p, projection);\n        float taperFactor = 0.6;\n        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n        float R = 0.025;\n        float m = exp(-l/R);\n        \n        float speed = length(mouseVelocity);\n        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);\n        color.rgb += m * (\n          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)\n            + (vec3(100) / 100.) * pow(x, 9.)\n        );\n      }\n\n    gl_FragColor = color;\n  }\n\n\n";
	}
	,__class__: MouseDye
});
var MouseForce = function() {
	ApplyForces.call(this);
};
$hxClasses["MouseForce"] = MouseForce;
MouseForce.__name__ = ["MouseForce"];
MouseForce.__super__ = ApplyForces;
MouseForce.prototype = $extend(ApplyForces.prototype,{
	createProperties: function() {
		ApplyForces.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UVec2("mousePosition0",null);
		this.mousePosition0 = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_uniforms_UVec2("mousePosition1",null);
		this.mousePosition1 = instance1;
		this._uniforms.push(instance1);
		var instance2 = new shaderblox_uniforms_UVec2("mousePosition2",null);
		this.mousePosition2 = instance2;
		this._uniforms.push(instance2);
		var instance3 = new shaderblox_uniforms_UVec2("mousePosition3",null);
		this.mousePosition3 = instance3;
		this._uniforms.push(instance3);
		var instance4 = new shaderblox_uniforms_UVec2("mousePosition4",null);
		this.mousePosition4 = instance4;
		this._uniforms.push(instance4);
		var instance5 = new shaderblox_uniforms_UVec2("mousePosition5",null);
		this.mousePosition5 = instance5;
		this._uniforms.push(instance5);
		var instance6 = new shaderblox_uniforms_UVec2("mousePosition6",null);
		this.mousePosition6 = instance6;
		this._uniforms.push(instance6);
		var instance7 = new shaderblox_uniforms_UVec2("mousePosition7",null);
		this.mousePosition7 = instance7;
		this._uniforms.push(instance7);
		var instance8 = new shaderblox_uniforms_UVec2("mousePosition8",null);
		this.mousePosition8 = instance8;
		this._uniforms.push(instance8);
		var instance9 = new shaderblox_uniforms_UVec2("mousePosition9",null);
		this.mousePosition9 = instance9;
		this._uniforms.push(instance9);
		var instance10 = new shaderblox_uniforms_UVec2("mousePosition10",null);
		this.mousePosition10 = instance10;
		this._uniforms.push(instance10);
		var instance11 = new shaderblox_uniforms_UVec2("mousePosition11",null);
		this.mousePosition11 = instance11;
		this._uniforms.push(instance11);
		var instance12 = new shaderblox_uniforms_UVec2("mousePosition12",null);
		this.mousePosition12 = instance12;
		this._uniforms.push(instance12);
		var instance13 = new shaderblox_uniforms_UVec2("mousePosition13",null);
		this.mousePosition13 = instance13;
		this._uniforms.push(instance13);
		var instance14 = new shaderblox_uniforms_UVec2("mousePosition14",null);
		this.mousePosition14 = instance14;
		this._uniforms.push(instance14);
		var instance15 = new shaderblox_uniforms_UVec2("mousePosition15",null);
		this.mousePosition15 = instance15;
		this._uniforms.push(instance15);
		var instance16 = new shaderblox_uniforms_UVec2("mousePosition16",null);
		this.mousePosition16 = instance16;
		this._uniforms.push(instance16);
		var instance17 = new shaderblox_uniforms_UVec2("mousePosition17",null);
		this.mousePosition17 = instance17;
		this._uniforms.push(instance17);
		var instance18 = new shaderblox_uniforms_UVec2("mousePosition18",null);
		this.mousePosition18 = instance18;
		this._uniforms.push(instance18);
		var instance19 = new shaderblox_uniforms_UVec2("mousePosition19",null);
		this.mousePosition19 = instance19;
		this._uniforms.push(instance19);
		var instance20 = new shaderblox_uniforms_UVec2("mousePosition20",null);
		this.mousePosition20 = instance20;
		this._uniforms.push(instance20);
		var instance21 = new shaderblox_uniforms_UVec2("mousePosition21",null);
		this.mousePosition21 = instance21;
		this._uniforms.push(instance21);
		var instance22 = new shaderblox_uniforms_UVec2("mousePosition22",null);
		this.mousePosition22 = instance22;
		this._uniforms.push(instance22);
		var instance23 = new shaderblox_uniforms_UVec2("mousePosition23",null);
		this.mousePosition23 = instance23;
		this._uniforms.push(instance23);
		var instance24 = new shaderblox_uniforms_UVec2("mousePosition24",null);
		this.mousePosition24 = instance24;
		this._uniforms.push(instance24);
		var instance25 = new shaderblox_uniforms_UVec2("mousePosition25",null);
		this.mousePosition25 = instance25;
		this._uniforms.push(instance25);
		var instance26 = new shaderblox_uniforms_UVec2("mousePosition26",null);
		this.mousePosition26 = instance26;
		this._uniforms.push(instance26);
		var instance27 = new shaderblox_uniforms_UVec2("mousePosition27",null);
		this.mousePosition27 = instance27;
		this._uniforms.push(instance27);
		var instance28 = new shaderblox_uniforms_UVec2("mousePosition28",null);
		this.mousePosition28 = instance28;
		this._uniforms.push(instance28);
		var instance29 = new shaderblox_uniforms_UVec2("mousePosition29",null);
		this.mousePosition29 = instance29;
		this._uniforms.push(instance29);
		var instance30 = new shaderblox_uniforms_UVec2("lastMousePosition0",null);
		this.lastMousePosition0 = instance30;
		this._uniforms.push(instance30);
		var instance31 = new shaderblox_uniforms_UVec2("lastMousePosition1",null);
		this.lastMousePosition1 = instance31;
		this._uniforms.push(instance31);
		var instance32 = new shaderblox_uniforms_UVec2("lastMousePosition2",null);
		this.lastMousePosition2 = instance32;
		this._uniforms.push(instance32);
		var instance33 = new shaderblox_uniforms_UVec2("lastMousePosition3",null);
		this.lastMousePosition3 = instance33;
		this._uniforms.push(instance33);
		var instance34 = new shaderblox_uniforms_UVec2("lastMousePosition4",null);
		this.lastMousePosition4 = instance34;
		this._uniforms.push(instance34);
		var instance35 = new shaderblox_uniforms_UVec2("lastMousePosition5",null);
		this.lastMousePosition5 = instance35;
		this._uniforms.push(instance35);
		var instance36 = new shaderblox_uniforms_UVec2("lastMousePosition6",null);
		this.lastMousePosition6 = instance36;
		this._uniforms.push(instance36);
		var instance37 = new shaderblox_uniforms_UVec2("lastMousePosition7",null);
		this.lastMousePosition7 = instance37;
		this._uniforms.push(instance37);
		var instance38 = new shaderblox_uniforms_UVec2("lastMousePosition8",null);
		this.lastMousePosition8 = instance38;
		this._uniforms.push(instance38);
		var instance39 = new shaderblox_uniforms_UVec2("lastMousePosition9",null);
		this.lastMousePosition9 = instance39;
		this._uniforms.push(instance39);
		var instance40 = new shaderblox_uniforms_UVec2("lastMousePosition10",null);
		this.lastMousePosition10 = instance40;
		this._uniforms.push(instance40);
		var instance41 = new shaderblox_uniforms_UVec2("lastMousePosition11",null);
		this.lastMousePosition11 = instance41;
		this._uniforms.push(instance41);
		var instance42 = new shaderblox_uniforms_UVec2("lastMousePosition12",null);
		this.lastMousePosition12 = instance42;
		this._uniforms.push(instance42);
		var instance43 = new shaderblox_uniforms_UVec2("lastMousePosition13",null);
		this.lastMousePosition13 = instance43;
		this._uniforms.push(instance43);
		var instance44 = new shaderblox_uniforms_UVec2("lastMousePosition14",null);
		this.lastMousePosition14 = instance44;
		this._uniforms.push(instance44);
		var instance45 = new shaderblox_uniforms_UVec2("lastMousePosition15",null);
		this.lastMousePosition15 = instance45;
		this._uniforms.push(instance45);
		var instance46 = new shaderblox_uniforms_UVec2("lastMousePosition16",null);
		this.lastMousePosition16 = instance46;
		this._uniforms.push(instance46);
		var instance47 = new shaderblox_uniforms_UVec2("lastMousePosition17",null);
		this.lastMousePosition17 = instance47;
		this._uniforms.push(instance47);
		var instance48 = new shaderblox_uniforms_UVec2("lastMousePosition18",null);
		this.lastMousePosition18 = instance48;
		this._uniforms.push(instance48);
		var instance49 = new shaderblox_uniforms_UVec2("lastMousePosition19",null);
		this.lastMousePosition19 = instance49;
		this._uniforms.push(instance49);
		var instance50 = new shaderblox_uniforms_UVec2("lastMousePosition20",null);
		this.lastMousePosition20 = instance50;
		this._uniforms.push(instance50);
		var instance51 = new shaderblox_uniforms_UVec2("lastMousePosition21",null);
		this.lastMousePosition21 = instance51;
		this._uniforms.push(instance51);
		var instance52 = new shaderblox_uniforms_UVec2("lastMousePosition22",null);
		this.lastMousePosition22 = instance52;
		this._uniforms.push(instance52);
		var instance53 = new shaderblox_uniforms_UVec2("lastMousePosition23",null);
		this.lastMousePosition23 = instance53;
		this._uniforms.push(instance53);
		var instance54 = new shaderblox_uniforms_UVec2("lastMousePosition24",null);
		this.lastMousePosition24 = instance54;
		this._uniforms.push(instance54);
		var instance55 = new shaderblox_uniforms_UVec2("lastMousePosition25",null);
		this.lastMousePosition25 = instance55;
		this._uniforms.push(instance55);
		var instance56 = new shaderblox_uniforms_UVec2("lastMousePosition26",null);
		this.lastMousePosition26 = instance56;
		this._uniforms.push(instance56);
		var instance57 = new shaderblox_uniforms_UVec2("lastMousePosition27",null);
		this.lastMousePosition27 = instance57;
		this._uniforms.push(instance57);
		var instance58 = new shaderblox_uniforms_UVec2("lastMousePosition28",null);
		this.lastMousePosition28 = instance58;
		this._uniforms.push(instance58);
		var instance59 = new shaderblox_uniforms_UVec2("lastMousePosition29",null);
		this.lastMousePosition29 = instance59;
		this._uniforms.push(instance59);
		var instance60 = new shaderblox_uniforms_UBool("isMouseDown0",null);
		this.isMouseDown0 = instance60;
		this._uniforms.push(instance60);
		var instance61 = new shaderblox_uniforms_UBool("isMouseDown1",null);
		this.isMouseDown1 = instance61;
		this._uniforms.push(instance61);
		var instance62 = new shaderblox_uniforms_UBool("isMouseDown2",null);
		this.isMouseDown2 = instance62;
		this._uniforms.push(instance62);
		var instance63 = new shaderblox_uniforms_UBool("isMouseDown3",null);
		this.isMouseDown3 = instance63;
		this._uniforms.push(instance63);
		var instance64 = new shaderblox_uniforms_UBool("isMouseDown4",null);
		this.isMouseDown4 = instance64;
		this._uniforms.push(instance64);
		var instance65 = new shaderblox_uniforms_UBool("isMouseDown5",null);
		this.isMouseDown5 = instance65;
		this._uniforms.push(instance65);
		var instance66 = new shaderblox_uniforms_UBool("isMouseDown6",null);
		this.isMouseDown6 = instance66;
		this._uniforms.push(instance66);
		var instance67 = new shaderblox_uniforms_UBool("isMouseDown7",null);
		this.isMouseDown7 = instance67;
		this._uniforms.push(instance67);
		var instance68 = new shaderblox_uniforms_UBool("isMouseDown8",null);
		this.isMouseDown8 = instance68;
		this._uniforms.push(instance68);
		var instance69 = new shaderblox_uniforms_UBool("isMouseDown9",null);
		this.isMouseDown9 = instance69;
		this._uniforms.push(instance69);
		var instance70 = new shaderblox_uniforms_UBool("isMouseDown10",null);
		this.isMouseDown10 = instance70;
		this._uniforms.push(instance70);
		var instance71 = new shaderblox_uniforms_UBool("isMouseDown11",null);
		this.isMouseDown11 = instance71;
		this._uniforms.push(instance71);
		var instance72 = new shaderblox_uniforms_UBool("isMouseDown12",null);
		this.isMouseDown12 = instance72;
		this._uniforms.push(instance72);
		var instance73 = new shaderblox_uniforms_UBool("isMouseDown13",null);
		this.isMouseDown13 = instance73;
		this._uniforms.push(instance73);
		var instance74 = new shaderblox_uniforms_UBool("isMouseDown14",null);
		this.isMouseDown14 = instance74;
		this._uniforms.push(instance74);
		var instance75 = new shaderblox_uniforms_UBool("isMouseDown15",null);
		this.isMouseDown15 = instance75;
		this._uniforms.push(instance75);
		var instance76 = new shaderblox_uniforms_UBool("isMouseDown16",null);
		this.isMouseDown16 = instance76;
		this._uniforms.push(instance76);
		var instance77 = new shaderblox_uniforms_UBool("isMouseDown17",null);
		this.isMouseDown17 = instance77;
		this._uniforms.push(instance77);
		var instance78 = new shaderblox_uniforms_UBool("isMouseDown18",null);
		this.isMouseDown18 = instance78;
		this._uniforms.push(instance78);
		var instance79 = new shaderblox_uniforms_UBool("isMouseDown19",null);
		this.isMouseDown19 = instance79;
		this._uniforms.push(instance79);
		var instance80 = new shaderblox_uniforms_UBool("isMouseDown20",null);
		this.isMouseDown20 = instance80;
		this._uniforms.push(instance80);
		var instance81 = new shaderblox_uniforms_UBool("isMouseDown21",null);
		this.isMouseDown21 = instance81;
		this._uniforms.push(instance81);
		var instance82 = new shaderblox_uniforms_UBool("isMouseDown22",null);
		this.isMouseDown22 = instance82;
		this._uniforms.push(instance82);
		var instance83 = new shaderblox_uniforms_UBool("isMouseDown23",null);
		this.isMouseDown23 = instance83;
		this._uniforms.push(instance83);
		var instance84 = new shaderblox_uniforms_UBool("isMouseDown24",null);
		this.isMouseDown24 = instance84;
		this._uniforms.push(instance84);
		var instance85 = new shaderblox_uniforms_UBool("isMouseDown25",null);
		this.isMouseDown25 = instance85;
		this._uniforms.push(instance85);
		var instance86 = new shaderblox_uniforms_UBool("isMouseDown26",null);
		this.isMouseDown26 = instance86;
		this._uniforms.push(instance86);
		var instance87 = new shaderblox_uniforms_UBool("isMouseDown27",null);
		this.isMouseDown27 = instance87;
		this._uniforms.push(instance87);
		var instance88 = new shaderblox_uniforms_UBool("isMouseDown28",null);
		this.isMouseDown28 = instance88;
		this._uniforms.push(instance88);
		var instance89 = new shaderblox_uniforms_UBool("isMouseDown29",null);
		this.isMouseDown29 = instance89;
		this._uniforms.push(instance89);
		this._aStride += 0;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\r\nattribute vec2 vertexPosition;\r\n\r\nuniform float aspectRatio;\r\n\r\nvarying vec2 texelCoord;\r\n\r\n\r\nvarying vec2 p;\n\r\nvoid main() {\r\n\ttexelCoord = vertexPosition;\r\n\t\r\n\tvec2 clipSpace = 2.0*texelCoord - 1.0;\t\n\t\r\n\tp = vec2(clipSpace.x * aspectRatio, clipSpace.y);\r\n\r\n\tgl_Position = vec4(clipSpace, 0.0, 1.0 );\t\r\n}\r\n\n\n\n\n\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\n\n\n#define PRESSURE_BOUNDARY\n#define VELOCITY_BOUNDARY\n\nuniform vec2 invresolution;\nuniform float aspectRatio;\n\nvec2 clipToAspectSpace(vec2 p){\n    return vec2(p.x * aspectRatio, p.y);\n}\n\nvec2 aspectToTexelSpace(vec2 p){\n    return vec2(p.x / aspectRatio + 1.0 , p.y + 1.0)*.5;\n}\n\n\nfloat samplePressue(sampler2D pressure, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n\n    \n    \n    \n    #ifdef PRESSURE_BOUNDARY\n    if(coord.x < 0.0)      cellOffset.x = 1.0;\n    else if(coord.x > 1.0) cellOffset.x = -1.0;\n    if(coord.y < 0.0)      cellOffset.y = 1.0;\n    else if(coord.y > 1.0) cellOffset.y = -1.0;\n    #endif\n\n    return texture2D(pressure, coord + cellOffset * invresolution).x;\n}\n\n\nvec2 sampleVelocity(sampler2D velocity, vec2 coord){\n    vec2 cellOffset = vec2(0.0, 0.0);\n    vec2 multiplier = vec2(1.0, 1.0);\n\n    \n    \n    \n    #ifdef VELOCITY_BOUNDARY\n    if(coord.x<0.0){\n        cellOffset.x = 1.0;\n        multiplier.x = -1.0;\n    }else if(coord.x>1.0){\n        cellOffset.x = -1.0;\n        multiplier.x = -1.0;\n    }\n    if(coord.y<0.0){\n        cellOffset.y = 1.0;\n        multiplier.y = -1.0;\n    }else if(coord.y>1.0){\n        cellOffset.y = -1.0;\n        multiplier.y = -1.0;\n    }\n    #endif\n\n    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;\n}\n\nuniform sampler2D velocity;\n\tuniform float dt;\n\tuniform float dx;\n\tvarying vec2 texelCoord;\n\tvarying vec2 p;\n\n\nfloat distanceToSegment(vec2 a, vec2 b, vec2 p, out float fp){\n\tvec2 d = p - a;\n\tvec2 x = b - a;\n\n\tfp = 0.0; \n\tfloat lx = length(x);\n\t\n\tif(lx <= 0.0001) return length(d);\n\n\tfloat projection = dot(d, x / lx); \n\n\tfp = projection / lx;\n\n\tif(projection < 0.0)            return length(d);\n\telse if(projection > length(x)) return length(p - b);\n\treturn sqrt(abs(dot(d,d) - projection*projection));\n}\nfloat distanceToSegment(vec2 a, vec2 b, vec2 p){\n\tfloat fp;\n\treturn distanceToSegment(a, b, p, fp);\n}\nuniform vec2 mousePosition0;\nuniform vec2 mousePosition1;\nuniform vec2 mousePosition2;\nuniform vec2 mousePosition3;\nuniform vec2 mousePosition4;\nuniform vec2 mousePosition5;\nuniform vec2 mousePosition6;\nuniform vec2 mousePosition7;\nuniform vec2 mousePosition8;\nuniform vec2 mousePosition9;\nuniform vec2 mousePosition10;\nuniform vec2 mousePosition11;\nuniform vec2 mousePosition12;\nuniform vec2 mousePosition13;\nuniform vec2 mousePosition14;\nuniform vec2 mousePosition15;\nuniform vec2 mousePosition16;\nuniform vec2 mousePosition17;\nuniform vec2 mousePosition18;\nuniform vec2 mousePosition19;\nuniform vec2 mousePosition20;\nuniform vec2 mousePosition21;\nuniform vec2 mousePosition22;\nuniform vec2 mousePosition23;\nuniform vec2 mousePosition24;\nuniform vec2 mousePosition25;\nuniform vec2 mousePosition26;\nuniform vec2 mousePosition27;\nuniform vec2 mousePosition28;\nuniform vec2 mousePosition29;\nuniform vec2 lastMousePosition0;\nuniform vec2 lastMousePosition1;\nuniform vec2 lastMousePosition2;\nuniform vec2 lastMousePosition3;\nuniform vec2 lastMousePosition4;\nuniform vec2 lastMousePosition5;\nuniform vec2 lastMousePosition6;\nuniform vec2 lastMousePosition7;\nuniform vec2 lastMousePosition8;\nuniform vec2 lastMousePosition9;\nuniform vec2 lastMousePosition10;\nuniform vec2 lastMousePosition11;\nuniform vec2 lastMousePosition12;\nuniform vec2 lastMousePosition13;\nuniform vec2 lastMousePosition14;\nuniform vec2 lastMousePosition15;\nuniform vec2 lastMousePosition16;\nuniform vec2 lastMousePosition17;\nuniform vec2 lastMousePosition18;\nuniform vec2 lastMousePosition19;\nuniform vec2 lastMousePosition20;\nuniform vec2 lastMousePosition21;\nuniform vec2 lastMousePosition22;\nuniform vec2 lastMousePosition23;\nuniform vec2 lastMousePosition24;\nuniform vec2 lastMousePosition25;\nuniform vec2 lastMousePosition26;\nuniform vec2 lastMousePosition27;\nuniform vec2 lastMousePosition28;\nuniform vec2 lastMousePosition29;\nuniform bool isMouseDown0;\nuniform bool isMouseDown1;\nuniform bool isMouseDown2;\nuniform bool isMouseDown3;\nuniform bool isMouseDown4;\nuniform bool isMouseDown5;\nuniform bool isMouseDown6;\nuniform bool isMouseDown7;\nuniform bool isMouseDown8;\nuniform bool isMouseDown9;\nuniform bool isMouseDown10;\nuniform bool isMouseDown11;\nuniform bool isMouseDown12;\nuniform bool isMouseDown13;\nuniform bool isMouseDown14;\nuniform bool isMouseDown15;\nuniform bool isMouseDown16;\nuniform bool isMouseDown17;\nuniform bool isMouseDown18;\nuniform bool isMouseDown19;\nuniform bool isMouseDown20;\nuniform bool isMouseDown21;\nuniform bool isMouseDown22;\nuniform bool isMouseDown23;\nuniform bool isMouseDown24;\nuniform bool isMouseDown25;\nuniform bool isMouseDown26;\nuniform bool isMouseDown27;\nuniform bool isMouseDown28;\nuniform bool isMouseDown29;\n\n  void main(){\n    int i = 0;\n    vec2 v = texture2D(velocity, texelCoord).xy;\n    v.xy *= 0.999;\n\n\n    vec2  mouseVelocity;\n    float projection;\n    float l;\n    float taperFactor;\n    float projectedFraction;\n    float R;\n    float m;\n    vec2 targetVelocity;\n    if (isMouseDown0) {\n      mouseVelocity = -(lastMousePosition0 - mousePosition0)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition0, lastMousePosition0, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown1) {\n      mouseVelocity = -(lastMousePosition1 - mousePosition1)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition1, lastMousePosition1, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown2) {\n      mouseVelocity = -(lastMousePosition2 - mousePosition2)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition2, lastMousePosition2, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown3) {\n      mouseVelocity = -(lastMousePosition3 - mousePosition3)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition3, lastMousePosition3, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown4) {\n      mouseVelocity = -(lastMousePosition4 - mousePosition4)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition4, lastMousePosition4, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown5) {\n      mouseVelocity = -(lastMousePosition5 - mousePosition5)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition5, lastMousePosition5, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown6) {\n      mouseVelocity = -(lastMousePosition6 - mousePosition6)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition6, lastMousePosition6, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown7) {\n      mouseVelocity = -(lastMousePosition7 - mousePosition7)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition7, lastMousePosition7, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown8) {\n      mouseVelocity = -(lastMousePosition8 - mousePosition8)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition8, lastMousePosition8, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown9) {\n      mouseVelocity = -(lastMousePosition9 - mousePosition9)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition9, lastMousePosition9, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown10) {\n      mouseVelocity = -(lastMousePosition10 - mousePosition10)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition10, lastMousePosition10, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown11) {\n      mouseVelocity = -(lastMousePosition11 - mousePosition11)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition11, lastMousePosition11, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown12) {\n      mouseVelocity = -(lastMousePosition12 - mousePosition12)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition12, lastMousePosition12, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown13) {\n      mouseVelocity = -(lastMousePosition13 - mousePosition13)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition13, lastMousePosition13, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown14) {\n      mouseVelocity = -(lastMousePosition14 - mousePosition14)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition14, lastMousePosition14, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown15) {\n      mouseVelocity = -(lastMousePosition15 - mousePosition15)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition15, lastMousePosition15, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown16) {\n      mouseVelocity = -(lastMousePosition16 - mousePosition16)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition16, lastMousePosition16, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown17) {\n      mouseVelocity = -(lastMousePosition17 - mousePosition17)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition17, lastMousePosition17, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown18) {\n      mouseVelocity = -(lastMousePosition18 - mousePosition18)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition18, lastMousePosition18, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown19) {\n      mouseVelocity = -(lastMousePosition19 - mousePosition19)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition19, lastMousePosition19, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown20) {\n      mouseVelocity = -(lastMousePosition20 - mousePosition20)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition20, lastMousePosition20, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown21) {\n      mouseVelocity = -(lastMousePosition21 - mousePosition21)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition21, lastMousePosition21, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown22) {\n      mouseVelocity = -(lastMousePosition22 - mousePosition22)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition22, lastMousePosition22, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown23) {\n      mouseVelocity = -(lastMousePosition23 - mousePosition23)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition23, lastMousePosition23, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown24) {\n      mouseVelocity = -(lastMousePosition24 - mousePosition24)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition24, lastMousePosition24, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown25) {\n      mouseVelocity = -(lastMousePosition25 - mousePosition25)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition25, lastMousePosition25, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown26) {\n      mouseVelocity = -(lastMousePosition26 - mousePosition26)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition26, lastMousePosition26, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown27) {\n      mouseVelocity = -(lastMousePosition27 - mousePosition27)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition27, lastMousePosition27, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown28) {\n      mouseVelocity = -(lastMousePosition28 - mousePosition28)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition28, lastMousePosition28, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    if (isMouseDown29) {\n      mouseVelocity = -(lastMousePosition29 - mousePosition29)/dt;\n      \n      \n      projection;\n      l = distanceToSegment(mousePosition29, lastMousePosition29, p, projection);\n      taperFactor = 0.6;\n      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;\n      R = 0.015;\n      m = exp(-l/R); \n      m *= projectedFraction * projectedFraction;\n      targetVelocity = mouseVelocity * dx * 1.4;\n      v += (targetVelocity - v)*m;\n    }\n\n    gl_FragColor = vec4(v, 0, 1.);\n  }\n\n\n";
	}
	,__class__: MouseForce
});
Math.__name__ = ["Math"];
var PerformanceMonitor = function(lowerBoundFPS,upperBoundFPS,thresholdTime_ms,fpsSampleSize) {
	if(fpsSampleSize == null) fpsSampleSize = 30;
	if(thresholdTime_ms == null) thresholdTime_ms = 3000;
	if(lowerBoundFPS == null) lowerBoundFPS = 30;
	this.upperBoundEnterTime = null;
	this.lowerBoundEnterTime = null;
	this.fpsTooHighCallback = null;
	this.fpsTooLowCallback = null;
	this.fpsIgnoreBounds = [5,180];
	this.lowerBoundFPS = lowerBoundFPS;
	this.upperBoundFPS = upperBoundFPS;
	this.thresholdTime_ms = thresholdTime_ms;
	this.fpsSample = new RollingSample(fpsSampleSize);
};
$hxClasses["PerformanceMonitor"] = PerformanceMonitor;
PerformanceMonitor.__name__ = ["PerformanceMonitor"];
PerformanceMonitor.prototype = {
	recordFrameTime: function(dt_seconds) {
		if(dt_seconds > 0) this.recordFPS(1 / dt_seconds);
	}
	,recordFPS: function(fps) {
		if(fps < this.fpsIgnoreBounds[0] && fps > this.fpsIgnoreBounds[1]) return;
		this.fpsSample.add(fps);
		if(this.fpsSample.sampleCount < this.fpsSample.length) return;
		var now = haxe_Timer.stamp() * 1000;
		if(this.fpsSample.average < this.lowerBoundFPS) {
			if(this.lowerBoundEnterTime == null) this.lowerBoundEnterTime = now;
			if(now - this.lowerBoundEnterTime >= this.thresholdTime_ms && this.fpsTooLowCallback != null) {
				this.fpsTooLowCallback((this.lowerBoundFPS - this.fpsSample.average) / this.lowerBoundFPS);
				this.fpsSample.clear();
				this.lowerBoundEnterTime = null;
			}
		} else if(this.fpsSample.average > this.upperBoundFPS) {
			if(this.upperBoundEnterTime == null) this.upperBoundEnterTime = now;
			if(now - this.upperBoundEnterTime >= this.thresholdTime_ms && this.fpsTooHighCallback != null) {
				this.fpsTooHighCallback((this.fpsSample.average - this.upperBoundFPS) / this.upperBoundFPS);
				this.fpsSample.clear();
				this.upperBoundEnterTime = null;
			}
		} else {
			this.lowerBoundEnterTime = null;
			this.upperBoundEnterTime = null;
		}
	}
	,get_fpsAverage: function() {
		return this.fpsSample.average;
	}
	,get_fpsVariance: function() {
		return this.fpsSample.get_variance();
	}
	,get_fpsStandardDeviation: function() {
		return this.fpsSample.get_standardDeviation();
	}
	,__class__: PerformanceMonitor
};
var RollingSample = function(length) {
	this.m2 = 0;
	this.pos = 0;
	this.sampleCount = 0;
	this.standardDeviation = 0;
	this.variance = 0;
	this.average = 0;
	var this1;
	this1 = new Array(length);
	this.samples = this1;
};
$hxClasses["RollingSample"] = RollingSample;
RollingSample.__name__ = ["RollingSample"];
RollingSample.prototype = {
	add: function(v) {
		var delta;
		if(this.sampleCount >= this.samples.length) {
			var bottomValue = this.samples[this.pos];
			delta = bottomValue - this.average;
			this.average -= delta / (this.sampleCount - 1);
			this.m2 -= delta * (bottomValue - this.average);
		} else this.sampleCount++;
		delta = v - this.average;
		this.average += delta / this.sampleCount;
		this.m2 += delta * (v - this.average);
		this.samples[this.pos] = v;
		this.pos++;
		this.pos %= this.samples.length;
		return this.pos;
	}
	,clear: function() {
		var _g1 = 0;
		var _g = this.samples.length;
		while(_g1 < _g) {
			var i = _g1++;
			this.samples[i] = 0;
		}
		this.average = 0;
		this.variance = 0;
		this.standardDeviation = 0;
		this.sampleCount = 0;
		this.m2 = 0;
	}
	,get_variance: function() {
		return this.m2 / (this.sampleCount - 1);
	}
	,get_standardDeviation: function() {
		return Math.sqrt(this.get_variance());
	}
	,get_length: function() {
		return this.samples.length;
	}
	,__class__: RollingSample
};
var Reflect = function() { };
$hxClasses["Reflect"] = Reflect;
Reflect.__name__ = ["Reflect"];
Reflect.field = function(o,field) {
	try {
		return o[field];
	} catch( e ) {
		if (e instanceof js__$Boot_HaxeError) e = e.val;
		return null;
	}
};
Reflect.setField = function(o,field,value) {
	o[field] = value;
};
Reflect.callMethod = function(o,func,args) {
	return func.apply(o,args);
};
Reflect.fields = function(o) {
	var a = [];
	if(o != null) {
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		for( var f in o ) {
		if(f != "__id__" && f != "hx__closures__" && hasOwnProperty.call(o,f)) a.push(f);
		}
	}
	return a;
};
Reflect.isFunction = function(f) {
	return typeof(f) == "function" && !(f.__name__ || f.__ename__);
};
Reflect.deleteField = function(o,field) {
	if(!Object.prototype.hasOwnProperty.call(o,field)) return false;
	delete(o[field]);
	return true;
};
var Std = function() { };
$hxClasses["Std"] = Std;
Std.__name__ = ["Std"];
Std.string = function(s) {
	return js_Boot.__string_rec(s,"");
};
Std.parseInt = function(x) {
	var v = parseInt(x,10);
	if(v == 0 && (HxOverrides.cca(x,1) == 120 || HxOverrides.cca(x,1) == 88)) v = parseInt(x);
	if(isNaN(v)) return null;
	return v;
};
Std.parseFloat = function(x) {
	return parseFloat(x);
};
Std.random = function(x) {
	if(x <= 0) return 0; else return Math.floor(Math.random() * x);
};
var StringBuf = function() {
	this.b = "";
};
$hxClasses["StringBuf"] = StringBuf;
StringBuf.__name__ = ["StringBuf"];
StringBuf.prototype = {
	add: function(x) {
		this.b += Std.string(x);
	}
	,__class__: StringBuf
};
var StringTools = function() { };
$hxClasses["StringTools"] = StringTools;
StringTools.__name__ = ["StringTools"];
StringTools.isSpace = function(s,pos) {
	var c = HxOverrides.cca(s,pos);
	return c > 8 && c < 14 || c == 32;
};
StringTools.ltrim = function(s) {
	var l = s.length;
	var r = 0;
	while(r < l && StringTools.isSpace(s,r)) r++;
	if(r > 0) return HxOverrides.substr(s,r,l - r); else return s;
};
StringTools.rtrim = function(s) {
	var l = s.length;
	var r = 0;
	while(r < l && StringTools.isSpace(s,l - r - 1)) r++;
	if(r > 0) return HxOverrides.substr(s,0,l - r); else return s;
};
StringTools.trim = function(s) {
	return StringTools.ltrim(StringTools.rtrim(s));
};
StringTools.fastCodeAt = function(s,index) {
	return s.charCodeAt(index);
};
var ValueType = $hxClasses["ValueType"] = { __ename__ : ["ValueType"], __constructs__ : ["TNull","TInt","TFloat","TBool","TObject","TFunction","TClass","TEnum","TUnknown"] };
ValueType.TNull = ["TNull",0];
ValueType.TNull.toString = $estr;
ValueType.TNull.__enum__ = ValueType;
ValueType.TInt = ["TInt",1];
ValueType.TInt.toString = $estr;
ValueType.TInt.__enum__ = ValueType;
ValueType.TFloat = ["TFloat",2];
ValueType.TFloat.toString = $estr;
ValueType.TFloat.__enum__ = ValueType;
ValueType.TBool = ["TBool",3];
ValueType.TBool.toString = $estr;
ValueType.TBool.__enum__ = ValueType;
ValueType.TObject = ["TObject",4];
ValueType.TObject.toString = $estr;
ValueType.TObject.__enum__ = ValueType;
ValueType.TFunction = ["TFunction",5];
ValueType.TFunction.toString = $estr;
ValueType.TFunction.__enum__ = ValueType;
ValueType.TClass = function(c) { var $x = ["TClass",6,c]; $x.__enum__ = ValueType; $x.toString = $estr; return $x; };
ValueType.TEnum = function(e) { var $x = ["TEnum",7,e]; $x.__enum__ = ValueType; $x.toString = $estr; return $x; };
ValueType.TUnknown = ["TUnknown",8];
ValueType.TUnknown.toString = $estr;
ValueType.TUnknown.__enum__ = ValueType;
ValueType.__empty_constructs__ = [ValueType.TNull,ValueType.TInt,ValueType.TFloat,ValueType.TBool,ValueType.TObject,ValueType.TFunction,ValueType.TUnknown];
var Type = function() { };
$hxClasses["Type"] = Type;
Type.__name__ = ["Type"];
Type.getClassName = function(c) {
	var a = c.__name__;
	if(a == null) return null;
	return a.join(".");
};
Type.getEnumName = function(e) {
	var a = e.__ename__;
	return a.join(".");
};
Type.resolveClass = function(name) {
	var cl = $hxClasses[name];
	if(cl == null || !cl.__name__) return null;
	return cl;
};
Type.resolveEnum = function(name) {
	var e = $hxClasses[name];
	if(e == null || !e.__ename__) return null;
	return e;
};
Type.createInstance = function(cl,args) {
	var _g = args.length;
	switch(_g) {
	case 0:
		return new cl();
	case 1:
		return new cl(args[0]);
	case 2:
		return new cl(args[0],args[1]);
	case 3:
		return new cl(args[0],args[1],args[2]);
	case 4:
		return new cl(args[0],args[1],args[2],args[3]);
	case 5:
		return new cl(args[0],args[1],args[2],args[3],args[4]);
	case 6:
		return new cl(args[0],args[1],args[2],args[3],args[4],args[5]);
	case 7:
		return new cl(args[0],args[1],args[2],args[3],args[4],args[5],args[6]);
	case 8:
		return new cl(args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7]);
	default:
		throw new js__$Boot_HaxeError("Too many arguments");
	}
	return null;
};
Type.createEmptyInstance = function(cl) {
	function empty() {}; empty.prototype = cl.prototype;
	return new empty();
};
Type.createEnum = function(e,constr,params) {
	var f = Reflect.field(e,constr);
	if(f == null) throw new js__$Boot_HaxeError("No such constructor " + constr);
	if(Reflect.isFunction(f)) {
		if(params == null) throw new js__$Boot_HaxeError("Constructor " + constr + " need parameters");
		return Reflect.callMethod(e,f,params);
	}
	if(params != null && params.length != 0) throw new js__$Boot_HaxeError("Constructor " + constr + " does not need parameters");
	return f;
};
Type.createEnumIndex = function(e,index,params) {
	var c = e.__constructs__[index];
	if(c == null) throw new js__$Boot_HaxeError(index + " is not a valid enum constructor index");
	return Type.createEnum(e,c,params);
};
Type.getEnumConstructs = function(e) {
	var a = e.__constructs__;
	return a.slice();
};
Type["typeof"] = function(v) {
	var _g = typeof(v);
	switch(_g) {
	case "boolean":
		return ValueType.TBool;
	case "string":
		return ValueType.TClass(String);
	case "number":
		if(Math.ceil(v) == v % 2147483648.0) return ValueType.TInt;
		return ValueType.TFloat;
	case "object":
		if(v == null) return ValueType.TNull;
		var e = v.__enum__;
		if(e != null) return ValueType.TEnum(e);
		var c = js_Boot.getClass(v);
		if(c != null) return ValueType.TClass(c);
		return ValueType.TObject;
	case "function":
		if(v.__name__ || v.__ename__) return ValueType.TObject;
		return ValueType.TFunction;
	case "undefined":
		return ValueType.TNull;
	default:
		return ValueType.TUnknown;
	}
};
Type.allEnums = function(e) {
	return e.__empty_constructs__;
};
var gltoolbox_GeometryTools = function() { };
$hxClasses["gltoolbox.GeometryTools"] = gltoolbox_GeometryTools;
gltoolbox_GeometryTools.__name__ = ["gltoolbox","GeometryTools"];
gltoolbox_GeometryTools.getCachedUnitQuad = function(drawMode) {
	if(drawMode == null) drawMode = 5;
	var unitQuad = gltoolbox_GeometryTools.unitQuadCache.h[drawMode];
	if(unitQuad == null || !snow_modules_opengl_web_GL.gl.isBuffer(unitQuad)) {
		unitQuad = gltoolbox_GeometryTools.createQuad(0,0,1,1,drawMode);
		gltoolbox_GeometryTools.unitQuadCache.h[drawMode] = unitQuad;
	}
	return unitQuad;
};
gltoolbox_GeometryTools.getCachedClipSpaceQuad = function(drawMode) {
	if(drawMode == null) drawMode = 5;
	var clipSpaceQuad = gltoolbox_GeometryTools.clipSpaceQuadCache.h[drawMode];
	if(clipSpaceQuad == null || !snow_modules_opengl_web_GL.gl.isBuffer(clipSpaceQuad)) {
		clipSpaceQuad = gltoolbox_GeometryTools.createQuad(-1,-1,2,2,drawMode);
		gltoolbox_GeometryTools.clipSpaceQuadCache.h[drawMode] = clipSpaceQuad;
	}
	return clipSpaceQuad;
};
gltoolbox_GeometryTools.createUnitQuad = function(drawMode) {
	if(drawMode == null) drawMode = 5;
	return gltoolbox_GeometryTools.createQuad(0,0,1,1,drawMode);
};
gltoolbox_GeometryTools.createClipSpaceQuad = function(drawMode) {
	if(drawMode == null) drawMode = 5;
	return gltoolbox_GeometryTools.createQuad(-1,-1,2,2,drawMode);
};
gltoolbox_GeometryTools.createQuad = function(originX,originY,width,height,drawMode,usage) {
	if(usage == null) usage = 35044;
	if(drawMode == null) drawMode = 5;
	if(height == null) height = 1;
	if(width == null) width = 1;
	if(originY == null) originY = 0;
	if(originX == null) originX = 0;
	var quad = snow_modules_opengl_web_GL.gl.createBuffer();
	var vertices = [];
	switch(drawMode) {
	case 5:case 4:
		vertices = [originX,originY + height,originX,originY,originX + width,originY + height,originX + width,originY];
		if(drawMode == 4) vertices = vertices.concat([originX + width,originY + height,originX,originY]);
		break;
	case 6:
		vertices = [originX,originY + height,originX,originY,originX + width,originY,originX + width,originY + height];
		break;
	}
	snow_modules_opengl_web_GL.gl.bindBuffer(34962,quad);
	snow_modules_opengl_web_GL.bufferData(34962,new Float32Array(vertices),usage);
	snow_modules_opengl_web_GL.gl.bindBuffer(34962,null);
	return quad;
};
gltoolbox_GeometryTools.boundaryLinesArray = function(width,height) {
	return new Float32Array([0.5,0,0.5,height,0,height - 0.5,width,height - 0.5,width - 0.5,height,width - 0.5,0,width,0.5,0,0.5]);
};
var gltoolbox_TextureTools = function() { };
$hxClasses["gltoolbox.TextureTools"] = gltoolbox_TextureTools;
gltoolbox_TextureTools.__name__ = ["gltoolbox","TextureTools"];
gltoolbox_TextureTools.createTextureFactory = function(params) {
	return function(width,height) {
		return gltoolbox_TextureTools.createTexture(width,height,params);
	};
};
gltoolbox_TextureTools.createFloatTextureRGB = function(width,height) {
	return gltoolbox_TextureTools.createTexture(width,height,{ channelType : 6407, dataType : 5126});
};
gltoolbox_TextureTools.createFloatTextureRGBA = function(width,height) {
	return gltoolbox_TextureTools.createTexture(width,height,{ channelType : 6408, dataType : 5126});
};
gltoolbox_TextureTools.createTexture = function(width,height,params) {
	if(params == null) params = { };
	var _g = 0;
	var _g1 = Reflect.fields(gltoolbox_TextureTools.defaultParams);
	while(_g < _g1.length) {
		var f = _g1[_g];
		++_g;
		if(!Object.prototype.hasOwnProperty.call(params,f)) Reflect.setField(params,f,Reflect.field(gltoolbox_TextureTools.defaultParams,f));
	}
	var texture = snow_modules_opengl_web_GL.gl.createTexture();
	snow_modules_opengl_web_GL.gl.bindTexture(3553,texture);
	snow_modules_opengl_web_GL.gl.texParameteri(3553,10241,params.filter);
	snow_modules_opengl_web_GL.gl.texParameteri(3553,10240,params.filter);
	snow_modules_opengl_web_GL.gl.texParameteri(3553,10242,params.wrapS);
	snow_modules_opengl_web_GL.gl.texParameteri(3553,10243,params.wrapT);
	snow_modules_opengl_web_GL.gl.pixelStorei(3317,params.unpackAlignment);
	snow_modules_opengl_web_GL.gl.texImage2D(3553,0,params.channelType,width,height,0,params.channelType,params.dataType,null);
	snow_modules_opengl_web_GL.gl.bindTexture(3553,null);
	return texture;
};
var gltoolbox_render_ITargetable = function() { };
$hxClasses["gltoolbox.render.ITargetable"] = gltoolbox_render_ITargetable;
gltoolbox_render_ITargetable.__name__ = ["gltoolbox","render","ITargetable"];
gltoolbox_render_ITargetable.prototype = {
	__class__: gltoolbox_render_ITargetable
};
var gltoolbox_render_RenderTarget = function(width,height,textureFactory) {
	if(textureFactory == null) textureFactory = gltoolbox_TextureTools.createTextureFactory(null);
	this.width = width;
	this.height = height;
	this.textureFactory = textureFactory;
	this.texture = textureFactory(width,height);
	if(gltoolbox_render_RenderTarget.textureQuad == null) gltoolbox_render_RenderTarget.textureQuad = gltoolbox_GeometryTools.getCachedUnitQuad(5);
	this.frameBufferObject = snow_modules_opengl_web_GL.gl.createFramebuffer();
	this.resize(width,height);
};
$hxClasses["gltoolbox.render.RenderTarget"] = gltoolbox_render_RenderTarget;
gltoolbox_render_RenderTarget.__name__ = ["gltoolbox","render","RenderTarget"];
gltoolbox_render_RenderTarget.__interfaces__ = [gltoolbox_render_ITargetable];
gltoolbox_render_RenderTarget.prototype = {
	resize: function(width,height) {
		var newTexture = this.textureFactory(width,height);
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.frameBufferObject);
		snow_modules_opengl_web_GL.gl.framebufferTexture2D(36160,36064,3553,newTexture,0);
		if(this.texture != null) {
			var resampler = gltoolbox_shaders_Resample.instance;
			resampler.texture.set_data(this.texture);
			snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.frameBufferObject);
			snow_modules_opengl_web_GL.gl.viewport(0,0,width,height);
			snow_modules_opengl_web_GL.gl.bindBuffer(34962,gltoolbox_render_RenderTarget.textureQuad);
			if(resampler._active) {
				resampler.setUniforms();
				resampler.setAttributes();
				null;
			} else {
				if(!resampler._ready) resampler.create();
				snow_modules_opengl_web_GL.gl.useProgram(resampler._prog);
				resampler.setUniforms();
				resampler.setAttributes();
				resampler._active = true;
			}
			snow_modules_opengl_web_GL.gl.drawArrays(5,0,4);
			resampler.deactivate();
			snow_modules_opengl_web_GL.gl.deleteTexture(this.texture);
		} else {
			snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.frameBufferObject);
			snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
			snow_modules_opengl_web_GL.gl.clear(16384);
		}
		this.width = width;
		this.height = height;
		this.texture = newTexture;
		return this;
	}
	,activate: function() {
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.frameBufferObject);
	}
	,clear: function(mask) {
		if(mask == null) mask = 16384;
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.frameBufferObject);
		snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
		snow_modules_opengl_web_GL.gl.clear(mask);
	}
	,dispose: function() {
		snow_modules_opengl_web_GL.gl.deleteFramebuffer(this.frameBufferObject);
		snow_modules_opengl_web_GL.gl.deleteTexture(this.texture);
	}
	,__class__: gltoolbox_render_RenderTarget
};
var gltoolbox_render_RenderTarget2Phase = function(width,height,textureFactory) {
	if(textureFactory == null) textureFactory = gltoolbox_TextureTools.createTextureFactory(null);
	this.width = width;
	this.height = height;
	this.textureFactory = textureFactory;
	if(gltoolbox_render_RenderTarget2Phase.textureQuad == null) gltoolbox_render_RenderTarget2Phase.textureQuad = gltoolbox_GeometryTools.getCachedUnitQuad(5);
	this.writeFrameBufferObject = snow_modules_opengl_web_GL.gl.createFramebuffer();
	this.readFrameBufferObject = snow_modules_opengl_web_GL.gl.createFramebuffer();
	this.resize(width,height);
};
$hxClasses["gltoolbox.render.RenderTarget2Phase"] = gltoolbox_render_RenderTarget2Phase;
gltoolbox_render_RenderTarget2Phase.__name__ = ["gltoolbox","render","RenderTarget2Phase"];
gltoolbox_render_RenderTarget2Phase.__interfaces__ = [gltoolbox_render_ITargetable];
gltoolbox_render_RenderTarget2Phase.prototype = {
	resize: function(width,height) {
		var newWriteToTexture = this.textureFactory(width,height);
		var newReadFromTexture = this.textureFactory(width,height);
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.writeFrameBufferObject);
		snow_modules_opengl_web_GL.gl.framebufferTexture2D(36160,36064,3553,newWriteToTexture,0);
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.readFrameBufferObject);
		snow_modules_opengl_web_GL.gl.framebufferTexture2D(36160,36064,3553,newReadFromTexture,0);
		if(this.readFromTexture != null) {
			var resampler = gltoolbox_shaders_Resample.instance;
			resampler.texture.set_data(this.readFromTexture);
			snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.readFrameBufferObject);
			snow_modules_opengl_web_GL.gl.viewport(0,0,width,height);
			snow_modules_opengl_web_GL.gl.bindBuffer(34962,gltoolbox_render_RenderTarget2Phase.textureQuad);
			if(resampler._active) {
				resampler.setUniforms();
				resampler.setAttributes();
				null;
			} else {
				if(!resampler._ready) resampler.create();
				snow_modules_opengl_web_GL.gl.useProgram(resampler._prog);
				resampler.setUniforms();
				resampler.setAttributes();
				resampler._active = true;
			}
			snow_modules_opengl_web_GL.gl.drawArrays(5,0,4);
			resampler.deactivate();
			snow_modules_opengl_web_GL.gl.deleteTexture(this.readFromTexture);
		} else {
			snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.readFrameBufferObject);
			snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
			snow_modules_opengl_web_GL.gl.clear(16384);
		}
		if(this.writeToTexture != null) snow_modules_opengl_web_GL.gl.deleteTexture(this.writeToTexture); else {
			snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.writeFrameBufferObject);
			snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
			snow_modules_opengl_web_GL.gl.clear(16384);
		}
		this.width = width;
		this.height = height;
		this.writeToTexture = newWriteToTexture;
		this.readFromTexture = newReadFromTexture;
		return this;
	}
	,activate: function() {
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.writeFrameBufferObject);
	}
	,swap: function() {
		this.tmpFBO = this.writeFrameBufferObject;
		this.writeFrameBufferObject = this.readFrameBufferObject;
		this.readFrameBufferObject = this.tmpFBO;
		this.tmpTex = this.writeToTexture;
		this.writeToTexture = this.readFromTexture;
		this.readFromTexture = this.tmpTex;
	}
	,clear: function(mask) {
		if(mask == null) mask = 16384;
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.readFrameBufferObject);
		snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
		snow_modules_opengl_web_GL.gl.clear(mask);
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.writeFrameBufferObject);
		snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
		snow_modules_opengl_web_GL.gl.clear(mask);
	}
	,clearRead: function(mask) {
		if(mask == null) mask = 16384;
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.readFrameBufferObject);
		snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
		snow_modules_opengl_web_GL.gl.clear(mask);
	}
	,clearWrite: function(mask) {
		if(mask == null) mask = 16384;
		snow_modules_opengl_web_GL.gl.bindFramebuffer(36160,this.writeFrameBufferObject);
		snow_modules_opengl_web_GL.gl.clearColor(0,0,0,1);
		snow_modules_opengl_web_GL.gl.clear(mask);
	}
	,dispose: function() {
		snow_modules_opengl_web_GL.gl.deleteFramebuffer(this.writeFrameBufferObject);
		snow_modules_opengl_web_GL.gl.deleteFramebuffer(this.readFrameBufferObject);
		snow_modules_opengl_web_GL.gl.deleteTexture(this.writeToTexture);
		snow_modules_opengl_web_GL.gl.deleteTexture(this.readFromTexture);
	}
	,__class__: gltoolbox_render_RenderTarget2Phase
};
var js_Boot = function() { };
$hxClasses["js.Boot"] = js_Boot;
js_Boot.__name__ = ["js","Boot"];
js_Boot.__unhtml = function(s) {
	return s.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
};
js_Boot.__trace = function(v,i) {
	var msg;
	if(i != null) msg = i.fileName + ":" + i.lineNumber + ": "; else msg = "";
	msg += js_Boot.__string_rec(v,"");
	if(i != null && i.customParams != null) {
		var _g = 0;
		var _g1 = i.customParams;
		while(_g < _g1.length) {
			var v1 = _g1[_g];
			++_g;
			msg += "," + js_Boot.__string_rec(v1,"");
		}
	}
	var d;
	if(typeof(document) != "undefined" && (d = document.getElementById("haxe:trace")) != null) d.innerHTML += js_Boot.__unhtml(msg) + "<br/>"; else if(typeof console != "undefined" && console.log != null) console.log(msg);
};
js_Boot.getClass = function(o) {
	if((o instanceof Array) && o.__enum__ == null) return Array; else {
		var cl = o.__class__;
		if(cl != null) return cl;
		var name = js_Boot.__nativeClassName(o);
		if(name != null) return js_Boot.__resolveNativeClass(name);
		return null;
	}
};
js_Boot.__string_rec = function(o,s) {
	if(o == null) return "null";
	if(s.length >= 5) return "<...>";
	var t = typeof(o);
	if(t == "function" && (o.__name__ || o.__ename__)) t = "object";
	switch(t) {
	case "object":
		if(o instanceof Array) {
			if(o.__enum__) {
				if(o.length == 2) return o[0];
				var str2 = o[0] + "(";
				s += "\t";
				var _g1 = 2;
				var _g = o.length;
				while(_g1 < _g) {
					var i1 = _g1++;
					if(i1 != 2) str2 += "," + js_Boot.__string_rec(o[i1],s); else str2 += js_Boot.__string_rec(o[i1],s);
				}
				return str2 + ")";
			}
			var l = o.length;
			var i;
			var str1 = "[";
			s += "\t";
			var _g2 = 0;
			while(_g2 < l) {
				var i2 = _g2++;
				str1 += (i2 > 0?",":"") + js_Boot.__string_rec(o[i2],s);
			}
			str1 += "]";
			return str1;
		}
		var tostr;
		try {
			tostr = o.toString;
		} catch( e ) {
			if (e instanceof js__$Boot_HaxeError) e = e.val;
			return "???";
		}
		if(tostr != null && tostr != Object.toString && typeof(tostr) == "function") {
			var s2 = o.toString();
			if(s2 != "[object Object]") return s2;
		}
		var k = null;
		var str = "{\n";
		s += "\t";
		var hasp = o.hasOwnProperty != null;
		for( var k in o ) {
		if(hasp && !o.hasOwnProperty(k)) {
			continue;
		}
		if(k == "prototype" || k == "__class__" || k == "__super__" || k == "__interfaces__" || k == "__properties__") {
			continue;
		}
		if(str.length != 2) str += ", \n";
		str += s + k + " : " + js_Boot.__string_rec(o[k],s);
		}
		s = s.substring(1);
		str += "\n" + s + "}";
		return str;
	case "function":
		return "<function>";
	case "string":
		return o;
	default:
		return String(o);
	}
};
js_Boot.__interfLoop = function(cc,cl) {
	if(cc == null) return false;
	if(cc == cl) return true;
	var intf = cc.__interfaces__;
	if(intf != null) {
		var _g1 = 0;
		var _g = intf.length;
		while(_g1 < _g) {
			var i = _g1++;
			var i1 = intf[i];
			if(i1 == cl || js_Boot.__interfLoop(i1,cl)) return true;
		}
	}
	return js_Boot.__interfLoop(cc.__super__,cl);
};
js_Boot.__instanceof = function(o,cl) {
	if(cl == null) return false;
	switch(cl) {
	case Int:
		return (o|0) === o;
	case Float:
		return typeof(o) == "number";
	case Bool:
		return typeof(o) == "boolean";
	case String:
		return typeof(o) == "string";
	case Array:
		return (o instanceof Array) && o.__enum__ == null;
	case Dynamic:
		return true;
	default:
		if(o != null) {
			if(typeof(cl) == "function") {
				if(o instanceof cl) return true;
				if(js_Boot.__interfLoop(js_Boot.getClass(o),cl)) return true;
			} else if(typeof(cl) == "object" && js_Boot.__isNativeObj(cl)) {
				if(o instanceof cl) return true;
			}
		} else return false;
		if(cl == Class && o.__name__ != null) return true;
		if(cl == Enum && o.__ename__ != null) return true;
		return o.__enum__ == cl;
	}
};
js_Boot.__cast = function(o,t) {
	if(js_Boot.__instanceof(o,t)) return o; else throw new js__$Boot_HaxeError("Cannot cast " + Std.string(o) + " to " + Std.string(t));
};
js_Boot.__nativeClassName = function(o) {
	var name = js_Boot.__toStr.call(o).slice(8,-1);
	if(name == "Object" || name == "Function" || name == "Math" || name == "JSON") return null;
	return name;
};
js_Boot.__isNativeObj = function(o) {
	return js_Boot.__nativeClassName(o) != null;
};
js_Boot.__resolveNativeClass = function(name) {
	return $global[name];
};
var gltoolbox_shaders_Resample = function() {
	shaderblox_ShaderBase.call(this);
};
$hxClasses["gltoolbox.shaders.Resample"] = gltoolbox_shaders_Resample;
gltoolbox_shaders_Resample.__name__ = ["gltoolbox","shaders","Resample"];
gltoolbox_shaders_Resample.__super__ = shaderblox_ShaderBase;
gltoolbox_shaders_Resample.prototype = $extend(shaderblox_ShaderBase.prototype,{
	createProperties: function() {
		shaderblox_ShaderBase.prototype.createProperties.call(this);
		var instance = new shaderblox_uniforms_UTexture("texture",null,false);
		this.texture = instance;
		this._uniforms.push(instance);
		var instance1 = new shaderblox_attributes_FloatAttribute("vertexPosition",0,2);
		this.vertexPosition = instance1;
		this._attributes.push(instance1);
		this._aStride += 8;
	}
	,initSources: function() {
		this._vertSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nattribute vec2 vertexPosition;\n\tvarying vec2 texelCoord;\n\tvoid main(){\n\t\ttexelCoord = vertexPosition;\n\t\tgl_Position = vec4(vertexPosition*2.0 - 1.0, 0.0, 1.0 );\n\t}\n";
		this._fragSource = "\n#ifdef GL_ES\nprecision highp float;\nprecision highp sampler2D;\n#endif\n\nuniform sampler2D texture;\n\tvarying vec2 texelCoord;\n\tvoid main(){\n\t\tgl_FragColor = texture2D(texture, texelCoord);\n\t}\n";
	}
	,__class__: gltoolbox_shaders_Resample
});
var haxe_IMap = function() { };
$hxClasses["haxe.IMap"] = haxe_IMap;
haxe_IMap.__name__ = ["haxe","IMap"];
haxe_IMap.prototype = {
	__class__: haxe_IMap
};
var haxe__$Int64__$_$_$Int64 = function(high,low) {
	this.high = high;
	this.low = low;
};
$hxClasses["haxe._Int64.___Int64"] = haxe__$Int64__$_$_$Int64;
haxe__$Int64__$_$_$Int64.__name__ = ["haxe","_Int64","___Int64"];
haxe__$Int64__$_$_$Int64.prototype = {
	__class__: haxe__$Int64__$_$_$Int64
};
var haxe_Log = function() { };
$hxClasses["haxe.Log"] = haxe_Log;
haxe_Log.__name__ = ["haxe","Log"];
haxe_Log.trace = function(v,infos) {
	js_Boot.__trace(v,infos);
};
var haxe_Serializer = function() {
	this.buf = new StringBuf();
	this.cache = [];
	this.useCache = haxe_Serializer.USE_CACHE;
	this.useEnumIndex = haxe_Serializer.USE_ENUM_INDEX;
	this.shash = new haxe_ds_StringMap();
	this.scount = 0;
};
$hxClasses["haxe.Serializer"] = haxe_Serializer;
haxe_Serializer.__name__ = ["haxe","Serializer"];
haxe_Serializer.run = function(v) {
	var s = new haxe_Serializer();
	s.serialize(v);
	return s.toString();
};
haxe_Serializer.prototype = {
	toString: function() {
		return this.buf.b;
	}
	,serializeString: function(s) {
		var x = this.shash.get(s);
		if(x != null) {
			this.buf.b += "R";
			if(x == null) this.buf.b += "null"; else this.buf.b += "" + x;
			return;
		}
		this.shash.set(s,this.scount++);
		this.buf.b += "y";
		s = encodeURIComponent(s);
		if(s.length == null) this.buf.b += "null"; else this.buf.b += "" + s.length;
		this.buf.b += ":";
		if(s == null) this.buf.b += "null"; else this.buf.b += "" + s;
	}
	,serializeRef: function(v) {
		var vt = typeof(v);
		var _g1 = 0;
		var _g = this.cache.length;
		while(_g1 < _g) {
			var i = _g1++;
			var ci = this.cache[i];
			if(typeof(ci) == vt && ci == v) {
				this.buf.b += "r";
				if(i == null) this.buf.b += "null"; else this.buf.b += "" + i;
				return true;
			}
		}
		this.cache.push(v);
		return false;
	}
	,serializeFields: function(v) {
		var _g = 0;
		var _g1 = Reflect.fields(v);
		while(_g < _g1.length) {
			var f = _g1[_g];
			++_g;
			this.serializeString(f);
			this.serialize(Reflect.field(v,f));
		}
		this.buf.b += "g";
	}
	,serialize: function(v) {
		{
			var _g = Type["typeof"](v);
			switch(_g[1]) {
			case 0:
				this.buf.b += "n";
				break;
			case 1:
				var v1 = v;
				if(v1 == 0) {
					this.buf.b += "z";
					return;
				}
				this.buf.b += "i";
				if(v1 == null) this.buf.b += "null"; else this.buf.b += "" + v1;
				break;
			case 2:
				var v2 = v;
				if(isNaN(v2)) this.buf.b += "k"; else if(!isFinite(v2)) if(v2 < 0) this.buf.b += "m"; else this.buf.b += "p"; else {
					this.buf.b += "d";
					if(v2 == null) this.buf.b += "null"; else this.buf.b += "" + v2;
				}
				break;
			case 3:
				if(v) this.buf.b += "t"; else this.buf.b += "f";
				break;
			case 6:
				var c = _g[2];
				if(c == String) {
					this.serializeString(v);
					return;
				}
				if(this.useCache && this.serializeRef(v)) return;
				switch(c) {
				case Array:
					var ucount = 0;
					this.buf.b += "a";
					var l = v.length;
					var _g1 = 0;
					while(_g1 < l) {
						var i = _g1++;
						if(v[i] == null) ucount++; else {
							if(ucount > 0) {
								if(ucount == 1) this.buf.b += "n"; else {
									this.buf.b += "u";
									if(ucount == null) this.buf.b += "null"; else this.buf.b += "" + ucount;
								}
								ucount = 0;
							}
							this.serialize(v[i]);
						}
					}
					if(ucount > 0) {
						if(ucount == 1) this.buf.b += "n"; else {
							this.buf.b += "u";
							if(ucount == null) this.buf.b += "null"; else this.buf.b += "" + ucount;
						}
					}
					this.buf.b += "h";
					break;
				case List:
					this.buf.b += "l";
					var v3 = v;
					var _g1_head = v3.h;
					var _g1_val = null;
					while(_g1_head != null) {
						var i1;
						_g1_val = _g1_head[0];
						_g1_head = _g1_head[1];
						i1 = _g1_val;
						this.serialize(i1);
					}
					this.buf.b += "h";
					break;
				case Date:
					var d = v;
					this.buf.b += "v";
					this.buf.add(d.getTime());
					break;
				case haxe_ds_StringMap:
					this.buf.b += "b";
					var v4 = v;
					var $it0 = v4.keys();
					while( $it0.hasNext() ) {
						var k = $it0.next();
						this.serializeString(k);
						this.serialize(__map_reserved[k] != null?v4.getReserved(k):v4.h[k]);
					}
					this.buf.b += "h";
					break;
				case haxe_ds_IntMap:
					this.buf.b += "q";
					var v5 = v;
					var $it1 = v5.keys();
					while( $it1.hasNext() ) {
						var k1 = $it1.next();
						this.buf.b += ":";
						if(k1 == null) this.buf.b += "null"; else this.buf.b += "" + k1;
						this.serialize(v5.h[k1]);
					}
					this.buf.b += "h";
					break;
				case haxe_ds_ObjectMap:
					this.buf.b += "M";
					var v6 = v;
					var $it2 = v6.keys();
					while( $it2.hasNext() ) {
						var k2 = $it2.next();
						var id = Reflect.field(k2,"__id__");
						Reflect.deleteField(k2,"__id__");
						this.serialize(k2);
						k2.__id__ = id;
						this.serialize(v6.h[k2.__id__]);
					}
					this.buf.b += "h";
					break;
				case haxe_io_Bytes:
					var v7 = v;
					var i2 = 0;
					var max = v7.length - 2;
					var charsBuf = new StringBuf();
					var b64 = haxe_Serializer.BASE64;
					while(i2 < max) {
						var b1 = v7.get(i2++);
						var b2 = v7.get(i2++);
						var b3 = v7.get(i2++);
						charsBuf.add(b64.charAt(b1 >> 2));
						charsBuf.add(b64.charAt((b1 << 4 | b2 >> 4) & 63));
						charsBuf.add(b64.charAt((b2 << 2 | b3 >> 6) & 63));
						charsBuf.add(b64.charAt(b3 & 63));
					}
					if(i2 == max) {
						var b11 = v7.get(i2++);
						var b21 = v7.get(i2++);
						charsBuf.add(b64.charAt(b11 >> 2));
						charsBuf.add(b64.charAt((b11 << 4 | b21 >> 4) & 63));
						charsBuf.add(b64.charAt(b21 << 2 & 63));
					} else if(i2 == max + 1) {
						var b12 = v7.get(i2++);
						charsBuf.add(b64.charAt(b12 >> 2));
						charsBuf.add(b64.charAt(b12 << 4 & 63));
					}
					var chars = charsBuf.b;
					this.buf.b += "s";
					if(chars.length == null) this.buf.b += "null"; else this.buf.b += "" + chars.length;
					this.buf.b += ":";
					if(chars == null) this.buf.b += "null"; else this.buf.b += "" + chars;
					break;
				default:
					if(this.useCache) this.cache.pop();
					if(v.hxSerialize != null) {
						this.buf.b += "C";
						this.serializeString(Type.getClassName(c));
						if(this.useCache) this.cache.push(v);
						v.hxSerialize(this);
						this.buf.b += "g";
					} else {
						this.buf.b += "c";
						this.serializeString(Type.getClassName(c));
						if(this.useCache) this.cache.push(v);
						this.serializeFields(v);
					}
				}
				break;
			case 4:
				if(js_Boot.__instanceof(v,Class)) {
					var className = Type.getClassName(v);
					this.buf.b += "A";
					this.serializeString(className);
				} else if(js_Boot.__instanceof(v,Enum)) {
					this.buf.b += "B";
					this.serializeString(Type.getEnumName(v));
				} else {
					if(this.useCache && this.serializeRef(v)) return;
					this.buf.b += "o";
					this.serializeFields(v);
				}
				break;
			case 7:
				var e = _g[2];
				if(this.useCache) {
					if(this.serializeRef(v)) return;
					this.cache.pop();
				}
				if(this.useEnumIndex) this.buf.b += "j"; else this.buf.b += "w";
				this.serializeString(Type.getEnumName(e));
				if(this.useEnumIndex) {
					this.buf.b += ":";
					this.buf.b += Std.string(v[1]);
				} else this.serializeString(v[0]);
				this.buf.b += ":";
				var l1 = v.length;
				this.buf.b += Std.string(l1 - 2);
				var _g11 = 2;
				while(_g11 < l1) {
					var i3 = _g11++;
					this.serialize(v[i3]);
				}
				if(this.useCache) this.cache.push(v);
				break;
			case 5:
				throw new js__$Boot_HaxeError("Cannot serialize function");
				break;
			default:
				throw new js__$Boot_HaxeError("Cannot serialize " + Std.string(v));
			}
		}
	}
	,__class__: haxe_Serializer
};
var haxe_Timer = function() { };
$hxClasses["haxe.Timer"] = haxe_Timer;
haxe_Timer.__name__ = ["haxe","Timer"];
haxe_Timer.stamp = function() {
	return new Date().getTime() / 1000;
};
var haxe_Unserializer = function(buf) {
	this.buf = buf;
	this.length = buf.length;
	this.pos = 0;
	this.scache = [];
	this.cache = [];
	var r = haxe_Unserializer.DEFAULT_RESOLVER;
	if(r == null) {
		r = Type;
		haxe_Unserializer.DEFAULT_RESOLVER = r;
	}
	this.setResolver(r);
};
$hxClasses["haxe.Unserializer"] = haxe_Unserializer;
haxe_Unserializer.__name__ = ["haxe","Unserializer"];
haxe_Unserializer.initCodes = function() {
	var codes = [];
	var _g1 = 0;
	var _g = haxe_Unserializer.BASE64.length;
	while(_g1 < _g) {
		var i = _g1++;
		codes[haxe_Unserializer.BASE64.charCodeAt(i)] = i;
	}
	return codes;
};
haxe_Unserializer.run = function(v) {
	return new haxe_Unserializer(v).unserialize();
};
haxe_Unserializer.prototype = {
	setResolver: function(r) {
		if(r == null) this.resolver = { resolveClass : function(_) {
			return null;
		}, resolveEnum : function(_1) {
			return null;
		}}; else this.resolver = r;
	}
	,get: function(p) {
		return this.buf.charCodeAt(p);
	}
	,readDigits: function() {
		var k = 0;
		var s = false;
		var fpos = this.pos;
		while(true) {
			var c = this.buf.charCodeAt(this.pos);
			if(c != c) break;
			if(c == 45) {
				if(this.pos != fpos) break;
				s = true;
				this.pos++;
				continue;
			}
			if(c < 48 || c > 57) break;
			k = k * 10 + (c - 48);
			this.pos++;
		}
		if(s) k *= -1;
		return k;
	}
	,readFloat: function() {
		var p1 = this.pos;
		while(true) {
			var c = this.buf.charCodeAt(this.pos);
			if(c >= 43 && c < 58 || c == 101 || c == 69) this.pos++; else break;
		}
		return Std.parseFloat(HxOverrides.substr(this.buf,p1,this.pos - p1));
	}
	,unserializeObject: function(o) {
		while(true) {
			if(this.pos >= this.length) throw new js__$Boot_HaxeError("Invalid object");
			if(this.buf.charCodeAt(this.pos) == 103) break;
			var k = this.unserialize();
			if(!(typeof(k) == "string")) throw new js__$Boot_HaxeError("Invalid object key");
			var v = this.unserialize();
			o[k] = v;
		}
		this.pos++;
	}
	,unserializeEnum: function(edecl,tag) {
		if(this.get(this.pos++) != 58) throw new js__$Boot_HaxeError("Invalid enum format");
		var nargs = this.readDigits();
		if(nargs == 0) return Type.createEnum(edecl,tag);
		var args = [];
		while(nargs-- > 0) args.push(this.unserialize());
		return Type.createEnum(edecl,tag,args);
	}
	,unserialize: function() {
		var _g = this.get(this.pos++);
		switch(_g) {
		case 110:
			return null;
		case 116:
			return true;
		case 102:
			return false;
		case 122:
			return 0;
		case 105:
			return this.readDigits();
		case 100:
			return this.readFloat();
		case 121:
			var len = this.readDigits();
			if(this.get(this.pos++) != 58 || this.length - this.pos < len) throw new js__$Boot_HaxeError("Invalid string length");
			var s = HxOverrides.substr(this.buf,this.pos,len);
			this.pos += len;
			s = decodeURIComponent(s.split("+").join(" "));
			this.scache.push(s);
			return s;
		case 107:
			return NaN;
		case 109:
			return -Infinity;
		case 112:
			return Infinity;
		case 97:
			var buf = this.buf;
			var a = [];
			this.cache.push(a);
			while(true) {
				var c = this.buf.charCodeAt(this.pos);
				if(c == 104) {
					this.pos++;
					break;
				}
				if(c == 117) {
					this.pos++;
					var n = this.readDigits();
					a[a.length + n - 1] = null;
				} else a.push(this.unserialize());
			}
			return a;
		case 111:
			var o = { };
			this.cache.push(o);
			this.unserializeObject(o);
			return o;
		case 114:
			var n1 = this.readDigits();
			if(n1 < 0 || n1 >= this.cache.length) throw new js__$Boot_HaxeError("Invalid reference");
			return this.cache[n1];
		case 82:
			var n2 = this.readDigits();
			if(n2 < 0 || n2 >= this.scache.length) throw new js__$Boot_HaxeError("Invalid string reference");
			return this.scache[n2];
		case 120:
			throw new js__$Boot_HaxeError(this.unserialize());
			break;
		case 99:
			var name = this.unserialize();
			var cl = this.resolver.resolveClass(name);
			if(cl == null) throw new js__$Boot_HaxeError("Class not found " + name);
			var o1 = Type.createEmptyInstance(cl);
			this.cache.push(o1);
			this.unserializeObject(o1);
			return o1;
		case 119:
			var name1 = this.unserialize();
			var edecl = this.resolver.resolveEnum(name1);
			if(edecl == null) throw new js__$Boot_HaxeError("Enum not found " + name1);
			var e = this.unserializeEnum(edecl,this.unserialize());
			this.cache.push(e);
			return e;
		case 106:
			var name2 = this.unserialize();
			var edecl1 = this.resolver.resolveEnum(name2);
			if(edecl1 == null) throw new js__$Boot_HaxeError("Enum not found " + name2);
			this.pos++;
			var index = this.readDigits();
			var tag = Type.getEnumConstructs(edecl1)[index];
			if(tag == null) throw new js__$Boot_HaxeError("Unknown enum index " + name2 + "@" + index);
			var e1 = this.unserializeEnum(edecl1,tag);
			this.cache.push(e1);
			return e1;
		case 108:
			var l = new List();
			this.cache.push(l);
			var buf1 = this.buf;
			while(this.buf.charCodeAt(this.pos) != 104) l.add(this.unserialize());
			this.pos++;
			return l;
		case 98:
			var h = new haxe_ds_StringMap();
			this.cache.push(h);
			var buf2 = this.buf;
			while(this.buf.charCodeAt(this.pos) != 104) {
				var s1 = this.unserialize();
				h.set(s1,this.unserialize());
			}
			this.pos++;
			return h;
		case 113:
			var h1 = new haxe_ds_IntMap();
			this.cache.push(h1);
			var buf3 = this.buf;
			var c1 = this.get(this.pos++);
			while(c1 == 58) {
				var i = this.readDigits();
				h1.set(i,this.unserialize());
				c1 = this.get(this.pos++);
			}
			if(c1 != 104) throw new js__$Boot_HaxeError("Invalid IntMap format");
			return h1;
		case 77:
			var h2 = new haxe_ds_ObjectMap();
			this.cache.push(h2);
			var buf4 = this.buf;
			while(this.buf.charCodeAt(this.pos) != 104) {
				var s2 = this.unserialize();
				h2.set(s2,this.unserialize());
			}
			this.pos++;
			return h2;
		case 118:
			var d;
			if(this.buf.charCodeAt(this.pos) >= 48 && this.buf.charCodeAt(this.pos) <= 57 && this.buf.charCodeAt(this.pos + 1) >= 48 && this.buf.charCodeAt(this.pos + 1) <= 57 && this.buf.charCodeAt(this.pos + 2) >= 48 && this.buf.charCodeAt(this.pos + 2) <= 57 && this.buf.charCodeAt(this.pos + 3) >= 48 && this.buf.charCodeAt(this.pos + 3) <= 57 && this.buf.charCodeAt(this.pos + 4) == 45) {
				var s3 = HxOverrides.substr(this.buf,this.pos,19);
				d = HxOverrides.strDate(s3);
				this.pos += 19;
			} else {
				var t = this.readFloat();
				var d1 = new Date();
				d1.setTime(t);
				d = d1;
			}
			this.cache.push(d);
			return d;
		case 115:
			var len1 = this.readDigits();
			var buf5 = this.buf;
			if(this.get(this.pos++) != 58 || this.length - this.pos < len1) throw new js__$Boot_HaxeError("Invalid bytes length");
			var codes = haxe_Unserializer.CODES;
			if(codes == null) {
				codes = haxe_Unserializer.initCodes();
				haxe_Unserializer.CODES = codes;
			}
			var i1 = this.pos;
			var rest = len1 & 3;
			var size;
			size = (len1 >> 2) * 3 + (rest >= 2?rest - 1:0);
			var max = i1 + (len1 - rest);
			var bytes = haxe_io_Bytes.alloc(size);
			var bpos = 0;
			while(i1 < max) {
				var c11 = codes[StringTools.fastCodeAt(buf5,i1++)];
				var c2 = codes[StringTools.fastCodeAt(buf5,i1++)];
				bytes.set(bpos++,c11 << 2 | c2 >> 4);
				var c3 = codes[StringTools.fastCodeAt(buf5,i1++)];
				bytes.set(bpos++,c2 << 4 | c3 >> 2);
				var c4 = codes[StringTools.fastCodeAt(buf5,i1++)];
				bytes.set(bpos++,c3 << 6 | c4);
			}
			if(rest >= 2) {
				var c12 = codes[StringTools.fastCodeAt(buf5,i1++)];
				var c21 = codes[StringTools.fastCodeAt(buf5,i1++)];
				bytes.set(bpos++,c12 << 2 | c21 >> 4);
				if(rest == 3) {
					var c31 = codes[StringTools.fastCodeAt(buf5,i1++)];
					bytes.set(bpos++,c21 << 4 | c31 >> 2);
				}
			}
			this.pos += len1;
			this.cache.push(bytes);
			return bytes;
		case 67:
			var name3 = this.unserialize();
			var cl1 = this.resolver.resolveClass(name3);
			if(cl1 == null) throw new js__$Boot_HaxeError("Class not found " + name3);
			var o2 = Type.createEmptyInstance(cl1);
			this.cache.push(o2);
			o2.hxUnserialize(this);
			if(this.get(this.pos++) != 103) throw new js__$Boot_HaxeError("Invalid custom data");
			return o2;
		case 65:
			var name4 = this.unserialize();
			var cl2 = this.resolver.resolveClass(name4);
			if(cl2 == null) throw new js__$Boot_HaxeError("Class not found " + name4);
			return cl2;
		case 66:
			var name5 = this.unserialize();
			var e2 = this.resolver.resolveEnum(name5);
			if(e2 == null) throw new js__$Boot_HaxeError("Enum not found " + name5);
			return e2;
		default:
		}
		this.pos--;
		throw new js__$Boot_HaxeError("Invalid char " + this.buf.charAt(this.pos) + " at position " + this.pos);
	}
	,__class__: haxe_Unserializer
};
var haxe_Utf8 = function(size) {
	this.__b = "";
};
$hxClasses["haxe.Utf8"] = haxe_Utf8;
haxe_Utf8.__name__ = ["haxe","Utf8"];
haxe_Utf8.prototype = {
	__class__: haxe_Utf8
};
var haxe_ds_IntMap = function() {
	this.h = { };
};
$hxClasses["haxe.ds.IntMap"] = haxe_ds_IntMap;
haxe_ds_IntMap.__name__ = ["haxe","ds","IntMap"];
haxe_ds_IntMap.__interfaces__ = [haxe_IMap];
haxe_ds_IntMap.prototype = {
	set: function(key,value) {
		this.h[key] = value;
	}
	,remove: function(key) {
		if(!this.h.hasOwnProperty(key)) return false;
		delete(this.h[key]);
		return true;
	}
	,keys: function() {
		var a = [];
		for( var key in this.h ) {
		if(this.h.hasOwnProperty(key)) a.push(key | 0);
		}
		return HxOverrides.iter(a);
	}
	,iterator: function() {
		return { ref : this.h, it : this.keys(), hasNext : function() {
			return this.it.hasNext();
		}, next : function() {
			var i = this.it.next();
			return this.ref[i];
		}};
	}
	,__class__: haxe_ds_IntMap
};
var haxe_ds_ObjectMap = function() {
	this.h = { };
	this.h.__keys__ = { };
};
$hxClasses["haxe.ds.ObjectMap"] = haxe_ds_ObjectMap;
haxe_ds_ObjectMap.__name__ = ["haxe","ds","ObjectMap"];
haxe_ds_ObjectMap.__interfaces__ = [haxe_IMap];
haxe_ds_ObjectMap.prototype = {
	set: function(key,value) {
		var id = key.__id__ || (key.__id__ = ++haxe_ds_ObjectMap.count);
		this.h[id] = value;
		this.h.__keys__[id] = key;
	}
	,remove: function(key) {
		var id = key.__id__;
		if(this.h.__keys__[id] == null) return false;
		delete(this.h[id]);
		delete(this.h.__keys__[id]);
		return true;
	}
	,keys: function() {
		var a = [];
		for( var key in this.h.__keys__ ) {
		if(this.h.hasOwnProperty(key)) a.push(this.h.__keys__[key]);
		}
		return HxOverrides.iter(a);
	}
	,__class__: haxe_ds_ObjectMap
};
var haxe_ds_StringMap = function() {
	this.h = { };
};
$hxClasses["haxe.ds.StringMap"] = haxe_ds_StringMap;
haxe_ds_StringMap.__name__ = ["haxe","ds","StringMap"];
haxe_ds_StringMap.__interfaces__ = [haxe_IMap];
haxe_ds_StringMap.prototype = {
	set: function(key,value) {
		if(__map_reserved[key] != null) this.setReserved(key,value); else this.h[key] = value;
	}
	,get: function(key) {
		if(__map_reserved[key] != null) return this.getReserved(key);
		return this.h[key];
	}
	,exists: function(key) {
		if(__map_reserved[key] != null) return this.existsReserved(key);
		return this.h.hasOwnProperty(key);
	}
	,setReserved: function(key,value) {
		if(this.rh == null) this.rh = { };
		this.rh["$" + key] = value;
	}
	,getReserved: function(key) {
		if(this.rh == null) return null; else return this.rh["$" + key];
	}
	,existsReserved: function(key) {
		if(this.rh == null) return false;
		return this.rh.hasOwnProperty("$" + key);
	}
	,remove: function(key) {
		if(__map_reserved[key] != null) {
			key = "$" + key;
			if(this.rh == null || !this.rh.hasOwnProperty(key)) return false;
			delete(this.rh[key]);
			return true;
		} else {
			if(!this.h.hasOwnProperty(key)) return false;
			delete(this.h[key]);
			return true;
		}
	}
	,keys: function() {
		var _this = this.arrayKeys();
		return HxOverrides.iter(_this);
	}
	,arrayKeys: function() {
		var out = [];
		for( var key in this.h ) {
		if(this.h.hasOwnProperty(key)) out.push(key);
		}
		if(this.rh != null) {
			for( var key in this.rh ) {
			if(key.charCodeAt(0) == 36) out.push(key.substr(1));
			}
		}
		return out;
	}
	,__class__: haxe_ds_StringMap
};
var haxe_io_Bytes = function(data) {
	this.length = data.byteLength;
	this.b = new Uint8Array(data);
	this.b.bufferValue = data;
	data.hxBytes = this;
	data.bytes = this.b;
};
$hxClasses["haxe.io.Bytes"] = haxe_io_Bytes;
haxe_io_Bytes.__name__ = ["haxe","io","Bytes"];
haxe_io_Bytes.alloc = function(length) {
	return new haxe_io_Bytes(new ArrayBuffer(length));
};
haxe_io_Bytes.prototype = {
	get: function(pos) {
		return this.b[pos];
	}
	,set: function(pos,v) {
		this.b[pos] = v & 255;
	}
	,getString: function(pos,len) {
		if(pos < 0 || len < 0 || pos + len > this.length) throw new js__$Boot_HaxeError(haxe_io_Error.OutsideBounds);
		var s = "";
		var b = this.b;
		var fcc = String.fromCharCode;
		var i = pos;
		var max = pos + len;
		while(i < max) {
			var c = b[i++];
			if(c < 128) {
				if(c == 0) break;
				s += fcc(c);
			} else if(c < 224) s += fcc((c & 63) << 6 | b[i++] & 127); else if(c < 240) {
				var c2 = b[i++];
				s += fcc((c & 31) << 12 | (c2 & 127) << 6 | b[i++] & 127);
			} else {
				var c21 = b[i++];
				var c3 = b[i++];
				var u = (c & 15) << 18 | (c21 & 127) << 12 | (c3 & 127) << 6 | b[i++] & 127;
				s += fcc((u >> 10) + 55232);
				s += fcc(u & 1023 | 56320);
			}
		}
		return s;
	}
	,toString: function() {
		return this.getString(0,this.length);
	}
	,__class__: haxe_io_Bytes
};
var haxe_io_Error = $hxClasses["haxe.io.Error"] = { __ename__ : ["haxe","io","Error"], __constructs__ : ["Blocked","Overflow","OutsideBounds","Custom"] };
haxe_io_Error.Blocked = ["Blocked",0];
haxe_io_Error.Blocked.toString = $estr;
haxe_io_Error.Blocked.__enum__ = haxe_io_Error;
haxe_io_Error.Overflow = ["Overflow",1];
haxe_io_Error.Overflow.toString = $estr;
haxe_io_Error.Overflow.__enum__ = haxe_io_Error;
haxe_io_Error.OutsideBounds = ["OutsideBounds",2];
haxe_io_Error.OutsideBounds.toString = $estr;
haxe_io_Error.OutsideBounds.__enum__ = haxe_io_Error;
haxe_io_Error.Custom = function(e) { var $x = ["Custom",3,e]; $x.__enum__ = haxe_io_Error; $x.toString = $estr; return $x; };
haxe_io_Error.__empty_constructs__ = [haxe_io_Error.Blocked,haxe_io_Error.Overflow,haxe_io_Error.OutsideBounds];
var haxe_io_FPHelper = function() { };
$hxClasses["haxe.io.FPHelper"] = haxe_io_FPHelper;
haxe_io_FPHelper.__name__ = ["haxe","io","FPHelper"];
haxe_io_FPHelper.i32ToFloat = function(i) {
	var sign = 1 - (i >>> 31 << 1);
	var exp = i >>> 23 & 255;
	var sig = i & 8388607;
	if(sig == 0 && exp == 0) return 0.0;
	return sign * (1 + Math.pow(2,-23) * sig) * Math.pow(2,exp - 127);
};
haxe_io_FPHelper.floatToI32 = function(f) {
	if(f == 0) return 0;
	var af;
	if(f < 0) af = -f; else af = f;
	var exp = Math.floor(Math.log(af) / 0.6931471805599453);
	if(exp < -127) exp = -127; else if(exp > 128) exp = 128;
	var sig = Math.round((af / Math.pow(2,exp) - 1) * 8388608) & 8388607;
	return (f < 0?-2147483648:0) | exp + 127 << 23 | sig;
};
haxe_io_FPHelper.i64ToDouble = function(low,high) {
	var sign = 1 - (high >>> 31 << 1);
	var exp = (high >> 20 & 2047) - 1023;
	var sig = (high & 1048575) * 4294967296. + (low >>> 31) * 2147483648. + (low & 2147483647);
	if(sig == 0 && exp == -1023) return 0.0;
	return sign * (1.0 + Math.pow(2,-52) * sig) * Math.pow(2,exp);
};
haxe_io_FPHelper.doubleToI64 = function(v) {
	var i64 = haxe_io_FPHelper.i64tmp;
	if(v == 0) {
		i64.low = 0;
		i64.high = 0;
	} else {
		var av;
		if(v < 0) av = -v; else av = v;
		var exp = Math.floor(Math.log(av) / 0.6931471805599453);
		var sig;
		var v1 = (av / Math.pow(2,exp) - 1) * 4503599627370496.;
		sig = Math.round(v1);
		var sig_l = sig | 0;
		var sig_h = sig / 4294967296.0 | 0;
		i64.low = sig_l;
		i64.high = (v < 0?-2147483648:0) | exp + 1023 << 20 | sig_h;
	}
	return i64;
};
var haxe_io_Path = function(path) {
	switch(path) {
	case ".":case "..":
		this.dir = path;
		this.file = "";
		return;
	}
	var c1 = path.lastIndexOf("/");
	var c2 = path.lastIndexOf("\\");
	if(c1 < c2) {
		this.dir = HxOverrides.substr(path,0,c2);
		path = HxOverrides.substr(path,c2 + 1,null);
		this.backslash = true;
	} else if(c2 < c1) {
		this.dir = HxOverrides.substr(path,0,c1);
		path = HxOverrides.substr(path,c1 + 1,null);
	} else this.dir = null;
	var cp = path.lastIndexOf(".");
	if(cp != -1) {
		this.ext = HxOverrides.substr(path,cp + 1,null);
		this.file = HxOverrides.substr(path,0,cp);
	} else {
		this.ext = null;
		this.file = path;
	}
};
$hxClasses["haxe.io.Path"] = haxe_io_Path;
haxe_io_Path.__name__ = ["haxe","io","Path"];
haxe_io_Path.extension = function(path) {
	var s = new haxe_io_Path(path);
	if(s.ext == null) return "";
	return s.ext;
};
haxe_io_Path.join = function(paths) {
	var paths1 = paths.filter(function(s) {
		return s != null && s != "";
	});
	if(paths1.length == 0) return "";
	var path = paths1[0];
	var _g1 = 1;
	var _g = paths1.length;
	while(_g1 < _g) {
		var i = _g1++;
		path = haxe_io_Path.addTrailingSlash(path);
		path += paths1[i];
	}
	return haxe_io_Path.normalize(path);
};
haxe_io_Path.normalize = function(path) {
	var slash = "/";
	path = path.split("\\").join("/");
	if(path == null || path == slash) return slash;
	var target = [];
	var _g = 0;
	var _g1 = path.split(slash);
	while(_g < _g1.length) {
		var token = _g1[_g];
		++_g;
		if(token == ".." && target.length > 0 && target[target.length - 1] != "..") target.pop(); else if(token != ".") target.push(token);
	}
	var tmp = target.join(slash);
	var regex = new EReg("([^:])/+","g");
	var result = regex.replace(tmp,"$1" + slash);
	var acc = new StringBuf();
	var colon = false;
	var slashes = false;
	var _g11 = 0;
	var _g2 = tmp.length;
	while(_g11 < _g2) {
		var i = _g11++;
		var _g21 = HxOverrides.cca(tmp,i);
		var i1 = _g21;
		if(_g21 != null) switch(_g21) {
		case 58:
			acc.b += ":";
			colon = true;
			break;
		case 47:
			if(colon == false) slashes = true; else {
				colon = false;
				if(slashes) {
					acc.b += "/";
					slashes = false;
				}
				acc.add(String.fromCharCode(i1));
			}
			break;
		default:
			colon = false;
			if(slashes) {
				acc.b += "/";
				slashes = false;
			}
			acc.add(String.fromCharCode(i1));
		} else {
			colon = false;
			if(slashes) {
				acc.b += "/";
				slashes = false;
			}
			acc.add(String.fromCharCode(i1));
		}
	}
	var result1 = acc.b;
	return result1;
};
haxe_io_Path.addTrailingSlash = function(path) {
	if(path.length == 0) return "/";
	var c1 = path.lastIndexOf("/");
	var c2 = path.lastIndexOf("\\");
	if(c1 < c2) {
		if(c2 != path.length - 1) return path + "\\"; else return path;
	} else if(c1 != path.length - 1) return path + "/"; else return path;
};
haxe_io_Path.prototype = {
	__class__: haxe_io_Path
};
var js__$Boot_HaxeError = function(val) {
	Error.call(this);
	this.val = val;
	this.message = String(val);
	if(Error.captureStackTrace) Error.captureStackTrace(this,js__$Boot_HaxeError);
};
$hxClasses["js._Boot.HaxeError"] = js__$Boot_HaxeError;
js__$Boot_HaxeError.__name__ = ["js","_Boot","HaxeError"];
js__$Boot_HaxeError.__super__ = Error;
js__$Boot_HaxeError.prototype = $extend(Error.prototype,{
	__class__: js__$Boot_HaxeError
});
var js_Web = function() { };
$hxClasses["js.Web"] = js_Web;
js_Web.__name__ = ["js","Web"];
js_Web.getParams = function() {
	var result = new haxe_ds_StringMap();
	var paramObj = eval("\n\t\t\t(function() {\n\t\t\t    var match,\n\t\t\t        pl     = /\\+/g,  // Regex for replacing addition symbol with a space\n\t\t\t        search = /([^&=]+)=?([^&]*)/g,\n\t\t\t        decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); },\n\t\t\t        query  = window.location.search.substring(1);\n\n\t\t\t    var urlParams = {};\n\t\t\t    while (match = search.exec(query))\n\t\t\t       urlParams[decode(match[1])] = decode(match[2]);\n\t\t\t    return urlParams;\n\t\t\t})();\n\t\t");
	var _g = 0;
	var _g1 = Reflect.fields(paramObj);
	while(_g < _g1.length) {
		var f = _g1[_g];
		++_g;
		result.set(f,Reflect.field(paramObj,f));
	}
	return result;
};
var js_html__$CanvasElement_CanvasUtil = function() { };
$hxClasses["js.html._CanvasElement.CanvasUtil"] = js_html__$CanvasElement_CanvasUtil;
js_html__$CanvasElement_CanvasUtil.__name__ = ["js","html","_CanvasElement","CanvasUtil"];
js_html__$CanvasElement_CanvasUtil.getContextWebGL = function(canvas,attribs) {
	var _g = 0;
	var _g1 = ["webgl","experimental-webgl"];
	while(_g < _g1.length) {
		var name = _g1[_g];
		++_g;
		var ctx = canvas.getContext(name,attribs);
		if(ctx != null) return ctx;
	}
	return null;
};
var js_html_compat_ArrayBuffer = function(a) {
	if((a instanceof Array) && a.__enum__ == null) {
		this.a = a;
		this.byteLength = a.length;
	} else {
		var len = a;
		this.a = [];
		var _g = 0;
		while(_g < len) {
			var i = _g++;
			this.a[i] = 0;
		}
		this.byteLength = len;
	}
};
$hxClasses["js.html.compat.ArrayBuffer"] = js_html_compat_ArrayBuffer;
js_html_compat_ArrayBuffer.__name__ = ["js","html","compat","ArrayBuffer"];
js_html_compat_ArrayBuffer.sliceImpl = function(begin,end) {
	var u = new Uint8Array(this,begin,end == null?null:end - begin);
	var result = new ArrayBuffer(u.byteLength);
	var resultArray = new Uint8Array(result);
	resultArray.set(u);
	return result;
};
js_html_compat_ArrayBuffer.prototype = {
	slice: function(begin,end) {
		return new js_html_compat_ArrayBuffer(this.a.slice(begin,end));
	}
	,__class__: js_html_compat_ArrayBuffer
};
var js_html_compat_DataView = function(buffer,byteOffset,byteLength) {
	this.buf = buffer;
	if(byteOffset == null) this.offset = 0; else this.offset = byteOffset;
	if(byteLength == null) this.length = buffer.byteLength - this.offset; else this.length = byteLength;
	if(this.offset < 0 || this.length < 0 || this.offset + this.length > buffer.byteLength) throw new js__$Boot_HaxeError(haxe_io_Error.OutsideBounds);
};
$hxClasses["js.html.compat.DataView"] = js_html_compat_DataView;
js_html_compat_DataView.__name__ = ["js","html","compat","DataView"];
js_html_compat_DataView.prototype = {
	getInt8: function(byteOffset) {
		var v = this.buf.a[this.offset + byteOffset];
		if(v >= 128) return v - 256; else return v;
	}
	,getUint8: function(byteOffset) {
		return this.buf.a[this.offset + byteOffset];
	}
	,getInt16: function(byteOffset,littleEndian) {
		var v = this.getUint16(byteOffset,littleEndian);
		if(v >= 32768) return v - 65536; else return v;
	}
	,getUint16: function(byteOffset,littleEndian) {
		if(littleEndian) return this.buf.a[this.offset + byteOffset] | this.buf.a[this.offset + byteOffset + 1] << 8; else return this.buf.a[this.offset + byteOffset] << 8 | this.buf.a[this.offset + byteOffset + 1];
	}
	,getInt32: function(byteOffset,littleEndian) {
		var p = this.offset + byteOffset;
		var a = this.buf.a[p++];
		var b = this.buf.a[p++];
		var c = this.buf.a[p++];
		var d = this.buf.a[p++];
		if(littleEndian) return a | b << 8 | c << 16 | d << 24; else return d | c << 8 | b << 16 | a << 24;
	}
	,getUint32: function(byteOffset,littleEndian) {
		var v = this.getInt32(byteOffset,littleEndian);
		if(v < 0) return v + 4294967296.; else return v;
	}
	,getFloat32: function(byteOffset,littleEndian) {
		return haxe_io_FPHelper.i32ToFloat(this.getInt32(byteOffset,littleEndian));
	}
	,getFloat64: function(byteOffset,littleEndian) {
		var a = this.getInt32(byteOffset,littleEndian);
		var b = this.getInt32(byteOffset + 4,littleEndian);
		return haxe_io_FPHelper.i64ToDouble(littleEndian?a:b,littleEndian?b:a);
	}
	,setInt8: function(byteOffset,value) {
		if(value < 0) this.buf.a[byteOffset + this.offset] = value + 128 & 255; else this.buf.a[byteOffset + this.offset] = value & 255;
	}
	,setUint8: function(byteOffset,value) {
		this.buf.a[byteOffset + this.offset] = value & 255;
	}
	,setInt16: function(byteOffset,value,littleEndian) {
		this.setUint16(byteOffset,value < 0?value + 65536:value,littleEndian);
	}
	,setUint16: function(byteOffset,value,littleEndian) {
		var p = byteOffset + this.offset;
		if(littleEndian) {
			this.buf.a[p] = value & 255;
			this.buf.a[p++] = value >> 8 & 255;
		} else {
			this.buf.a[p++] = value >> 8 & 255;
			this.buf.a[p] = value & 255;
		}
	}
	,setInt32: function(byteOffset,value,littleEndian) {
		this.setUint32(byteOffset,value,littleEndian);
	}
	,setUint32: function(byteOffset,value,littleEndian) {
		var p = byteOffset + this.offset;
		if(littleEndian) {
			this.buf.a[p++] = value & 255;
			this.buf.a[p++] = value >> 8 & 255;
			this.buf.a[p++] = value >> 16 & 255;
			this.buf.a[p++] = value >>> 24;
		} else {
			this.buf.a[p++] = value >>> 24;
			this.buf.a[p++] = value >> 16 & 255;
			this.buf.a[p++] = value >> 8 & 255;
			this.buf.a[p++] = value & 255;
		}
	}
	,setFloat32: function(byteOffset,value,littleEndian) {
		this.setUint32(byteOffset,haxe_io_FPHelper.floatToI32(value),littleEndian);
	}
	,setFloat64: function(byteOffset,value,littleEndian) {
		var i64 = haxe_io_FPHelper.doubleToI64(value);
		if(littleEndian) {
			this.setUint32(byteOffset,i64.low);
			this.setUint32(byteOffset,i64.high);
		} else {
			this.setUint32(byteOffset,i64.high);
			this.setUint32(byteOffset,i64.low);
		}
	}
	,__class__: js_html_compat_DataView
};
var js_html_compat_Uint8Array = function() { };
$hxClasses["js.html.compat.Uint8Array"] = js_html_compat_Uint8Array;
js_html_compat_Uint8Array.__name__ = ["js","html","compat","Uint8Array"];
js_html_compat_Uint8Array._new = function(arg1,offset,length) {
	var arr;
	if(typeof(arg1) == "number") {
		arr = [];
		var _g = 0;
		while(_g < arg1) {
			var i = _g++;
			arr[i] = 0;
		}
		arr.byteLength = arr.length;
		arr.byteOffset = 0;
		arr.buffer = new js_html_compat_ArrayBuffer(arr);
	} else if(js_Boot.__instanceof(arg1,js_html_compat_ArrayBuffer)) {
		var buffer = arg1;
		if(offset == null) offset = 0;
		if(length == null) length = buffer.byteLength - offset;
		if(offset == 0) arr = buffer.a; else arr = buffer.a.slice(offset,offset + length);
		arr.byteLength = arr.length;
		arr.byteOffset = offset;
		arr.buffer = buffer;
	} else if((arg1 instanceof Array) && arg1.__enum__ == null) {
		arr = arg1.slice();
		arr.byteLength = arr.length;
		arr.byteOffset = 0;
		arr.buffer = new js_html_compat_ArrayBuffer(arr);
	} else throw new js__$Boot_HaxeError("TODO " + Std.string(arg1));
	arr.subarray = js_html_compat_Uint8Array._subarray;
	arr.set = js_html_compat_Uint8Array._set;
	return arr;
};
js_html_compat_Uint8Array._set = function(arg,offset) {
	var t = this;
	if(js_Boot.__instanceof(arg.buffer,js_html_compat_ArrayBuffer)) {
		var a = arg;
		if(arg.byteLength + offset > t.byteLength) throw new js__$Boot_HaxeError("set() outside of range");
		var _g1 = 0;
		var _g = arg.byteLength;
		while(_g1 < _g) {
			var i = _g1++;
			t[i + offset] = a[i];
		}
	} else if((arg instanceof Array) && arg.__enum__ == null) {
		var a1 = arg;
		if(a1.length + offset > t.byteLength) throw new js__$Boot_HaxeError("set() outside of range");
		var _g11 = 0;
		var _g2 = a1.length;
		while(_g11 < _g2) {
			var i1 = _g11++;
			t[i1 + offset] = a1[i1];
		}
	} else throw new js__$Boot_HaxeError("TODO");
};
js_html_compat_Uint8Array._subarray = function(start,end) {
	var t = this;
	var a = js_html_compat_Uint8Array._new(t.slice(start,end));
	a.byteOffset = start;
	return a;
};
var shaderblox_attributes_Attribute = function() { };
$hxClasses["shaderblox.attributes.Attribute"] = shaderblox_attributes_Attribute;
shaderblox_attributes_Attribute.__name__ = ["shaderblox","attributes","Attribute"];
shaderblox_attributes_Attribute.prototype = {
	__class__: shaderblox_attributes_Attribute
};
var shaderblox_attributes_FloatAttribute = function(name,location,nFloats) {
	if(nFloats == null) nFloats = 1;
	this.name = name;
	this.location = location;
	this.byteSize = nFloats * 4;
	this.itemCount = nFloats;
	this.type = 5126;
};
$hxClasses["shaderblox.attributes.FloatAttribute"] = shaderblox_attributes_FloatAttribute;
shaderblox_attributes_FloatAttribute.__name__ = ["shaderblox","attributes","FloatAttribute"];
shaderblox_attributes_FloatAttribute.__super__ = shaderblox_attributes_Attribute;
shaderblox_attributes_FloatAttribute.prototype = $extend(shaderblox_attributes_Attribute.prototype,{
	toString: function() {
		return "[FloatAttribute itemCount=" + this.itemCount + " byteSize=" + this.byteSize + " location=" + this.location + " name=" + this.name + "]";
	}
	,__class__: shaderblox_attributes_FloatAttribute
});
var shaderblox_glsl_GLSLTools = function() { };
$hxClasses["shaderblox.glsl.GLSLTools"] = shaderblox_glsl_GLSLTools;
shaderblox_glsl_GLSLTools.__name__ = ["shaderblox","glsl","GLSLTools"];
shaderblox_glsl_GLSLTools.injectConstValue = function(src,name,value) {
	var storageQualifier = "const";
	var types = shaderblox_glsl_GLSLTools.STORAGE_QUALIFIER_TYPES.get(storageQualifier);
	var reg = new EReg(storageQualifier + "\\s+((" + shaderblox_glsl_GLSLTools.PRECISION_QUALIFIERS.join("|") + ")\\s+)?(" + types.join("|") + ")\\s+([^;]+)","m");
	var src1 = shaderblox_glsl_GLSLTools.stripComments(src);
	var currStr = src1;
	while(reg.match(currStr)) {
		var declarationPos = reg.matchedPos();
		var rawDeclarationString = reg.matched(0);
		var exploded = shaderblox_glsl_GLSLTools.bracketExplode(rawDeclarationString,"()");
		var rootScopeStr = Lambda.fold(exploded.contents,function(n,rs) {
			return rs + (js_Boot.__instanceof(n,shaderblox_glsl__$GLSLTools_StringNode)?n.toString():"");
		},"");
		var rConstName = new EReg("\\b(" + name + ")\\b\\s*=","m");
		var nameFound = rConstName.match(rootScopeStr);
		if(nameFound) {
			var namePos = rConstName.matchedPos();
			var initializerLength = 0;
			if((initializerLength = rConstName.matchedRight().indexOf(",")) == -1) initializerLength = rConstName.matchedRight().length;
			var initializerRangeInRootStr_start = namePos.pos + namePos.len;
			var initializerRangeInRootStr_end = namePos.pos + namePos.len + initializerLength;
			var absoluteOffset = src1.length - currStr.length + declarationPos.pos;
			var initializerRangeAbsolute_start = shaderblox_glsl_GLSLTools.compressedToExploded(exploded,initializerRangeInRootStr_start) + absoluteOffset;
			var initializerRangeAbsolute_end = shaderblox_glsl_GLSLTools.compressedToExploded(exploded,initializerRangeInRootStr_end) + absoluteOffset;
			var srcBefore = src1.substring(0,initializerRangeAbsolute_start);
			var srcAfter = src1.substring(initializerRangeAbsolute_end);
			return srcBefore + value + srcAfter;
		}
		currStr = reg.matchedRight();
	}
	return null;
};
shaderblox_glsl_GLSLTools.compressedToExploded = function(scope,compressedPosition) {
	var CC = compressedPosition;
	var stringTotal = 0;
	var nodeTotal = 0;
	var targetIndex = null;
	var _g1 = 0;
	var _g = scope.contents.length;
	while(_g1 < _g) {
		var i = _g1++;
		var n = scope.contents[i];
		var len = n.toString().length;
		if(js_Boot.__instanceof(n,shaderblox_glsl__$GLSLTools_StringNode)) {
			if(stringTotal + len > CC) {
				targetIndex = i;
				break;
			}
			stringTotal += len;
		}
		nodeTotal += len;
	}
	return CC - stringTotal + nodeTotal;
};
shaderblox_glsl_GLSLTools.extractGlobals = function(src,storageQualifiers) {
	if(storageQualifiers == null) storageQualifiers = shaderblox_glsl_GLSLTools.STORAGE_QUALIFIERS;
	if(src == null) return [];
	var str = shaderblox_glsl_GLSLTools.stripComments(src);
	var globals = [];
	var _g = 0;
	while(_g < storageQualifiers.length) {
		var storageQualifier = storageQualifiers[_g];
		++_g;
		var types = shaderblox_glsl_GLSLTools.STORAGE_QUALIFIER_TYPES.get(storageQualifier);
		var reg = new EReg(storageQualifier + "\\s+((" + shaderblox_glsl_GLSLTools.PRECISION_QUALIFIERS.join("|") + ")\\s+)?(" + types.join("|") + ")\\s+([^;]+)","m");
		while(reg.match(str)) {
			var precision = reg.matched(2);
			var type = reg.matched(3);
			var rawNamesStr = reg.matched(4);
			var rName = new EReg("^\\s*([\\w\\d_]+)\\s*(\\[(\\d*)\\])?\\s*(=\\s*(.+))?$","im");
			var _g1 = 0;
			var _g2 = rawNamesStr.split(",");
			while(_g1 < _g2.length) {
				var rawName = _g2[_g1];
				++_g1;
				if(!rName.match(rawName)) continue;
				var global = { storageQualifier : storageQualifier, precision : precision, type : type, name : rName.matched(1), arraySize : Std.parseInt(rName.matched(3))};
				globals.push(global);
			}
			str = reg.matchedRight();
		}
	}
	return globals;
};
shaderblox_glsl_GLSLTools.stripComments = function(src) {
	return new EReg("(/\\*([\\s\\S]*?)\\*/)|(//(.*)$)","igm").replace(src,"");
};
shaderblox_glsl_GLSLTools.unifyLineEndings = function(src) {
	return StringTools.trim(src.split("\r").join("\n").split("\n\n").join("\n"));
};
shaderblox_glsl_GLSLTools.hasMain = function(src) {
	if(src == null) return false;
	var str = shaderblox_glsl_GLSLTools.stripComments(src);
	return shaderblox_glsl_GLSLTools.MAIN_FUNC_REGEX.match(str);
};
shaderblox_glsl_GLSLTools.stripMain = function(src) {
	if(src == null) return null;
	var str = src;
	var reg = shaderblox_glsl_GLSLTools.MAIN_FUNC_REGEX;
	var matched = reg.match(str);
	if(!matched) return str;
	var remainingStr = reg.matchedRight();
	var mainEnd = 0;
	var open = 1;
	var _g1 = 0;
	var _g = remainingStr.length;
	while(_g1 < _g) {
		var i = _g1++;
		var c = remainingStr.charAt(i);
		if(c == "{") open++; else if(c == "}") open--;
		if(open == 0) {
			mainEnd = i + 1;
			break;
		}
	}
	return reg.matchedLeft() + remainingStr.substring(mainEnd,remainingStr.length);
};
shaderblox_glsl_GLSLTools.GLSLGlobalToString = function(g) {
	return (g.storageQualifier != null?g.storageQualifier:"") + " " + (g.precision != null?g.precision:"") + " " + g.type + " " + g.name + (g.arraySize != null?"[" + g.arraySize + "]":"") + ";";
};
shaderblox_glsl_GLSLTools.bracketExplode = function(src,brackets) {
	if(brackets.length != 2) return null;
	var open = brackets.charAt(0);
	var close = brackets.charAt(1);
	var root = new shaderblox_glsl__$GLSLTools_ScopeNode();
	var scopeStack = [];
	var currentScope = root;
	var currentNode = null;
	var c;
	var level = 0;
	var _g1 = 0;
	var _g = src.length;
	while(_g1 < _g) {
		var i = _g1++;
		c = src.charAt(i);
		if(c == open) {
			level++;
			var newScope = new shaderblox_glsl__$GLSLTools_ScopeNode(brackets);
			currentScope.contents.push(newScope);
			scopeStack.push(currentScope);
			currentScope = newScope;
			currentNode = currentScope;
		} else if(c == close) {
			level--;
			currentScope = scopeStack.pop();
			currentNode = currentScope;
		} else {
			if(!js_Boot.__instanceof(currentNode,shaderblox_glsl__$GLSLTools_StringNode)) {
				currentNode = new shaderblox_glsl__$GLSLTools_StringNode();
				currentScope.contents.push(currentNode);
			}
			(js_Boot.__cast(currentNode , shaderblox_glsl__$GLSLTools_StringNode)).contents += c;
		}
	}
	return root;
};
var shaderblox_glsl__$GLSLTools_INode = function() { };
$hxClasses["shaderblox.glsl._GLSLTools.INode"] = shaderblox_glsl__$GLSLTools_INode;
shaderblox_glsl__$GLSLTools_INode.__name__ = ["shaderblox","glsl","_GLSLTools","INode"];
shaderblox_glsl__$GLSLTools_INode.prototype = {
	__class__: shaderblox_glsl__$GLSLTools_INode
};
var shaderblox_glsl__$GLSLTools_StringNode = function(str) {
	if(str == null) str = "";
	this.contents = str;
};
$hxClasses["shaderblox.glsl._GLSLTools.StringNode"] = shaderblox_glsl__$GLSLTools_StringNode;
shaderblox_glsl__$GLSLTools_StringNode.__name__ = ["shaderblox","glsl","_GLSLTools","StringNode"];
shaderblox_glsl__$GLSLTools_StringNode.__interfaces__ = [shaderblox_glsl__$GLSLTools_INode];
shaderblox_glsl__$GLSLTools_StringNode.prototype = {
	toString: function() {
		return this.contents;
	}
	,__class__: shaderblox_glsl__$GLSLTools_StringNode
};
var shaderblox_glsl__$GLSLTools_ScopeNode = function(brackets) {
	this.closeBracket = "";
	this.openBracket = "";
	this.contents = [];
	if(brackets != null) {
		this.openBracket = brackets.charAt(0);
		this.closeBracket = brackets.charAt(1);
	}
};
$hxClasses["shaderblox.glsl._GLSLTools.ScopeNode"] = shaderblox_glsl__$GLSLTools_ScopeNode;
shaderblox_glsl__$GLSLTools_ScopeNode.__name__ = ["shaderblox","glsl","_GLSLTools","ScopeNode"];
shaderblox_glsl__$GLSLTools_ScopeNode.__interfaces__ = [shaderblox_glsl__$GLSLTools_INode];
shaderblox_glsl__$GLSLTools_ScopeNode.prototype = {
	push: function(v) {
		return this.contents.push(v);
	}
	,toString: function() {
		var str = this.openBracket;
		var _g = 0;
		var _g1 = this.contents;
		while(_g < _g1.length) {
			var n = _g1[_g];
			++_g;
			str += n.toString();
		}
		return str + this.closeBracket;
	}
	,__class__: shaderblox_glsl__$GLSLTools_ScopeNode
};
var shaderblox_helpers_GLUniformLocationHelper = function() { };
$hxClasses["shaderblox.helpers.GLUniformLocationHelper"] = shaderblox_helpers_GLUniformLocationHelper;
shaderblox_helpers_GLUniformLocationHelper.__name__ = ["shaderblox","helpers","GLUniformLocationHelper"];
shaderblox_helpers_GLUniformLocationHelper.isValid = function(u) {
	return u != null;
};
var shaderblox_uniforms_IAppliable = function() { };
$hxClasses["shaderblox.uniforms.IAppliable"] = shaderblox_uniforms_IAppliable;
shaderblox_uniforms_IAppliable.__name__ = ["shaderblox","uniforms","IAppliable"];
shaderblox_uniforms_IAppliable.prototype = {
	__class__: shaderblox_uniforms_IAppliable
};
var shaderblox_uniforms_UniformBase_$Bool = function(name,index,data) {
	this.name = name;
	this.location = index;
	{
		this.dirty = true;
		this.data = data;
	}
};
$hxClasses["shaderblox.uniforms.UniformBase_Bool"] = shaderblox_uniforms_UniformBase_$Bool;
shaderblox_uniforms_UniformBase_$Bool.__name__ = ["shaderblox","uniforms","UniformBase_Bool"];
shaderblox_uniforms_UniformBase_$Bool.prototype = {
	set: function(data) {
		return (function($this) {
			var $r;
			$this.dirty = true;
			$r = $this.data = data;
			return $r;
		}(this));
	}
	,setDirty: function() {
		this.dirty = true;
	}
	,set_data: function(data) {
		this.dirty = true;
		return this.data = data;
	}
	,__class__: shaderblox_uniforms_UniformBase_$Bool
};
var shaderblox_uniforms_UBool = function(name,index,f) {
	if(f == null) f = false;
	shaderblox_uniforms_UniformBase_$Bool.call(this,name,index,f);
};
$hxClasses["shaderblox.uniforms.UBool"] = shaderblox_uniforms_UBool;
shaderblox_uniforms_UBool.__name__ = ["shaderblox","uniforms","UBool"];
shaderblox_uniforms_UBool.__interfaces__ = [shaderblox_uniforms_IAppliable];
shaderblox_uniforms_UBool.__super__ = shaderblox_uniforms_UniformBase_$Bool;
shaderblox_uniforms_UBool.prototype = $extend(shaderblox_uniforms_UniformBase_$Bool.prototype,{
	apply: function() {
		snow_modules_opengl_web_GL.gl.uniform1i(this.location,this.data?1:0);
		this.dirty = false;
	}
	,__class__: shaderblox_uniforms_UBool
});
var shaderblox_uniforms_UniformBase_$Float = function(name,index,data) {
	this.name = name;
	this.location = index;
	{
		this.dirty = true;
		this.data = data;
	}
};
$hxClasses["shaderblox.uniforms.UniformBase_Float"] = shaderblox_uniforms_UniformBase_$Float;
shaderblox_uniforms_UniformBase_$Float.__name__ = ["shaderblox","uniforms","UniformBase_Float"];
shaderblox_uniforms_UniformBase_$Float.prototype = {
	set: function(data) {
		return (function($this) {
			var $r;
			$this.dirty = true;
			$r = $this.data = data;
			return $r;
		}(this));
	}
	,setDirty: function() {
		this.dirty = true;
	}
	,set_data: function(data) {
		this.dirty = true;
		return this.data = data;
	}
	,__class__: shaderblox_uniforms_UniformBase_$Float
};
var shaderblox_uniforms_UFloat = function(name,index,f) {
	if(f == null) f = 0.0;
	shaderblox_uniforms_UniformBase_$Float.call(this,name,index,f);
};
$hxClasses["shaderblox.uniforms.UFloat"] = shaderblox_uniforms_UFloat;
shaderblox_uniforms_UFloat.__name__ = ["shaderblox","uniforms","UFloat"];
shaderblox_uniforms_UFloat.__interfaces__ = [shaderblox_uniforms_IAppliable];
shaderblox_uniforms_UFloat.__super__ = shaderblox_uniforms_UniformBase_$Float;
shaderblox_uniforms_UFloat.prototype = $extend(shaderblox_uniforms_UniformBase_$Float.prototype,{
	apply: function() {
		snow_modules_opengl_web_GL.gl.uniform1f(this.location,this.data);
		this.dirty = false;
	}
	,__class__: shaderblox_uniforms_UFloat
});
var shaderblox_uniforms_UniformBase_$js_$html_$webgl_$Texture = function(name,index,data) {
	this.name = name;
	this.location = index;
	{
		this.dirty = true;
		this.data = data;
	}
};
$hxClasses["shaderblox.uniforms.UniformBase_js_html_webgl_Texture"] = shaderblox_uniforms_UniformBase_$js_$html_$webgl_$Texture;
shaderblox_uniforms_UniformBase_$js_$html_$webgl_$Texture.__name__ = ["shaderblox","uniforms","UniformBase_js_html_webgl_Texture"];
shaderblox_uniforms_UniformBase_$js_$html_$webgl_$Texture.prototype = {
	set: function(data) {
		return (function($this) {
			var $r;
			$this.dirty = true;
			$r = $this.data = data;
			return $r;
		}(this));
	}
	,setDirty: function() {
		this.dirty = true;
	}
	,set_data: function(data) {
		this.dirty = true;
		return this.data = data;
	}
	,__class__: shaderblox_uniforms_UniformBase_$js_$html_$webgl_$Texture
};
var shaderblox_uniforms_UTexture = function(name,index,cube) {
	if(cube == null) cube = false;
	this.cube = cube;
	if(cube) this.type = 34067; else this.type = 3553;
	shaderblox_uniforms_UniformBase_$js_$html_$webgl_$Texture.call(this,name,index,null);
};
$hxClasses["shaderblox.uniforms.UTexture"] = shaderblox_uniforms_UTexture;
shaderblox_uniforms_UTexture.__name__ = ["shaderblox","uniforms","UTexture"];
shaderblox_uniforms_UTexture.__interfaces__ = [shaderblox_uniforms_IAppliable];
shaderblox_uniforms_UTexture.__super__ = shaderblox_uniforms_UniformBase_$js_$html_$webgl_$Texture;
shaderblox_uniforms_UTexture.prototype = $extend(shaderblox_uniforms_UniformBase_$js_$html_$webgl_$Texture.prototype,{
	apply: function() {
		if(this.data == null) return;
		var idx = 33984 + this.samplerIndex;
		if(shaderblox_uniforms_UTexture.lastActiveTexture != idx) snow_modules_opengl_web_GL.activeTexture(shaderblox_uniforms_UTexture.lastActiveTexture = idx);
		snow_modules_opengl_web_GL.gl.uniform1i(this.location,this.samplerIndex);
		snow_modules_opengl_web_GL.gl.bindTexture(this.type,this.data);
		this.dirty = false;
	}
	,__class__: shaderblox_uniforms_UTexture
});
var shaderblox_uniforms_Vector2 = function(x,y) {
	if(y == null) y = 0;
	if(x == null) x = 0;
	this.x = x;
	this.y = y;
};
$hxClasses["shaderblox.uniforms.Vector2"] = shaderblox_uniforms_Vector2;
shaderblox_uniforms_Vector2.__name__ = ["shaderblox","uniforms","Vector2"];
shaderblox_uniforms_Vector2.prototype = {
	set: function(x,y) {
		this.x = x;
		this.y = y;
	}
	,__class__: shaderblox_uniforms_Vector2
};
var shaderblox_uniforms_UniformBase_$shaderblox_$uniforms_$Vector2 = function(name,index,data) {
	this.name = name;
	this.location = index;
	{
		this.dirty = true;
		this.data = data;
	}
};
$hxClasses["shaderblox.uniforms.UniformBase_shaderblox_uniforms_Vector2"] = shaderblox_uniforms_UniformBase_$shaderblox_$uniforms_$Vector2;
shaderblox_uniforms_UniformBase_$shaderblox_$uniforms_$Vector2.__name__ = ["shaderblox","uniforms","UniformBase_shaderblox_uniforms_Vector2"];
shaderblox_uniforms_UniformBase_$shaderblox_$uniforms_$Vector2.prototype = {
	set: function(data) {
		return (function($this) {
			var $r;
			$this.dirty = true;
			$r = $this.data = data;
			return $r;
		}(this));
	}
	,setDirty: function() {
		this.dirty = true;
	}
	,set_data: function(data) {
		this.dirty = true;
		return this.data = data;
	}
	,__class__: shaderblox_uniforms_UniformBase_$shaderblox_$uniforms_$Vector2
};
var shaderblox_uniforms_UVec2 = function(name,index,x,y) {
	if(y == null) y = 0;
	if(x == null) x = 0;
	shaderblox_uniforms_UniformBase_$shaderblox_$uniforms_$Vector2.call(this,name,index,new shaderblox_uniforms_Vector2(x,y));
};
$hxClasses["shaderblox.uniforms.UVec2"] = shaderblox_uniforms_UVec2;
shaderblox_uniforms_UVec2.__name__ = ["shaderblox","uniforms","UVec2"];
shaderblox_uniforms_UVec2.__interfaces__ = [shaderblox_uniforms_IAppliable];
shaderblox_uniforms_UVec2.__super__ = shaderblox_uniforms_UniformBase_$shaderblox_$uniforms_$Vector2;
shaderblox_uniforms_UVec2.prototype = $extend(shaderblox_uniforms_UniformBase_$shaderblox_$uniforms_$Vector2.prototype,{
	apply: function() {
		snow_modules_opengl_web_GL.gl.uniform2f(this.location,this.data.x,this.data.y);
		this.dirty = false;
	}
	,__class__: shaderblox_uniforms_UVec2
});
var snow_Snow = function(_host) {
	this.had_ready_event = false;
	this.i = 0;
	this.immediate_shutdown = false;
	this.has_shutdown = false;
	this.shutting_down = false;
	this.debug = false;
	this.platform = "unknown";
	this.ready = false;
	this.freeze = false;
	if(_host == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_host was null" + (" ( " + "snow App instance was null!" + " )")));
	this.host = _host;
	this.host.app = this;
	this.config = this.default_config();
	this.sys_event = new snow_types_SystemEvent();
	this.win_event = new snow_types_WindowEvent();
	this.io = new snow_systems_io_IO(this);
	this.input = new snow_systems_input_Input(this);
	this.audio = new snow_systems_audio_Audio(this);
	this.assets = new snow_systems_assets_Assets(this);
	this.extensions = [];
	var _g = 0;
	var _g1 = snow_types_Config.extensions;
	while(_g < _g1.length) {
		var _ext_type = _g1[_g];
		++_g;
		var _class = Type.resolveClass(_ext_type);
		if(_class == null) throw new js__$Boot_HaxeError(snow_types_Error.error("Extension `" + _ext_type + "`: Type not found via Type.resolveClass!"));
		var _instance = Type.createInstance(_class,null);
		if(_instance == null) throw new js__$Boot_HaxeError(snow_types_Error.error("Extension `" + _ext_type + "`: Instance was null on calling new()!"));
		this.extensions.push(_instance);
	}
	this.runtime = new snow_core_web_Runtime(this);
	if(this.os == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("os was null" + (" ( " + "init - Runtime didn't set the app.os value!" + " )")));
	if(this.platform == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("platform was null" + (" ( " + "init - Runtime didn't set the app.platform value!" + " )")));
	this.dispatch_event(1);
	this.host.internal_init();
	snow_api_Promises.step();
	while(snow_Snow.next_queue.length > 0) this.cycle_next_queue();
	while(snow_Snow.defer_queue.length > 0) this.cycle_defer_queue();
	this.dispatch_event(2);
	snow_api_Promises.step();
	while(snow_Snow.next_queue.length > 0) this.cycle_next_queue();
	while(snow_Snow.defer_queue.length > 0) this.cycle_defer_queue();
	var _should_exit = this.runtime.run();
	if(_should_exit && !(this.has_shutdown || this.shutting_down)) this.shutdown();
};
$hxClasses["snow.Snow"] = snow_Snow;
snow_Snow.__name__ = ["snow","Snow"];
snow_Snow.next = function(func) {
	if(func != null) snow_Snow.next_queue.push(func);
};
snow_Snow.defer = function(func) {
	if(func != null) snow_Snow.defer_queue.push(func);
};
snow_Snow.get_timestamp = function() {
	return window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
};
snow_Snow.prototype = {
	shutdown: function() {
		if(this.shutting_down) {
			haxe_Log.trace("     i / snow / " + "shutdown / called again, already shutting down - ignoring",{ fileName : "Snow.hx", lineNumber : 158, className : "snow.Snow", methodName : "shutdown"});
			return;
		}
		if(!(this.has_shutdown == false)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("has_shutdown == false" + (" ( " + "snow - calling shutdown more than once is disallowed" + " )")));
		this.shutting_down = true;
		this.host.ondestroy();
		this.dispatch_event(7);
		this.io.shutdown();
		this.audio.shutdown();
		this.assets.shutdown();
		this.input.shutdown();
		this.runtime.shutdown(this.immediate_shutdown);
		this.has_shutdown = true;
	}
	,dispatch_event: function(_type) {
		this.sys_event.set(_type,null,null);
		this.onevent(this.sys_event);
	}
	,dispatch_window_event: function(_type,_timestamp,_window_id,_x,_y) {
		this.win_event.set(_type,_timestamp,_window_id,_x,_y);
		this.sys_event.set(8,this.win_event,null);
		this.onevent(this.sys_event);
	}
	,dispatch_input_event: function(_event) {
		this.sys_event.set(9,null,_event);
		this.onevent(this.sys_event);
	}
	,onevent: function(_event) {
		this.io.module.onevent(_event);
		this.audio.onevent(_event);
		this.input.onevent(_event);
		this.host.onevent(_event);
		this.i = 0;
		while(this.i < this.extensions.length) {
			this.extensions[this.i].onevent(_event);
			++this.i;
		}
		var _g = _event.type;
		switch(_g) {
		case 2:
			this.on_ready_event();
			break;
		case 3:
			if(this.freeze) null; else {
				snow_api_Timer.update();
				snow_api_Promises.step();
				this.cycle_next_queue();
				if(!this.shutting_down && this.ready) this.host.internal_tick();
				this.cycle_defer_queue();
			}
			break;
		case 10:
			this.shutdown();
			break;
		case 7:
			haxe_Log.trace("     i / snow / " + "goodbye.",{ fileName : "Snow.hx", lineNumber : 237, className : "snow.Snow", methodName : "onevent"});
			break;
		case 11:
			this.immediate_shutdown = true;
			this.shutdown();
			break;
		default:
		}
	}
	,get_time: function() {
		return window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
	}
	,get_uniqueid: function() {
		return this.make_uniqueid();
	}
	,on_ready_event: function() {
		var _g = this;
		if(!(this.had_ready_event == false)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("had_ready_event == false" + (" ( " + "snow; the ready event should not be fired repeatedly" + " )")));
		this.had_ready_event = true;
		this.setup_configs().then(function(_) {
			_g.runtime.ready();
			_g.host.ready();
			_g.ready = true;
		}).error(function(e) {
			throw new js__$Boot_HaxeError(snow_types_Error.init("snow / cannot recover from error: " + e));
		});
		snow_api_Promises.step();
		while(snow_Snow.next_queue.length > 0) this.cycle_next_queue();
		while(snow_Snow.defer_queue.length > 0) this.cycle_defer_queue();
	}
	,on_tick_event: function() {
		if(this.freeze) return;
		snow_api_Timer.update();
		snow_api_Promises.step();
		this.cycle_next_queue();
		if(!this.shutting_down && this.ready) this.host.internal_tick();
		this.cycle_defer_queue();
	}
	,setup_configs: function() {
		var _g = this;
		if(snow_types_Config.app_config == null || snow_types_Config.app_config == "") {
			this.config = this.host.config(this.config);
			return snow_api_Promise.resolve();
		}
		return new snow_api_Promise(function(resolve,reject) {
			_g.default_user_config().then(function(_user_conf) {
				_g.config.user = _user_conf;
			}).error(function(error) {
				throw new js__$Boot_HaxeError(snow_types_Error.init("config / failed / default user config JSON failed to parse. Cannot recover. " + error));
			}).then(function() {
				_g.config = _g.host.config(_g.config);
				resolve();
			});
		});
	}
	,setup_host_config: function() {
		this.config = this.host.config(this.config);
	}
	,default_user_config: function() {
		var _g = this;
		return new snow_api_Promise(function(resolve,reject) {
			var load = _g.io.data_flow(haxe_io_Path.join([_g.assets.root,snow_types_Config.app_config]),snow_systems_assets_AssetJSON.processor);
			load.then(resolve).error(function(error) {
				switch(error[1]) {
				case 2:
					var val = error[2];
					reject(error);
					break;
				default:
					haxe_Log.trace("     i / snow / " + ("config / user config will be null! / " + Std.string(error)),{ fileName : "Snow.hx", lineNumber : 378, className : "snow.Snow", methodName : "default_user_config"});
					resolve(null);
				}
			});
		});
	}
	,default_config: function() {
		return { user : null, window : this.default_window_config(), render : this.default_render_config(), runtime : null};
	}
	,default_render_config: function() {
		return { depth : 0, stencil : 0, antialiasing : 0, red_bits : 8, green_bits : 8, blue_bits : 8, alpha_bits : 8, opengl : { major : 0, minor : 0, profile : 0}, webgl : { version : 1}};
	}
	,default_window_config: function() {
		var conf = { true_fullscreen : false, fullscreen : false, borderless : false, resizable : true, x : 536805376, y : 536805376, width : 960, height : 640, title : "snow app"};
		return conf;
	}
	,set_freeze: function(_freeze) {
		this.freeze = _freeze;
		this.dispatch_event(_freeze?4:5);
		return this.freeze;
	}
	,step: function() {
		snow_api_Promises.step();
		while(snow_Snow.next_queue.length > 0) this.cycle_next_queue();
		while(snow_Snow.defer_queue.length > 0) this.cycle_defer_queue();
	}
	,cycle_next_queue: function() {
		var count = snow_Snow.next_queue.length;
		var i = 0;
		while(i < count) {
			(snow_Snow.next_queue.shift())();
			++i;
		}
	}
	,cycle_defer_queue: function() {
		var count = snow_Snow.defer_queue.length;
		var i = 0;
		while(i < count) {
			(snow_Snow.defer_queue.shift())();
			++i;
		}
	}
	,copy_window_config: function(_config) {
		return { borderless : _config.borderless, fullscreen : _config.fullscreen, true_fullscreen : _config.true_fullscreen, height : _config.height, no_input : _config.no_input, resizable : _config.resizable, title : "" + _config.title, width : _config.width, x : _config.x, y : _config.y};
	}
	,copy_render_config: function(_config) {
		return { antialiasing : _config.antialiasing, depth : _config.depth, stencil : _config.stencil, red_bits : _config.red_bits, green_bits : _config.green_bits, blue_bits : _config.blue_bits, alpha_bits : _config.alpha_bits, opengl : { major : _config.opengl.major, minor : _config.opengl.minor, profile : _config.opengl.profile}};
	}
	,make_uniqueid: function(val) {
		if(val == null) val = Std.random(2147483647);
		var r = val % 62 | 0;
		var q = val / 62 | 0;
		if(q > 0) return this.make_uniqueid(q) + (r > 9?(function($this) {
			var $r;
			var ascii = 65 + (r - 10);
			if(ascii > 90) ascii += 6;
			$r = String.fromCharCode(ascii);
			return $r;
		}(this)):(r == null?"null":"" + r).charAt(0));
		return Std.string(r > 9?(function($this) {
			var $r;
			var ascii1 = 65 + (r - 10);
			if(ascii1 > 90) ascii1 += 6;
			$r = String.fromCharCode(ascii1);
			return $r;
		}(this)):(r == null?"null":"" + r).charAt(0));
	}
	,__class__: snow_Snow
};
var snow_api__$Debug_LogError = $hxClasses["snow.api._Debug.LogError"] = { __ename__ : ["snow","api","_Debug","LogError"], __constructs__ : ["RequireString"] };
snow_api__$Debug_LogError.RequireString = function(detail) { var $x = ["RequireString",0,detail]; $x.__enum__ = snow_api__$Debug_LogError; $x.toString = $estr; return $x; };
snow_api__$Debug_LogError.__empty_constructs__ = [];
var snow_api_Debug = function() { };
$hxClasses["snow.api.Debug"] = snow_api_Debug;
snow_api_Debug.__name__ = ["snow","api","Debug"];
snow_api_Debug._get_spacing = function(_file) {
	var _spaces = "";
	var _trace_length = _file.length + 4;
	var _diff = snow_api_Debug._log_width - _trace_length;
	if(_diff > 0) {
		var _g = 0;
		while(_g < _diff) {
			var i = _g++;
			_spaces += " ";
		}
	}
	return _spaces;
};
var snow_api_DebugError = $hxClasses["snow.api.DebugError"] = { __ename__ : ["snow","api","DebugError"], __constructs__ : ["assertion","null_assertion"] };
snow_api_DebugError.assertion = function(expr) { var $x = ["assertion",0,expr]; $x.__enum__ = snow_api_DebugError; $x.toString = $estr; return $x; };
snow_api_DebugError.null_assertion = function(expr) { var $x = ["null_assertion",1,expr]; $x.__enum__ = snow_api_DebugError; $x.toString = $estr; return $x; };
snow_api_DebugError.__empty_constructs__ = [];
var snow_api_Emitter = function() {
	this._checking = false;
	this._to_remove = new List();
	this.connected = new List();
	this.bindings = new haxe_ds_IntMap();
};
$hxClasses["snow.api.Emitter"] = snow_api_Emitter;
snow_api_Emitter.__name__ = ["snow","api","Emitter"];
snow_api_Emitter.prototype = {
	emit: function(event,data) {
		this._check();
		var list = this.bindings.h[event];
		if(list != null && list.length > 0) {
			var _g = 0;
			while(_g < list.length) {
				var handler = list[_g];
				++_g;
				handler(data);
			}
		}
		this._check();
	}
	,on: function(event,handler) {
		this._check();
		if(!this.bindings.h.hasOwnProperty(event)) {
			this.bindings.h[event] = [handler];
			this.connected.push({ handler : handler, event : event});
		} else {
			var list = this.bindings.h[event];
			if(HxOverrides.indexOf(list,handler,0) == -1) {
				list.push(handler);
				this.connected.push({ handler : handler, event : event});
			}
		}
	}
	,off: function(event,handler) {
		this._check();
		var success = false;
		if(this.bindings.h.hasOwnProperty(event)) {
			this._to_remove.push({ event : event, handler : handler});
			var _g_head = this.connected.h;
			var _g_val = null;
			while(_g_head != null) {
				var _info;
				_info = (function($this) {
					var $r;
					_g_val = _g_head[0];
					_g_head = _g_head[1];
					$r = _g_val;
					return $r;
				}(this));
				if(_info.event == event && _info.handler == handler) this.connected.remove(_info);
			}
			success = true;
		}
		return success;
	}
	,_check: function() {
		if(this._checking) return;
		this._checking = true;
		if(this._to_remove.length > 0) {
			var _g_head = this._to_remove.h;
			var _g_val = null;
			while(_g_head != null) {
				var _node;
				_node = (function($this) {
					var $r;
					_g_val = _g_head[0];
					_g_head = _g_head[1];
					$r = _g_val;
					return $r;
				}(this));
				var list = this.bindings.h[_node.event];
				HxOverrides.remove(list,_node.handler);
				if(list.length == 0) this.bindings.remove(_node.event);
			}
			this._to_remove = null;
			this._to_remove = new List();
		}
		this._checking = false;
	}
	,__class__: snow_api_Emitter
};
var snow_api_Promise = function(func) {
	this.was_caught = false;
	var _g = this;
	this.state = 0;
	this.reject_reactions = [];
	this.fulfill_reactions = [];
	this.settle_reactions = [];
	snow_api_Promises.queue(function() {
		func($bind(_g,_g.onfulfill),$bind(_g,_g.onreject));
		snow_api_Promises.defer(snow_api_Promises.next);
	});
};
$hxClasses["snow.api.Promise"] = snow_api_Promise;
snow_api_Promise.__name__ = ["snow","api","Promise"];
snow_api_Promise.all = function(list) {
	return new snow_api_Promise(function(ok,no) {
		var current = 0;
		var total = list.length;
		var fulfill_result = [];
		var reject_result = null;
		var all_state = 0;
		var single_ok = function(index,val) {
			if(all_state != 0) return;
			current++;
			fulfill_result[index] = val;
			if(total == current) {
				all_state = 1;
				ok(fulfill_result);
			}
		};
		var single_err = function(val1) {
			if(all_state != 0) return;
			all_state = 2;
			reject_result = val1;
			no(reject_result);
		};
		var index1 = 0;
		var _g = 0;
		while(_g < list.length) {
			var promise = list[_g];
			++_g;
			promise.then((function(f,a1) {
				return function(a2) {
					f(a1,a2);
				};
			})(single_ok,index1)).error(single_err);
			index1++;
		}
	});
};
snow_api_Promise.race = function(list) {
	return new snow_api_Promise(function(ok,no) {
		var settled = false;
		var single_ok = function(val) {
			if(settled) return;
			settled = true;
			ok(val);
		};
		var single_err = function(val1) {
			if(settled) return;
			settled = true;
			no(val1);
		};
		var _g = 0;
		while(_g < list.length) {
			var promise = list[_g];
			++_g;
			promise.then(single_ok).error(single_err);
		}
	});
};
snow_api_Promise.reject = function(reason) {
	return new snow_api_Promise(function(ok,no) {
		no(reason);
	});
};
snow_api_Promise.resolve = function(val) {
	return new snow_api_Promise(function(ok,no) {
		ok(val);
	});
};
snow_api_Promise.prototype = {
	then: function(on_fulfilled,on_rejected) {
		var _g = this.state;
		switch(_g) {
		case 0:
			this.add_fulfill(on_fulfilled);
			this.add_reject(on_rejected);
			return this.new_linked_promise();
		case 1:
			snow_api_Promises.defer(on_fulfilled,this.result);
			return snow_api_Promise.resolve(this.result);
		case 2:
			snow_api_Promises.defer(on_rejected,this.result);
			return snow_api_Promise.reject(this.result);
		}
	}
	,error: function(on_rejected) {
		var _g = this.state;
		switch(_g) {
		case 0:
			this.add_reject(on_rejected);
			return this.new_linked_resolve_empty();
		case 1:
			return snow_api_Promise.resolve(this.result);
		case 2:
			snow_api_Promises.defer(on_rejected,this.result);
			return snow_api_Promise.reject(this.result);
		}
	}
	,toString: function() {
		return "Promise { state:" + this.state_string() + ", result:" + Std.string(this.result) + " }";
	}
	,add_settle: function(f) {
		if(this.state == 0) this.settle_reactions.push(f); else snow_api_Promises.defer(f,this.result);
	}
	,new_linked_promise: function() {
		var _g = this;
		return new snow_api_Promise(function(f,r) {
			_g.add_settle(function(_) {
				if(_g.state == 1) f(_g.result); else r(_g.result);
			});
		});
	}
	,new_linked_resolve: function() {
		var _g = this;
		return new snow_api_Promise(function(f,r) {
			_g.add_settle(function(val) {
				f(val);
			});
		});
	}
	,new_linked_reject: function() {
		var _g = this;
		return new snow_api_Promise(function(f,r) {
			_g.add_settle(function(val) {
				r(val);
			});
		});
	}
	,new_linked_resolve_empty: function() {
		var _g = this;
		return new snow_api_Promise(function(f,r) {
			_g.add_settle(function(_) {
				f();
			});
		});
	}
	,new_linked_reject_empty: function() {
		var _g = this;
		return new snow_api_Promise(function(f,r) {
			_g.add_settle(function(_) {
				r();
			});
		});
	}
	,add_fulfill: function(f) {
		if(f != null) this.fulfill_reactions.push(f);
	}
	,add_reject: function(f) {
		if(f != null) {
			this.was_caught = true;
			this.reject_reactions.push(f);
		}
	}
	,onfulfill: function(val) {
		this.state = 1;
		this.result = val;
		while(this.fulfill_reactions.length > 0) {
			var fn = this.fulfill_reactions.shift();
			fn(this.result);
		}
		this.onsettle();
	}
	,onreject: function(reason) {
		this.state = 2;
		this.result = reason;
		while(this.reject_reactions.length > 0) {
			var fn = this.reject_reactions.shift();
			fn(this.result);
		}
		this.onsettle();
	}
	,onsettle: function() {
		while(this.settle_reactions.length > 0) {
			var fn = this.settle_reactions.shift();
			fn(this.result);
		}
	}
	,onexception: function(err) {
		var _g = this;
		this.add_settle(function(_) {
			if(!_g.was_caught) {
				if(_g.state == 2) {
					throw new js__$Boot_HaxeError(snow_api_PromiseError.UnhandledPromiseRejection(_g.toString()));
					return;
				}
			}
		});
		if(this.state == 0) this.onreject(err);
	}
	,state_string: function() {
		var _g = this.state;
		switch(_g) {
		case 0:
			return "pending";
		case 1:
			return "fulfilled";
		case 2:
			return "rejected";
		}
	}
	,__class__: snow_api_Promise
};
var snow_api_Promises = function() { };
$hxClasses["snow.api.Promises"] = snow_api_Promises;
snow_api_Promises.__name__ = ["snow","api","Promises"];
snow_api_Promises.step = function() {
	snow_api_Promises.next();
	while(snow_api_Promises.defers.length > 0) {
		var defer = snow_api_Promises.defers.shift();
		defer.f(defer.a);
	}
};
snow_api_Promises.next = function() {
	if(snow_api_Promises.calls.length > 0) (snow_api_Promises.calls.shift())();
};
snow_api_Promises.defer = function(f,a) {
	if(f == null) return;
	snow_api_Promises.defers.push({ f : f, a : a});
};
snow_api_Promises.queue = function(f) {
	if(f == null) return;
	snow_api_Promises.calls.push(f);
};
var snow_api_PromiseError = $hxClasses["snow.api.PromiseError"] = { __ename__ : ["snow","api","PromiseError"], __constructs__ : ["UnhandledPromiseRejection"] };
snow_api_PromiseError.UnhandledPromiseRejection = function(err) { var $x = ["UnhandledPromiseRejection",0,err]; $x.__enum__ = snow_api_PromiseError; $x.toString = $estr; return $x; };
snow_api_PromiseError.__empty_constructs__ = [];
var snow_api_Timer = function(_time) {
	this.time = _time;
	snow_api_Timer.running_timers.push(this);
	this.fire_at = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start + this.time;
	this.running = true;
};
$hxClasses["snow.api.Timer"] = snow_api_Timer;
snow_api_Timer.__name__ = ["snow","api","Timer"];
snow_api_Timer.measure = function(f,pos) {
	var t0 = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
	var r = f();
	haxe_Log.trace(window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start - t0 + "s",pos);
	return r;
};
snow_api_Timer.update = function() {
	var now = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
	var _g = 0;
	var _g1 = snow_api_Timer.running_timers;
	while(_g < _g1.length) {
		var timer = _g1[_g];
		++_g;
		if(timer.running) {
			if(timer.fire_at < now) {
				timer.fire_at += timer.time;
				timer.run();
			}
		}
	}
};
snow_api_Timer.delay = function(_time,_f) {
	var t = new snow_api_Timer(_time);
	t.run = function() {
		t.stop();
		_f();
	};
	return t;
};
snow_api_Timer.prototype = {
	run: function() {
	}
	,stop: function() {
		if(this.running) {
			this.running = false;
			HxOverrides.remove(snow_api_Timer.running_timers,this);
		}
	}
	,__class__: snow_api_Timer
};
var snow_api_buffers__$Float32Array_Float32Array_$Impl_$ = {};
$hxClasses["snow.api.buffers._Float32Array.Float32Array_Impl_"] = snow_api_buffers__$Float32Array_Float32Array_$Impl_$;
snow_api_buffers__$Float32Array_Float32Array_$Impl_$.__name__ = ["snow","api","buffers","_Float32Array","Float32Array_Impl_"];
snow_api_buffers__$Float32Array_Float32Array_$Impl_$._new = function(_elements) {
	return new Float32Array(_elements);
};
snow_api_buffers__$Float32Array_Float32Array_$Impl_$.fromArray = function(_array) {
	return new Float32Array(_array);
};
snow_api_buffers__$Float32Array_Float32Array_$Impl_$.fromView = function(_view) {
	return new Float32Array(_view);
};
snow_api_buffers__$Float32Array_Float32Array_$Impl_$.fromBuffer = function(_buffer,_byteOffset,_byteLength) {
	return new Float32Array(_buffer,_byteOffset,_byteLength / 4 | 0);
};
snow_api_buffers__$Float32Array_Float32Array_$Impl_$.fromBytes = function(bytes,byteOffset,len) {
	if(byteOffset == null) byteOffset = 0;
	if(byteOffset == null) return new Float32Array(bytes.b.bufferValue);
	if(len == null) return new Float32Array(bytes.b.bufferValue,byteOffset);
	return new Float32Array(bytes.b.bufferValue,byteOffset,len);
};
snow_api_buffers__$Float32Array_Float32Array_$Impl_$.toBytes = function(this1) {
	return new haxe_io_Bytes(new Uint8Array(this1.buffer));
};
snow_api_buffers__$Float32Array_Float32Array_$Impl_$.toString = function(this1) {
	return "Float32Array [byteLength:" + this1.byteLength + ", length:" + this1.length + "]";
};
var snow_api_buffers__$Int32Array_Int32Array_$Impl_$ = {};
$hxClasses["snow.api.buffers._Int32Array.Int32Array_Impl_"] = snow_api_buffers__$Int32Array_Int32Array_$Impl_$;
snow_api_buffers__$Int32Array_Int32Array_$Impl_$.__name__ = ["snow","api","buffers","_Int32Array","Int32Array_Impl_"];
snow_api_buffers__$Int32Array_Int32Array_$Impl_$._new = function(_elements) {
	return new Int32Array(_elements);
};
snow_api_buffers__$Int32Array_Int32Array_$Impl_$.fromArray = function(_array) {
	return new Int32Array(_array);
};
snow_api_buffers__$Int32Array_Int32Array_$Impl_$.fromView = function(_view) {
	return new Int32Array(_view);
};
snow_api_buffers__$Int32Array_Int32Array_$Impl_$.fromBuffer = function(_buffer,_byteOffset,_byteLength) {
	return new Int32Array(_buffer,_byteOffset,_byteLength / 4 | 0);
};
snow_api_buffers__$Int32Array_Int32Array_$Impl_$.fromBytes = function(bytes,byteOffset,len) {
	if(byteOffset == null) byteOffset = 0;
	if(byteOffset == null) return new Int32Array(bytes.b.bufferValue);
	if(len == null) return new Int32Array(bytes.b.bufferValue,byteOffset);
	return new Int32Array(bytes.b.bufferValue,byteOffset,len);
};
snow_api_buffers__$Int32Array_Int32Array_$Impl_$.toBytes = function(this1) {
	return new haxe_io_Bytes(new Uint8Array(this1.buffer));
};
snow_api_buffers__$Int32Array_Int32Array_$Impl_$.toString = function(this1) {
	return "Int32Array [byteLength:" + this1.byteLength + ", length:" + this1.length + "]";
};
var snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$ = {};
$hxClasses["snow.api.buffers._Uint8Array.Uint8Array_Impl_"] = snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$;
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$.__name__ = ["snow","api","buffers","_Uint8Array","Uint8Array_Impl_"];
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$._new = function(_elements) {
	return new Uint8Array(_elements);
};
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$.fromArray = function(_array) {
	return new Uint8Array(_array);
};
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$.fromView = function(_view) {
	return new Uint8Array(_view);
};
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$.fromBuffer = function(_buffer,_byteOffset,_byteLength) {
	return new Uint8Array(_buffer,_byteOffset,_byteLength);
};
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$.fromBytes = function(bytes,byteOffset,len) {
	if(byteOffset == null) return new Uint8Array(bytes.b.bufferValue);
	if(len == null) return new Uint8Array(bytes.b.bufferValue,byteOffset);
	return new Uint8Array(bytes.b.bufferValue,byteOffset,len);
};
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$.toBytes = function(this1) {
	return new haxe_io_Bytes(new Uint8Array(this1.buffer));
};
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$.toString = function(this1) {
	return "Uint8Array [byteLength:" + this1.byteLength + ", length:" + this1.length + "]";
};
var snow_modules_interfaces_Audio = function() { };
$hxClasses["snow.modules.interfaces.Audio"] = snow_modules_interfaces_Audio;
snow_modules_interfaces_Audio.__name__ = ["snow","modules","interfaces","Audio"];
snow_modules_interfaces_Audio.prototype = {
	__class__: snow_modules_interfaces_Audio
};
var snow_core_Audio = function(_app) {
	this.active = false;
	this.app = _app;
};
$hxClasses["snow.core.Audio"] = snow_core_Audio;
snow_core_Audio.__name__ = ["snow","core","Audio"];
snow_core_Audio.__interfaces__ = [snow_modules_interfaces_Audio];
snow_core_Audio.audio_format_from_path = function(_path) {
	var _ext = haxe_io_Path.extension(_path);
	switch(_ext) {
	case "wav":
		return 3;
	case "ogg":
		return 2;
	case "pcm":
		return 4;
	default:
		return 0;
	}
};
snow_core_Audio.prototype = {
	onevent: function(event) {
	}
	,shutdown: function() {
	}
	,suspend: function() {
	}
	,resume: function() {
	}
	,data_from_load: function(_path,_is_stream,_format) {
		if(_is_stream == null) _is_stream = false;
		return null;
	}
	,data_from_bytes: function(_id,_bytes,_format) {
		return null;
	}
	,play: function(_source,_volume,_paused) {
		return null;
	}
	,loop: function(_source,_volume,_paused) {
		return null;
	}
	,pause: function(_handle) {
	}
	,unpause: function(_handle) {
	}
	,stop: function(_handle) {
	}
	,volume: function(_handle,_volume) {
	}
	,pan: function(_handle,_pan) {
	}
	,pitch: function(_handle,_pitch) {
	}
	,position: function(_handle,_time) {
	}
	,volume_of: function(_handle) {
		return 0.0;
	}
	,pan_of: function(_handle) {
		return 0.0;
	}
	,pitch_of: function(_handle) {
		return 0.0;
	}
	,position_of: function(_handle) {
		return 0.0;
	}
	,state_of: function(_handle) {
		return -1;
	}
	,loop_of: function(_handle) {
		return false;
	}
	,instance_of: function(_handle) {
		return null;
	}
	,__class__: snow_core_Audio
};
var snow_core_Extension = function() { };
$hxClasses["snow.core.Extension"] = snow_core_Extension;
snow_core_Extension.__name__ = ["snow","core","Extension"];
snow_core_Extension.prototype = {
	__class__: snow_core_Extension
};
var snow_core_Runtime = function() { };
$hxClasses["snow.core.Runtime"] = snow_core_Runtime;
snow_core_Runtime.__name__ = ["snow","core","Runtime"];
snow_core_Runtime.prototype = {
	__class__: snow_core_Runtime
};
var snow_core_web_Runtime = function(_app) {
	this.p_body_margin = "0";
	this.p_body_overflow = "0";
	this.p_height = 0;
	this.p_width = 0;
	this.p_s_height = "";
	this.p_s_width = "";
	this.p_margin = "0";
	this.p_padding = "0";
	this.gamepads_supported = false;
	this.window_dpr = 1.0;
	this.window_h = 0;
	this.window_w = 0;
	this.window_y = 0;
	this.window_x = 0;
	this.name = "web";
	this.app = _app;
	this.app.platform = "web";
	this.app.os = this.guess_os();
	snow_core_web_Runtime.timestamp_start = window.performance.now() / 1000.0;
	this.app.config.runtime = { window_id : "app", window_parent : window.document.body, prevent_default_context_menu : true, prevent_default_mouse_wheel : true, prevent_default_touches : true, prevent_default_keys : [snow_systems_input_Keycodes.left,snow_systems_input_Keycodes.right,snow_systems_input_Keycodes.up,snow_systems_input_Keycodes.down,8,9,127]};
	this.gamepads_init();
	haxe_Log.trace("  i / runtime / " + "web / init ok",{ fileName : "Runtime.hx", lineNumber : 63, className : "snow.core.web.Runtime", methodName : "new"});
};
$hxClasses["snow.core.web.Runtime"] = snow_core_web_Runtime;
snow_core_web_Runtime.__name__ = ["snow","core","web","Runtime"];
snow_core_web_Runtime.__interfaces__ = [snow_core_Runtime];
snow_core_web_Runtime.timestamp = function() {
	return window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start;
};
snow_core_web_Runtime.prototype = {
	window_device_pixel_ratio: function() {
		if(window.devicePixelRatio == null) return 1.0; else return window.devicePixelRatio;
	}
	,window_width: function() {
		return this.window.width;
	}
	,window_height: function() {
		return this.window.height;
	}
	,window_grab: function(enable) {
		if(enable) {
			if(($_=this.window,$bind($_,$_.requestPointerLock)) != null) this.window.requestPointerLock(); else if(this.window.webkitRequestPointerLock != null) this.window.webkitRequestPointerLock(); else if(this.window.mozRequestPointerLock != null) this.window.mozRequestPointerLock(); else return false;
		} else if(($_=window.document,$bind($_,$_.exitPointerLock)) != null) window.document.exitPointerLock(); else if(window.document.webkitExitPointerLock != null) window.document.webkitExitPointerLock(); else if(window.document.mozExitPointerLock != null) window.document.mozExitPointerLock(); else return false;
		return true;
	}
	,onresize_handler: function(_) {
		this.window.style.width = "" + window.innerWidth + "px";
		this.window.style.height = "" + window.innerHeight + "px";
	}
	,window_fullscreen: function(enable,true_fullscreen) {
		if(true_fullscreen == null) true_fullscreen = false;
		var _result = true;
		if(enable) {
			this.p_padding = this.window.style.padding;
			this.p_margin = this.window.style.margin;
			this.p_s_width = this.window.style.width;
			this.p_s_height = this.window.style.height;
			this.p_width = this.window.width;
			this.p_height = this.window.height;
			this.p_body_margin = window.document.body.style.margin;
			this.p_body_overflow = window.document.body.style.overflow;
			this.window.style.margin = "0";
			this.window.style.padding = "0";
			this.window.style.width = window.innerWidth + "px";
			this.window.style.height = window.innerHeight + "px";
			if(window.devicePixelRatio == null) this.window_dpr = 1.0; else this.window_dpr = window.devicePixelRatio;
			this.window.width = Math.floor(window.innerWidth * this.window_dpr);
			this.window.height = Math.floor(window.innerHeight * this.window_dpr);
			window.document.body.style.margin = "0";
			window.document.body.style.overflow = "hidden";
			if(true_fullscreen) {
				if(($_=this.window,$bind($_,$_.requestFullscreen)) != null) this.window.requestFullscreen(); else if(this.window.requestFullScreen != null) this.window.requestFullScreen(null); else if(this.window.webkitRequestFullscreen != null) this.window.webkitRequestFullscreen(); else if(this.window.mozRequestFullScreen != null) this.window.mozRequestFullScreen(); else _result = false;
			}
			window.addEventListener("resize",$bind(this,this.onresize_handler));
		} else {
			window.removeEventListener("resize",$bind(this,this.onresize_handler));
			this.window.style.padding = this.p_padding;
			this.window.style.margin = this.p_margin;
			this.window.style.width = this.p_s_width;
			this.window.style.height = this.p_s_height;
			this.window.width = this.p_width;
			this.window.height = this.p_height;
			window.document.body.style.margin = this.p_body_margin;
			window.document.body.style.overflow = this.p_body_overflow;
			if(true_fullscreen) {
				if(($_=window.document,$bind($_,$_.exitFullscreen)) != null) window.document.exitFullscreen(); else if(window.document.webkitExitFullscreen != null) window.document.webkitExitFullscreen(); else if(window.document.mozCancelFullScreen != null) window.document.mozCancelFullScreen(); else _result = false;
			}
		}
		return _result;
	}
	,shutdown: function(_immediate) {
		if(_immediate == null) _immediate = false;
		haxe_Log.trace("  i / runtime / " + "runtime / web / shutdown",{ fileName : "Runtime.hx", lineNumber : 226, className : "snow.core.web.Runtime", methodName : "shutdown"});
		window.document.removeEventListener("visibilitychange",$bind(this,this.on_visibilitychange));
		window.document.removeEventListener("keydown",$bind(this,this.on_keydown));
		window.document.removeEventListener("keyup",$bind(this,this.on_keyup));
		window.document.removeEventListener("keypress",$bind(this,this.on_keypress));
		window.removeEventListener("gamepadconnected",$bind(this,this.on_gamepadconnected));
		window.removeEventListener("gamepaddisconnected",$bind(this,this.on_gamepaddisconnected));
		this.window.remove();
		this.window = null;
		snow_modules_opengl_web_GL.gl = null;
	}
	,run: function() {
		haxe_Log.trace("  i / runtime / " + "web / run",{ fileName : "Runtime.hx", lineNumber : 244, className : "snow.core.web.Runtime", methodName : "run"});
		this.loop_pre_ready();
		return false;
	}
	,ready: function() {
		haxe_Log.trace("  i / runtime / " + "web / ready",{ fileName : "Runtime.hx", lineNumber : 254, className : "snow.core.web.Runtime", methodName : "ready"});
		this.create_window();
	}
	,dispatch_window_ev: function(_type,_x,_y) {
		this.app.dispatch_window_event(_type,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,_x,_y);
	}
	,setup_events: function() {
		var _g = this;
		this.window.addEventListener("mouseleave",function(_ev) {
			_g.app.dispatch_window_event(11,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,null,null);
		});
		this.window.addEventListener("mouseenter",function(_ev1) {
			_g.app.dispatch_window_event(10,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,null,null);
		});
		window.document.addEventListener("visibilitychange",$bind(this,this.on_visibilitychange));
		window.document.addEventListener("keydown",$bind(this,this.on_keydown));
		window.document.addEventListener("keyup",$bind(this,this.on_keyup));
		window.document.addEventListener("keypress",$bind(this,this.on_keypress));
		this.window.addEventListener("contextmenu",function(_ev2) {
			if(_g.app.config.runtime.prevent_default_context_menu) _ev2.preventDefault();
		});
		this.window.addEventListener("mousedown",function(_ev3) {
			_g.app.input.dispatch_mouse_down_event(Math.floor(_g.window_dpr * (_ev3.pageX - _g.window_x)),Math.floor(_g.window_dpr * (_ev3.pageY - _g.window_y)),_ev3.button + 1,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1);
		});
		this.window.addEventListener("mouseup",function(_ev4) {
			_g.app.input.dispatch_mouse_up_event(Math.floor(_g.window_dpr * (_ev4.pageX - _g.window_x)),Math.floor(_g.window_dpr * (_ev4.pageY - _g.window_y)),_ev4.button + 1,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1);
		});
		this.window.addEventListener("mousemove",function(_ev5) {
			var _movement_x;
			if(_ev5.movementX == null) _movement_x = 0; else _movement_x = _ev5.movementX;
			var _movement_y;
			if(_ev5.movementY == null) _movement_y = 0; else _movement_y = _ev5.movementY;
			_movement_x = Math.floor(_movement_x * _g.window_dpr);
			_movement_y = Math.floor(_movement_y * _g.window_dpr);
			_g.app.input.dispatch_mouse_move_event(Math.floor(_g.window_dpr * (_ev5.pageX - _g.window_x)),Math.floor(_g.window_dpr * (_ev5.pageY - _g.window_y)),_movement_x,_movement_y,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1);
		});
		this.window.addEventListener("wheel",function(_ev6) {
			if(_g.app.config.runtime.prevent_default_mouse_wheel) _ev6.preventDefault();
			_g.app.input.dispatch_mouse_wheel_event(_ev6.deltaX,_ev6.deltaY,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1);
		});
		this.window.addEventListener("touchstart",function(_ev7) {
			if(_g.app.config.runtime.prevent_default_touches) _ev7.preventDefault();
			var _bound = _g.window.getBoundingClientRect();
			var _g1 = 0;
			var _g2 = _ev7.changedTouches;
			while(_g1 < _g2.length) {
				var touch = _g2[_g1];
				++_g1;
				var _x = touch.clientX - _bound.left;
				var _y = touch.clientY - _bound.top;
				_x = _x / _bound.width;
				_y = _y / _bound.height;
				_g.app.input.dispatch_touch_down_event(_x,_y,0,0,touch.identifier,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start);
			}
		});
		this.window.addEventListener("touchend",function(_ev8) {
			if(_g.app.config.runtime.prevent_default_touches) _ev8.preventDefault();
			var _bound1 = _g.window.getBoundingClientRect();
			var _g11 = 0;
			var _g21 = _ev8.changedTouches;
			while(_g11 < _g21.length) {
				var touch1 = _g21[_g11];
				++_g11;
				var _x1 = touch1.clientX - _bound1.left;
				var _y1 = touch1.clientY - _bound1.top;
				_x1 = _x1 / _bound1.width;
				_y1 = _y1 / _bound1.height;
				_g.app.input.dispatch_touch_up_event(_x1,_y1,0,0,touch1.identifier,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start);
			}
		});
		this.window.addEventListener("touchmove",function(_ev9) {
			if(_g.app.config.runtime.prevent_default_touches) _ev9.preventDefault();
			var _bound2 = _g.window.getBoundingClientRect();
			var _g12 = 0;
			var _g22 = _ev9.changedTouches;
			while(_g12 < _g22.length) {
				var touch2 = _g22[_g12];
				++_g12;
				var _x2 = touch2.clientX - _bound2.left;
				var _y2 = touch2.clientY - _bound2.top;
				_x2 = _x2 / _bound2.width;
				_y2 = _y2 / _bound2.height;
				_g.app.input.dispatch_touch_move_event(_x2,_y2,0,0,touch2.identifier,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start);
			}
		});
		window.addEventListener("gamepadconnected",$bind(this,this.on_gamepadconnected));
		window.addEventListener("gamepaddisconnected",$bind(this,this.on_gamepaddisconnected));
	}
	,on_visibilitychange: function(_) {
		if(window.document.hidden) {
			this.app.dispatch_window_event(2,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,null,null);
			this.app.dispatch_window_event(7,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,null,null);
			this.app.dispatch_window_event(13,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,null,null);
		} else {
			this.app.dispatch_window_event(1,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,null,null);
			this.app.dispatch_window_event(9,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,null,null);
			this.app.dispatch_window_event(12,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,null,null);
		}
	}
	,on_keydown: function(_ev) {
		var _keycode = this.convert_keycode(_ev.keyCode);
		var _scancode = snow_systems_input_Keycodes.to_scan(_keycode);
		var _mod_state = this.mod_state_from_event(_ev);
		if(HxOverrides.indexOf(this.app.config.runtime.prevent_default_keys,_keycode,0) != -1) _ev.preventDefault();
		this.app.input.dispatch_key_down_event(_keycode,_scancode,_ev.repeat,_mod_state,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1);
	}
	,on_keyup: function(_ev) {
		var _keycode = this.convert_keycode(_ev.keyCode);
		var _scancode = snow_systems_input_Keycodes.to_scan(_keycode);
		var _mod_state = this.mod_state_from_event(_ev);
		if(HxOverrides.indexOf(this.app.config.runtime.prevent_default_keys,_keycode,0) != -1) _ev.preventDefault();
		this.app.input.dispatch_key_up_event(_keycode,_scancode,_ev.repeat,_mod_state,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1);
	}
	,on_keypress: function(_ev) {
		if(_ev.which != 0 && HxOverrides.indexOf(snow_core_web_Runtime.key_press_ignored,_ev.keyCode,0) == -1) {
			var _text = String.fromCharCode(_ev.charCode);
			this.app.input.dispatch_text_event(_text,0,_text.length,2,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1);
		}
	}
	,on_gamepadconnected: function(_ev) {
		this.gamepads_init_cache(_ev.gamepad);
		this.app.input.dispatch_gamepad_device_event(_ev.gamepad.index,_ev.gamepad.id,1,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start);
	}
	,on_gamepaddisconnected: function(_ev) {
		this.gamepad_btns_cache[_ev.gamepad.index] = null;
		this.app.input.dispatch_gamepad_device_event(_ev.gamepad.index,_ev.gamepad.id,2,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start);
	}
	,create_window: function() {
		var config = this.app.config.window;
		var _this = window.document;
		this.window = _this.createElement("canvas");
		if(window.devicePixelRatio == null) this.window_dpr = 1.0; else this.window_dpr = window.devicePixelRatio;
		this.window.width = Math.floor(config.width * this.window_dpr);
		this.window.height = Math.floor(config.height * this.window_dpr);
		this.window_w = config.width;
		this.window_h = config.height;
		this.window.style.width = config.width + "px";
		this.window.style.height = config.height + "px";
		this.window.style.background = "#000";
		this.window.id = this.app.config.runtime.window_id;
		this.app.config.runtime.window_parent.appendChild(this.window);
		if(config.title != null) window.document.title = config.title;
		if(!this.create_render_context(this.window)) {
			this.create_render_context_failed();
			return;
		}
		this.setup_events();
		if(config.fullscreen) {
			this.window_fullscreen(true,config.true_fullscreen);
			this.update_window_bounds();
		}
	}
	,create_render_context: function(_window) {
		var config = this.app.config.render;
		var attr = config.webgl;
		attr = this.apply_GL_attr(config,attr);
		var _gl = null;
		if(config.webgl.version != 1) {
			_gl = this.window.getContext("webgl" + config.webgl.version);
			if(_gl == null) _gl = this.window.getContext("experimental-webgl" + config.webgl.version);
		} else _gl = js_html__$CanvasElement_CanvasUtil.getContextWebGL(this.window,attr);
		snow_modules_opengl_web_GL.gl = _gl;
		haxe_Log.trace("  i / runtime / " + ("web / GL / context(" + Std.string(_gl != null) + ")"),{ fileName : "Runtime.hx", lineNumber : 631, className : "snow.core.web.Runtime", methodName : "create_render_context"});
		return _gl != null;
	}
	,apply_GL_attr: function(render,attr) {
		if(attr.alpha == null) attr.alpha = false;
		attr.alpha = attr.alpha;
		if(attr.premultipliedAlpha == null) attr.premultipliedAlpha = false;
		attr.premultipliedAlpha = attr.premultipliedAlpha;
		if(attr.antialias == null) attr.antialias = this.app.config.render.antialiasing > 0;
		attr.antialias = attr.antialias;
		if(attr.depth == null) attr.depth = this.app.config.render.depth > 0;
		attr.depth = attr.depth;
		if(attr.stencil == null) attr.stencil = this.app.config.render.stencil > 0;
		attr.stencil = attr.stencil;
		return attr;
	}
	,create_render_context_failed: function() {
		var msg = "WebGL is required to run this!<br/><br/>";
		msg += "visit <a style=\"color:#06b4fb; text-decoration:none;\" href=\"http://get.webgl.org/\">get.webgl.com</a> for info<br/>";
		msg += "and contact the developer of this app";
		var text_el;
		var overlay_el;
		var _this = window.document;
		text_el = _this.createElement("div");
		var _this1 = window.document;
		overlay_el = _this1.createElement("div");
		text_el.style.marginLeft = "auto";
		text_el.style.marginRight = "auto";
		text_el.style.color = "#d3d3d3";
		text_el.style.marginTop = "5em";
		text_el.style.fontSize = "1.4em";
		text_el.style.fontFamily = "helvetica,sans-serif";
		text_el.innerHTML = msg;
		overlay_el.style.top = "0";
		overlay_el.style.left = "0";
		overlay_el.style.width = "100%";
		overlay_el.style.height = "100%";
		overlay_el.style.display = "block";
		overlay_el.style.minWidth = "100%";
		overlay_el.style.minHeight = "100%";
		overlay_el.style.textAlign = "center";
		overlay_el.style.position = "absolute";
		overlay_el.style.background = "rgba(1,1,1,0.90)";
		overlay_el.appendChild(text_el);
		window.document.body.appendChild(overlay_el);
		throw new js__$Boot_HaxeError(snow_types_Error.error("runtime / web / failed to create render context, unable to recover"));
	}
	,request_frame: function() {
		window.requestAnimationFrame($bind(this,this.loop));
	}
	,loop: function(_t) {
		if(_t == null) _t = 0.016;
		if(this.app.has_shutdown) return false;
		if(this.gamepads_supported) this.gamepads_poll();
		this.update_window_bounds();
		this.app.dispatch_event(3);
		if(!this.app.shutting_down) window.requestAnimationFrame($bind(this,this.loop));
		return true;
	}
	,loop_pre_ready: function(_t) {
		if(_t == null) _t = 0.016;
		this.app.dispatch_event(3);
		if(!this.app.shutting_down) {
			if(!this.app.ready) window.requestAnimationFrame($bind(this,this.loop_pre_ready)); else window.requestAnimationFrame($bind(this,this.loop));
		}
		return true;
	}
	,mod_state_from_event: function(_key_event) {
		var _none = !_key_event.altKey && !_key_event.ctrlKey && !_key_event.metaKey && !_key_event.shiftKey;
		this.app.input.mod_state.none = _none;
		this.app.input.mod_state.lshift = _key_event.shiftKey;
		this.app.input.mod_state.rshift = _key_event.shiftKey;
		this.app.input.mod_state.lctrl = _key_event.ctrlKey;
		this.app.input.mod_state.rctrl = _key_event.ctrlKey;
		this.app.input.mod_state.lalt = _key_event.altKey;
		this.app.input.mod_state.ralt = _key_event.altKey;
		this.app.input.mod_state.lmeta = _key_event.metaKey;
		this.app.input.mod_state.rmeta = _key_event.metaKey;
		this.app.input.mod_state.num = false;
		this.app.input.mod_state.caps = false;
		this.app.input.mod_state.mode = false;
		this.app.input.mod_state.ctrl = _key_event.ctrlKey;
		this.app.input.mod_state.shift = _key_event.shiftKey;
		this.app.input.mod_state.alt = _key_event.altKey;
		this.app.input.mod_state.meta = _key_event.metaKey;
		return this.app.input.mod_state;
	}
	,convert_keycode: function(dom_keycode) {
		if(dom_keycode >= 65 && dom_keycode <= 90) return dom_keycode + 32;
		return snow_core_web__$Runtime_DOMKeys.dom_key_to_keycode(dom_keycode);
	}
	,get_window_x: function(_bounds) {
		return Math.round(_bounds.left + window.pageXOffset - window.document.body.clientTop);
	}
	,get_window_y: function(_bounds) {
		return Math.round(_bounds.top + window.pageYOffset - window.document.body.clientLeft);
	}
	,update_window_bounds: function() {
		if(window.devicePixelRatio == null) this.window_dpr = 1.0; else this.window_dpr = window.devicePixelRatio;
		var _bounds = this.window.getBoundingClientRect();
		var _x = Math.round(_bounds.left + window.pageXOffset - window.document.body.clientTop);
		var _y = Math.round(_bounds.top + window.pageYOffset - window.document.body.clientLeft);
		var _w = Math.round(_bounds.width);
		var _h = Math.round(_bounds.height);
		if(_x != this.window_x || _y != this.window_y) {
			this.window_x = _x;
			this.window_y = _y;
			this.app.dispatch_window_event(4,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,this.window_x,this.window_y);
		}
		if(_w != this.window_w || _h != this.window_h) {
			this.window_w = _w;
			this.window_h = _h;
			this.window.width = Math.floor(this.window_w * this.window_dpr);
			this.window.height = Math.floor(this.window_h * this.window_dpr);
			this.app.dispatch_window_event(6,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start,1,this.window.width,this.window.height);
		}
	}
	,gamepads_init_cache: function(_gamepad) {
		this.gamepad_btns_cache[_gamepad.index] = [];
		var _g1 = 0;
		var _g = _gamepad.buttons.length;
		while(_g1 < _g) {
			var i = _g1++;
			this.gamepad_btns_cache[_gamepad.index].push(0);
		}
	}
	,gamepads_init: function() {
		var _list;
		if(($_=window.navigator,$bind($_,$_.getGamepads)) != null) _list = window.navigator.getGamepads(); else if(window.navigator.webkitGetGamepads != null) _list = window.navigator.webkitGetGamepads(); else _list = null;
		if(_list != null) {
			this.gamepads_supported = true;
			this.gamepad_btns_cache = [];
			var _g = 0;
			while(_g < _list.length) {
				var _gamepad = _list[_g];
				++_g;
				if(_gamepad != null) this.gamepads_init_cache(_gamepad);
			}
		} else haxe_Log.trace("  i / runtime / " + "Gamepads are not supported in this browser :(",{ fileName : "Runtime.hx", lineNumber : 840, className : "snow.core.web.Runtime", methodName : "gamepads_init"});
	}
	,gamepads_poll: function() {
		var list;
		if(($_=window.navigator,$bind($_,$_.getGamepads)) != null) list = window.navigator.getGamepads(); else if(window.navigator.webkitGetGamepads != null) list = window.navigator.webkitGetGamepads(); else list = null;
		if(list == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("list was null" + (" ( " + "gamepad list not found, but they were previously?" + " )")));
		var _count = list.length;
		var _idx = 0;
		while(_idx < _count) {
			var _gamepad = list[_idx];
			if(_gamepad == null) {
				_idx++;
				continue;
			}
			var _g1 = 0;
			var _g = _gamepad.axes.length;
			while(_g1 < _g) {
				var _axis_idx = _g1++;
				var _axis = _gamepad.axes[_axis_idx];
				if(_axis != 0) this.app.input.dispatch_gamepad_axis_event(_gamepad.index,_axis_idx,_axis,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start);
			}
			var _prev_btn = this.gamepad_btns_cache[_gamepad.index];
			var _g11 = 0;
			var _g2 = _gamepad.buttons.length;
			while(_g11 < _g2) {
				var _btn_idx = _g11++;
				var _btn = _gamepad.buttons[_btn_idx];
				if(_btn.value != _prev_btn[_btn_idx]) {
					if(_btn.pressed) this.app.input.dispatch_gamepad_button_down_event(_gamepad.index,_btn_idx,_btn.value,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start); else this.app.input.dispatch_gamepad_button_up_event(_gamepad.index,_btn_idx,_btn.value,window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start);
					_prev_btn[_btn_idx] = _btn.value;
				}
			}
			_idx++;
		}
	}
	,gamepads_get_list: function() {
		if(($_=window.navigator,$bind($_,$_.getGamepads)) != null) return window.navigator.getGamepads();
		if(window.navigator.webkitGetGamepads != null) return window.navigator.webkitGetGamepads();
		return null;
	}
	,guess_os: function() {
		var _ver = window.navigator.appVersion;
		var _agent = window.navigator.userAgent;
		if((function($this) {
			var $r;
			var r = new EReg("mac","gi");
			$r = r.match(_ver);
			return $r;
		}(this))) return "mac";
		if((function($this) {
			var $r;
			var r1 = new EReg("win","gi");
			$r = r1.match(_ver);
			return $r;
		}(this))) return "windows";
		if((function($this) {
			var $r;
			var r2 = new EReg("x11","gi");
			$r = r2.match(_ver);
			return $r;
		}(this))) return "linux";
		if((function($this) {
			var $r;
			var r3 = new EReg("linux","gi");
			$r = r3.match(_ver);
			return $r;
		}(this))) return "linux";
		if((function($this) {
			var $r;
			var r4 = new EReg("android","gi");
			$r = r4.match(_ver);
			return $r;
		}(this))) return "android";
		if((function($this) {
			var $r;
			var r5 = new EReg("ipad","gi");
			$r = r5.match(_agent);
			return $r;
		}(this))) return "ios";
		if((function($this) {
			var $r;
			var r6 = new EReg("iphone","gi");
			$r = r6.match(_agent);
			return $r;
		}(this))) return "ios";
		if((function($this) {
			var $r;
			var r7 = new EReg("ipod","gi");
			$r = r7.match(_agent);
			return $r;
		}(this))) return "ios";
		return "unknown";
	}
	,__class__: snow_core_web_Runtime
};
var snow_core_web__$Runtime_DOMKeys = function() { };
$hxClasses["snow.core.web._Runtime.DOMKeys"] = snow_core_web__$Runtime_DOMKeys;
snow_core_web__$Runtime_DOMKeys.__name__ = ["snow","core","web","_Runtime","DOMKeys"];
snow_core_web__$Runtime_DOMKeys.dom_key_to_keycode = function(_keycode) {
	switch(_keycode) {
	case 16:
		return snow_systems_input_Keycodes.lshift;
	case 17:
		return snow_systems_input_Keycodes.lctrl;
	case 18:
		return snow_systems_input_Keycodes.lalt;
	case 20:
		return snow_systems_input_Keycodes.capslock;
	case 33:
		return snow_systems_input_Keycodes.pageup;
	case 34:
		return snow_systems_input_Keycodes.pagedown;
	case 35:
		return snow_systems_input_Keycodes.end;
	case 36:
		return snow_systems_input_Keycodes.home;
	case 37:
		return snow_systems_input_Keycodes.left;
	case 38:
		return snow_systems_input_Keycodes.up;
	case 39:
		return snow_systems_input_Keycodes.right;
	case 40:
		return snow_systems_input_Keycodes.down;
	case 44:
		return snow_systems_input_Keycodes.printscreen;
	case 45:
		return snow_systems_input_Keycodes.insert;
	case 46:
		return 127;
	case 91:
		return snow_systems_input_Keycodes.lmeta;
	case 93:
		return snow_systems_input_Keycodes.rmeta;
	case 224:
		return snow_systems_input_Keycodes.lmeta;
	case 96:
		return snow_systems_input_Keycodes.kp_0;
	case 97:
		return snow_systems_input_Keycodes.kp_1;
	case 98:
		return snow_systems_input_Keycodes.kp_2;
	case 99:
		return snow_systems_input_Keycodes.kp_3;
	case 100:
		return snow_systems_input_Keycodes.kp_4;
	case 101:
		return snow_systems_input_Keycodes.kp_5;
	case 102:
		return snow_systems_input_Keycodes.kp_6;
	case 103:
		return snow_systems_input_Keycodes.kp_7;
	case 104:
		return snow_systems_input_Keycodes.kp_8;
	case 105:
		return snow_systems_input_Keycodes.kp_9;
	case 106:
		return snow_systems_input_Keycodes.kp_multiply;
	case 107:
		return snow_systems_input_Keycodes.kp_plus;
	case 109:
		return snow_systems_input_Keycodes.kp_minus;
	case 110:
		return snow_systems_input_Keycodes.kp_decimal;
	case 111:
		return snow_systems_input_Keycodes.kp_divide;
	case 144:
		return snow_systems_input_Keycodes.numlockclear;
	case 112:
		return snow_systems_input_Keycodes.f1;
	case 113:
		return snow_systems_input_Keycodes.f2;
	case 114:
		return snow_systems_input_Keycodes.f3;
	case 115:
		return snow_systems_input_Keycodes.f4;
	case 116:
		return snow_systems_input_Keycodes.f5;
	case 117:
		return snow_systems_input_Keycodes.f6;
	case 118:
		return snow_systems_input_Keycodes.f7;
	case 119:
		return snow_systems_input_Keycodes.f8;
	case 120:
		return snow_systems_input_Keycodes.f9;
	case 121:
		return snow_systems_input_Keycodes.f10;
	case 122:
		return snow_systems_input_Keycodes.f11;
	case 123:
		return snow_systems_input_Keycodes.f12;
	case 124:
		return snow_systems_input_Keycodes.f13;
	case 125:
		return snow_systems_input_Keycodes.f14;
	case 126:
		return snow_systems_input_Keycodes.f15;
	case 127:
		return snow_systems_input_Keycodes.f16;
	case 128:
		return snow_systems_input_Keycodes.f17;
	case 129:
		return snow_systems_input_Keycodes.f18;
	case 130:
		return snow_systems_input_Keycodes.f19;
	case 131:
		return snow_systems_input_Keycodes.f20;
	case 132:
		return snow_systems_input_Keycodes.f21;
	case 133:
		return snow_systems_input_Keycodes.f22;
	case 134:
		return snow_systems_input_Keycodes.f23;
	case 135:
		return snow_systems_input_Keycodes.f24;
	case 160:
		return 94;
	case 161:
		return 33;
	case 162:
		return 34;
	case 163:
		return 35;
	case 164:
		return 36;
	case 165:
		return 37;
	case 166:
		return 38;
	case 167:
		return 95;
	case 168:
		return 40;
	case 169:
		return 41;
	case 170:
		return 42;
	case 171:
		return 43;
	case 172:
		return 92;
	case 173:
		return 45;
	case 174:
		return 91;
	case 175:
		return 93;
	case 176:
		return 96;
	case 181:
		return snow_systems_input_Keycodes.audiomute;
	case 182:
		return snow_systems_input_Keycodes.volumedown;
	case 183:
		return snow_systems_input_Keycodes.volumeup;
	case 188:
		return 44;
	case 190:
		return 46;
	case 191:
		return 47;
	case 192:
		return 96;
	case 219:
		return 91;
	case 221:
		return 93;
	case 220:
		return 92;
	case 222:
		return 39;
	}
	return _keycode;
};
var snow_modules_interfaces_Assets = function() { };
$hxClasses["snow.modules.interfaces.Assets"] = snow_modules_interfaces_Assets;
snow_modules_interfaces_Assets.__name__ = ["snow","modules","interfaces","Assets"];
snow_modules_interfaces_Assets.prototype = {
	__class__: snow_modules_interfaces_Assets
};
var snow_core_web_assets_Assets = function(_app) {
	this.app = _app;
};
$hxClasses["snow.core.web.assets.Assets"] = snow_core_web_assets_Assets;
snow_core_web_assets_Assets.__name__ = ["snow","core","web","assets","Assets"];
snow_core_web_assets_Assets.__interfaces__ = [snow_modules_interfaces_Assets];
snow_core_web_assets_Assets.prototype = {
	onevent: function(event) {
	}
	,shutdown: function() {
	}
	,image_info_from_load: function(_id,_components) {
		if(_components == null) _components = 4;
		return this.app.io.data_flow(_id,snow_systems_assets_AssetImage.processor);
	}
	,image_info_from_element: function(_id,_elem) {
		var width_pot = this.nearest_power_of_two(_elem.width);
		var height_pot = this.nearest_power_of_two(_elem.height);
		var image_bytes = this.POT_bytes_from_element(_elem.width,_elem.height,width_pot,height_pot,_elem);
		var info = new snow_types_ImageData(this.app,{ id : _id, bpp : 4, width : _elem.width, height : _elem.height, width_actual : width_pot, height_actual : height_pot, bpp_source : 4, pixels : image_bytes});
		image_bytes = null;
		return info;
	}
	,image_info_from_pixels: function(_id,_width,_height,_pixels,_bpp) {
		if(_bpp == null) _bpp = 4;
		var info = new snow_types_ImageData(this.app,{ id : _id, bpp : 4, width : _width, height : _height, width_actual : _width, height_actual : _height, bpp_source : 4, pixels : _pixels});
		return info;
	}
	,image_info_from_bytes: function(_id,_bytes,_components) {
		if(_components == null) _components = 4;
		var _g = this;
		if(_id == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_id was null" + ""));
		if(_bytes == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_bytes was null" + ""));
		if(!(_bytes.length != 0)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("_bytes.length != 0" + ""));
		var ext = haxe_io_Path.extension(_id);
		return new snow_api_Promise(function(resolve,reject) {
			var str = "";
			var i = 0;
			var len = _bytes.length;
			while(i < len) str += String.fromCharCode((function($this) {
				var $r;
				var idx = i++;
				$r = _bytes[idx];
				return $r;
			}(this)) & 255);
			var b64 = window.btoa(str);
			var src = "data:image/" + ext + ";base64," + b64;
			var _img = new Image();
			_img.onload = function(_) {
				var info = _g.image_info_from_element(_id,_img);
				resolve(info);
			};
			_img.onerror = function(e) {
				reject(snow_types_Error.error("failed to load image from bytes, on error: " + e));
			};
			_img.src = src;
		});
	}
	,POT_bytes_from_pixels: function(_width,_height,_width_pot,_height_pot,_source) {
		var tmp_canvas;
		var _this = window.document;
		tmp_canvas = _this.createElement("canvas");
		tmp_canvas.width = _width_pot;
		tmp_canvas.height = _height_pot;
		var tmp_context = tmp_canvas.getContext("2d",null);
		tmp_context.clearRect(0,0,tmp_canvas.width,tmp_canvas.height);
		var image_bytes = null;
		var _pixels = new Uint8ClampedArray(_source.buffer);
		var _imgdata = tmp_context.createImageData(_width,_height);
		_imgdata.data.set(_pixels);
		try {
			tmp_context.putImageData(_imgdata,0,0);
			image_bytes = tmp_context.getImageData(0,0,tmp_canvas.width,tmp_canvas.height);
		} catch( e ) {
			if (e instanceof js__$Boot_HaxeError) e = e.val;
			var tips = "- textures served from file:/// throw security errors\n";
			tips += "- textures served over http:// work for cross origin byte requests";
			haxe_Log.trace("   i / assets / " + tips,{ fileName : "Assets.hx", lineNumber : 183, className : "snow.core.web.assets.Assets", methodName : "POT_bytes_from_pixels"});
			throw new js__$Boot_HaxeError(e);
		}
		tmp_canvas = null;
		tmp_context = null;
		_imgdata = null;
		return new Uint8Array(image_bytes.data);
	}
	,POT_bytes_from_element: function(_width,_height,_width_pot,_height_pot,_source) {
		var tmp_canvas;
		var _this = window.document;
		tmp_canvas = _this.createElement("canvas");
		tmp_canvas.width = _width_pot;
		tmp_canvas.height = _height_pot;
		var tmp_context = tmp_canvas.getContext("2d",null);
		tmp_context.clearRect(0,0,tmp_canvas.width,tmp_canvas.height);
		tmp_context.drawImage(_source,0,0,_width,_height);
		var image_bytes = null;
		try {
			image_bytes = tmp_context.getImageData(0,0,tmp_canvas.width,tmp_canvas.height);
		} catch( e ) {
			if (e instanceof js__$Boot_HaxeError) e = e.val;
			var tips = "- textures served from file:/// throw security errors\n";
			tips += "- textures served over http:// work for cross origin byte requests";
			haxe_Log.trace("   i / assets / " + tips,{ fileName : "Assets.hx", lineNumber : 221, className : "snow.core.web.assets.Assets", methodName : "POT_bytes_from_element"});
			throw new js__$Boot_HaxeError(e);
		}
		tmp_canvas = null;
		tmp_context = null;
		return new Uint8Array(image_bytes.data);
	}
	,nearest_power_of_two: function(_value) {
		if(!snow_core_web_assets_Assets.POT) return _value;
		_value--;
		_value |= _value >> 1;
		_value |= _value >> 2;
		_value |= _value >> 4;
		_value |= _value >> 8;
		_value |= _value >> 16;
		_value++;
		return _value;
	}
	,__class__: snow_core_web_assets_Assets
};
var snow_modules_interfaces_IO = function() { };
$hxClasses["snow.modules.interfaces.IO"] = snow_modules_interfaces_IO;
snow_modules_interfaces_IO.__name__ = ["snow","modules","interfaces","IO"];
snow_modules_interfaces_IO.prototype = {
	__class__: snow_modules_interfaces_IO
};
var snow_core_web_io_IO = function(_app) {
	this.app = _app;
};
$hxClasses["snow.core.web.io.IO"] = snow_core_web_io_IO;
snow_core_web_io_IO.__name__ = ["snow","core","web","io","IO"];
snow_core_web_io_IO.__interfaces__ = [snow_modules_interfaces_IO];
snow_core_web_io_IO.prototype = {
	shutdown: function() {
	}
	,onevent: function(_event) {
	}
	,app_path: function() {
		return "./";
	}
	,app_path_prefs: function() {
		return "./";
	}
	,url_open: function(_url) {
		if(_url != null && _url.length > 0) window.open(_url,"_blank");
	}
	,data_load: function(_path,_options) {
		return new snow_api_Promise(function(resolve,reject) {
			var _async = true;
			var _binary = true;
			if(_options != null) {
				if(_options.binary != null) _binary = _options.binary;
			}
			var request = new XMLHttpRequest();
			request.open("GET",_path,_async);
			if(_binary) request.overrideMimeType("text/plain; charset=x-user-defined"); else request.overrideMimeType("text/plain; charset=UTF-8");
			if(_async) request.responseType = "arraybuffer";
			request.onload = function(data) {
				if(request.status == 200) resolve((function($this) {
					var $r;
					var _elements = request.response;
					$r = new Uint8Array(_elements);
					return $r;
				}(this))); else reject(snow_types_Error.error("request status was " + request.status + " / " + request.statusText));
			};
			request.send();
		});
	}
	,data_save: function(_path,_data,_options) {
		return false;
	}
	,string_save_path: function(_slot) {
		if(_slot == null) _slot = 0;
		var _pref_path = "<localstorage>";
		var _slot_path = this.string_slot_id(_slot);
		var _path = haxe_io_Path.join([_pref_path,_slot_path]);
		return haxe_io_Path.normalize(_path);
	}
	,string_slot_id: function(_slot) {
		if(_slot == null) _slot = 0;
		var _parts = snow_types_Config.app_ident.split(".");
		var _appname = _parts.pop();
		var _org = _parts.join(".");
		return "" + _org + "/" + _appname + "/" + this.app.io.string_save_prefix + "." + _slot;
	}
	,string_slot_destroy: function(_slot) {
		if(_slot == null) _slot = 0;
		var storage = window.localStorage;
		if(storage == null) {
			haxe_Log.trace("       i / io / " + "localStorage isnt supported in this browser?!",{ fileName : "IO.hx", lineNumber : 119, className : "snow.core.web.io.IO", methodName : "string_slot_destroy"});
			return false;
		}
		var _id = this.string_slot_id(_slot);
		storage.removeItem(_id);
		return false;
	}
	,string_slot_save: function(_slot,_contents) {
		if(_slot == null) _slot = 0;
		var storage = window.localStorage;
		if(storage == null) {
			haxe_Log.trace("       i / io / " + "localStorage isnt supported in this browser?!",{ fileName : "IO.hx", lineNumber : 136, className : "snow.core.web.io.IO", methodName : "string_slot_save"});
			return false;
		}
		var _id = this.string_slot_id(_slot);
		storage.setItem(_id,_contents);
		return true;
	}
	,string_slot_load: function(_slot) {
		if(_slot == null) _slot = 0;
		var storage = window.localStorage;
		if(storage == null) {
			haxe_Log.trace("       i / io / " + "localStorage isnt supported in this browser?!",{ fileName : "IO.hx", lineNumber : 154, className : "snow.core.web.io.IO", methodName : "string_slot_load"});
			return null;
		}
		var _id = this.string_slot_id(_slot);
		return storage.getItem(_id);
	}
	,string_slot_encode: function(_string) {
		return window.btoa(_string);
	}
	,string_slot_decode: function(_string) {
		return window.atob(_string);
	}
	,__class__: snow_core_web_io_IO
};
var snow_modules_opengl_web_GL = function() { };
$hxClasses["snow.modules.opengl.web.GL"] = snow_modules_opengl_web_GL;
snow_modules_opengl_web_GL.__name__ = ["snow","modules","opengl","web","GL"];
snow_modules_opengl_web_GL.versionString = function() {
	var ver = snow_modules_opengl_web_GL.gl.getParameter(7938);
	var slver = snow_modules_opengl_web_GL.gl.getParameter(35724);
	var ren = snow_modules_opengl_web_GL.gl.getParameter(7937);
	var ven = snow_modules_opengl_web_GL.gl.getParameter(7936);
	return "/ " + ver + " / " + slver + " / " + ren + " / " + ven + " /";
};
snow_modules_opengl_web_GL.activeTexture = function(texture) {
	snow_modules_opengl_web_GL.gl.activeTexture(texture);
};
snow_modules_opengl_web_GL.attachShader = function(program,shader) {
	snow_modules_opengl_web_GL.gl.attachShader(program,shader);
};
snow_modules_opengl_web_GL.bindAttribLocation = function(program,index,name) {
	snow_modules_opengl_web_GL.gl.bindAttribLocation(program,index,name);
};
snow_modules_opengl_web_GL.bindBuffer = function(target,buffer) {
	snow_modules_opengl_web_GL.gl.bindBuffer(target,buffer);
};
snow_modules_opengl_web_GL.bindFramebuffer = function(target,framebuffer) {
	snow_modules_opengl_web_GL.gl.bindFramebuffer(target,framebuffer);
};
snow_modules_opengl_web_GL.bindRenderbuffer = function(target,renderbuffer) {
	snow_modules_opengl_web_GL.gl.bindRenderbuffer(target,renderbuffer);
};
snow_modules_opengl_web_GL.bindTexture = function(target,texture) {
	snow_modules_opengl_web_GL.gl.bindTexture(target,texture);
};
snow_modules_opengl_web_GL.blendColor = function(red,green,blue,alpha) {
	snow_modules_opengl_web_GL.gl.blendColor(red,green,blue,alpha);
};
snow_modules_opengl_web_GL.blendEquation = function(mode) {
	snow_modules_opengl_web_GL.gl.blendEquation(mode);
};
snow_modules_opengl_web_GL.blendEquationSeparate = function(modeRGB,modeAlpha) {
	snow_modules_opengl_web_GL.gl.blendEquationSeparate(modeRGB,modeAlpha);
};
snow_modules_opengl_web_GL.blendFunc = function(sfactor,dfactor) {
	snow_modules_opengl_web_GL.gl.blendFunc(sfactor,dfactor);
};
snow_modules_opengl_web_GL.blendFuncSeparate = function(srcRGB,dstRGB,srcAlpha,dstAlpha) {
	snow_modules_opengl_web_GL.gl.blendFuncSeparate(srcRGB,dstRGB,srcAlpha,dstAlpha);
};
snow_modules_opengl_web_GL.bufferData = function(target,data,usage) {
	snow_modules_opengl_web_GL.gl.bufferData(target,data,usage);
};
snow_modules_opengl_web_GL.bufferSubData = function(target,offset,data) {
	snow_modules_opengl_web_GL.gl.bufferSubData(target,offset,data);
};
snow_modules_opengl_web_GL.checkFramebufferStatus = function(target) {
	return snow_modules_opengl_web_GL.gl.checkFramebufferStatus(target);
};
snow_modules_opengl_web_GL.clear = function(mask) {
	snow_modules_opengl_web_GL.gl.clear(mask);
};
snow_modules_opengl_web_GL.clearColor = function(red,green,blue,alpha) {
	snow_modules_opengl_web_GL.gl.clearColor(red,green,blue,alpha);
};
snow_modules_opengl_web_GL.clearDepth = function(depth) {
	snow_modules_opengl_web_GL.gl.clearDepth(depth);
};
snow_modules_opengl_web_GL.clearStencil = function(s) {
	snow_modules_opengl_web_GL.gl.clearStencil(s);
};
snow_modules_opengl_web_GL.colorMask = function(red,green,blue,alpha) {
	snow_modules_opengl_web_GL.gl.colorMask(red,green,blue,alpha);
};
snow_modules_opengl_web_GL.compileShader = function(shader) {
	snow_modules_opengl_web_GL.gl.compileShader(shader);
};
snow_modules_opengl_web_GL.compressedTexImage2D = function(target,level,internalformat,width,height,border,data) {
	snow_modules_opengl_web_GL.gl.compressedTexImage2D(target,level,internalformat,width,height,border,data);
};
snow_modules_opengl_web_GL.compressedTexSubImage2D = function(target,level,xoffset,yoffset,width,height,format,data) {
	snow_modules_opengl_web_GL.gl.compressedTexSubImage2D(target,level,xoffset,yoffset,width,height,format,data);
};
snow_modules_opengl_web_GL.copyTexImage2D = function(target,level,internalformat,x,y,width,height,border) {
	snow_modules_opengl_web_GL.gl.copyTexImage2D(target,level,internalformat,x,y,width,height,border);
};
snow_modules_opengl_web_GL.copyTexSubImage2D = function(target,level,xoffset,yoffset,x,y,width,height) {
	snow_modules_opengl_web_GL.gl.copyTexSubImage2D(target,level,xoffset,yoffset,x,y,width,height);
};
snow_modules_opengl_web_GL.createBuffer = function() {
	return snow_modules_opengl_web_GL.gl.createBuffer();
};
snow_modules_opengl_web_GL.createFramebuffer = function() {
	return snow_modules_opengl_web_GL.gl.createFramebuffer();
};
snow_modules_opengl_web_GL.createProgram = function() {
	return snow_modules_opengl_web_GL.gl.createProgram();
};
snow_modules_opengl_web_GL.createRenderbuffer = function() {
	return snow_modules_opengl_web_GL.gl.createRenderbuffer();
};
snow_modules_opengl_web_GL.createShader = function(type) {
	return snow_modules_opengl_web_GL.gl.createShader(type);
};
snow_modules_opengl_web_GL.createTexture = function() {
	return snow_modules_opengl_web_GL.gl.createTexture();
};
snow_modules_opengl_web_GL.cullFace = function(mode) {
	snow_modules_opengl_web_GL.gl.cullFace(mode);
};
snow_modules_opengl_web_GL.deleteBuffer = function(buffer) {
	snow_modules_opengl_web_GL.gl.deleteBuffer(buffer);
};
snow_modules_opengl_web_GL.deleteFramebuffer = function(framebuffer) {
	snow_modules_opengl_web_GL.gl.deleteFramebuffer(framebuffer);
};
snow_modules_opengl_web_GL.deleteProgram = function(program) {
	snow_modules_opengl_web_GL.gl.deleteProgram(program);
};
snow_modules_opengl_web_GL.deleteRenderbuffer = function(renderbuffer) {
	snow_modules_opengl_web_GL.gl.deleteRenderbuffer(renderbuffer);
};
snow_modules_opengl_web_GL.deleteShader = function(shader) {
	snow_modules_opengl_web_GL.gl.deleteShader(shader);
};
snow_modules_opengl_web_GL.deleteTexture = function(texture) {
	snow_modules_opengl_web_GL.gl.deleteTexture(texture);
};
snow_modules_opengl_web_GL.depthFunc = function(func) {
	snow_modules_opengl_web_GL.gl.depthFunc(func);
};
snow_modules_opengl_web_GL.depthMask = function(flag) {
	snow_modules_opengl_web_GL.gl.depthMask(flag);
};
snow_modules_opengl_web_GL.depthRange = function(zNear,zFar) {
	snow_modules_opengl_web_GL.gl.depthRange(zNear,zFar);
};
snow_modules_opengl_web_GL.detachShader = function(program,shader) {
	snow_modules_opengl_web_GL.gl.detachShader(program,shader);
};
snow_modules_opengl_web_GL.disable = function(cap) {
	snow_modules_opengl_web_GL.gl.disable(cap);
};
snow_modules_opengl_web_GL.disableVertexAttribArray = function(index) {
	snow_modules_opengl_web_GL.gl.disableVertexAttribArray(index);
};
snow_modules_opengl_web_GL.drawArrays = function(mode,first,count) {
	snow_modules_opengl_web_GL.gl.drawArrays(mode,first,count);
};
snow_modules_opengl_web_GL.drawElements = function(mode,count,type,offset) {
	snow_modules_opengl_web_GL.gl.drawElements(mode,count,type,offset);
};
snow_modules_opengl_web_GL.enable = function(cap) {
	snow_modules_opengl_web_GL.gl.enable(cap);
};
snow_modules_opengl_web_GL.enableVertexAttribArray = function(index) {
	snow_modules_opengl_web_GL.gl.enableVertexAttribArray(index);
};
snow_modules_opengl_web_GL.finish = function() {
	snow_modules_opengl_web_GL.gl.finish();
};
snow_modules_opengl_web_GL.flush = function() {
	snow_modules_opengl_web_GL.gl.flush();
};
snow_modules_opengl_web_GL.framebufferRenderbuffer = function(target,attachment,renderbuffertarget,renderbuffer) {
	snow_modules_opengl_web_GL.gl.framebufferRenderbuffer(target,attachment,renderbuffertarget,renderbuffer);
};
snow_modules_opengl_web_GL.framebufferTexture2D = function(target,attachment,textarget,texture,level) {
	snow_modules_opengl_web_GL.gl.framebufferTexture2D(target,attachment,textarget,texture,level);
};
snow_modules_opengl_web_GL.frontFace = function(mode) {
	snow_modules_opengl_web_GL.gl.frontFace(mode);
};
snow_modules_opengl_web_GL.generateMipmap = function(target) {
	snow_modules_opengl_web_GL.gl.generateMipmap(target);
};
snow_modules_opengl_web_GL.getActiveAttrib = function(program,index) {
	return snow_modules_opengl_web_GL.gl.getActiveAttrib(program,index);
};
snow_modules_opengl_web_GL.getActiveUniform = function(program,index) {
	return snow_modules_opengl_web_GL.gl.getActiveUniform(program,index);
};
snow_modules_opengl_web_GL.getAttachedShaders = function(program) {
	return snow_modules_opengl_web_GL.gl.getAttachedShaders(program);
};
snow_modules_opengl_web_GL.getAttribLocation = function(program,name) {
	return snow_modules_opengl_web_GL.gl.getAttribLocation(program,name);
};
snow_modules_opengl_web_GL.getBufferParameter = function(target,pname) {
	return snow_modules_opengl_web_GL.gl.getBufferParameter(target,pname);
};
snow_modules_opengl_web_GL.getContextAttributes = function() {
	return snow_modules_opengl_web_GL.gl.getContextAttributes();
};
snow_modules_opengl_web_GL.getError = function() {
	return snow_modules_opengl_web_GL.gl.getError();
};
snow_modules_opengl_web_GL.getExtension = function(name) {
	return snow_modules_opengl_web_GL.gl.getExtension(name);
};
snow_modules_opengl_web_GL.getFramebufferAttachmentParameter = function(target,attachment,pname) {
	return snow_modules_opengl_web_GL.gl.getFramebufferAttachmentParameter(target,attachment,pname);
};
snow_modules_opengl_web_GL.getParameter = function(pname) {
	return snow_modules_opengl_web_GL.gl.getParameter(pname);
};
snow_modules_opengl_web_GL.getProgramInfoLog = function(program) {
	return snow_modules_opengl_web_GL.gl.getProgramInfoLog(program);
};
snow_modules_opengl_web_GL.getProgramParameter = function(program,pname) {
	return snow_modules_opengl_web_GL.gl.getProgramParameter(program,pname);
};
snow_modules_opengl_web_GL.getRenderbufferParameter = function(target,pname) {
	return snow_modules_opengl_web_GL.gl.getRenderbufferParameter(target,pname);
};
snow_modules_opengl_web_GL.getShaderInfoLog = function(shader) {
	return snow_modules_opengl_web_GL.gl.getShaderInfoLog(shader);
};
snow_modules_opengl_web_GL.getShaderParameter = function(shader,pname) {
	return snow_modules_opengl_web_GL.gl.getShaderParameter(shader,pname);
};
snow_modules_opengl_web_GL.getShaderPrecisionFormat = function(shadertype,precisiontype) {
	return snow_modules_opengl_web_GL.gl.getShaderPrecisionFormat(shadertype,precisiontype);
};
snow_modules_opengl_web_GL.getShaderSource = function(shader) {
	return snow_modules_opengl_web_GL.gl.getShaderSource(shader);
};
snow_modules_opengl_web_GL.getSupportedExtensions = function() {
	return snow_modules_opengl_web_GL.gl.getSupportedExtensions();
};
snow_modules_opengl_web_GL.getTexParameter = function(target,pname) {
	return snow_modules_opengl_web_GL.gl.getTexParameter(target,pname);
};
snow_modules_opengl_web_GL.getUniform = function(program,location) {
	return snow_modules_opengl_web_GL.gl.getUniform(program,location);
};
snow_modules_opengl_web_GL.getUniformLocation = function(program,name) {
	return snow_modules_opengl_web_GL.gl.getUniformLocation(program,name);
};
snow_modules_opengl_web_GL.getVertexAttrib = function(index,pname) {
	return snow_modules_opengl_web_GL.gl.getVertexAttrib(index,pname);
};
snow_modules_opengl_web_GL.getVertexAttribOffset = function(index,pname) {
	return snow_modules_opengl_web_GL.gl.getVertexAttribOffset(index,pname);
};
snow_modules_opengl_web_GL.hint = function(target,mode) {
	snow_modules_opengl_web_GL.gl.hint(target,mode);
};
snow_modules_opengl_web_GL.isBuffer = function(buffer) {
	return snow_modules_opengl_web_GL.gl.isBuffer(buffer);
};
snow_modules_opengl_web_GL.isEnabled = function(cap) {
	return snow_modules_opengl_web_GL.gl.isEnabled(cap);
};
snow_modules_opengl_web_GL.isFramebuffer = function(framebuffer) {
	return snow_modules_opengl_web_GL.gl.isFramebuffer(framebuffer);
};
snow_modules_opengl_web_GL.isProgram = function(program) {
	return snow_modules_opengl_web_GL.gl.isProgram(program);
};
snow_modules_opengl_web_GL.isRenderbuffer = function(renderbuffer) {
	return snow_modules_opengl_web_GL.gl.isRenderbuffer(renderbuffer);
};
snow_modules_opengl_web_GL.isShader = function(shader) {
	return snow_modules_opengl_web_GL.gl.isShader(shader);
};
snow_modules_opengl_web_GL.isTexture = function(texture) {
	return snow_modules_opengl_web_GL.gl.isTexture(texture);
};
snow_modules_opengl_web_GL.lineWidth = function(width) {
	snow_modules_opengl_web_GL.gl.lineWidth(width);
};
snow_modules_opengl_web_GL.linkProgram = function(program) {
	snow_modules_opengl_web_GL.gl.linkProgram(program);
};
snow_modules_opengl_web_GL.pixelStorei = function(pname,param) {
	snow_modules_opengl_web_GL.gl.pixelStorei(pname,param);
};
snow_modules_opengl_web_GL.polygonOffset = function(factor,units) {
	snow_modules_opengl_web_GL.gl.polygonOffset(factor,units);
};
snow_modules_opengl_web_GL.readPixels = function(x,y,width,height,format,type,data) {
	snow_modules_opengl_web_GL.gl.readPixels(x,y,width,height,format,type,data);
};
snow_modules_opengl_web_GL.renderbufferStorage = function(target,internalformat,width,height) {
	snow_modules_opengl_web_GL.gl.renderbufferStorage(target,internalformat,width,height);
};
snow_modules_opengl_web_GL.sampleCoverage = function(value,invert) {
	snow_modules_opengl_web_GL.gl.sampleCoverage(value,invert);
};
snow_modules_opengl_web_GL.scissor = function(x,y,width,height) {
	snow_modules_opengl_web_GL.gl.scissor(x,y,width,height);
};
snow_modules_opengl_web_GL.shaderSource = function(shader,source) {
	snow_modules_opengl_web_GL.gl.shaderSource(shader,source);
};
snow_modules_opengl_web_GL.stencilFunc = function(func,ref,mask) {
	snow_modules_opengl_web_GL.gl.stencilFunc(func,ref,mask);
};
snow_modules_opengl_web_GL.stencilFuncSeparate = function(face,func,ref,mask) {
	snow_modules_opengl_web_GL.gl.stencilFuncSeparate(face,func,ref,mask);
};
snow_modules_opengl_web_GL.stencilMask = function(mask) {
	snow_modules_opengl_web_GL.gl.stencilMask(mask);
};
snow_modules_opengl_web_GL.stencilMaskSeparate = function(face,mask) {
	snow_modules_opengl_web_GL.gl.stencilMaskSeparate(face,mask);
};
snow_modules_opengl_web_GL.stencilOp = function(fail,zfail,zpass) {
	snow_modules_opengl_web_GL.gl.stencilOp(fail,zfail,zpass);
};
snow_modules_opengl_web_GL.stencilOpSeparate = function(face,fail,zfail,zpass) {
	snow_modules_opengl_web_GL.gl.stencilOpSeparate(face,fail,zfail,zpass);
};
snow_modules_opengl_web_GL.texImage2D = function(target,level,internalformat,width,height,border,format,type,data) {
	snow_modules_opengl_web_GL.gl.texImage2D(target,level,internalformat,width,height,border,format,type,data);
};
snow_modules_opengl_web_GL.texParameterf = function(target,pname,param) {
	snow_modules_opengl_web_GL.gl.texParameterf(target,pname,param);
};
snow_modules_opengl_web_GL.texParameteri = function(target,pname,param) {
	snow_modules_opengl_web_GL.gl.texParameteri(target,pname,param);
};
snow_modules_opengl_web_GL.texSubImage2D = function(target,level,xoffset,yoffset,width,height,format,type,data) {
	snow_modules_opengl_web_GL.gl.texSubImage2D(target,level,xoffset,yoffset,width,height,format,type,data);
};
snow_modules_opengl_web_GL.uniform1f = function(location,x) {
	snow_modules_opengl_web_GL.gl.uniform1f(location,x);
};
snow_modules_opengl_web_GL.uniform1fv = function(location,data) {
	snow_modules_opengl_web_GL.gl.uniform1fv(location,data);
};
snow_modules_opengl_web_GL.uniform1i = function(location,x) {
	snow_modules_opengl_web_GL.gl.uniform1i(location,x);
};
snow_modules_opengl_web_GL.uniform1iv = function(location,data) {
	snow_modules_opengl_web_GL.gl.uniform1iv(location,data);
};
snow_modules_opengl_web_GL.uniform2f = function(location,x,y) {
	snow_modules_opengl_web_GL.gl.uniform2f(location,x,y);
};
snow_modules_opengl_web_GL.uniform2fv = function(location,data) {
	snow_modules_opengl_web_GL.gl.uniform2fv(location,data);
};
snow_modules_opengl_web_GL.uniform2i = function(location,x,y) {
	snow_modules_opengl_web_GL.gl.uniform2i(location,x,y);
};
snow_modules_opengl_web_GL.uniform2iv = function(location,data) {
	snow_modules_opengl_web_GL.gl.uniform2iv(location,data);
};
snow_modules_opengl_web_GL.uniform3f = function(location,x,y,z) {
	snow_modules_opengl_web_GL.gl.uniform3f(location,x,y,z);
};
snow_modules_opengl_web_GL.uniform3fv = function(location,data) {
	snow_modules_opengl_web_GL.gl.uniform3fv(location,data);
};
snow_modules_opengl_web_GL.uniform3i = function(location,x,y,z) {
	snow_modules_opengl_web_GL.gl.uniform3i(location,x,y,z);
};
snow_modules_opengl_web_GL.uniform3iv = function(location,data) {
	snow_modules_opengl_web_GL.gl.uniform3iv(location,data);
};
snow_modules_opengl_web_GL.uniform4f = function(location,x,y,z,w) {
	snow_modules_opengl_web_GL.gl.uniform4f(location,x,y,z,w);
};
snow_modules_opengl_web_GL.uniform4fv = function(location,data) {
	snow_modules_opengl_web_GL.gl.uniform4fv(location,data);
};
snow_modules_opengl_web_GL.uniform4i = function(location,x,y,z,w) {
	snow_modules_opengl_web_GL.gl.uniform4i(location,x,y,z,w);
};
snow_modules_opengl_web_GL.uniform4iv = function(location,data) {
	snow_modules_opengl_web_GL.gl.uniform4iv(location,data);
};
snow_modules_opengl_web_GL.uniformMatrix2fv = function(location,transpose,data) {
	snow_modules_opengl_web_GL.gl.uniformMatrix2fv(location,transpose,data);
};
snow_modules_opengl_web_GL.uniformMatrix3fv = function(location,transpose,data) {
	snow_modules_opengl_web_GL.gl.uniformMatrix3fv(location,transpose,data);
};
snow_modules_opengl_web_GL.uniformMatrix4fv = function(location,transpose,data) {
	snow_modules_opengl_web_GL.gl.uniformMatrix4fv(location,transpose,data);
};
snow_modules_opengl_web_GL.useProgram = function(program) {
	snow_modules_opengl_web_GL.gl.useProgram(program);
};
snow_modules_opengl_web_GL.validateProgram = function(program) {
	snow_modules_opengl_web_GL.gl.validateProgram(program);
};
snow_modules_opengl_web_GL.vertexAttrib1f = function(indx,x) {
	snow_modules_opengl_web_GL.gl.vertexAttrib1f(indx,x);
};
snow_modules_opengl_web_GL.vertexAttrib1fv = function(indx,data) {
	snow_modules_opengl_web_GL.gl.vertexAttrib1fv(indx,data);
};
snow_modules_opengl_web_GL.vertexAttrib2f = function(indx,x,y) {
	snow_modules_opengl_web_GL.gl.vertexAttrib2f(indx,x,y);
};
snow_modules_opengl_web_GL.vertexAttrib2fv = function(indx,data) {
	snow_modules_opengl_web_GL.gl.vertexAttrib2fv(indx,data);
};
snow_modules_opengl_web_GL.vertexAttrib3f = function(indx,x,y,z) {
	snow_modules_opengl_web_GL.gl.vertexAttrib3f(indx,x,y,z);
};
snow_modules_opengl_web_GL.vertexAttrib3fv = function(indx,data) {
	snow_modules_opengl_web_GL.gl.vertexAttrib3fv(indx,data);
};
snow_modules_opengl_web_GL.vertexAttrib4f = function(indx,x,y,z,w) {
	snow_modules_opengl_web_GL.gl.vertexAttrib4f(indx,x,y,z,w);
};
snow_modules_opengl_web_GL.vertexAttrib4fv = function(indx,data) {
	snow_modules_opengl_web_GL.gl.vertexAttrib4fv(indx,data);
};
snow_modules_opengl_web_GL.vertexAttribPointer = function(indx,size,type,normalized,stride,offset) {
	snow_modules_opengl_web_GL.gl.vertexAttribPointer(indx,size,type,normalized,stride,offset);
};
snow_modules_opengl_web_GL.viewport = function(x,y,width,height) {
	snow_modules_opengl_web_GL.gl.viewport(x,y,width,height);
};
snow_modules_opengl_web_GL.get_version = function() {
	return 7938;
};
var snow_modules_webaudio_Audio = function(_app) {
	this.active = false;
	this.handle_seq = 0;
	this.app = _app;
	this.instances = new haxe_ds_IntMap();
	try {
		this.context = new AudioContext();
	} catch( err ) {
		if (err instanceof js__$Boot_HaxeError) err = err.val;
		try {
			this.context = new window.webkitAudioContext();
		} catch( err1 ) {
			if (err1 instanceof js__$Boot_HaxeError) err1 = err1.val;
			haxe_Log.trace("    i / audio / " + "WebAudio: no AudioContext could be created! No audio loading or playback will be available.",{ fileName : "Audio.hx", lineNumber : 59, className : "snow.modules.webaudio.Audio", methodName : "new"});
			return;
		}
	}
	if(this.context == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("context was null" + (" ( " + "Audio / webaudio / no AudioContext could be created, is the Web Audio API supported?" + " )")));
	var info = "channelCount: " + this.context.destination.channelCount + ", " + ("channelCountMode: \"" + this.context.destination.channelCountMode + "\", ") + ("channelInterpretation: \"" + this.context.destination.channelInterpretation + "\", ") + ("maxChannelCount: " + this.context.destination.maxChannelCount + ", ") + ("numberOfInputs: " + this.context.destination.numberOfInputs + ", ") + ("numberOfOutputs: " + this.context.destination.numberOfOutputs);
	haxe_Log.trace("    i / audio / " + ("webaudio: " + Std.string(this.context) + " / sampleRate: " + this.context.sampleRate + " / destination: " + info),{ fileName : "Audio.hx", lineNumber : 74, className : "snow.modules.webaudio.Audio", methodName : "new"});
	this.active = true;
};
$hxClasses["snow.modules.webaudio.Audio"] = snow_modules_webaudio_Audio;
snow_modules_webaudio_Audio.__name__ = ["snow","modules","webaudio","Audio"];
snow_modules_webaudio_Audio.__interfaces__ = [snow_modules_interfaces_Audio];
snow_modules_webaudio_Audio.prototype = {
	shutdown: function() {
		this.context.close();
	}
	,onevent: function(event) {
	}
	,snd_of: function(_handle) {
		return this.instances.h[_handle];
	}
	,play_buffer: function(_data) {
		var _node = this.context.createBufferSource();
		_node.buffer = _data.buffer;
		return _node;
	}
	,play_buffer_again: function(_handle,_snd,_start_time) {
		_snd.buffer_node = this.play_buffer(_snd.source.data);
		_snd.buffer_node.connect(_snd.pan_node);
		_snd.buffer_node.loop = _snd.loop;
		_snd.pan_node.connect(_snd.gain_node);
		_snd.gain_node.connect(this.context.destination);
		_snd.buffer_node.start(0,_start_time);
		_snd.buffer_node.onended = (function(f,a1) {
			return function() {
				f(a1);
			};
		})($bind(this,this.destroy_snd),_snd);
	}
	,play_instance: function(_handle,_source,_inst,_data,_buffer_node,_volume,_loop) {
		var _g = this;
		var _gain = this.context.createGain();
		var _pan = this.context.createPanner();
		var _node = null;
		var _pan_val = 0;
		_gain.gain.value = _volume;
		_pan.panningModel = "equalpower";
		_pan.setPosition(Math.cos(-1.5707),0,Math.sin(1.5707));
		if(_buffer_node != null) {
			_node = _buffer_node;
			_buffer_node.loop = _loop;
		}
		if(_data.media_node != null) {
			_node = _data.media_node;
			_data.media_elem.loop = _loop;
		}
		_node.connect(_pan);
		_pan.connect(_gain);
		_gain.connect(this.context.destination);
		var _snd = { handle : _handle, source : _source, instance : _inst, buffer_node : _buffer_node, media_node : _data.media_node, media_elem : _data.media_elem, gain_node : _gain, pan_node : _pan, state : 1, time_start : window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start, loop : _loop, pan : 0};
		this.instances.h[_handle] = _snd;
		if(_buffer_node != null) {
			_buffer_node.start(0);
			_buffer_node.onended = (function(f,a1) {
				return function() {
					f(a1);
				};
			})($bind(this,this.destroy_snd),_snd);
		}
		if(_data.media_node != null) {
			_data.media_elem.play();
			_data.media_node.addEventListener("ended",function() {
				_g.app.audio.emit_Int(0,_handle);
				_snd.state = 2;
			});
		}
	}
	,play: function(_source,_volume,_paused) {
		var _data = _source.data;
		var _handle = this.handle_seq;
		var _inst = _source.instance(_handle);
		if(_source.data.is_stream) {
			_data.media_elem.play();
			_data.media_elem.volume = 1.0;
			this.play_instance(_handle,_source,_inst,_data,null,_volume,false);
		} else this.play_instance(_handle,_source,_inst,_data,this.play_buffer(_data),_volume,false);
		this.handle_seq++;
		return _handle;
	}
	,loop: function(_source,_volume,_paused) {
		var _data = _source.data;
		var _handle = this.handle_seq;
		var _inst = _source.instance(_handle);
		if(_source.data.is_stream) {
			_data.media_elem.play();
			_data.media_elem.volume = 1.0;
			this.play_instance(_handle,_source,_inst,_data,null,_volume,true);
		} else this.play_instance(_handle,_source,_inst,_data,this.play_buffer(_data),_volume,true);
		this.handle_seq++;
		return _handle;
	}
	,stop_buffer: function(_snd) {
		_snd.buffer_node.stop();
		_snd.buffer_node.disconnect();
		_snd.gain_node.disconnect();
		_snd.pan_node.disconnect();
		_snd.buffer_node = null;
	}
	,pause: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return;
		_snd.time_pause = window.performance.now() / 1000.0 - snow_core_web_Runtime.timestamp_start - _snd.time_start;
		_snd.state = 0;
		if(_snd.buffer_node != null) this.stop_buffer(_snd); else if(_snd.media_node != null) _snd.media_elem.pause();
	}
	,unpause: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return;
		if(_snd.state != 0) return;
		if(_snd.media_node == null) this.play_buffer_again(_handle,_snd,_snd.time_pause); else _snd.media_elem.play();
		_snd.state = 1;
	}
	,destroy_snd: function(_snd) {
		if(_snd.buffer_node != null) {
			_snd.buffer_node.stop();
			_snd.buffer_node.disconnect();
			_snd.buffer_node = null;
		}
		if(_snd.media_node != null) {
			_snd.media_elem.pause();
			_snd.media_elem.currentTime = 0;
			_snd.media_node.disconnect();
			_snd.media_elem = null;
			_snd.media_node = null;
		}
		if(_snd.gain_node != null) {
			_snd.gain_node.disconnect();
			_snd.gain_node = null;
		}
		if(_snd.pan_node != null) {
			_snd.pan_node.disconnect();
			_snd.pan_node = null;
		}
		this.instances.remove(_snd.handle);
		_snd = null;
	}
	,stop: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return;
		this.destroy_snd(_snd);
		_snd.state = 2;
	}
	,volume: function(_handle,_volume) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return;
		_snd.gain_node.gain.value = _volume;
	}
	,pan: function(_handle,_pan) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return;
		_snd.pan = _pan;
		_snd.pan_node.setPosition(Math.cos((_pan - 1) * 1.5707),0,Math.sin((_pan + 1) * 1.5707));
	}
	,pitch: function(_handle,_pitch) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return;
		if(_snd.buffer_node != null) _snd.buffer_node.playbackRate.value = _pitch; else if(_snd.media_node != null) _snd.media_elem.playbackRate = _pitch;
	}
	,position: function(_handle,_time) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return;
		if(_snd.buffer_node != null) {
			this.stop_buffer(_snd);
			this.play_buffer_again(_handle,_snd,_time);
		} else _snd.media_elem.currentTime = _time;
	}
	,volume_of: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return 0.0;
		return _snd.gain_node.gain.value;
	}
	,pan_of: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return 0.0;
		return _snd.pan;
	}
	,pitch_of: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return 0.0;
		var _result = 1.0;
		if(_snd.buffer_node != null) _result = _snd.buffer_node.playbackRate.value; else if(_snd.media_node != null) _result = _snd.media_elem.playbackRate;
		return _result;
	}
	,position_of: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return 0.0;
		return 0.0;
	}
	,state_of: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return -1;
		return _snd.state;
	}
	,loop_of: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return false;
		return _snd.loop;
	}
	,instance_of: function(_handle) {
		var _snd = this.instances.h[_handle];
		if(_snd == null) return null;
		return _snd.instance;
	}
	,suspend: function() {
		this.context.suspend();
	}
	,resume: function() {
		this.context.resume();
	}
	,data_from_load: function(_path,_is_stream,_format) {
		if(_is_stream == null) _is_stream = false;
		if(!this.active) return snow_api_Promise.reject("WebAudio context unavailable");
		if(_format == null) _format = snow_core_Audio.audio_format_from_path(_path);
		if(_is_stream) return this.data_from_load_stream(_path,_format);
		return this.data_from_load_sound(_path,_format);
	}
	,data_from_bytes: function(_id,_bytes,_format) {
		var _g = this;
		if(!this.active) return snow_api_Promise.reject("WebAudio context unavailable");
		return new snow_api_Promise(function(resolve,reject) {
			_g.data_from_bytes_direct(_id,_bytes,_format,resolve,reject);
		});
	}
	,data_from_bytes_direct: function(_id,_bytes,_format,resolve,reject) {
		var _g = this;
		this.context.decodeAudioData(_bytes.buffer,function(_buffer) {
			var _data = new snow_modules_webaudio__$Audio_AudioDataWebAudio(_g.app,_buffer,null,null,{ id : _id, is_stream : false, format : _format, samples : null, length : _buffer.length, channels : _buffer.numberOfChannels, rate : _buffer.sampleRate | 0});
			resolve(_data);
			return;
		},function() {
			reject("failed to decode audio for `" + _id + "`");
			return;
		});
	}
	,data_from_load_sound: function(_path,_format) {
		var _g = this;
		return new snow_api_Promise(function(resolve,reject) {
			var _load = _g.app.io.module.data_load(_path,null);
			_load.then(function(_bytes) {
				_g.data_from_bytes_direct(_path,_bytes,_format,resolve,reject);
			});
		});
	}
	,data_from_load_stream: function(_path,_format) {
		var _g = this;
		return new snow_api_Promise(function(resolve,reject) {
			var _element = new Audio(_path);
			_element.autoplay = false;
			_element.controls = false;
			_element.preload = "auto";
			_element.onerror = function(err) {
				var _error;
				var _g1 = _element.error.code;
				switch(_g1) {
				case 1:
					_error = "MEDIA_ERR_ABORTED";
					break;
				case 2:
					_error = "MEDIA_ERR_NETWORK";
					break;
				case 3:
					_error = "MEDIA_ERR_DECODE";
					break;
				case 4:
					_error = "MEDIA_ERR_SRC_NOT_SUPPORTED";
					break;
				case 5:
					_error = "MEDIA_ERR_ENCRYPTED";
					break;
				default:
					_error = "unknown error";
				}
				return reject("failed to load `" + _path + "` as stream : `" + _error + "`");
			};
			_element.onloadedmetadata = function(_) {
				var _node = _g.context.createMediaElementSource(_element);
				var _bytes_per_sample = 2;
				var _rate = _g.context.sampleRate | 0;
				var _channels = _node.channelCount;
				var _sample_frames = _rate * _channels * _bytes_per_sample;
				var _length = _element.duration * _sample_frames | 0;
				var _data = new snow_modules_webaudio__$Audio_AudioDataWebAudio(_g.app,null,_node,_element,{ id : _path, is_stream : true, format : _format, samples : null, length : _length, channels : _channels, rate : _rate});
				return resolve(_data);
			};
		});
	}
	,__class__: snow_modules_webaudio_Audio
};
var snow_types_AudioData = function(_app,_options) {
	this.is_stream = false;
	this.format = 0;
	this.channels = 1;
	this.length = 0;
	this.rate = 44100;
	this.id = "AudioData";
	this.app = _app;
	if(_options.id == null) _options.id = this.id;
	this.id = _options.id;
	if(_options.rate == null) _options.rate = this.rate;
	this.rate = _options.rate;
	if(_options.length == null) _options.length = this.length;
	this.length = _options.length;
	if(_options.format == null) _options.format = this.format;
	this.format = _options.format;
	if(_options.channels == null) _options.channels = this.channels;
	this.channels = _options.channels;
	if(_options.is_stream == null) _options.is_stream = this.is_stream;
	this.is_stream = _options.is_stream;
	if(_options.samples == null) _options.samples = this.samples;
	this.samples = _options.samples;
	_options = null;
};
$hxClasses["snow.types.AudioData"] = snow_types_AudioData;
snow_types_AudioData.__name__ = ["snow","types","AudioData"];
snow_types_AudioData.prototype = {
	destroy: function() {
		this.id = null;
		this.samples = null;
	}
	,seek: function(_to) {
		return false;
	}
	,portion: function(_into,_start,_len,_into_result) {
		return _into_result;
	}
	,toString: function() {
		return "{ \"AudioData\":true, \"id\":" + this.id + ", \"rate\":" + this.rate + ", \"length\":" + this.length + ", \"channels\":" + this.channels + ", \"format\":\"" + (function($this) {
			var $r;
			var this1 = $this.format;
			$r = this1 != null?(function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "af_unknown";
					break;
				case 1:
					$r = "af_custom";
					break;
				case 2:
					$r = "af_ogg";
					break;
				case 3:
					$r = "af_wav";
					break;
				case 4:
					$r = "af_pcm";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this)):"" + this1;
			return $r;
		}(this)) + "\", \"is_stream\":" + Std.string(this.is_stream) + " }";
	}
	,__class__: snow_types_AudioData
};
var snow_modules_webaudio__$Audio_AudioDataWebAudio = function(_app,_buffer,_media_node,_media_elem,_opt) {
	this.buffer = _buffer;
	this.media_node = _media_node;
	this.media_elem = _media_elem;
	snow_types_AudioData.call(this,_app,_opt);
};
$hxClasses["snow.modules.webaudio._Audio.AudioDataWebAudio"] = snow_modules_webaudio__$Audio_AudioDataWebAudio;
snow_modules_webaudio__$Audio_AudioDataWebAudio.__name__ = ["snow","modules","webaudio","_Audio","AudioDataWebAudio"];
snow_modules_webaudio__$Audio_AudioDataWebAudio.__super__ = snow_types_AudioData;
snow_modules_webaudio__$Audio_AudioDataWebAudio.prototype = $extend(snow_types_AudioData.prototype,{
	destroy: function() {
		this.buffer = null;
		this.media_node = null;
		this.media_elem = null;
	}
	,__class__: snow_modules_webaudio__$Audio_AudioDataWebAudio
});
var snow_systems_assets_Asset = function(_system,_id,_type) {
	if(_type == null) _type = 0;
	this.loaded = false;
	if(_id == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_id was null" + ""));
	if(_system == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_system was null" + ""));
	this.system = _system;
	this.type = _type;
	this.id = _id;
};
$hxClasses["snow.systems.assets.Asset"] = snow_systems_assets_Asset;
snow_systems_assets_Asset.__name__ = ["snow","systems","assets","Asset"];
snow_systems_assets_Asset.prototype = {
	destroy: function() {
	}
	,__class__: snow_systems_assets_Asset
};
var snow_systems_assets_AssetImage = function(_system,_id,_image) {
	snow_systems_assets_Asset.call(this,_system,_id,4);
	this.set_image(_image);
};
$hxClasses["snow.systems.assets.AssetImage"] = snow_systems_assets_AssetImage;
snow_systems_assets_AssetImage.__name__ = ["snow","systems","assets","AssetImage"];
snow_systems_assets_AssetImage.load = function(_system,_id) {
	if(_id == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_id was null" + ""));
	if(_system == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_system was null" + ""));
	return new snow_systems_assets_AssetImage(_system,_id,null).reload();
};
snow_systems_assets_AssetImage.load_from_bytes = function(_system,_id,_bytes) {
	if(_id == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_id was null" + ""));
	if(_bytes == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_bytes was null" + ""));
	if(_system == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_system was null" + ""));
	return new snow_systems_assets_AssetImage(_system,_id,null).reload_from_bytes(_bytes);
};
snow_systems_assets_AssetImage.load_from_pixels = function(_system,_id,_width,_height,_pixels) {
	if(_id == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_id was null" + ""));
	if(_pixels == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_pixels was null" + ""));
	if(_system == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_system was null" + ""));
	var info = _system.module.image_info_from_pixels(_id,_width,_height,_pixels);
	return new snow_systems_assets_AssetImage(_system,_id,info);
};
snow_systems_assets_AssetImage.provider = function(_app,_path) {
	return _app.assets.module.image_info_from_load(_path);
};
snow_systems_assets_AssetImage.processor = function(_app,_id,_data) {
	if(_data == null) return snow_api_Promise.reject(snow_types_Error.error("AssetImage processor: data was null"));
	return _app.assets.module.image_info_from_bytes(_id,_data);
};
snow_systems_assets_AssetImage.__super__ = snow_systems_assets_Asset;
snow_systems_assets_AssetImage.prototype = $extend(snow_systems_assets_Asset.prototype,{
	reload: function() {
		var _g = this;
		this.loaded = false;
		return new snow_api_Promise(function(resolve,reject) {
			var _load = _g.system.app.io.data_flow(haxe_io_Path.join([_g.system.root,_g.id]),null,snow_systems_assets_AssetImage.provider);
			_load.then(function(_image) {
				_g.set_image(_image);
				resolve(_g);
			}).error(reject);
		});
	}
	,destroy: function() {
		this.image.destroy();
		this.set_image(null);
	}
	,reload_from_bytes: function(_bytes) {
		var _g = this;
		this.loaded = false;
		return new snow_api_Promise(function(resolve,reject) {
			var _load = _g.system.module.image_info_from_bytes(_g.id,_bytes);
			_load.then(function(_image) {
				_g.set_image(_image);
				resolve(_g);
			}).error(reject);
		});
	}
	,reload_from_pixels: function(_width,_height,_pixels) {
		this.loaded = false;
		this.set_image(this.system.module.image_info_from_pixels(this.id,_width,_height,_pixels));
	}
	,set_image: function(_image) {
		this.loaded = _image != null;
		return this.image = _image;
	}
	,__class__: snow_systems_assets_AssetImage
});
var snow_systems_assets_AssetAudio = function(_system,_id,_audio) {
	snow_systems_assets_Asset.call(this,_system,_id,5);
	this.set_audio(_audio);
};
$hxClasses["snow.systems.assets.AssetAudio"] = snow_systems_assets_AssetAudio;
snow_systems_assets_AssetAudio.__name__ = ["snow","systems","assets","AssetAudio"];
snow_systems_assets_AssetAudio.load = function(_system,_id,_is_stream) {
	if(_is_stream == null) _is_stream = false;
	if(_id == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_id was null" + ""));
	if(_system == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_system was null" + ""));
	return new snow_systems_assets_AssetAudio(_system,_id,null).reload(_is_stream);
};
snow_systems_assets_AssetAudio.load_from_bytes = function(_system,_id,_bytes,_format) {
	if(_id == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_id was null" + ""));
	if(_bytes == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_bytes was null" + ""));
	if(_system == null) throw new js__$Boot_HaxeError(snow_api_DebugError.null_assertion("_system was null" + ""));
	return new snow_systems_assets_AssetAudio(_system,_id,null).reload_from_bytes(_bytes,_format);
};
snow_systems_assets_AssetAudio.__super__ = snow_systems_assets_Asset;
snow_systems_assets_AssetAudio.prototype = $extend(snow_systems_assets_Asset.prototype,{
	reload: function(_is_stream) {
		if(_is_stream == null) _is_stream = false;
		var _g = this;
		this.loaded = false;
		return new snow_api_Promise(function(resolve,reject) {
			var _load = _g.system.app.audio.module.data_from_load(haxe_io_Path.join([_g.system.root,_g.id]),_is_stream);
			_load.then(function(_audio) {
				_g.set_audio(_audio);
				resolve(_g);
			}).error(reject);
		});
	}
	,destroy: function() {
		this.audio.destroy();
		this.set_audio(null);
	}
	,reload_from_bytes: function(_bytes,_format) {
		var _g = this;
		this.loaded = false;
		return new snow_api_Promise(function(resolve,reject) {
			var _load = _g.system.app.audio.module.data_from_bytes(_g.id,_bytes,_format);
			_load.then(function(_audio) {
				_g.set_audio(_audio);
				resolve(_g);
			}).error(reject);
		});
	}
	,set_audio: function(_audio) {
		this.loaded = _audio != null;
		return this.audio = _audio;
	}
	,__class__: snow_systems_assets_AssetAudio
});
var snow_systems_assets_AssetBytes = function(_system,_id,_bytes) {
	snow_systems_assets_Asset.call(this,_system,_id,1);
	this.set_bytes(_bytes);
};
$hxClasses["snow.systems.assets.AssetBytes"] = snow_systems_assets_AssetBytes;
snow_systems_assets_AssetBytes.__name__ = ["snow","systems","assets","AssetBytes"];
snow_systems_assets_AssetBytes.load = function(_system,_id) {
	return new snow_systems_assets_AssetBytes(_system,_id,null).reload();
};
snow_systems_assets_AssetBytes.__super__ = snow_systems_assets_Asset;
snow_systems_assets_AssetBytes.prototype = $extend(snow_systems_assets_Asset.prototype,{
	reload: function() {
		var _g = this;
		return new snow_api_Promise(function(resolve,reject) {
			_g.system.app.io.data_flow(haxe_io_Path.join([_g.system.root,_g.id])).then(function(_bytes) {
				_g.set_bytes(_bytes);
				resolve(_g);
			}).error(reject);
		});
	}
	,destroy: function() {
		this.set_bytes(null);
	}
	,set_bytes: function(_bytes) {
		this.loaded = _bytes != null;
		return this.bytes = _bytes;
	}
	,__class__: snow_systems_assets_AssetBytes
});
var snow_systems_assets_AssetText = function(_system,_id,_text) {
	snow_systems_assets_Asset.call(this,_system,_id,2);
	this.set_text(_text);
};
$hxClasses["snow.systems.assets.AssetText"] = snow_systems_assets_AssetText;
snow_systems_assets_AssetText.__name__ = ["snow","systems","assets","AssetText"];
snow_systems_assets_AssetText.load = function(_system,_id) {
	return new snow_systems_assets_AssetText(_system,_id,null).reload();
};
snow_systems_assets_AssetText.processor = function(_app,_id,_data) {
	if(_data == null) return snow_api_Promise.reject(snow_types_Error.error("AssetText processor: data was null"));
	var _string = new haxe_io_Bytes(new Uint8Array(_data.buffer)).toString();
	_data = null;
	return snow_api_Promise.resolve(_string);
};
snow_systems_assets_AssetText.__super__ = snow_systems_assets_Asset;
snow_systems_assets_AssetText.prototype = $extend(snow_systems_assets_Asset.prototype,{
	reload: function() {
		var _g = this;
		return new snow_api_Promise(function(resolve,reject) {
			_g.system.app.io.data_flow(haxe_io_Path.join([_g.system.root,_g.id]),snow_systems_assets_AssetText.processor).then(function(_text) {
				_g.set_text(_text);
				resolve(_g);
			}).error(reject);
		});
	}
	,destroy: function() {
		this.set_text(null);
	}
	,set_text: function(_text) {
		this.loaded = _text != null;
		return this.text = _text;
	}
	,__class__: snow_systems_assets_AssetText
});
var snow_systems_assets_AssetJSON = function(_system,_id,_json) {
	snow_systems_assets_Asset.call(this,_system,_id,3);
	this.set_json(_json);
};
$hxClasses["snow.systems.assets.AssetJSON"] = snow_systems_assets_AssetJSON;
snow_systems_assets_AssetJSON.__name__ = ["snow","systems","assets","AssetJSON"];
snow_systems_assets_AssetJSON.load = function(_system,_id) {
	return new snow_systems_assets_AssetJSON(_system,_id,null).reload();
};
snow_systems_assets_AssetJSON.processor = function(_app,_id,_data) {
	if(_data == null) return snow_api_Promise.reject(snow_types_Error.error("AssetJSON: data was null"));
	return new snow_api_Promise(function(resolve,reject) {
		var _data_json = null;
		try {
			_data_json = JSON.parse(new haxe_io_Bytes(new Uint8Array(_data.buffer)).toString());
			_data = null;
		} catch( e ) {
			if (e instanceof js__$Boot_HaxeError) e = e.val;
			_data = null;
			return reject(snow_types_Error.parse(e));
		}
		return resolve(_data_json);
	});
};
snow_systems_assets_AssetJSON.__super__ = snow_systems_assets_Asset;
snow_systems_assets_AssetJSON.prototype = $extend(snow_systems_assets_Asset.prototype,{
	reload: function() {
		var _g = this;
		return new snow_api_Promise(function(resolve,reject) {
			_g.system.app.io.data_flow(haxe_io_Path.join([_g.system.root,_g.id]),snow_systems_assets_AssetJSON.processor).then(function(_json) {
				_g.set_json(_json);
				resolve(_g);
			}).error(reject);
		});
	}
	,destroy: function() {
		this.set_json(null);
	}
	,set_json: function(_json) {
		this.loaded = _json != null;
		return this.json = _json;
	}
	,__class__: snow_systems_assets_AssetJSON
});
var snow_systems_assets_Assets = function(_app) {
	this.root = "";
	this.app = _app;
	this.module = new snow_core_web_assets_Assets(this.app);
};
$hxClasses["snow.systems.assets.Assets"] = snow_systems_assets_Assets;
snow_systems_assets_Assets.__name__ = ["snow","systems","assets","Assets"];
snow_systems_assets_Assets.prototype = {
	shutdown: function() {
		this.module.shutdown();
	}
	,path: function(_id) {
		return haxe_io_Path.join([this.root,_id]);
	}
	,bytes: function(_id) {
		return snow_systems_assets_AssetBytes.load(this,_id);
	}
	,text: function(_id) {
		return snow_systems_assets_AssetText.load(this,_id);
	}
	,json: function(_id) {
		return snow_systems_assets_AssetJSON.load(this,_id);
	}
	,image: function(_id) {
		return snow_systems_assets_AssetImage.load(this,_id);
	}
	,image_from_bytes: function(_id,_bytes) {
		return snow_systems_assets_AssetImage.load_from_bytes(this,_id,_bytes);
	}
	,image_from_pixels: function(_id,_width,_height,_pixels) {
		return snow_systems_assets_AssetImage.load_from_pixels(this,_id,_width,_height,_pixels);
	}
	,audio: function(_id,_is_stream) {
		if(_is_stream == null) _is_stream = false;
		return snow_systems_assets_AssetAudio.load(this,_id,_is_stream);
	}
	,audio_from_bytes: function(_id,_bytes,_format) {
		return snow_systems_assets_AssetAudio.load_from_bytes(this,_id,_bytes,_format);
	}
	,__class__: snow_systems_assets_Assets
};
var snow_systems_audio_Audio = function(_app) {
	this.active = false;
	this.app = _app;
	this.module = new snow_modules_webaudio_Audio(this.app);
	this.emitter = new snow_api_Emitter();
	this.active = this.module.active;
};
$hxClasses["snow.systems.audio.Audio"] = snow_systems_audio_Audio;
snow_systems_audio_Audio.__name__ = ["snow","systems","audio","Audio"];
snow_systems_audio_Audio.prototype = {
	emit_snow_systems_audio_AudioSource: function(_event,_data) {
		this.emitter.emit(_event,_data);
	}
	,emit_Int: function(_event,_data) {
		this.emitter.emit(_event,_data);
	}
	,play: function(_source,_volume,_paused) {
		if(_paused == null) _paused = false;
		if(_volume == null) _volume = 1.0;
		if(!this.active) return -1;
		return this.module.play(_source,_volume,_paused);
	}
	,loop: function(_source,_volume,_paused) {
		if(_paused == null) _paused = false;
		if(_volume == null) _volume = 1.0;
		if(!this.active) return -1;
		return this.module.loop(_source,_volume,_paused);
	}
	,pause: function(_handle) {
		if(!this.active) return;
		this.module.pause(_handle);
	}
	,unpause: function(_handle) {
		if(!this.active) return;
		this.module.unpause(_handle);
	}
	,stop: function(_handle) {
		if(!this.active) return;
		this.module.stop(_handle);
	}
	,volume: function(_handle,_volume) {
		if(!this.active) return;
		this.module.volume(_handle,_volume);
	}
	,pan: function(_handle,_pan) {
		if(!this.active) return;
		this.module.pan(_handle,_pan);
	}
	,pitch: function(_handle,_pitch) {
		if(!this.active) return;
		this.module.pitch(_handle,_pitch);
	}
	,position: function(_handle,_position) {
		if(!this.active) return;
		this.module.position(_handle,_position);
	}
	,state_of: function(_handle) {
		return this.module.state_of(_handle);
	}
	,loop_of: function(_handle) {
		if(!this.active) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("active" + (" ( " + "audio is suspended, queries are invalid" + " )")));
		return this.module.loop_of(_handle);
	}
	,instance_of: function(_handle) {
		if(!this.active) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("active" + (" ( " + "audio is suspended, queries are invalid" + " )")));
		return this.module.instance_of(_handle);
	}
	,volume_of: function(_handle) {
		if(!this.active) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("active" + (" ( " + "audio is suspended, queries are invalid" + " )")));
		return this.module.volume_of(_handle);
	}
	,pan_of: function(_handle) {
		if(!this.active) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("active" + (" ( " + "audio is suspended, queries are invalid" + " )")));
		return this.module.pan_of(_handle);
	}
	,pitch_of: function(_handle) {
		if(!this.active) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("active" + (" ( " + "audio is suspended, queries are invalid" + " )")));
		return this.module.pitch_of(_handle);
	}
	,position_of: function(_handle) {
		if(!this.active) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("active" + (" ( " + "audio is suspended, queries are invalid" + " )")));
		return this.module.position_of(_handle);
	}
	,suspend: function() {
		if(!this.active) return;
		this.active = false;
		this.module.suspend();
	}
	,resume: function() {
		if(this.active || !this.module.active) return;
		this.active = true;
		this.module.resume();
	}
	,onevent: function(_event) {
		this.module.onevent(_event);
		if(_event.type == 8) {
			var _g = _event.window.type;
			switch(_g) {
			case 7:
				this.suspend();
				break;
			case 9:
				this.resume();
				break;
			default:
			}
		}
	}
	,shutdown: function() {
		this.active = false;
		this.module.shutdown();
	}
	,__class__: snow_systems_audio_Audio
};
var snow_systems_audio_AudioInstance = function(_source,_handle) {
	this.destroyed = false;
	this.source = _source;
	this.handle = _handle;
};
$hxClasses["snow.systems.audio.AudioInstance"] = snow_systems_audio_AudioInstance;
snow_systems_audio_AudioInstance.__name__ = ["snow","systems","audio","AudioInstance"];
snow_systems_audio_AudioInstance.prototype = {
	tick: function() {
	}
	,has_ended: function() {
		if(!(this.destroyed == false)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("destroyed == false" + (" ( " + "snow / Audio / Instance has_ended queried after being destroyed" + " )")));
		return this.source.app.audio.state_of(this.handle) == 2;
	}
	,destroy: function() {
		if(!(this.destroyed == false)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("destroyed == false" + (" ( " + "snow / Audio / Instance being destroyed more than once" + " )")));
		this.source.app.audio.emit_Int(1,this.handle);
		this.source.instance_killed(this);
		this.destroyed = true;
		this.source = null;
		this.handle = -1;
	}
	,data_get: function(_into,_start,_length,_into_result) {
		if(!(this.destroyed == false)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("destroyed == false" + (" ( " + "snow / Audio / Instance data_get queried after being destroyed" + " )")));
		return this.source.data.portion(_into,_start,_length,_into_result);
	}
	,data_seek: function(_to_samples) {
		if(!(this.destroyed == false)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("destroyed == false" + (" ( " + "snow / Audio / Instance data_seek queried after being destroyed" + " )")));
		return this.source.data.seek(_to_samples);
	}
	,__class__: snow_systems_audio_AudioInstance
};
var snow_systems_audio_AudioSource = function(_app,_data) {
	this.stream_buffer_count = 2;
	this.stream_buffer_length = 176400;
	this.app = _app;
	this.data = _data;
	this.instances = [];
};
$hxClasses["snow.systems.audio.AudioSource"] = snow_systems_audio_AudioSource;
snow_systems_audio_AudioSource.__name__ = ["snow","systems","audio","AudioSource"];
snow_systems_audio_AudioSource.prototype = {
	instance: function(_handle) {
		var _instance = new snow_systems_audio_AudioInstance(this,_handle);
		if(HxOverrides.indexOf(this.instances,_instance,0) == -1) this.instances.push(_instance);
		return _instance;
	}
	,bytes_to_seconds: function(_bytes) {
		var _bits_per_sample = 16;
		var _word;
		if(_bits_per_sample == 16) _word = 2; else _word = 1;
		var _sample_frames = this.data.rate * this.data.channels * _word;
		return _bytes / _sample_frames;
	}
	,seconds_to_bytes: function(_seconds) {
		var _bits_per_sample = 16;
		var _word;
		if(_bits_per_sample == 16) _word = 2; else _word = 1;
		var _sample_frames = this.data.rate * this.data.channels * _word;
		return _seconds * _sample_frames | 0;
	}
	,duration: function() {
		return this.bytes_to_seconds(this.data.length);
	}
	,destroy: function() {
		var c = this.instances.length;
		var i = 0;
		haxe_Log.trace("i / audiosource / " + ("destroy " + this.data.id + ", stream=" + Std.string(this.data.is_stream) + ", instances=" + c),{ fileName : "AudioSource.hx", lineNumber : 83, className : "snow.systems.audio.AudioSource", methodName : "destroy"});
		this.app.audio.emit_snow_systems_audio_AudioSource(2,this);
		while(i < c) {
			var _instance = this.instances.pop();
			_instance.destroy();
			_instance = null;
			i++;
		}
		this.data.destroy();
		this.data = null;
		this.instances = null;
		this.app = null;
	}
	,instance_killed: function(_instance) {
		HxOverrides.remove(this.instances,_instance);
	}
	,__class__: snow_systems_audio_AudioSource
};
var snow_systems_input_Input = function(_app) {
	this.touch_count = 0;
	this.gamepad_init_count = 16;
	this.app = _app;
	this.event = new snow_types_InputEvent();
	this.key_event = new snow_types_KeyEvent();
	this.text_event = new snow_types_TextEvent();
	this.mouse_event = new snow_types_MouseEvent();
	this.touch_event = new snow_types_TouchEvent();
	this.gamepad_event = new snow_types_GamepadEvent();
	this.mod_state = new snow_types_ModState();
	this.mod_state.none = true;
	this.key_code_pressed = new haxe_ds_IntMap();
	this.key_code_down = new haxe_ds_IntMap();
	this.key_code_released = new haxe_ds_IntMap();
	this.scan_code_pressed = new haxe_ds_IntMap();
	this.scan_code_down = new haxe_ds_IntMap();
	this.scan_code_released = new haxe_ds_IntMap();
	this.mouse_button_pressed = new haxe_ds_IntMap();
	this.mouse_button_down = new haxe_ds_IntMap();
	this.mouse_button_released = new haxe_ds_IntMap();
	this.gamepad_button_pressed = new haxe_ds_IntMap();
	this.gamepad_button_down = new haxe_ds_IntMap();
	this.gamepad_button_released = new haxe_ds_IntMap();
	this.gamepad_axis_values = new haxe_ds_IntMap();
	var _g1 = 0;
	var _g = this.gamepad_init_count;
	while(_g1 < _g) {
		var i = _g1++;
		var value = new haxe_ds_IntMap();
		this.gamepad_button_pressed.h[i] = value;
		var value1 = new haxe_ds_IntMap();
		this.gamepad_button_down.h[i] = value1;
		var value2 = new haxe_ds_IntMap();
		this.gamepad_button_released.h[i] = value2;
		var value3 = new haxe_ds_IntMap();
		this.gamepad_axis_values.h[i] = value3;
	}
	this.touches_down = new haxe_ds_IntMap();
};
$hxClasses["snow.systems.input.Input"] = snow_systems_input_Input;
snow_systems_input_Input.__name__ = ["snow","systems","input","Input"];
snow_systems_input_Input.prototype = {
	shutdown: function() {
	}
	,keypressed: function(_code) {
		return this.key_code_pressed.h.hasOwnProperty(_code);
	}
	,keyreleased: function(_code) {
		return this.key_code_released.h.hasOwnProperty(_code);
	}
	,keydown: function(_code) {
		return this.key_code_down.h.hasOwnProperty(_code);
	}
	,scanpressed: function(_code) {
		return this.scan_code_pressed.h.hasOwnProperty(_code);
	}
	,scanreleased: function(_code) {
		return this.scan_code_released.h.hasOwnProperty(_code);
	}
	,scandown: function(_code) {
		return this.scan_code_down.h.hasOwnProperty(_code);
	}
	,mousepressed: function(_button) {
		return this.mouse_button_pressed.h.hasOwnProperty(_button);
	}
	,mousereleased: function(_button) {
		return this.mouse_button_released.h.hasOwnProperty(_button);
	}
	,mousedown: function(_button) {
		return this.mouse_button_down.h.hasOwnProperty(_button);
	}
	,gamepadpressed: function(_gamepad,_button) {
		var _gamepad_state = this.gamepad_button_pressed.h[_gamepad];
		if(_gamepad_state != null) return _gamepad_state.h.hasOwnProperty(_button); else return false;
	}
	,gamepadreleased: function(_gamepad,_button) {
		var _gamepad_state = this.gamepad_button_released.h[_gamepad];
		if(_gamepad_state != null) return _gamepad_state.h.hasOwnProperty(_button); else return false;
	}
	,gamepaddown: function(_gamepad,_button) {
		var _gamepad_state = this.gamepad_button_down.h[_gamepad];
		if(_gamepad_state != null) return _gamepad_state.h.hasOwnProperty(_button); else return false;
	}
	,gamepadaxis: function(_gamepad,_axis) {
		var _gamepad_state = this.gamepad_axis_values.h[_gamepad];
		if(_gamepad_state != null) {
			if(_gamepad_state.h.hasOwnProperty(_axis)) return _gamepad_state.h[_axis];
		}
		return 0;
	}
	,dispatch_key_down_event: function(keycode,scancode,repeat,mod,timestamp,window_id) {
		if(!repeat) {
			this.key_code_pressed.h[keycode] = false;
			this.key_code_down.h[keycode] = true;
			this.scan_code_pressed.h[scancode] = false;
			this.scan_code_down.h[scancode] = true;
		}
		this.key_event.set(1,keycode,scancode,repeat,mod);
		this.event.set_key(this.key_event,window_id,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.onkeydown(keycode,scancode,repeat,mod,timestamp,window_id);
	}
	,dispatch_key_up_event: function(keycode,scancode,repeat,mod,timestamp,window_id) {
		this.key_code_released.h[keycode] = false;
		this.key_code_down.remove(keycode);
		this.scan_code_released.h[scancode] = false;
		this.scan_code_down.remove(scancode);
		this.key_event.set(2,keycode,scancode,repeat,mod);
		this.event.set_key(this.key_event,window_id,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.onkeyup(keycode,scancode,repeat,mod,timestamp,window_id);
	}
	,dispatch_text_event: function(text,start,length,type,timestamp,window_id) {
		this.text_event.set(type,text,start,length);
		this.event.set_text(this.text_event,window_id,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.ontextinput(text,start,length,type,timestamp,window_id);
	}
	,dispatch_mouse_move_event: function(x,y,xrel,yrel,timestamp,window_id) {
		this.mouse_event.set(1,x,y,xrel,yrel,0,0,0);
		this.event.set_mouse(this.mouse_event,window_id,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.onmousemove(x,y,xrel,yrel,timestamp,window_id);
	}
	,dispatch_mouse_down_event: function(x,y,button,timestamp,window_id) {
		this.mouse_button_pressed.h[button] = false;
		this.mouse_button_down.h[button] = true;
		this.mouse_event.set(2,x,y,0,0,button,0,0);
		this.event.set_mouse(this.mouse_event,window_id,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.onmousedown(x,y,button,timestamp,window_id);
	}
	,dispatch_mouse_up_event: function(x,y,button,timestamp,window_id) {
		this.mouse_button_released.h[button] = false;
		this.mouse_button_down.remove(button);
		this.mouse_event.set(3,x,y,0,0,button,0,0);
		this.event.set_mouse(this.mouse_event,window_id,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.onmouseup(x,y,button,timestamp,window_id);
	}
	,dispatch_mouse_wheel_event: function(x,y,timestamp,window_id) {
		this.mouse_event.set(4,0,0,0,0,0,x,y);
		this.event.set_mouse(this.mouse_event,window_id,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.onmousewheel(x,y,timestamp,window_id);
	}
	,dispatch_touch_down_event: function(x,y,dx,dy,touch_id,timestamp) {
		if(!this.touches_down.h.hasOwnProperty(touch_id)) {
			this.touch_count++;
			this.touches_down.h[touch_id] = true;
		}
		this.touch_event.set(2,touch_id,x,y,dx,dy);
		this.event.set_touch(this.touch_event,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.ontouchdown(x,y,dx,dy,touch_id,timestamp);
	}
	,dispatch_touch_up_event: function(x,y,dx,dy,touch_id,timestamp) {
		this.touch_event.set(3,touch_id,x,y,dx,dy);
		this.event.set_touch(this.touch_event,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.ontouchup(x,y,dx,dy,touch_id,timestamp);
		if(this.touches_down.remove(touch_id)) this.touch_count--;
	}
	,dispatch_touch_move_event: function(x,y,dx,dy,touch_id,timestamp) {
		this.touch_event.set(1,touch_id,x,y,dx,dy);
		this.event.set_touch(this.touch_event,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.ontouchmove(x,y,dx,dy,touch_id,timestamp);
	}
	,dispatch_gamepad_axis_event: function(gamepad,axis,value,timestamp) {
		if(!this.gamepad_axis_values.h.hasOwnProperty(gamepad)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("gamepad_axis_values.exists(gamepad)" + (" ( " + ("gamepad with id " + gamepad + " not pre-inited? Is gamepad_init_count too low, or the gamepad id not sequential from 0?") + " )")));
		var this1 = this.gamepad_axis_values.h[gamepad];
		this1.set(axis,value);
		this.gamepad_event.set_axis(gamepad,axis,value);
		this.event.set_gamepad(this.gamepad_event,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.ongamepadaxis(gamepad,axis,value,timestamp);
	}
	,dispatch_gamepad_button_down_event: function(gamepad,button,value,timestamp) {
		if(!this.gamepad_button_pressed.h.hasOwnProperty(gamepad)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("gamepad_button_pressed.exists(gamepad)" + (" ( " + ("gamepad with id " + gamepad + " not pre-inited? Is gamepad_init_count too low, or the gamepad id not sequential from 0?") + " )")));
		if(!this.gamepad_button_down.h.hasOwnProperty(gamepad)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("gamepad_button_down.exists(gamepad)" + (" ( " + ("gamepad with id " + gamepad + " not pre-inited? Is gamepad_init_count too low, or the gamepad id not sequential from 0?") + " )")));
		var this1 = this.gamepad_button_pressed.h[gamepad];
		this1.set(button,false);
		var this2 = this.gamepad_button_down.h[gamepad];
		this2.set(button,true);
		this.gamepad_event.set_button(2,gamepad,button,value);
		this.event.set_gamepad(this.gamepad_event,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.ongamepaddown(gamepad,button,value,timestamp);
	}
	,dispatch_gamepad_button_up_event: function(gamepad,button,value,timestamp) {
		if(!this.gamepad_button_released.h.hasOwnProperty(gamepad)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("gamepad_button_released.exists(gamepad)" + (" ( " + ("gamepad with id " + gamepad + " not pre-inited? Is gamepad_init_count too low, or the gamepad id not sequential from 0?") + " )")));
		if(!this.gamepad_button_down.h.hasOwnProperty(gamepad)) throw new js__$Boot_HaxeError(snow_api_DebugError.assertion("gamepad_button_down.exists(gamepad)" + (" ( " + ("gamepad with id " + gamepad + " not pre-inited? Is gamepad_init_count too low, or the gamepad id not sequential from 0?") + " )")));
		var this1 = this.gamepad_button_released.h[gamepad];
		this1.set(button,false);
		var this2 = this.gamepad_button_down.h[gamepad];
		this2.remove(button);
		this.gamepad_event.set_button(3,gamepad,button,value);
		this.event.set_gamepad(this.gamepad_event,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.ongamepadup(gamepad,button,value,timestamp);
	}
	,dispatch_gamepad_device_event: function(gamepad,id,type,timestamp) {
		this.gamepad_event.set_device(gamepad,id,type);
		this.event.set_gamepad(this.gamepad_event,timestamp);
		this.app.dispatch_input_event(this.event);
		this.app.host.ongamepaddevice(gamepad,id,type,timestamp);
	}
	,onevent: function(_event) {
		if(_event.type == 3) {
			this._update_keystate();
			this._update_gamepadstate();
			this._update_mousestate();
		}
	}
	,_update_mousestate: function() {
		var $it0 = this.mouse_button_pressed.keys();
		while( $it0.hasNext() ) {
			var _code = $it0.next();
			if(this.mouse_button_pressed.h[_code]) this.mouse_button_pressed.remove(_code); else this.mouse_button_pressed.h[_code] = true;
		}
		var $it1 = this.mouse_button_released.keys();
		while( $it1.hasNext() ) {
			var _code1 = $it1.next();
			if(this.mouse_button_released.h[_code1]) this.mouse_button_released.remove(_code1); else this.mouse_button_released.h[_code1] = true;
		}
	}
	,_update_gamepadstate: function() {
		var $it0 = this.gamepad_button_pressed.iterator();
		while( $it0.hasNext() ) {
			var _gamepad_pressed = $it0.next();
			var $it1 = _gamepad_pressed.keys();
			while( $it1.hasNext() ) {
				var _button = $it1.next();
				if(_gamepad_pressed.h[_button]) _gamepad_pressed.remove(_button); else _gamepad_pressed.h[_button] = true;
			}
		}
		var $it2 = this.gamepad_button_released.iterator();
		while( $it2.hasNext() ) {
			var _gamepad_released = $it2.next();
			var $it3 = _gamepad_released.keys();
			while( $it3.hasNext() ) {
				var _button1 = $it3.next();
				if(_gamepad_released.h[_button1]) _gamepad_released.remove(_button1); else _gamepad_released.h[_button1] = true;
			}
		}
	}
	,_update_keystate: function() {
		var $it0 = this.key_code_pressed.keys();
		while( $it0.hasNext() ) {
			var _code = $it0.next();
			if(this.key_code_pressed.h[_code]) this.key_code_pressed.remove(_code); else this.key_code_pressed.h[_code] = true;
		}
		var $it1 = this.key_code_released.keys();
		while( $it1.hasNext() ) {
			var _code1 = $it1.next();
			if(this.key_code_released.h[_code1]) this.key_code_released.remove(_code1); else this.key_code_released.h[_code1] = true;
		}
		var $it2 = this.scan_code_pressed.keys();
		while( $it2.hasNext() ) {
			var _code2 = $it2.next();
			if(this.scan_code_pressed.h[_code2]) this.scan_code_pressed.remove(_code2); else this.scan_code_pressed.h[_code2] = true;
		}
		var $it3 = this.scan_code_released.keys();
		while( $it3.hasNext() ) {
			var _code3 = $it3.next();
			if(this.scan_code_released.h[_code3]) this.scan_code_released.remove(_code3); else this.scan_code_released.h[_code3] = true;
		}
	}
	,__class__: snow_systems_input_Input
};
var snow_systems_input_Scancodes = function() { };
$hxClasses["snow.systems.input.Scancodes"] = snow_systems_input_Scancodes;
snow_systems_input_Scancodes.__name__ = ["snow","systems","input","Scancodes"];
snow_systems_input_Scancodes.$name = function(scancode) {
	var res = null;
	if(scancode >= 0 && scancode < snow_systems_input_Scancodes.scancode_names.length) res = snow_systems_input_Scancodes.scancode_names[scancode];
	if(res != null) return res; else return "";
};
var snow_systems_input_Keycodes = function() { };
$hxClasses["snow.systems.input.Keycodes"] = snow_systems_input_Keycodes;
snow_systems_input_Keycodes.__name__ = ["snow","systems","input","Keycodes"];
snow_systems_input_Keycodes.from_scan = function(scancode) {
	return scancode | snow_systems_input_Scancodes.MASK;
};
snow_systems_input_Keycodes.to_scan = function(keycode) {
	if((keycode & snow_systems_input_Scancodes.MASK) != 0) return keycode & ~snow_systems_input_Scancodes.MASK;
	switch(keycode) {
	case 13:
		return snow_systems_input_Scancodes.enter;
	case 27:
		return snow_systems_input_Scancodes.escape;
	case 8:
		return snow_systems_input_Scancodes.backspace;
	case 9:
		return snow_systems_input_Scancodes.tab;
	case 32:
		return snow_systems_input_Scancodes.space;
	case 47:
		return snow_systems_input_Scancodes.slash;
	case 48:
		return snow_systems_input_Scancodes.key_0;
	case 49:
		return snow_systems_input_Scancodes.key_1;
	case 50:
		return snow_systems_input_Scancodes.key_2;
	case 51:
		return snow_systems_input_Scancodes.key_3;
	case 52:
		return snow_systems_input_Scancodes.key_4;
	case 53:
		return snow_systems_input_Scancodes.key_5;
	case 54:
		return snow_systems_input_Scancodes.key_6;
	case 55:
		return snow_systems_input_Scancodes.key_7;
	case 56:
		return snow_systems_input_Scancodes.key_8;
	case 57:
		return snow_systems_input_Scancodes.key_9;
	case 59:
		return snow_systems_input_Scancodes.semicolon;
	case 61:
		return snow_systems_input_Scancodes.equals;
	case 91:
		return snow_systems_input_Scancodes.leftbracket;
	case 92:
		return snow_systems_input_Scancodes.backslash;
	case 93:
		return snow_systems_input_Scancodes.rightbracket;
	case 96:
		return snow_systems_input_Scancodes.grave;
	case 97:
		return snow_systems_input_Scancodes.key_a;
	case 98:
		return snow_systems_input_Scancodes.key_b;
	case 99:
		return snow_systems_input_Scancodes.key_c;
	case 100:
		return snow_systems_input_Scancodes.key_d;
	case 101:
		return snow_systems_input_Scancodes.key_e;
	case 102:
		return snow_systems_input_Scancodes.key_f;
	case 103:
		return snow_systems_input_Scancodes.key_g;
	case 104:
		return snow_systems_input_Scancodes.key_h;
	case 105:
		return snow_systems_input_Scancodes.key_i;
	case 106:
		return snow_systems_input_Scancodes.key_j;
	case 107:
		return snow_systems_input_Scancodes.key_k;
	case 108:
		return snow_systems_input_Scancodes.key_l;
	case 109:
		return snow_systems_input_Scancodes.key_m;
	case 110:
		return snow_systems_input_Scancodes.key_n;
	case 111:
		return snow_systems_input_Scancodes.key_o;
	case 112:
		return snow_systems_input_Scancodes.key_p;
	case 113:
		return snow_systems_input_Scancodes.key_q;
	case 114:
		return snow_systems_input_Scancodes.key_r;
	case 115:
		return snow_systems_input_Scancodes.key_s;
	case 116:
		return snow_systems_input_Scancodes.key_t;
	case 117:
		return snow_systems_input_Scancodes.key_u;
	case 118:
		return snow_systems_input_Scancodes.key_v;
	case 119:
		return snow_systems_input_Scancodes.key_w;
	case 120:
		return snow_systems_input_Scancodes.key_x;
	case 121:
		return snow_systems_input_Scancodes.key_y;
	case 122:
		return snow_systems_input_Scancodes.key_z;
	}
	return snow_systems_input_Scancodes.unknown;
};
snow_systems_input_Keycodes.$name = function(keycode) {
	if((keycode & snow_systems_input_Scancodes.MASK) != 0) return snow_systems_input_Scancodes.$name(keycode & ~snow_systems_input_Scancodes.MASK);
	switch(keycode) {
	case 13:
		return snow_systems_input_Scancodes.$name(snow_systems_input_Scancodes.enter);
	case 27:
		return snow_systems_input_Scancodes.$name(snow_systems_input_Scancodes.escape);
	case 8:
		return snow_systems_input_Scancodes.$name(snow_systems_input_Scancodes.backspace);
	case 9:
		return snow_systems_input_Scancodes.$name(snow_systems_input_Scancodes.tab);
	case 32:
		return snow_systems_input_Scancodes.$name(snow_systems_input_Scancodes.space);
	case 127:
		return snow_systems_input_Scancodes.$name(snow_systems_input_Scancodes["delete"]);
	default:
		var decoder = new haxe_Utf8();
		decoder.__b += String.fromCharCode(keycode);
		return decoder.__b;
	}
};
var snow_systems_io_IO = function(_app) {
	this.string_save_prefix = "slot";
	this.app = _app;
	this.module = new snow_core_web_io_IO(this.app);
};
$hxClasses["snow.systems.io.IO"] = snow_systems_io_IO;
snow_systems_io_IO.__name__ = ["snow","systems","io","IO"];
snow_systems_io_IO.prototype = {
	app_path: function() {
		return this.module.app_path();
	}
	,app_path_prefs: function() {
		return this.module.app_path_prefs();
	}
	,url_open: function(_url) {
		this.module.url_open(_url);
	}
	,data_load: function(_path,_options) {
		return this.module.data_load(_path,_options);
	}
	,data_save: function(_path,_data,_options) {
		return this.module.data_save(_path,_data,_options);
	}
	,data_flow: function(_id,_processor,_provider) {
		var _g = this;
		if(_provider == null) _provider = $bind(this,this.default_provider);
		return new snow_api_Promise(function(resolve,reject) {
			_provider(_g.app,_id).then(function(data) {
				if(_processor != null) _processor(_g.app,_id,data).then(resolve,reject); else resolve(data);
			}).error(reject);
		});
	}
	,string_save_path: function(_slot) {
		if(_slot == null) _slot = 0;
		return this.module.string_save_path(_slot);
	}
	,string_save: function(_key,_value,_slot) {
		if(_slot == null) _slot = 0;
		var _string_map = this.string_slots_sync(_slot);
		var _encoded_key = window.btoa(_key);
		if(_value == null) _string_map.remove(_encoded_key); else {
			var _encoded_value = window.btoa(_value);
			if(__map_reserved[_encoded_key] != null) _string_map.setReserved(_encoded_key,_encoded_value); else _string_map.h[_encoded_key] = _encoded_value;
		}
		var _contents = haxe_Serializer.run(_string_map);
		_contents = window.btoa(_contents);
		return this.module.string_slot_save(_slot,_contents);
	}
	,string_load: function(_key,_slot) {
		if(_slot == null) _slot = 0;
		var _string_map = this.string_slots_sync(_slot);
		var _encoded_key = window.btoa(_key);
		var _encoded_value;
		_encoded_value = __map_reserved[_encoded_key] != null?_string_map.getReserved(_encoded_key):_string_map.h[_encoded_key];
		if(_encoded_value == null) return null;
		return window.atob(_encoded_value);
	}
	,string_destroy: function(_slot) {
		if(_slot == null) _slot = 0;
		if(this.string_slots == null) this.string_slots = new haxe_ds_IntMap(); else this.string_slots.remove(_slot);
		return this.module.string_slot_destroy(_slot);
	}
	,string_slots_sync: function(_slot) {
		if(_slot == null) _slot = 0;
		if(this.string_slots == null) this.string_slots = new haxe_ds_IntMap();
		var _string_map = this.string_slots.h[_slot];
		if(_string_map == null) {
			var _string = this.module.string_slot_load(_slot);
			if(_string == null) _string_map = new haxe_ds_StringMap(); else {
				_string = window.atob(_string);
				_string_map = haxe_Unserializer.run(_string);
			}
			this.string_slots.h[_slot] = _string_map;
		}
		return _string_map;
	}
	,default_provider: function(_app,_id) {
		return this.module.data_load(_id,null);
	}
	,onevent: function(_event) {
		this.module.onevent(_event);
	}
	,shutdown: function() {
		this.module.shutdown();
	}
	,__class__: snow_systems_io_IO
};
var snow_types_Config = function() { };
$hxClasses["snow.types.Config"] = snow_types_Config;
snow_types_Config.__name__ = ["snow","types","Config"];
var snow_types_Error = $hxClasses["snow.types.Error"] = { __ename__ : ["snow","types","Error"], __constructs__ : ["error","init","parse"] };
snow_types_Error.error = function(value) { var $x = ["error",0,value]; $x.__enum__ = snow_types_Error; $x.toString = $estr; return $x; };
snow_types_Error.init = function(value) { var $x = ["init",1,value]; $x.__enum__ = snow_types_Error; $x.toString = $estr; return $x; };
snow_types_Error.parse = function(value) { var $x = ["parse",2,value]; $x.__enum__ = snow_types_Error; $x.toString = $estr; return $x; };
snow_types_Error.__empty_constructs__ = [];
var snow_types__$Types_ApplyType = function() { };
$hxClasses["snow.types._Types.ApplyType"] = snow_types__$Types_ApplyType;
snow_types__$Types_ApplyType.__name__ = ["snow","types","_Types","ApplyType"];
var snow_types__$Types_ExtensionsInit = function() { };
$hxClasses["snow.types._Types.ExtensionsInit"] = snow_types__$Types_ExtensionsInit;
snow_types__$Types_ExtensionsInit.__name__ = ["snow","types","_Types","ExtensionsInit"];
var snow_types__$Types_AssetType_$Impl_$ = {};
$hxClasses["snow.types._Types.AssetType_Impl_"] = snow_types__$Types_AssetType_$Impl_$;
snow_types__$Types_AssetType_$Impl_$.__name__ = ["snow","types","_Types","AssetType_Impl_"];
snow_types__$Types_AssetType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "at_unknown";
	case 1:
		return "at_bytes";
	case 2:
		return "at_text";
	case 3:
		return "at_json";
	case 4:
		return "at_image";
	case 5:
		return "at_audio";
	default:
		return "" + this1;
	}
};
var snow_types_ImageData = function(_app,_options) {
	this.bpp_source = 4;
	this.bpp = 4;
	this.height_actual = 0;
	this.width_actual = 0;
	this.height = 0;
	this.width = 0;
	this.id = "ImageData";
	this.app = _app;
	if(_options.id == null) _options.id = this.id;
	this.id = _options.id;
	this.width = _options.width;
	this.height = _options.height;
	this.width_actual = _options.width_actual;
	this.height_actual = _options.height_actual;
	this.bpp = _options.bpp;
	this.bpp_source = _options.bpp_source;
	if(_options.pixels == null) _options.pixels = this.pixels;
	this.pixels = _options.pixels;
	_options = null;
};
$hxClasses["snow.types.ImageData"] = snow_types_ImageData;
snow_types_ImageData.__name__ = ["snow","types","ImageData"];
snow_types_ImageData.prototype = {
	destroy: function() {
		this.id = null;
		this.pixels = null;
	}
	,toString: function() {
		return "{ \"ImageData\":true, \"id\":" + this.id + ", \"width\":" + this.width + ", \"height\":" + this.height + ", \"width_actual\":" + this.width_actual + ", \"height_actual\":" + this.height_actual + ", \"bpp\":" + this.bpp + ", \"bpp_source\":" + this.bpp_source + " }";
	}
	,__class__: snow_types_ImageData
};
var snow_types__$Types_AudioFormatType_$Impl_$ = {};
$hxClasses["snow.types._Types.AudioFormatType_Impl_"] = snow_types__$Types_AudioFormatType_$Impl_$;
snow_types__$Types_AudioFormatType_$Impl_$.__name__ = ["snow","types","_Types","AudioFormatType_Impl_"];
snow_types__$Types_AudioFormatType_$Impl_$.toString = function(this1) {
	if(this1 != null) switch(this1) {
	case 0:
		return "af_unknown";
	case 1:
		return "af_custom";
	case 2:
		return "af_ogg";
	case 3:
		return "af_wav";
	case 4:
		return "af_pcm";
	default:
		return "" + this1;
	} else return "" + this1;
};
var snow_types__$Types_AudioEvent_$Impl_$ = {};
$hxClasses["snow.types._Types.AudioEvent_Impl_"] = snow_types__$Types_AudioEvent_$Impl_$;
snow_types__$Types_AudioEvent_$Impl_$.__name__ = ["snow","types","_Types","AudioEvent_Impl_"];
snow_types__$Types_AudioEvent_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "ae_end";
	case 1:
		return "ae_destroyed";
	case 2:
		return "ae_destroyed_source";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_AudioState_$Impl_$ = {};
$hxClasses["snow.types._Types.AudioState_Impl_"] = snow_types__$Types_AudioState_$Impl_$;
snow_types__$Types_AudioState_$Impl_$.__name__ = ["snow","types","_Types","AudioState_Impl_"];
snow_types__$Types_AudioState_$Impl_$.toString = function(this1) {
	switch(this1) {
	case -1:
		return "as_invalid";
	case 0:
		return "as_paused";
	case 1:
		return "as_playing";
	case 2:
		return "as_stopped";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_OpenGLProfile_$Impl_$ = {};
$hxClasses["snow.types._Types.OpenGLProfile_Impl_"] = snow_types__$Types_OpenGLProfile_$Impl_$;
snow_types__$Types_OpenGLProfile_$Impl_$.__name__ = ["snow","types","_Types","OpenGLProfile_Impl_"];
snow_types__$Types_OpenGLProfile_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "compatibility";
	case 1:
		return "core";
	case 2:
		return "gles";
	default:
		return "" + this1;
	}
};
var snow_types_SystemEvent = function() {
};
$hxClasses["snow.types.SystemEvent"] = snow_types_SystemEvent;
snow_types_SystemEvent.__name__ = ["snow","types","SystemEvent"];
snow_types_SystemEvent.prototype = {
	set: function(_type,_window,_input) {
		this.type = _type;
		this.window = _window;
		this.input = _input;
	}
	,toString: function() {
		var _s;
		_s = "{ \"SystemEvent\":true, \"type\":\"" + (function($this) {
			var $r;
			var this1 = $this.type;
			$r = (function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "se_unknown";
					break;
				case 1:
					$r = "se_init";
					break;
				case 2:
					$r = "se_ready";
					break;
				case 3:
					$r = "se_tick";
					break;
				case 4:
					$r = "se_freeze";
					break;
				case 5:
					$r = "se_unfreeze";
					break;
				case 7:
					$r = "se_shutdown";
					break;
				case 8:
					$r = "se_window";
					break;
				case 9:
					$r = "se_input";
					break;
				case 10:
					$r = "se_quit";
					break;
				case 11:
					$r = "se_app_terminating";
					break;
				case 12:
					$r = "se_app_lowmemory";
					break;
				case 13:
					$r = "se_app_willenterbackground";
					break;
				case 14:
					$r = "se_app_didenterbackground";
					break;
				case 15:
					$r = "se_app_willenterforeground";
					break;
				case 16:
					$r = "se_app_didenterforeground";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\"";
		if(this.window != null) _s += ", \"window\":" + Std.string(this.window);
		if(this.input != null) _s += ", \"input\":" + Std.string(this.input);
		_s += " }";
		return _s;
	}
	,__class__: snow_types_SystemEvent
};
var snow_types_WindowEvent = function() {
	this.window_id = -1;
	this.timestamp = 0.0;
	this.type = 0;
};
$hxClasses["snow.types.WindowEvent"] = snow_types_WindowEvent;
snow_types_WindowEvent.__name__ = ["snow","types","WindowEvent"];
snow_types_WindowEvent.prototype = {
	set: function(_type,_timestamp,_window_id,_x,_y) {
		this.type = _type;
		this.timestamp = _timestamp;
		this.window_id = _window_id;
		this.x = _x;
		this.y = _y;
	}
	,toString: function() {
		return "{ \"WindowEvent\":true, \"type\":\"" + (function($this) {
			var $r;
			var this1 = $this.type;
			$r = (function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "we_unknown";
					break;
				case 1:
					$r = "we_shown";
					break;
				case 2:
					$r = "we_hidden";
					break;
				case 3:
					$r = "we_exposed";
					break;
				case 4:
					$r = "we_moved";
					break;
				case 5:
					$r = "we_resized";
					break;
				case 6:
					$r = "we_size_changed";
					break;
				case 7:
					$r = "we_minimized";
					break;
				case 8:
					$r = "we_maximized";
					break;
				case 9:
					$r = "we_restored";
					break;
				case 10:
					$r = "we_enter";
					break;
				case 11:
					$r = "we_leave";
					break;
				case 12:
					$r = "we_focus_gained";
					break;
				case 13:
					$r = "we_focus_lost";
					break;
				case 14:
					$r = "we_close";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\", \"window\":" + this.window_id + ", \"x\":" + this.x + ", \"y\":" + this.y + ", \"time\":" + this.timestamp + " }";
	}
	,__class__: snow_types_WindowEvent
};
var snow_types_KeyEvent = function() {
};
$hxClasses["snow.types.KeyEvent"] = snow_types_KeyEvent;
snow_types_KeyEvent.__name__ = ["snow","types","KeyEvent"];
snow_types_KeyEvent.prototype = {
	set: function(_type,_keycode,_scancode,_repeat,_mod) {
		this.type = _type;
		this.keycode = _keycode;
		this.scancode = _scancode;
		this.repeat = _repeat;
		this.mod = _mod;
	}
	,toString: function() {
		return "{ \"KeyEvent\":true, \"type\":\"" + (function($this) {
			var $r;
			var this1 = $this.type;
			$r = (function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "ke_unknown";
					break;
				case 1:
					$r = "ke_down";
					break;
				case 2:
					$r = "ke_up";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\", \"keycode\":" + this.keycode + ", \"scancode\":" + this.scancode + ", \"repeat\":" + Std.string(this.repeat) + ", \"mod\":" + Std.string(this.mod) + " }";
	}
	,__class__: snow_types_KeyEvent
};
var snow_types_TextEvent = function() {
};
$hxClasses["snow.types.TextEvent"] = snow_types_TextEvent;
snow_types_TextEvent.__name__ = ["snow","types","TextEvent"];
snow_types_TextEvent.prototype = {
	set: function(_type,_text,_start,_length) {
		this.type = _type;
		this.text = _text;
		this.start = _start;
		this.length = _length;
	}
	,toString: function() {
		return "{ \"TextEvent\":true, \"type\":\"" + (function($this) {
			var $r;
			var this1 = $this.type;
			$r = (function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "te_unknown";
					break;
				case 1:
					$r = "te_edit";
					break;
				case 2:
					$r = "te_input";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\", \"text\":\"" + this.text + "\", \"start\":" + this.start + ", \"length\":" + this.length + " }";
	}
	,__class__: snow_types_TextEvent
};
var snow_types_MouseEvent = function() {
};
$hxClasses["snow.types.MouseEvent"] = snow_types_MouseEvent;
snow_types_MouseEvent.__name__ = ["snow","types","MouseEvent"];
snow_types_MouseEvent.prototype = {
	set: function(_type,_x,_y,_x_rel,_y_rel,_button,_wheel_x,_wheel_y) {
		this.type = _type;
		this.x = _x;
		this.y = _y;
		this.x_rel = _x_rel;
		this.y_rel = _y_rel;
		this.button = _button;
		this.wheel_x = _wheel_x;
		this.wheel_y = _wheel_y;
	}
	,toString: function() {
		return "{ \"MouseEvent\":true, \"type\":\"" + (function($this) {
			var $r;
			var this1 = $this.type;
			$r = (function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "me_unknown";
					break;
				case 1:
					$r = "me_move";
					break;
				case 2:
					$r = "me_down";
					break;
				case 3:
					$r = "me_up";
					break;
				case 4:
					$r = "me_wheel";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\", \"x\":" + this.x + ", \"y\":" + this.y + ", \"button\":" + this.button + ", \"x_rel\":" + this.x_rel + ", \"y_rel\":" + this.y_rel + ", \"wheel_x\":" + this.wheel_x + ", \"wheel_y\":" + this.wheel_y + " }";
	}
	,__class__: snow_types_MouseEvent
};
var snow_types_TouchEvent = function() {
};
$hxClasses["snow.types.TouchEvent"] = snow_types_TouchEvent;
snow_types_TouchEvent.__name__ = ["snow","types","TouchEvent"];
snow_types_TouchEvent.prototype = {
	set: function(_type,_id,_x,_y,_dx,_dy) {
		this.type = _type;
		this.touch_id = _id;
		this.x = _x;
		this.y = _y;
		this.dx = _dx;
		this.dy = _dy;
	}
	,toString: function() {
		return "{ \"TouchEvent\":true, \"type\":\"" + (function($this) {
			var $r;
			var this1 = $this.type;
			$r = (function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "te_unknown";
					break;
				case 1:
					$r = "te_move";
					break;
				case 2:
					$r = "te_down";
					break;
				case 3:
					$r = "te_up";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\", \"touch_id\":" + this.touch_id + ", \"x\":" + this.x + ", \"y\":" + this.y + ", \"dx\":" + this.dx + ", \"dy\":" + this.dy + " }";
	}
	,__class__: snow_types_TouchEvent
};
var snow_types_GamepadEvent = function() {
};
$hxClasses["snow.types.GamepadEvent"] = snow_types_GamepadEvent;
snow_types_GamepadEvent.__name__ = ["snow","types","GamepadEvent"];
snow_types_GamepadEvent.prototype = {
	set_axis: function(_gamepad,_axis,_value) {
		this.button = null;
		this.device_id = null;
		this.device_event = null;
		this.axis = _axis;
		this.value = _value;
		this.type = 1;
		this.gamepad = _gamepad;
	}
	,set_button: function(_type,_gamepad,_button,_value) {
		this.axis = null;
		this.device_id = null;
		this.device_event = null;
		this.type = _type;
		this.value = _value;
		this.button = _button;
		this.gamepad = _gamepad;
	}
	,set_device: function(_gamepad,_id,_event) {
		this.axis = null;
		this.value = null;
		this.button = null;
		this.device_id = _id;
		this.device_event = _event;
		this.gamepad = _gamepad;
		this.type = 4;
	}
	,toString: function() {
		return "{ \"GamepadEvent\":true, \"type\":\"" + (function($this) {
			var $r;
			var this1 = $this.type;
			$r = (function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "ge_unknown";
					break;
				case 1:
					$r = "ge_axis";
					break;
				case 2:
					$r = "ge_down";
					break;
				case 3:
					$r = "ge_up";
					break;
				case 4:
					$r = "ge_device";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\", \"gamepad\":" + this.gamepad + ", \"axis\":" + this.axis + ", \"button\":" + this.button + ", \"value\":" + this.value + ", \"device_id\":\"" + this.device_id + "\", \"device_event\":\"" + (function($this) {
			var $r;
			var this2 = $this.device_event;
			$r = (function($this) {
				var $r;
				switch(this2) {
				case 0:
					$r = "ge_unknown";
					break;
				case 1:
					$r = "ge_device_added";
					break;
				case 2:
					$r = "ge_device_removed";
					break;
				case 3:
					$r = "ge_device_remapped";
					break;
				default:
					$r = "" + this2;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\" }";
	}
	,__class__: snow_types_GamepadEvent
};
var snow_types_InputEvent = function() {
	this.window_id = -1;
	this.timestamp = 0.0;
};
$hxClasses["snow.types.InputEvent"] = snow_types_InputEvent;
snow_types_InputEvent.__name__ = ["snow","types","InputEvent"];
snow_types_InputEvent.prototype = {
	reset: function(_type,_window_id,_timestamp) {
		this.type = _type;
		this.key = null;
		this.text = null;
		this.mouse = null;
		this.touch = null;
		this.gamepad = null;
		this.window_id = _window_id;
		this.timestamp = _timestamp;
	}
	,set_key: function(_event,_window_id,_timestamp) {
		this.type = 1;
		this.key = null;
		this.text = null;
		this.mouse = null;
		this.touch = null;
		this.gamepad = null;
		this.window_id = _window_id;
		this.timestamp = _timestamp;
		this.key = _event;
	}
	,set_text: function(_event,_window_id,_timestamp) {
		this.type = 2;
		this.key = null;
		this.text = null;
		this.mouse = null;
		this.touch = null;
		this.gamepad = null;
		this.window_id = _window_id;
		this.timestamp = _timestamp;
		this.text = _event;
	}
	,set_mouse: function(_event,_window_id,_timestamp) {
		this.type = 3;
		this.key = null;
		this.text = null;
		this.mouse = null;
		this.touch = null;
		this.gamepad = null;
		this.window_id = _window_id;
		this.timestamp = _timestamp;
		this.mouse = _event;
	}
	,set_touch: function(_event,_timestamp) {
		this.type = 4;
		this.key = null;
		this.text = null;
		this.mouse = null;
		this.touch = null;
		this.gamepad = null;
		this.window_id = 0;
		this.timestamp = _timestamp;
		this.touch = _event;
	}
	,set_gamepad: function(_event,_timestamp) {
		this.type = 5;
		this.key = null;
		this.text = null;
		this.mouse = null;
		this.touch = null;
		this.gamepad = null;
		this.window_id = 0;
		this.timestamp = _timestamp;
		this.gamepad = _event;
	}
	,toString: function() {
		var _s;
		_s = "{ \"InputEvent\":true, \"type\":\"" + (function($this) {
			var $r;
			var this1 = $this.type;
			$r = (function($this) {
				var $r;
				switch(this1) {
				case 0:
					$r = "ie_unknown";
					break;
				case 1:
					$r = "ie_key";
					break;
				case 2:
					$r = "ie_text";
					break;
				case 3:
					$r = "ie_mouse";
					break;
				case 4:
					$r = "ie_touch";
					break;
				case 5:
					$r = "ie_gamepad";
					break;
				case 6:
					$r = "ie_joystick";
					break;
				default:
					$r = "" + this1;
				}
				return $r;
			}($this));
			return $r;
		}(this)) + "\"";
		if(this.key != null) _s += ", \"key\":" + Std.string(this.key);
		if(this.text != null) _s += ", \"text\":" + Std.string(this.text);
		if(this.mouse != null) _s += ", \"mouse\":" + Std.string(this.mouse);
		if(this.touch != null) _s += ", \"touch\":" + Std.string(this.touch);
		if(this.gamepad != null) _s += ", \"gamepad\":" + Std.string(this.gamepad);
		_s += "\"window\":" + this.window_id + ", \"time\":" + this.timestamp + " }";
		return _s;
	}
	,__class__: snow_types_InputEvent
};
var snow_types_ModState = function() {
	this.meta = false;
	this.alt = false;
	this.shift = false;
	this.ctrl = false;
	this.mode = false;
	this.caps = false;
	this.num = false;
	this.rmeta = false;
	this.lmeta = false;
	this.ralt = false;
	this.lalt = false;
	this.rctrl = false;
	this.lctrl = false;
	this.rshift = false;
	this.lshift = false;
	this.none = false;
};
$hxClasses["snow.types.ModState"] = snow_types_ModState;
snow_types_ModState.__name__ = ["snow","types","ModState"];
snow_types_ModState.prototype = {
	toString: function() {
		var _s = "{ \"ModState\":true ";
		if(this.none) return _s + ", \"none\":true }";
		if(this.lshift) _s += ", \"lshift\":true";
		if(this.rshift) _s += ", \"rshift\":true";
		if(this.lctrl) _s += ", \"lctrl\":true";
		if(this.rctrl) _s += ", \"rctrl\":true";
		if(this.lalt) _s += ", \"lalt\":true";
		if(this.ralt) _s += ", \"ralt\":true";
		if(this.lmeta) _s += ", \"lmeta\":true";
		if(this.rmeta) _s += ", \"rmeta\":true";
		if(this.num) _s += ", \"num\":true";
		if(this.caps) _s += ", \"caps\":true";
		if(this.mode) _s += ", \"mode\":true";
		if(this.ctrl) _s += ", \"ctrl\":true";
		if(this.shift) _s += ", \"shift\":true";
		if(this.alt) _s += ", \"alt\":true";
		if(this.meta) _s += ", \"meta\":true";
		_s += "}";
		return _s;
	}
	,__class__: snow_types_ModState
};
var snow_types__$Types_KeyEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.KeyEventType_Impl_"] = snow_types__$Types_KeyEventType_$Impl_$;
snow_types__$Types_KeyEventType_$Impl_$.__name__ = ["snow","types","_Types","KeyEventType_Impl_"];
snow_types__$Types_KeyEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "ke_unknown";
	case 1:
		return "ke_down";
	case 2:
		return "ke_up";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_MouseEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.MouseEventType_Impl_"] = snow_types__$Types_MouseEventType_$Impl_$;
snow_types__$Types_MouseEventType_$Impl_$.__name__ = ["snow","types","_Types","MouseEventType_Impl_"];
snow_types__$Types_MouseEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "me_unknown";
	case 1:
		return "me_move";
	case 2:
		return "me_down";
	case 3:
		return "me_up";
	case 4:
		return "me_wheel";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_TouchEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.TouchEventType_Impl_"] = snow_types__$Types_TouchEventType_$Impl_$;
snow_types__$Types_TouchEventType_$Impl_$.__name__ = ["snow","types","_Types","TouchEventType_Impl_"];
snow_types__$Types_TouchEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "te_unknown";
	case 1:
		return "te_move";
	case 2:
		return "te_down";
	case 3:
		return "te_up";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_GamepadEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.GamepadEventType_Impl_"] = snow_types__$Types_GamepadEventType_$Impl_$;
snow_types__$Types_GamepadEventType_$Impl_$.__name__ = ["snow","types","_Types","GamepadEventType_Impl_"];
snow_types__$Types_GamepadEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "ge_unknown";
	case 1:
		return "ge_axis";
	case 2:
		return "ge_down";
	case 3:
		return "ge_up";
	case 4:
		return "ge_device";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_TextEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.TextEventType_Impl_"] = snow_types__$Types_TextEventType_$Impl_$;
snow_types__$Types_TextEventType_$Impl_$.__name__ = ["snow","types","_Types","TextEventType_Impl_"];
snow_types__$Types_TextEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "te_unknown";
	case 1:
		return "te_edit";
	case 2:
		return "te_input";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_GamepadDeviceEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.GamepadDeviceEventType_Impl_"] = snow_types__$Types_GamepadDeviceEventType_$Impl_$;
snow_types__$Types_GamepadDeviceEventType_$Impl_$.__name__ = ["snow","types","_Types","GamepadDeviceEventType_Impl_"];
snow_types__$Types_GamepadDeviceEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "ge_unknown";
	case 1:
		return "ge_device_added";
	case 2:
		return "ge_device_removed";
	case 3:
		return "ge_device_remapped";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_SystemEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.SystemEventType_Impl_"] = snow_types__$Types_SystemEventType_$Impl_$;
snow_types__$Types_SystemEventType_$Impl_$.__name__ = ["snow","types","_Types","SystemEventType_Impl_"];
snow_types__$Types_SystemEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "se_unknown";
	case 1:
		return "se_init";
	case 2:
		return "se_ready";
	case 3:
		return "se_tick";
	case 4:
		return "se_freeze";
	case 5:
		return "se_unfreeze";
	case 7:
		return "se_shutdown";
	case 8:
		return "se_window";
	case 9:
		return "se_input";
	case 10:
		return "se_quit";
	case 11:
		return "se_app_terminating";
	case 12:
		return "se_app_lowmemory";
	case 13:
		return "se_app_willenterbackground";
	case 14:
		return "se_app_didenterbackground";
	case 15:
		return "se_app_willenterforeground";
	case 16:
		return "se_app_didenterforeground";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_WindowEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.WindowEventType_Impl_"] = snow_types__$Types_WindowEventType_$Impl_$;
snow_types__$Types_WindowEventType_$Impl_$.__name__ = ["snow","types","_Types","WindowEventType_Impl_"];
snow_types__$Types_WindowEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "we_unknown";
	case 1:
		return "we_shown";
	case 2:
		return "we_hidden";
	case 3:
		return "we_exposed";
	case 4:
		return "we_moved";
	case 5:
		return "we_resized";
	case 6:
		return "we_size_changed";
	case 7:
		return "we_minimized";
	case 8:
		return "we_maximized";
	case 9:
		return "we_restored";
	case 10:
		return "we_enter";
	case 11:
		return "we_leave";
	case 12:
		return "we_focus_gained";
	case 13:
		return "we_focus_lost";
	case 14:
		return "we_close";
	default:
		return "" + this1;
	}
};
var snow_types__$Types_InputEventType_$Impl_$ = {};
$hxClasses["snow.types._Types.InputEventType_Impl_"] = snow_types__$Types_InputEventType_$Impl_$;
snow_types__$Types_InputEventType_$Impl_$.__name__ = ["snow","types","_Types","InputEventType_Impl_"];
snow_types__$Types_InputEventType_$Impl_$.toString = function(this1) {
	switch(this1) {
	case 0:
		return "ie_unknown";
	case 1:
		return "ie_key";
	case 2:
		return "ie_text";
	case 3:
		return "ie_mouse";
	case 4:
		return "ie_touch";
	case 5:
		return "ie_gamepad";
	case 6:
		return "ie_joystick";
	default:
		return "" + this1;
	}
};
function $iterator(o) { if( o instanceof Array ) return function() { return HxOverrides.iter(o); }; return typeof(o.iterator) == 'function' ? $bind(o,o.iterator) : o.iterator; }
var $_, $fid = 0;
function $bind(o,m) { if( m == null ) return null; if( m.__id__ == null ) m.__id__ = $fid++; var f; if( o.hx__closures__ == null ) o.hx__closures__ = {}; else f = o.hx__closures__[m.__id__]; if( f == null ) { f = function(){ return f.method.apply(f.scope, arguments); }; f.scope = o; f.method = m; o.hx__closures__[m.__id__] = f; } return f; }
if(Array.prototype.indexOf) HxOverrides.indexOf = function(a,o,i) {
	return Array.prototype.indexOf.call(a,o,i);
};
$hxClasses.Math = Math;
String.prototype.__class__ = $hxClasses.String = String;
String.__name__ = ["String"];
$hxClasses.Array = Array;
Array.__name__ = ["Array"];
Date.prototype.__class__ = $hxClasses.Date = Date;
Date.__name__ = ["Date"];
var Int = $hxClasses.Int = { __name__ : ["Int"]};
var Dynamic = $hxClasses.Dynamic = { __name__ : ["Dynamic"]};
var Float = $hxClasses.Float = Number;
Float.__name__ = ["Float"];
var Bool = $hxClasses.Bool = Boolean;
Bool.__ename__ = ["Bool"];
var Class = $hxClasses.Class = { __name__ : ["Class"]};
var Enum = { };
if(Array.prototype.filter == null) Array.prototype.filter = function(f1) {
	var a1 = [];
	var _g11 = 0;
	var _g2 = this.length;
	while(_g11 < _g2) {
		var i1 = _g11++;
		var e = this[i1];
		if(f1(e)) a1.push(e);
	}
	return a1;
};
var __map_reserved = {}
var ArrayBuffer = $global.ArrayBuffer || js_html_compat_ArrayBuffer;
if(ArrayBuffer.prototype.slice == null) ArrayBuffer.prototype.slice = js_html_compat_ArrayBuffer.sliceImpl;
var DataView = $global.DataView || js_html_compat_DataView;
var Uint8Array = $global.Uint8Array || js_html_compat_Uint8Array._new;
Main.OFFSCREEN_RENDER = true;
gltoolbox_GeometryTools.unitQuadCache = new haxe_ds_IntMap();
gltoolbox_GeometryTools.clipSpaceQuadCache = new haxe_ds_IntMap();
gltoolbox_TextureTools.defaultParams = { channelType : 6408, dataType : 5121, filter : 9728, wrapS : 33071, wrapT : 33071, unpackAlignment : 4};
js_Boot.__toStr = {}.toString;
gltoolbox_shaders_Resample.instance = new gltoolbox_shaders_Resample();
haxe_Serializer.USE_CACHE = false;
haxe_Serializer.USE_ENUM_INDEX = false;
haxe_Serializer.BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%:";
haxe_Unserializer.DEFAULT_RESOLVER = Type;
haxe_Unserializer.BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%:";
haxe_ds_ObjectMap.count = 0;
haxe_io_FPHelper.i64tmp = (function($this) {
	var $r;
	var x = new haxe__$Int64__$_$_$Int64(0,0);
	$r = x;
	return $r;
}(this));
js_html_compat_Uint8Array.BYTES_PER_ELEMENT = 1;
shaderblox_glsl_GLSLTools.PRECISION_QUALIFIERS = ["lowp","mediump","highp"];
shaderblox_glsl_GLSLTools.MAIN_FUNC_REGEX = new EReg("(\\s|^)((" + shaderblox_glsl_GLSLTools.PRECISION_QUALIFIERS.join("|") + ")\\s+)?(void)\\s+(main)\\s*\\([^\\)]*\\)\\s*\\{","m");
shaderblox_glsl_GLSLTools.STORAGE_QUALIFIERS = ["const","attribute","uniform","varying"];
shaderblox_glsl_GLSLTools.STORAGE_QUALIFIER_TYPES = (function($this) {
	var $r;
	var _g = new haxe_ds_StringMap();
	_g.set("const",["bool","int","float","vec2","vec3","vec4","bvec2","bvec3","bvec4","ivec2","ivec3","ivec4","mat2","mat3","mat4"]);
	_g.set("attribute",["float","vec2","vec3","vec4","mat2","mat3","mat4"]);
	_g.set("uniform",["bool","int","float","vec2","vec3","vec4","bvec2","bvec3","bvec4","ivec2","ivec3","ivec4","mat2","mat3","mat4","sampler2D","samplerCube"]);
	_g.set("varying",["float","vec2","vec3","vec4","mat2","mat3","mat4"]);
	$r = _g;
	return $r;
}(this));
shaderblox_uniforms_UTexture.lastActiveTexture = -1;
snow_Snow.next_queue = [];
snow_Snow.defer_queue = [];
snow_api_Debug._level = 1;
snow_api_Debug._log_width = 16;
snow_api_Promises.calls = [];
snow_api_Promises.defers = [];
snow_api_Timer.running_timers = [];
snow_api_buffers__$Float32Array_Float32Array_$Impl_$.BYTES_PER_ELEMENT = 4;
snow_api_buffers__$Int32Array_Int32Array_$Impl_$.BYTES_PER_ELEMENT = 4;
snow_api_buffers__$Uint8Array_Uint8Array_$Impl_$.BYTES_PER_ELEMENT = 1;
snow_core_web_Runtime.web_window_id = 1;
snow_core_web_Runtime.timestamp_start = 0.0;
snow_core_web_Runtime.key_press_ignored = [8,13];
snow_core_web__$Runtime_DOMKeys.dom_shift = 16;
snow_core_web__$Runtime_DOMKeys.dom_ctrl = 17;
snow_core_web__$Runtime_DOMKeys.dom_alt = 18;
snow_core_web__$Runtime_DOMKeys.dom_capslock = 20;
snow_core_web__$Runtime_DOMKeys.dom_pageup = 33;
snow_core_web__$Runtime_DOMKeys.dom_pagedown = 34;
snow_core_web__$Runtime_DOMKeys.dom_end = 35;
snow_core_web__$Runtime_DOMKeys.dom_home = 36;
snow_core_web__$Runtime_DOMKeys.dom_left = 37;
snow_core_web__$Runtime_DOMKeys.dom_up = 38;
snow_core_web__$Runtime_DOMKeys.dom_right = 39;
snow_core_web__$Runtime_DOMKeys.dom_down = 40;
snow_core_web__$Runtime_DOMKeys.dom_printscr = 44;
snow_core_web__$Runtime_DOMKeys.dom_insert = 45;
snow_core_web__$Runtime_DOMKeys.dom_delete = 46;
snow_core_web__$Runtime_DOMKeys.dom_lmeta = 91;
snow_core_web__$Runtime_DOMKeys.dom_rmeta = 93;
snow_core_web__$Runtime_DOMKeys.dom_kp_0 = 96;
snow_core_web__$Runtime_DOMKeys.dom_kp_1 = 97;
snow_core_web__$Runtime_DOMKeys.dom_kp_2 = 98;
snow_core_web__$Runtime_DOMKeys.dom_kp_3 = 99;
snow_core_web__$Runtime_DOMKeys.dom_kp_4 = 100;
snow_core_web__$Runtime_DOMKeys.dom_kp_5 = 101;
snow_core_web__$Runtime_DOMKeys.dom_kp_6 = 102;
snow_core_web__$Runtime_DOMKeys.dom_kp_7 = 103;
snow_core_web__$Runtime_DOMKeys.dom_kp_8 = 104;
snow_core_web__$Runtime_DOMKeys.dom_kp_9 = 105;
snow_core_web__$Runtime_DOMKeys.dom_kp_multiply = 106;
snow_core_web__$Runtime_DOMKeys.dom_kp_plus = 107;
snow_core_web__$Runtime_DOMKeys.dom_kp_minus = 109;
snow_core_web__$Runtime_DOMKeys.dom_kp_decimal = 110;
snow_core_web__$Runtime_DOMKeys.dom_kp_divide = 111;
snow_core_web__$Runtime_DOMKeys.dom_kp_numlock = 144;
snow_core_web__$Runtime_DOMKeys.dom_f1 = 112;
snow_core_web__$Runtime_DOMKeys.dom_f2 = 113;
snow_core_web__$Runtime_DOMKeys.dom_f3 = 114;
snow_core_web__$Runtime_DOMKeys.dom_f4 = 115;
snow_core_web__$Runtime_DOMKeys.dom_f5 = 116;
snow_core_web__$Runtime_DOMKeys.dom_f6 = 117;
snow_core_web__$Runtime_DOMKeys.dom_f7 = 118;
snow_core_web__$Runtime_DOMKeys.dom_f8 = 119;
snow_core_web__$Runtime_DOMKeys.dom_f9 = 120;
snow_core_web__$Runtime_DOMKeys.dom_f10 = 121;
snow_core_web__$Runtime_DOMKeys.dom_f11 = 122;
snow_core_web__$Runtime_DOMKeys.dom_f12 = 123;
snow_core_web__$Runtime_DOMKeys.dom_f13 = 124;
snow_core_web__$Runtime_DOMKeys.dom_f14 = 125;
snow_core_web__$Runtime_DOMKeys.dom_f15 = 126;
snow_core_web__$Runtime_DOMKeys.dom_f16 = 127;
snow_core_web__$Runtime_DOMKeys.dom_f17 = 128;
snow_core_web__$Runtime_DOMKeys.dom_f18 = 129;
snow_core_web__$Runtime_DOMKeys.dom_f19 = 130;
snow_core_web__$Runtime_DOMKeys.dom_f20 = 131;
snow_core_web__$Runtime_DOMKeys.dom_f21 = 132;
snow_core_web__$Runtime_DOMKeys.dom_f22 = 133;
snow_core_web__$Runtime_DOMKeys.dom_f23 = 134;
snow_core_web__$Runtime_DOMKeys.dom_f24 = 135;
snow_core_web__$Runtime_DOMKeys.dom_caret = 160;
snow_core_web__$Runtime_DOMKeys.dom_exclaim = 161;
snow_core_web__$Runtime_DOMKeys.dom_quotedbl = 162;
snow_core_web__$Runtime_DOMKeys.dom_hash = 163;
snow_core_web__$Runtime_DOMKeys.dom_dollar = 164;
snow_core_web__$Runtime_DOMKeys.dom_percent = 165;
snow_core_web__$Runtime_DOMKeys.dom_ampersand = 166;
snow_core_web__$Runtime_DOMKeys.dom_underscore = 167;
snow_core_web__$Runtime_DOMKeys.dom_leftparen = 168;
snow_core_web__$Runtime_DOMKeys.dom_rightparen = 169;
snow_core_web__$Runtime_DOMKeys.dom_asterisk = 170;
snow_core_web__$Runtime_DOMKeys.dom_plus = 171;
snow_core_web__$Runtime_DOMKeys.dom_pipe = 172;
snow_core_web__$Runtime_DOMKeys.dom_minus = 173;
snow_core_web__$Runtime_DOMKeys.dom_leftbrace = 174;
snow_core_web__$Runtime_DOMKeys.dom_rightbrace = 175;
snow_core_web__$Runtime_DOMKeys.dom_tilde = 176;
snow_core_web__$Runtime_DOMKeys.dom_audiomute = 181;
snow_core_web__$Runtime_DOMKeys.dom_volumedown = 182;
snow_core_web__$Runtime_DOMKeys.dom_volumeup = 183;
snow_core_web__$Runtime_DOMKeys.dom_comma = 188;
snow_core_web__$Runtime_DOMKeys.dom_period = 190;
snow_core_web__$Runtime_DOMKeys.dom_slash = 191;
snow_core_web__$Runtime_DOMKeys.dom_backquote = 192;
snow_core_web__$Runtime_DOMKeys.dom_leftbracket = 219;
snow_core_web__$Runtime_DOMKeys.dom_rightbracket = 221;
snow_core_web__$Runtime_DOMKeys.dom_backslash = 220;
snow_core_web__$Runtime_DOMKeys.dom_quote = 222;
snow_core_web__$Runtime_DOMKeys.dom_meta = 224;
snow_core_web_assets_Assets.POT = true;
snow_modules_opengl_web_GL.DEPTH_BUFFER_BIT = 256;
snow_modules_opengl_web_GL.STENCIL_BUFFER_BIT = 1024;
snow_modules_opengl_web_GL.COLOR_BUFFER_BIT = 16384;
snow_modules_opengl_web_GL.POINTS = 0;
snow_modules_opengl_web_GL.LINES = 1;
snow_modules_opengl_web_GL.LINE_LOOP = 2;
snow_modules_opengl_web_GL.LINE_STRIP = 3;
snow_modules_opengl_web_GL.TRIANGLES = 4;
snow_modules_opengl_web_GL.TRIANGLE_STRIP = 5;
snow_modules_opengl_web_GL.TRIANGLE_FAN = 6;
snow_modules_opengl_web_GL.ZERO = 0;
snow_modules_opengl_web_GL.ONE = 1;
snow_modules_opengl_web_GL.SRC_COLOR = 768;
snow_modules_opengl_web_GL.ONE_MINUS_SRC_COLOR = 769;
snow_modules_opengl_web_GL.SRC_ALPHA = 770;
snow_modules_opengl_web_GL.ONE_MINUS_SRC_ALPHA = 771;
snow_modules_opengl_web_GL.DST_ALPHA = 772;
snow_modules_opengl_web_GL.ONE_MINUS_DST_ALPHA = 773;
snow_modules_opengl_web_GL.DST_COLOR = 774;
snow_modules_opengl_web_GL.ONE_MINUS_DST_COLOR = 775;
snow_modules_opengl_web_GL.SRC_ALPHA_SATURATE = 776;
snow_modules_opengl_web_GL.FUNC_ADD = 32774;
snow_modules_opengl_web_GL.BLEND_EQUATION = 32777;
snow_modules_opengl_web_GL.BLEND_EQUATION_RGB = 32777;
snow_modules_opengl_web_GL.BLEND_EQUATION_ALPHA = 34877;
snow_modules_opengl_web_GL.FUNC_SUBTRACT = 32778;
snow_modules_opengl_web_GL.FUNC_REVERSE_SUBTRACT = 32779;
snow_modules_opengl_web_GL.BLEND_DST_RGB = 32968;
snow_modules_opengl_web_GL.BLEND_SRC_RGB = 32969;
snow_modules_opengl_web_GL.BLEND_DST_ALPHA = 32970;
snow_modules_opengl_web_GL.BLEND_SRC_ALPHA = 32971;
snow_modules_opengl_web_GL.CONSTANT_COLOR = 32769;
snow_modules_opengl_web_GL.ONE_MINUS_CONSTANT_COLOR = 32770;
snow_modules_opengl_web_GL.CONSTANT_ALPHA = 32771;
snow_modules_opengl_web_GL.ONE_MINUS_CONSTANT_ALPHA = 32772;
snow_modules_opengl_web_GL.BLEND_COLOR = 32773;
snow_modules_opengl_web_GL.ARRAY_BUFFER = 34962;
snow_modules_opengl_web_GL.ELEMENT_ARRAY_BUFFER = 34963;
snow_modules_opengl_web_GL.ARRAY_BUFFER_BINDING = 34964;
snow_modules_opengl_web_GL.ELEMENT_ARRAY_BUFFER_BINDING = 34965;
snow_modules_opengl_web_GL.STREAM_DRAW = 35040;
snow_modules_opengl_web_GL.STATIC_DRAW = 35044;
snow_modules_opengl_web_GL.DYNAMIC_DRAW = 35048;
snow_modules_opengl_web_GL.BUFFER_SIZE = 34660;
snow_modules_opengl_web_GL.BUFFER_USAGE = 34661;
snow_modules_opengl_web_GL.CURRENT_VERTEX_ATTRIB = 34342;
snow_modules_opengl_web_GL.FRONT = 1028;
snow_modules_opengl_web_GL.BACK = 1029;
snow_modules_opengl_web_GL.FRONT_AND_BACK = 1032;
snow_modules_opengl_web_GL.CULL_FACE = 2884;
snow_modules_opengl_web_GL.BLEND = 3042;
snow_modules_opengl_web_GL.DITHER = 3024;
snow_modules_opengl_web_GL.STENCIL_TEST = 2960;
snow_modules_opengl_web_GL.DEPTH_TEST = 2929;
snow_modules_opengl_web_GL.SCISSOR_TEST = 3089;
snow_modules_opengl_web_GL.POLYGON_OFFSET_FILL = 32823;
snow_modules_opengl_web_GL.SAMPLE_ALPHA_TO_COVERAGE = 32926;
snow_modules_opengl_web_GL.SAMPLE_COVERAGE = 32928;
snow_modules_opengl_web_GL.NO_ERROR = 0;
snow_modules_opengl_web_GL.INVALID_ENUM = 1280;
snow_modules_opengl_web_GL.INVALID_VALUE = 1281;
snow_modules_opengl_web_GL.INVALID_OPERATION = 1282;
snow_modules_opengl_web_GL.OUT_OF_MEMORY = 1285;
snow_modules_opengl_web_GL.CW = 2304;
snow_modules_opengl_web_GL.CCW = 2305;
snow_modules_opengl_web_GL.LINE_WIDTH = 2849;
snow_modules_opengl_web_GL.ALIASED_POINT_SIZE_RANGE = 33901;
snow_modules_opengl_web_GL.ALIASED_LINE_WIDTH_RANGE = 33902;
snow_modules_opengl_web_GL.CULL_FACE_MODE = 2885;
snow_modules_opengl_web_GL.FRONT_FACE = 2886;
snow_modules_opengl_web_GL.DEPTH_RANGE = 2928;
snow_modules_opengl_web_GL.DEPTH_WRITEMASK = 2930;
snow_modules_opengl_web_GL.DEPTH_CLEAR_VALUE = 2931;
snow_modules_opengl_web_GL.DEPTH_FUNC = 2932;
snow_modules_opengl_web_GL.STENCIL_CLEAR_VALUE = 2961;
snow_modules_opengl_web_GL.STENCIL_FUNC = 2962;
snow_modules_opengl_web_GL.STENCIL_FAIL = 2964;
snow_modules_opengl_web_GL.STENCIL_PASS_DEPTH_FAIL = 2965;
snow_modules_opengl_web_GL.STENCIL_PASS_DEPTH_PASS = 2966;
snow_modules_opengl_web_GL.STENCIL_REF = 2967;
snow_modules_opengl_web_GL.STENCIL_VALUE_MASK = 2963;
snow_modules_opengl_web_GL.STENCIL_WRITEMASK = 2968;
snow_modules_opengl_web_GL.STENCIL_BACK_FUNC = 34816;
snow_modules_opengl_web_GL.STENCIL_BACK_FAIL = 34817;
snow_modules_opengl_web_GL.STENCIL_BACK_PASS_DEPTH_FAIL = 34818;
snow_modules_opengl_web_GL.STENCIL_BACK_PASS_DEPTH_PASS = 34819;
snow_modules_opengl_web_GL.STENCIL_BACK_REF = 36003;
snow_modules_opengl_web_GL.STENCIL_BACK_VALUE_MASK = 36004;
snow_modules_opengl_web_GL.STENCIL_BACK_WRITEMASK = 36005;
snow_modules_opengl_web_GL.VIEWPORT = 2978;
snow_modules_opengl_web_GL.SCISSOR_BOX = 3088;
snow_modules_opengl_web_GL.COLOR_CLEAR_VALUE = 3106;
snow_modules_opengl_web_GL.COLOR_WRITEMASK = 3107;
snow_modules_opengl_web_GL.UNPACK_ALIGNMENT = 3317;
snow_modules_opengl_web_GL.PACK_ALIGNMENT = 3333;
snow_modules_opengl_web_GL.MAX_TEXTURE_SIZE = 3379;
snow_modules_opengl_web_GL.MAX_VIEWPORT_DIMS = 3386;
snow_modules_opengl_web_GL.SUBPIXEL_BITS = 3408;
snow_modules_opengl_web_GL.RED_BITS = 3410;
snow_modules_opengl_web_GL.GREEN_BITS = 3411;
snow_modules_opengl_web_GL.BLUE_BITS = 3412;
snow_modules_opengl_web_GL.ALPHA_BITS = 3413;
snow_modules_opengl_web_GL.DEPTH_BITS = 3414;
snow_modules_opengl_web_GL.STENCIL_BITS = 3415;
snow_modules_opengl_web_GL.POLYGON_OFFSET_UNITS = 10752;
snow_modules_opengl_web_GL.POLYGON_OFFSET_FACTOR = 32824;
snow_modules_opengl_web_GL.TEXTURE_BINDING_2D = 32873;
snow_modules_opengl_web_GL.SAMPLE_BUFFERS = 32936;
snow_modules_opengl_web_GL.SAMPLES = 32937;
snow_modules_opengl_web_GL.SAMPLE_COVERAGE_VALUE = 32938;
snow_modules_opengl_web_GL.SAMPLE_COVERAGE_INVERT = 32939;
snow_modules_opengl_web_GL.COMPRESSED_TEXTURE_FORMATS = 34467;
snow_modules_opengl_web_GL.DONT_CARE = 4352;
snow_modules_opengl_web_GL.FASTEST = 4353;
snow_modules_opengl_web_GL.NICEST = 4354;
snow_modules_opengl_web_GL.GENERATE_MIPMAP_HINT = 33170;
snow_modules_opengl_web_GL.BYTE = 5120;
snow_modules_opengl_web_GL.UNSIGNED_BYTE = 5121;
snow_modules_opengl_web_GL.SHORT = 5122;
snow_modules_opengl_web_GL.UNSIGNED_SHORT = 5123;
snow_modules_opengl_web_GL.INT = 5124;
snow_modules_opengl_web_GL.UNSIGNED_INT = 5125;
snow_modules_opengl_web_GL.FLOAT = 5126;
snow_modules_opengl_web_GL.DEPTH_COMPONENT = 6402;
snow_modules_opengl_web_GL.ALPHA = 6406;
snow_modules_opengl_web_GL.RGB = 6407;
snow_modules_opengl_web_GL.RGBA = 6408;
snow_modules_opengl_web_GL.LUMINANCE = 6409;
snow_modules_opengl_web_GL.LUMINANCE_ALPHA = 6410;
snow_modules_opengl_web_GL.UNSIGNED_SHORT_4_4_4_4 = 32819;
snow_modules_opengl_web_GL.UNSIGNED_SHORT_5_5_5_1 = 32820;
snow_modules_opengl_web_GL.UNSIGNED_SHORT_5_6_5 = 33635;
snow_modules_opengl_web_GL.FRAGMENT_SHADER = 35632;
snow_modules_opengl_web_GL.VERTEX_SHADER = 35633;
snow_modules_opengl_web_GL.MAX_VERTEX_ATTRIBS = 34921;
snow_modules_opengl_web_GL.MAX_VERTEX_UNIFORM_VECTORS = 36347;
snow_modules_opengl_web_GL.MAX_VARYING_VECTORS = 36348;
snow_modules_opengl_web_GL.MAX_COMBINED_TEXTURE_IMAGE_UNITS = 35661;
snow_modules_opengl_web_GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS = 35660;
snow_modules_opengl_web_GL.MAX_TEXTURE_IMAGE_UNITS = 34930;
snow_modules_opengl_web_GL.MAX_FRAGMENT_UNIFORM_VECTORS = 36349;
snow_modules_opengl_web_GL.SHADER_TYPE = 35663;
snow_modules_opengl_web_GL.DELETE_STATUS = 35712;
snow_modules_opengl_web_GL.LINK_STATUS = 35714;
snow_modules_opengl_web_GL.VALIDATE_STATUS = 35715;
snow_modules_opengl_web_GL.ATTACHED_SHADERS = 35717;
snow_modules_opengl_web_GL.ACTIVE_UNIFORMS = 35718;
snow_modules_opengl_web_GL.ACTIVE_ATTRIBUTES = 35721;
snow_modules_opengl_web_GL.SHADING_LANGUAGE_VERSION = 35724;
snow_modules_opengl_web_GL.CURRENT_PROGRAM = 35725;
snow_modules_opengl_web_GL.NEVER = 512;
snow_modules_opengl_web_GL.LESS = 513;
snow_modules_opengl_web_GL.EQUAL = 514;
snow_modules_opengl_web_GL.LEQUAL = 515;
snow_modules_opengl_web_GL.GREATER = 516;
snow_modules_opengl_web_GL.NOTEQUAL = 517;
snow_modules_opengl_web_GL.GEQUAL = 518;
snow_modules_opengl_web_GL.ALWAYS = 519;
snow_modules_opengl_web_GL.KEEP = 7680;
snow_modules_opengl_web_GL.REPLACE = 7681;
snow_modules_opengl_web_GL.INCR = 7682;
snow_modules_opengl_web_GL.DECR = 7683;
snow_modules_opengl_web_GL.INVERT = 5386;
snow_modules_opengl_web_GL.INCR_WRAP = 34055;
snow_modules_opengl_web_GL.DECR_WRAP = 34056;
snow_modules_opengl_web_GL.VENDOR = 7936;
snow_modules_opengl_web_GL.RENDERER = 7937;
snow_modules_opengl_web_GL.VERSION = 7938;
snow_modules_opengl_web_GL.NEAREST = 9728;
snow_modules_opengl_web_GL.LINEAR = 9729;
snow_modules_opengl_web_GL.NEAREST_MIPMAP_NEAREST = 9984;
snow_modules_opengl_web_GL.LINEAR_MIPMAP_NEAREST = 9985;
snow_modules_opengl_web_GL.NEAREST_MIPMAP_LINEAR = 9986;
snow_modules_opengl_web_GL.LINEAR_MIPMAP_LINEAR = 9987;
snow_modules_opengl_web_GL.TEXTURE_MAG_FILTER = 10240;
snow_modules_opengl_web_GL.TEXTURE_MIN_FILTER = 10241;
snow_modules_opengl_web_GL.TEXTURE_WRAP_S = 10242;
snow_modules_opengl_web_GL.TEXTURE_WRAP_T = 10243;
snow_modules_opengl_web_GL.TEXTURE_2D = 3553;
snow_modules_opengl_web_GL.TEXTURE = 5890;
snow_modules_opengl_web_GL.TEXTURE_CUBE_MAP = 34067;
snow_modules_opengl_web_GL.TEXTURE_BINDING_CUBE_MAP = 34068;
snow_modules_opengl_web_GL.TEXTURE_CUBE_MAP_POSITIVE_X = 34069;
snow_modules_opengl_web_GL.TEXTURE_CUBE_MAP_NEGATIVE_X = 34070;
snow_modules_opengl_web_GL.TEXTURE_CUBE_MAP_POSITIVE_Y = 34071;
snow_modules_opengl_web_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072;
snow_modules_opengl_web_GL.TEXTURE_CUBE_MAP_POSITIVE_Z = 34073;
snow_modules_opengl_web_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074;
snow_modules_opengl_web_GL.MAX_CUBE_MAP_TEXTURE_SIZE = 34076;
snow_modules_opengl_web_GL.TEXTURE0 = 33984;
snow_modules_opengl_web_GL.TEXTURE1 = 33985;
snow_modules_opengl_web_GL.TEXTURE2 = 33986;
snow_modules_opengl_web_GL.TEXTURE3 = 33987;
snow_modules_opengl_web_GL.TEXTURE4 = 33988;
snow_modules_opengl_web_GL.TEXTURE5 = 33989;
snow_modules_opengl_web_GL.TEXTURE6 = 33990;
snow_modules_opengl_web_GL.TEXTURE7 = 33991;
snow_modules_opengl_web_GL.TEXTURE8 = 33992;
snow_modules_opengl_web_GL.TEXTURE9 = 33993;
snow_modules_opengl_web_GL.TEXTURE10 = 33994;
snow_modules_opengl_web_GL.TEXTURE11 = 33995;
snow_modules_opengl_web_GL.TEXTURE12 = 33996;
snow_modules_opengl_web_GL.TEXTURE13 = 33997;
snow_modules_opengl_web_GL.TEXTURE14 = 33998;
snow_modules_opengl_web_GL.TEXTURE15 = 33999;
snow_modules_opengl_web_GL.TEXTURE16 = 34000;
snow_modules_opengl_web_GL.TEXTURE17 = 34001;
snow_modules_opengl_web_GL.TEXTURE18 = 34002;
snow_modules_opengl_web_GL.TEXTURE19 = 34003;
snow_modules_opengl_web_GL.TEXTURE20 = 34004;
snow_modules_opengl_web_GL.TEXTURE21 = 34005;
snow_modules_opengl_web_GL.TEXTURE22 = 34006;
snow_modules_opengl_web_GL.TEXTURE23 = 34007;
snow_modules_opengl_web_GL.TEXTURE24 = 34008;
snow_modules_opengl_web_GL.TEXTURE25 = 34009;
snow_modules_opengl_web_GL.TEXTURE26 = 34010;
snow_modules_opengl_web_GL.TEXTURE27 = 34011;
snow_modules_opengl_web_GL.TEXTURE28 = 34012;
snow_modules_opengl_web_GL.TEXTURE29 = 34013;
snow_modules_opengl_web_GL.TEXTURE30 = 34014;
snow_modules_opengl_web_GL.TEXTURE31 = 34015;
snow_modules_opengl_web_GL.ACTIVE_TEXTURE = 34016;
snow_modules_opengl_web_GL.REPEAT = 10497;
snow_modules_opengl_web_GL.CLAMP_TO_EDGE = 33071;
snow_modules_opengl_web_GL.MIRRORED_REPEAT = 33648;
snow_modules_opengl_web_GL.FLOAT_VEC2 = 35664;
snow_modules_opengl_web_GL.FLOAT_VEC3 = 35665;
snow_modules_opengl_web_GL.FLOAT_VEC4 = 35666;
snow_modules_opengl_web_GL.INT_VEC2 = 35667;
snow_modules_opengl_web_GL.INT_VEC3 = 35668;
snow_modules_opengl_web_GL.INT_VEC4 = 35669;
snow_modules_opengl_web_GL.BOOL = 35670;
snow_modules_opengl_web_GL.BOOL_VEC2 = 35671;
snow_modules_opengl_web_GL.BOOL_VEC3 = 35672;
snow_modules_opengl_web_GL.BOOL_VEC4 = 35673;
snow_modules_opengl_web_GL.FLOAT_MAT2 = 35674;
snow_modules_opengl_web_GL.FLOAT_MAT3 = 35675;
snow_modules_opengl_web_GL.FLOAT_MAT4 = 35676;
snow_modules_opengl_web_GL.SAMPLER_2D = 35678;
snow_modules_opengl_web_GL.SAMPLER_CUBE = 35680;
snow_modules_opengl_web_GL.VERTEX_ATTRIB_ARRAY_ENABLED = 34338;
snow_modules_opengl_web_GL.VERTEX_ATTRIB_ARRAY_SIZE = 34339;
snow_modules_opengl_web_GL.VERTEX_ATTRIB_ARRAY_STRIDE = 34340;
snow_modules_opengl_web_GL.VERTEX_ATTRIB_ARRAY_TYPE = 34341;
snow_modules_opengl_web_GL.VERTEX_ATTRIB_ARRAY_NORMALIZED = 34922;
snow_modules_opengl_web_GL.VERTEX_ATTRIB_ARRAY_POINTER = 34373;
snow_modules_opengl_web_GL.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 34975;
snow_modules_opengl_web_GL.VERTEX_PROGRAM_POINT_SIZE = 34370;
snow_modules_opengl_web_GL.POINT_SPRITE = 34913;
snow_modules_opengl_web_GL.COMPILE_STATUS = 35713;
snow_modules_opengl_web_GL.LOW_FLOAT = 36336;
snow_modules_opengl_web_GL.MEDIUM_FLOAT = 36337;
snow_modules_opengl_web_GL.HIGH_FLOAT = 36338;
snow_modules_opengl_web_GL.LOW_INT = 36339;
snow_modules_opengl_web_GL.MEDIUM_INT = 36340;
snow_modules_opengl_web_GL.HIGH_INT = 36341;
snow_modules_opengl_web_GL.FRAMEBUFFER = 36160;
snow_modules_opengl_web_GL.RENDERBUFFER = 36161;
snow_modules_opengl_web_GL.RGBA4 = 32854;
snow_modules_opengl_web_GL.RGB5_A1 = 32855;
snow_modules_opengl_web_GL.RGB565 = 36194;
snow_modules_opengl_web_GL.DEPTH_COMPONENT16 = 33189;
snow_modules_opengl_web_GL.STENCIL_INDEX = 6401;
snow_modules_opengl_web_GL.STENCIL_INDEX8 = 36168;
snow_modules_opengl_web_GL.DEPTH_STENCIL = 34041;
snow_modules_opengl_web_GL.RENDERBUFFER_WIDTH = 36162;
snow_modules_opengl_web_GL.RENDERBUFFER_HEIGHT = 36163;
snow_modules_opengl_web_GL.RENDERBUFFER_INTERNAL_FORMAT = 36164;
snow_modules_opengl_web_GL.RENDERBUFFER_RED_SIZE = 36176;
snow_modules_opengl_web_GL.RENDERBUFFER_GREEN_SIZE = 36177;
snow_modules_opengl_web_GL.RENDERBUFFER_BLUE_SIZE = 36178;
snow_modules_opengl_web_GL.RENDERBUFFER_ALPHA_SIZE = 36179;
snow_modules_opengl_web_GL.RENDERBUFFER_DEPTH_SIZE = 36180;
snow_modules_opengl_web_GL.RENDERBUFFER_STENCIL_SIZE = 36181;
snow_modules_opengl_web_GL.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 36048;
snow_modules_opengl_web_GL.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 36049;
snow_modules_opengl_web_GL.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 36050;
snow_modules_opengl_web_GL.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 36051;
snow_modules_opengl_web_GL.COLOR_ATTACHMENT0 = 36064;
snow_modules_opengl_web_GL.DEPTH_ATTACHMENT = 36096;
snow_modules_opengl_web_GL.STENCIL_ATTACHMENT = 36128;
snow_modules_opengl_web_GL.DEPTH_STENCIL_ATTACHMENT = 33306;
snow_modules_opengl_web_GL.NONE = 0;
snow_modules_opengl_web_GL.FRAMEBUFFER_COMPLETE = 36053;
snow_modules_opengl_web_GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 36054;
snow_modules_opengl_web_GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 36055;
snow_modules_opengl_web_GL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 36057;
snow_modules_opengl_web_GL.FRAMEBUFFER_UNSUPPORTED = 36061;
snow_modules_opengl_web_GL.FRAMEBUFFER_BINDING = 36006;
snow_modules_opengl_web_GL.RENDERBUFFER_BINDING = 36007;
snow_modules_opengl_web_GL.MAX_RENDERBUFFER_SIZE = 34024;
snow_modules_opengl_web_GL.INVALID_FRAMEBUFFER_OPERATION = 1286;
snow_modules_opengl_web_GL.UNPACK_FLIP_Y_WEBGL = 37440;
snow_modules_opengl_web_GL.UNPACK_PREMULTIPLY_ALPHA_WEBGL = 37441;
snow_modules_opengl_web_GL.CONTEXT_LOST_WEBGL = 37442;
snow_modules_opengl_web_GL.UNPACK_COLORSPACE_CONVERSION_WEBGL = 37443;
snow_modules_opengl_web_GL.BROWSER_DEFAULT_WEBGL = 37444;
snow_modules_webaudio_Audio.half_pi = 1.5707;
snow_systems_input_Scancodes.MASK = 1073741824;
snow_systems_input_Scancodes.unknown = 0;
snow_systems_input_Scancodes.key_a = 4;
snow_systems_input_Scancodes.key_b = 5;
snow_systems_input_Scancodes.key_c = 6;
snow_systems_input_Scancodes.key_d = 7;
snow_systems_input_Scancodes.key_e = 8;
snow_systems_input_Scancodes.key_f = 9;
snow_systems_input_Scancodes.key_g = 10;
snow_systems_input_Scancodes.key_h = 11;
snow_systems_input_Scancodes.key_i = 12;
snow_systems_input_Scancodes.key_j = 13;
snow_systems_input_Scancodes.key_k = 14;
snow_systems_input_Scancodes.key_l = 15;
snow_systems_input_Scancodes.key_m = 16;
snow_systems_input_Scancodes.key_n = 17;
snow_systems_input_Scancodes.key_o = 18;
snow_systems_input_Scancodes.key_p = 19;
snow_systems_input_Scancodes.key_q = 20;
snow_systems_input_Scancodes.key_r = 21;
snow_systems_input_Scancodes.key_s = 22;
snow_systems_input_Scancodes.key_t = 23;
snow_systems_input_Scancodes.key_u = 24;
snow_systems_input_Scancodes.key_v = 25;
snow_systems_input_Scancodes.key_w = 26;
snow_systems_input_Scancodes.key_x = 27;
snow_systems_input_Scancodes.key_y = 28;
snow_systems_input_Scancodes.key_z = 29;
snow_systems_input_Scancodes.key_1 = 30;
snow_systems_input_Scancodes.key_2 = 31;
snow_systems_input_Scancodes.key_3 = 32;
snow_systems_input_Scancodes.key_4 = 33;
snow_systems_input_Scancodes.key_5 = 34;
snow_systems_input_Scancodes.key_6 = 35;
snow_systems_input_Scancodes.key_7 = 36;
snow_systems_input_Scancodes.key_8 = 37;
snow_systems_input_Scancodes.key_9 = 38;
snow_systems_input_Scancodes.key_0 = 39;
snow_systems_input_Scancodes.enter = 40;
snow_systems_input_Scancodes.escape = 41;
snow_systems_input_Scancodes.backspace = 42;
snow_systems_input_Scancodes.tab = 43;
snow_systems_input_Scancodes.space = 44;
snow_systems_input_Scancodes.minus = 45;
snow_systems_input_Scancodes.equals = 46;
snow_systems_input_Scancodes.leftbracket = 47;
snow_systems_input_Scancodes.rightbracket = 48;
snow_systems_input_Scancodes.backslash = 49;
snow_systems_input_Scancodes.nonushash = 50;
snow_systems_input_Scancodes.semicolon = 51;
snow_systems_input_Scancodes.apostrophe = 52;
snow_systems_input_Scancodes.grave = 53;
snow_systems_input_Scancodes.comma = 54;
snow_systems_input_Scancodes.period = 55;
snow_systems_input_Scancodes.slash = 56;
snow_systems_input_Scancodes.capslock = 57;
snow_systems_input_Scancodes.f1 = 58;
snow_systems_input_Scancodes.f2 = 59;
snow_systems_input_Scancodes.f3 = 60;
snow_systems_input_Scancodes.f4 = 61;
snow_systems_input_Scancodes.f5 = 62;
snow_systems_input_Scancodes.f6 = 63;
snow_systems_input_Scancodes.f7 = 64;
snow_systems_input_Scancodes.f8 = 65;
snow_systems_input_Scancodes.f9 = 66;
snow_systems_input_Scancodes.f10 = 67;
snow_systems_input_Scancodes.f11 = 68;
snow_systems_input_Scancodes.f12 = 69;
snow_systems_input_Scancodes.printscreen = 70;
snow_systems_input_Scancodes.scrolllock = 71;
snow_systems_input_Scancodes.pause = 72;
snow_systems_input_Scancodes.insert = 73;
snow_systems_input_Scancodes.home = 74;
snow_systems_input_Scancodes.pageup = 75;
snow_systems_input_Scancodes["delete"] = 76;
snow_systems_input_Scancodes.end = 77;
snow_systems_input_Scancodes.pagedown = 78;
snow_systems_input_Scancodes.right = 79;
snow_systems_input_Scancodes.left = 80;
snow_systems_input_Scancodes.down = 81;
snow_systems_input_Scancodes.up = 82;
snow_systems_input_Scancodes.numlockclear = 83;
snow_systems_input_Scancodes.kp_divide = 84;
snow_systems_input_Scancodes.kp_multiply = 85;
snow_systems_input_Scancodes.kp_minus = 86;
snow_systems_input_Scancodes.kp_plus = 87;
snow_systems_input_Scancodes.kp_enter = 88;
snow_systems_input_Scancodes.kp_1 = 89;
snow_systems_input_Scancodes.kp_2 = 90;
snow_systems_input_Scancodes.kp_3 = 91;
snow_systems_input_Scancodes.kp_4 = 92;
snow_systems_input_Scancodes.kp_5 = 93;
snow_systems_input_Scancodes.kp_6 = 94;
snow_systems_input_Scancodes.kp_7 = 95;
snow_systems_input_Scancodes.kp_8 = 96;
snow_systems_input_Scancodes.kp_9 = 97;
snow_systems_input_Scancodes.kp_0 = 98;
snow_systems_input_Scancodes.kp_period = 99;
snow_systems_input_Scancodes.nonusbackslash = 100;
snow_systems_input_Scancodes.application = 101;
snow_systems_input_Scancodes.power = 102;
snow_systems_input_Scancodes.kp_equals = 103;
snow_systems_input_Scancodes.f13 = 104;
snow_systems_input_Scancodes.f14 = 105;
snow_systems_input_Scancodes.f15 = 106;
snow_systems_input_Scancodes.f16 = 107;
snow_systems_input_Scancodes.f17 = 108;
snow_systems_input_Scancodes.f18 = 109;
snow_systems_input_Scancodes.f19 = 110;
snow_systems_input_Scancodes.f20 = 111;
snow_systems_input_Scancodes.f21 = 112;
snow_systems_input_Scancodes.f22 = 113;
snow_systems_input_Scancodes.f23 = 114;
snow_systems_input_Scancodes.f24 = 115;
snow_systems_input_Scancodes.execute = 116;
snow_systems_input_Scancodes.help = 117;
snow_systems_input_Scancodes.menu = 118;
snow_systems_input_Scancodes.select = 119;
snow_systems_input_Scancodes.stop = 120;
snow_systems_input_Scancodes.again = 121;
snow_systems_input_Scancodes.undo = 122;
snow_systems_input_Scancodes.cut = 123;
snow_systems_input_Scancodes.copy = 124;
snow_systems_input_Scancodes.paste = 125;
snow_systems_input_Scancodes.find = 126;
snow_systems_input_Scancodes.mute = 127;
snow_systems_input_Scancodes.volumeup = 128;
snow_systems_input_Scancodes.volumedown = 129;
snow_systems_input_Scancodes.kp_comma = 133;
snow_systems_input_Scancodes.kp_equalsas400 = 134;
snow_systems_input_Scancodes.international1 = 135;
snow_systems_input_Scancodes.international2 = 136;
snow_systems_input_Scancodes.international3 = 137;
snow_systems_input_Scancodes.international4 = 138;
snow_systems_input_Scancodes.international5 = 139;
snow_systems_input_Scancodes.international6 = 140;
snow_systems_input_Scancodes.international7 = 141;
snow_systems_input_Scancodes.international8 = 142;
snow_systems_input_Scancodes.international9 = 143;
snow_systems_input_Scancodes.lang1 = 144;
snow_systems_input_Scancodes.lang2 = 145;
snow_systems_input_Scancodes.lang3 = 146;
snow_systems_input_Scancodes.lang4 = 147;
snow_systems_input_Scancodes.lang5 = 148;
snow_systems_input_Scancodes.lang6 = 149;
snow_systems_input_Scancodes.lang7 = 150;
snow_systems_input_Scancodes.lang8 = 151;
snow_systems_input_Scancodes.lang9 = 152;
snow_systems_input_Scancodes.alterase = 153;
snow_systems_input_Scancodes.sysreq = 154;
snow_systems_input_Scancodes.cancel = 155;
snow_systems_input_Scancodes.clear = 156;
snow_systems_input_Scancodes.prior = 157;
snow_systems_input_Scancodes.return2 = 158;
snow_systems_input_Scancodes.separator = 159;
snow_systems_input_Scancodes.out = 160;
snow_systems_input_Scancodes.oper = 161;
snow_systems_input_Scancodes.clearagain = 162;
snow_systems_input_Scancodes.crsel = 163;
snow_systems_input_Scancodes.exsel = 164;
snow_systems_input_Scancodes.kp_00 = 176;
snow_systems_input_Scancodes.kp_000 = 177;
snow_systems_input_Scancodes.thousandsseparator = 178;
snow_systems_input_Scancodes.decimalseparator = 179;
snow_systems_input_Scancodes.currencyunit = 180;
snow_systems_input_Scancodes.currencysubunit = 181;
snow_systems_input_Scancodes.kp_leftparen = 182;
snow_systems_input_Scancodes.kp_rightparen = 183;
snow_systems_input_Scancodes.kp_leftbrace = 184;
snow_systems_input_Scancodes.kp_rightbrace = 185;
snow_systems_input_Scancodes.kp_tab = 186;
snow_systems_input_Scancodes.kp_backspace = 187;
snow_systems_input_Scancodes.kp_a = 188;
snow_systems_input_Scancodes.kp_b = 189;
snow_systems_input_Scancodes.kp_c = 190;
snow_systems_input_Scancodes.kp_d = 191;
snow_systems_input_Scancodes.kp_e = 192;
snow_systems_input_Scancodes.kp_f = 193;
snow_systems_input_Scancodes.kp_xor = 194;
snow_systems_input_Scancodes.kp_power = 195;
snow_systems_input_Scancodes.kp_percent = 196;
snow_systems_input_Scancodes.kp_less = 197;
snow_systems_input_Scancodes.kp_greater = 198;
snow_systems_input_Scancodes.kp_ampersand = 199;
snow_systems_input_Scancodes.kp_dblampersand = 200;
snow_systems_input_Scancodes.kp_verticalbar = 201;
snow_systems_input_Scancodes.kp_dblverticalbar = 202;
snow_systems_input_Scancodes.kp_colon = 203;
snow_systems_input_Scancodes.kp_hash = 204;
snow_systems_input_Scancodes.kp_space = 205;
snow_systems_input_Scancodes.kp_at = 206;
snow_systems_input_Scancodes.kp_exclam = 207;
snow_systems_input_Scancodes.kp_memstore = 208;
snow_systems_input_Scancodes.kp_memrecall = 209;
snow_systems_input_Scancodes.kp_memclear = 210;
snow_systems_input_Scancodes.kp_memadd = 211;
snow_systems_input_Scancodes.kp_memsubtract = 212;
snow_systems_input_Scancodes.kp_memmultiply = 213;
snow_systems_input_Scancodes.kp_memdivide = 214;
snow_systems_input_Scancodes.kp_plusminus = 215;
snow_systems_input_Scancodes.kp_clear = 216;
snow_systems_input_Scancodes.kp_clearentry = 217;
snow_systems_input_Scancodes.kp_binary = 218;
snow_systems_input_Scancodes.kp_octal = 219;
snow_systems_input_Scancodes.kp_decimal = 220;
snow_systems_input_Scancodes.kp_hexadecimal = 221;
snow_systems_input_Scancodes.lctrl = 224;
snow_systems_input_Scancodes.lshift = 225;
snow_systems_input_Scancodes.lalt = 226;
snow_systems_input_Scancodes.lmeta = 227;
snow_systems_input_Scancodes.rctrl = 228;
snow_systems_input_Scancodes.rshift = 229;
snow_systems_input_Scancodes.ralt = 230;
snow_systems_input_Scancodes.rmeta = 231;
snow_systems_input_Scancodes.mode = 257;
snow_systems_input_Scancodes.audionext = 258;
snow_systems_input_Scancodes.audioprev = 259;
snow_systems_input_Scancodes.audiostop = 260;
snow_systems_input_Scancodes.audioplay = 261;
snow_systems_input_Scancodes.audiomute = 262;
snow_systems_input_Scancodes.mediaselect = 263;
snow_systems_input_Scancodes.www = 264;
snow_systems_input_Scancodes.mail = 265;
snow_systems_input_Scancodes.calculator = 266;
snow_systems_input_Scancodes.computer = 267;
snow_systems_input_Scancodes.ac_search = 268;
snow_systems_input_Scancodes.ac_home = 269;
snow_systems_input_Scancodes.ac_back = 270;
snow_systems_input_Scancodes.ac_forward = 271;
snow_systems_input_Scancodes.ac_stop = 272;
snow_systems_input_Scancodes.ac_refresh = 273;
snow_systems_input_Scancodes.ac_bookmarks = 274;
snow_systems_input_Scancodes.brightnessdown = 275;
snow_systems_input_Scancodes.brightnessup = 276;
snow_systems_input_Scancodes.displayswitch = 277;
snow_systems_input_Scancodes.kbdillumtoggle = 278;
snow_systems_input_Scancodes.kbdillumdown = 279;
snow_systems_input_Scancodes.kbdillumup = 280;
snow_systems_input_Scancodes.eject = 281;
snow_systems_input_Scancodes.sleep = 282;
snow_systems_input_Scancodes.app1 = 283;
snow_systems_input_Scancodes.app2 = 284;
snow_systems_input_Scancodes.scancode_names = [null,null,null,null,"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","1","2","3","4","5","6","7","8","9","0","Enter","Escape","Backspace","Tab","Space","-","=","[","]","\\","#",";","'","`",",",".","/","CapsLock","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","PrintScreen","ScrollLock","Pause","Insert","Home","PageUp","Delete","End","PageDown","Right","Left","Down","Up","Numlock","Keypad /","Keypad *","Keypad -","Keypad +","Keypad Enter","Keypad 1","Keypad 2","Keypad 3","Keypad 4","Keypad 5","Keypad 6","Keypad 7","Keypad 8","Keypad 9","Keypad 0","Keypad .",null,"Application","Power","Keypad =","F13","F14","F15","F16","F17","F18","F19","F20","F21","F22","F23","F24","Execute","Help","Menu","Select","Stop","Again","Undo","Cut","Copy","Paste","Find","Mute","VolumeUp","VolumeDown",null,null,null,"Keypad ,","Keypad = (AS400)",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"AltErase","SysReq","Cancel","Clear","Prior","Enter","Separator","Out","Oper","Clear / Again","CrSel","ExSel",null,null,null,null,null,null,null,null,null,null,null,"Keypad 00","Keypad 000","ThousandsSeparator","DecimalSeparator","CurrencyUnit","CurrencySubUnit","Keypad (","Keypad )","Keypad {","Keypad }","Keypad Tab","Keypad Backspace","Keypad A","Keypad B","Keypad C","Keypad D","Keypad E","Keypad F","Keypad XOR","Keypad ^","Keypad %","Keypad <","Keypad >","Keypad &","Keypad &&","Keypad |","Keypad ||","Keypad :","Keypad #","Keypad Space","Keypad @","Keypad !","Keypad MemStore","Keypad MemRecall","Keypad MemClear","Keypad MemAdd","Keypad MemSubtract","Keypad MemMultiply","Keypad MemDivide","Keypad +/-","Keypad Clear","Keypad ClearEntry","Keypad Binary","Keypad Octal","Keypad Decimal","Keypad Hexadecimal",null,null,"Left Ctrl","Left Shift","Left Alt","Left Meta","Right Ctrl","Right Shift","Right Alt","Right Meta",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"ModeSwitch","AudioNext","AudioPrev","AudioStop","AudioPlay","AudioMute","MediaSelect","WWW","Mail","Calculator","Computer","AC Search","AC Home","AC Back","AC Forward","AC Stop","AC Refresh","AC Bookmarks","BrightnessDown","BrightnessUp","DisplaySwitch","KBDIllumToggle","KBDIllumDown","KBDIllumUp","Eject","Sleep"];
snow_systems_input_Keycodes.unknown = 0;
snow_systems_input_Keycodes.enter = 13;
snow_systems_input_Keycodes.escape = 27;
snow_systems_input_Keycodes.backspace = 8;
snow_systems_input_Keycodes.tab = 9;
snow_systems_input_Keycodes.space = 32;
snow_systems_input_Keycodes.exclaim = 33;
snow_systems_input_Keycodes.quotedbl = 34;
snow_systems_input_Keycodes.hash = 35;
snow_systems_input_Keycodes.percent = 37;
snow_systems_input_Keycodes.dollar = 36;
snow_systems_input_Keycodes.ampersand = 38;
snow_systems_input_Keycodes.quote = 39;
snow_systems_input_Keycodes.leftparen = 40;
snow_systems_input_Keycodes.rightparen = 41;
snow_systems_input_Keycodes.asterisk = 42;
snow_systems_input_Keycodes.plus = 43;
snow_systems_input_Keycodes.comma = 44;
snow_systems_input_Keycodes.minus = 45;
snow_systems_input_Keycodes.period = 46;
snow_systems_input_Keycodes.slash = 47;
snow_systems_input_Keycodes.key_0 = 48;
snow_systems_input_Keycodes.key_1 = 49;
snow_systems_input_Keycodes.key_2 = 50;
snow_systems_input_Keycodes.key_3 = 51;
snow_systems_input_Keycodes.key_4 = 52;
snow_systems_input_Keycodes.key_5 = 53;
snow_systems_input_Keycodes.key_6 = 54;
snow_systems_input_Keycodes.key_7 = 55;
snow_systems_input_Keycodes.key_8 = 56;
snow_systems_input_Keycodes.key_9 = 57;
snow_systems_input_Keycodes.colon = 58;
snow_systems_input_Keycodes.semicolon = 59;
snow_systems_input_Keycodes.less = 60;
snow_systems_input_Keycodes.equals = 61;
snow_systems_input_Keycodes.greater = 62;
snow_systems_input_Keycodes.question = 63;
snow_systems_input_Keycodes.at = 64;
snow_systems_input_Keycodes.leftbracket = 91;
snow_systems_input_Keycodes.backslash = 92;
snow_systems_input_Keycodes.rightbracket = 93;
snow_systems_input_Keycodes.caret = 94;
snow_systems_input_Keycodes.underscore = 95;
snow_systems_input_Keycodes.backquote = 96;
snow_systems_input_Keycodes.key_a = 97;
snow_systems_input_Keycodes.key_b = 98;
snow_systems_input_Keycodes.key_c = 99;
snow_systems_input_Keycodes.key_d = 100;
snow_systems_input_Keycodes.key_e = 101;
snow_systems_input_Keycodes.key_f = 102;
snow_systems_input_Keycodes.key_g = 103;
snow_systems_input_Keycodes.key_h = 104;
snow_systems_input_Keycodes.key_i = 105;
snow_systems_input_Keycodes.key_j = 106;
snow_systems_input_Keycodes.key_k = 107;
snow_systems_input_Keycodes.key_l = 108;
snow_systems_input_Keycodes.key_m = 109;
snow_systems_input_Keycodes.key_n = 110;
snow_systems_input_Keycodes.key_o = 111;
snow_systems_input_Keycodes.key_p = 112;
snow_systems_input_Keycodes.key_q = 113;
snow_systems_input_Keycodes.key_r = 114;
snow_systems_input_Keycodes.key_s = 115;
snow_systems_input_Keycodes.key_t = 116;
snow_systems_input_Keycodes.key_u = 117;
snow_systems_input_Keycodes.key_v = 118;
snow_systems_input_Keycodes.key_w = 119;
snow_systems_input_Keycodes.key_x = 120;
snow_systems_input_Keycodes.key_y = 121;
snow_systems_input_Keycodes.key_z = 122;
snow_systems_input_Keycodes.capslock = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.capslock);
snow_systems_input_Keycodes.f1 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f1);
snow_systems_input_Keycodes.f2 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f2);
snow_systems_input_Keycodes.f3 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f3);
snow_systems_input_Keycodes.f4 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f4);
snow_systems_input_Keycodes.f5 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f5);
snow_systems_input_Keycodes.f6 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f6);
snow_systems_input_Keycodes.f7 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f7);
snow_systems_input_Keycodes.f8 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f8);
snow_systems_input_Keycodes.f9 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f9);
snow_systems_input_Keycodes.f10 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f10);
snow_systems_input_Keycodes.f11 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f11);
snow_systems_input_Keycodes.f12 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f12);
snow_systems_input_Keycodes.printscreen = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.printscreen);
snow_systems_input_Keycodes.scrolllock = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.scrolllock);
snow_systems_input_Keycodes.pause = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.pause);
snow_systems_input_Keycodes.insert = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.insert);
snow_systems_input_Keycodes.home = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.home);
snow_systems_input_Keycodes.pageup = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.pageup);
snow_systems_input_Keycodes["delete"] = 127;
snow_systems_input_Keycodes.end = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.end);
snow_systems_input_Keycodes.pagedown = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.pagedown);
snow_systems_input_Keycodes.right = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.right);
snow_systems_input_Keycodes.left = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.left);
snow_systems_input_Keycodes.down = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.down);
snow_systems_input_Keycodes.up = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.up);
snow_systems_input_Keycodes.numlockclear = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.numlockclear);
snow_systems_input_Keycodes.kp_divide = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_divide);
snow_systems_input_Keycodes.kp_multiply = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_multiply);
snow_systems_input_Keycodes.kp_minus = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_minus);
snow_systems_input_Keycodes.kp_plus = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_plus);
snow_systems_input_Keycodes.kp_enter = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_enter);
snow_systems_input_Keycodes.kp_1 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_1);
snow_systems_input_Keycodes.kp_2 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_2);
snow_systems_input_Keycodes.kp_3 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_3);
snow_systems_input_Keycodes.kp_4 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_4);
snow_systems_input_Keycodes.kp_5 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_5);
snow_systems_input_Keycodes.kp_6 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_6);
snow_systems_input_Keycodes.kp_7 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_7);
snow_systems_input_Keycodes.kp_8 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_8);
snow_systems_input_Keycodes.kp_9 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_9);
snow_systems_input_Keycodes.kp_0 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_0);
snow_systems_input_Keycodes.kp_period = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_period);
snow_systems_input_Keycodes.application = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.application);
snow_systems_input_Keycodes.power = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.power);
snow_systems_input_Keycodes.kp_equals = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_equals);
snow_systems_input_Keycodes.f13 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f13);
snow_systems_input_Keycodes.f14 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f14);
snow_systems_input_Keycodes.f15 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f15);
snow_systems_input_Keycodes.f16 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f16);
snow_systems_input_Keycodes.f17 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f17);
snow_systems_input_Keycodes.f18 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f18);
snow_systems_input_Keycodes.f19 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f19);
snow_systems_input_Keycodes.f20 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f20);
snow_systems_input_Keycodes.f21 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f21);
snow_systems_input_Keycodes.f22 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f22);
snow_systems_input_Keycodes.f23 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f23);
snow_systems_input_Keycodes.f24 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.f24);
snow_systems_input_Keycodes.execute = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.execute);
snow_systems_input_Keycodes.help = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.help);
snow_systems_input_Keycodes.menu = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.menu);
snow_systems_input_Keycodes.select = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.select);
snow_systems_input_Keycodes.stop = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.stop);
snow_systems_input_Keycodes.again = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.again);
snow_systems_input_Keycodes.undo = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.undo);
snow_systems_input_Keycodes.cut = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.cut);
snow_systems_input_Keycodes.copy = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.copy);
snow_systems_input_Keycodes.paste = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.paste);
snow_systems_input_Keycodes.find = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.find);
snow_systems_input_Keycodes.mute = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.mute);
snow_systems_input_Keycodes.volumeup = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.volumeup);
snow_systems_input_Keycodes.volumedown = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.volumedown);
snow_systems_input_Keycodes.kp_comma = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_comma);
snow_systems_input_Keycodes.kp_equalsas400 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_equalsas400);
snow_systems_input_Keycodes.alterase = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.alterase);
snow_systems_input_Keycodes.sysreq = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.sysreq);
snow_systems_input_Keycodes.cancel = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.cancel);
snow_systems_input_Keycodes.clear = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.clear);
snow_systems_input_Keycodes.prior = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.prior);
snow_systems_input_Keycodes.return2 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.return2);
snow_systems_input_Keycodes.separator = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.separator);
snow_systems_input_Keycodes.out = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.out);
snow_systems_input_Keycodes.oper = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.oper);
snow_systems_input_Keycodes.clearagain = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.clearagain);
snow_systems_input_Keycodes.crsel = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.crsel);
snow_systems_input_Keycodes.exsel = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.exsel);
snow_systems_input_Keycodes.kp_00 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_00);
snow_systems_input_Keycodes.kp_000 = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_000);
snow_systems_input_Keycodes.thousandsseparator = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.thousandsseparator);
snow_systems_input_Keycodes.decimalseparator = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.decimalseparator);
snow_systems_input_Keycodes.currencyunit = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.currencyunit);
snow_systems_input_Keycodes.currencysubunit = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.currencysubunit);
snow_systems_input_Keycodes.kp_leftparen = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_leftparen);
snow_systems_input_Keycodes.kp_rightparen = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_rightparen);
snow_systems_input_Keycodes.kp_leftbrace = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_leftbrace);
snow_systems_input_Keycodes.kp_rightbrace = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_rightbrace);
snow_systems_input_Keycodes.kp_tab = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_tab);
snow_systems_input_Keycodes.kp_backspace = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_backspace);
snow_systems_input_Keycodes.kp_a = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_a);
snow_systems_input_Keycodes.kp_b = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_b);
snow_systems_input_Keycodes.kp_c = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_c);
snow_systems_input_Keycodes.kp_d = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_d);
snow_systems_input_Keycodes.kp_e = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_e);
snow_systems_input_Keycodes.kp_f = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_f);
snow_systems_input_Keycodes.kp_xor = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_xor);
snow_systems_input_Keycodes.kp_power = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_power);
snow_systems_input_Keycodes.kp_percent = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_percent);
snow_systems_input_Keycodes.kp_less = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_less);
snow_systems_input_Keycodes.kp_greater = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_greater);
snow_systems_input_Keycodes.kp_ampersand = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_ampersand);
snow_systems_input_Keycodes.kp_dblampersand = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_dblampersand);
snow_systems_input_Keycodes.kp_verticalbar = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_verticalbar);
snow_systems_input_Keycodes.kp_dblverticalbar = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_dblverticalbar);
snow_systems_input_Keycodes.kp_colon = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_colon);
snow_systems_input_Keycodes.kp_hash = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_hash);
snow_systems_input_Keycodes.kp_space = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_space);
snow_systems_input_Keycodes.kp_at = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_at);
snow_systems_input_Keycodes.kp_exclam = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_exclam);
snow_systems_input_Keycodes.kp_memstore = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_memstore);
snow_systems_input_Keycodes.kp_memrecall = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_memrecall);
snow_systems_input_Keycodes.kp_memclear = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_memclear);
snow_systems_input_Keycodes.kp_memadd = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_memadd);
snow_systems_input_Keycodes.kp_memsubtract = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_memsubtract);
snow_systems_input_Keycodes.kp_memmultiply = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_memmultiply);
snow_systems_input_Keycodes.kp_memdivide = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_memdivide);
snow_systems_input_Keycodes.kp_plusminus = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_plusminus);
snow_systems_input_Keycodes.kp_clear = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_clear);
snow_systems_input_Keycodes.kp_clearentry = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_clearentry);
snow_systems_input_Keycodes.kp_binary = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_binary);
snow_systems_input_Keycodes.kp_octal = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_octal);
snow_systems_input_Keycodes.kp_decimal = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_decimal);
snow_systems_input_Keycodes.kp_hexadecimal = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kp_hexadecimal);
snow_systems_input_Keycodes.lctrl = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.lctrl);
snow_systems_input_Keycodes.lshift = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.lshift);
snow_systems_input_Keycodes.lalt = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.lalt);
snow_systems_input_Keycodes.lmeta = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.lmeta);
snow_systems_input_Keycodes.rctrl = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.rctrl);
snow_systems_input_Keycodes.rshift = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.rshift);
snow_systems_input_Keycodes.ralt = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.ralt);
snow_systems_input_Keycodes.rmeta = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.rmeta);
snow_systems_input_Keycodes.mode = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.mode);
snow_systems_input_Keycodes.audionext = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.audionext);
snow_systems_input_Keycodes.audioprev = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.audioprev);
snow_systems_input_Keycodes.audiostop = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.audiostop);
snow_systems_input_Keycodes.audioplay = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.audioplay);
snow_systems_input_Keycodes.audiomute = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.audiomute);
snow_systems_input_Keycodes.mediaselect = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.mediaselect);
snow_systems_input_Keycodes.www = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.www);
snow_systems_input_Keycodes.mail = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.mail);
snow_systems_input_Keycodes.calculator = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.calculator);
snow_systems_input_Keycodes.computer = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.computer);
snow_systems_input_Keycodes.ac_search = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.ac_search);
snow_systems_input_Keycodes.ac_home = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.ac_home);
snow_systems_input_Keycodes.ac_back = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.ac_back);
snow_systems_input_Keycodes.ac_forward = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.ac_forward);
snow_systems_input_Keycodes.ac_stop = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.ac_stop);
snow_systems_input_Keycodes.ac_refresh = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.ac_refresh);
snow_systems_input_Keycodes.ac_bookmarks = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.ac_bookmarks);
snow_systems_input_Keycodes.brightnessdown = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.brightnessdown);
snow_systems_input_Keycodes.brightnessup = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.brightnessup);
snow_systems_input_Keycodes.displayswitch = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.displayswitch);
snow_systems_input_Keycodes.kbdillumtoggle = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kbdillumtoggle);
snow_systems_input_Keycodes.kbdillumdown = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kbdillumdown);
snow_systems_input_Keycodes.kbdillumup = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.kbdillumup);
snow_systems_input_Keycodes.eject = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.eject);
snow_systems_input_Keycodes.sleep = snow_systems_input_Keycodes.from_scan(snow_systems_input_Scancodes.sleep);
snow_types_Config.app_runtime = "snow.core.web.Runtime";
snow_types_Config.app_config = "config.json";
snow_types_Config.app_ident = "com.haxiomic.gpufluid";
snow_types_Config.app_main = "Main";
snow_types_Config.module_assets = "snow.core.web.assets.Assets";
snow_types_Config.module_audio = "snow.modules.webaudio.Audio";
snow_types_Config.module_io = "snow.core.web.io.IO";
snow_types_Config.extensions = [];
snow_types__$Types_AssetType_$Impl_$.at_unknown = 0;
snow_types__$Types_AssetType_$Impl_$.at_bytes = 1;
snow_types__$Types_AssetType_$Impl_$.at_text = 2;
snow_types__$Types_AssetType_$Impl_$.at_json = 3;
snow_types__$Types_AssetType_$Impl_$.at_image = 4;
snow_types__$Types_AssetType_$Impl_$.at_audio = 5;
snow_types__$Types_AudioFormatType_$Impl_$.af_unknown = 0;
snow_types__$Types_AudioFormatType_$Impl_$.af_custom = 1;
snow_types__$Types_AudioFormatType_$Impl_$.af_ogg = 2;
snow_types__$Types_AudioFormatType_$Impl_$.af_wav = 3;
snow_types__$Types_AudioFormatType_$Impl_$.af_pcm = 4;
snow_types__$Types_AudioEvent_$Impl_$.ae_end = 0;
snow_types__$Types_AudioEvent_$Impl_$.ae_destroyed = 1;
snow_types__$Types_AudioEvent_$Impl_$.ae_destroyed_source = 2;
snow_types__$Types_AudioState_$Impl_$.as_invalid = -1;
snow_types__$Types_AudioState_$Impl_$.as_paused = 0;
snow_types__$Types_AudioState_$Impl_$.as_playing = 1;
snow_types__$Types_AudioState_$Impl_$.as_stopped = 2;
snow_types__$Types_OpenGLProfile_$Impl_$.compatibility = 0;
snow_types__$Types_OpenGLProfile_$Impl_$.core = 1;
snow_types__$Types_OpenGLProfile_$Impl_$.gles = 2;
snow_types__$Types_KeyEventType_$Impl_$.ke_unknown = 0;
snow_types__$Types_KeyEventType_$Impl_$.ke_down = 1;
snow_types__$Types_KeyEventType_$Impl_$.ke_up = 2;
snow_types__$Types_MouseEventType_$Impl_$.me_unknown = 0;
snow_types__$Types_MouseEventType_$Impl_$.me_move = 1;
snow_types__$Types_MouseEventType_$Impl_$.me_down = 2;
snow_types__$Types_MouseEventType_$Impl_$.me_up = 3;
snow_types__$Types_MouseEventType_$Impl_$.me_wheel = 4;
snow_types__$Types_TouchEventType_$Impl_$.te_unknown = 0;
snow_types__$Types_TouchEventType_$Impl_$.te_move = 1;
snow_types__$Types_TouchEventType_$Impl_$.te_down = 2;
snow_types__$Types_TouchEventType_$Impl_$.te_up = 3;
snow_types__$Types_GamepadEventType_$Impl_$.ge_unknown = 0;
snow_types__$Types_GamepadEventType_$Impl_$.ge_axis = 1;
snow_types__$Types_GamepadEventType_$Impl_$.ge_down = 2;
snow_types__$Types_GamepadEventType_$Impl_$.ge_up = 3;
snow_types__$Types_GamepadEventType_$Impl_$.ge_device = 4;
snow_types__$Types_TextEventType_$Impl_$.te_unknown = 0;
snow_types__$Types_TextEventType_$Impl_$.te_edit = 1;
snow_types__$Types_TextEventType_$Impl_$.te_input = 2;
snow_types__$Types_GamepadDeviceEventType_$Impl_$.ge_unknown = 0;
snow_types__$Types_GamepadDeviceEventType_$Impl_$.ge_device_added = 1;
snow_types__$Types_GamepadDeviceEventType_$Impl_$.ge_device_removed = 2;
snow_types__$Types_GamepadDeviceEventType_$Impl_$.ge_device_remapped = 3;
snow_types__$Types_SystemEventType_$Impl_$.se_unknown = 0;
snow_types__$Types_SystemEventType_$Impl_$.se_init = 1;
snow_types__$Types_SystemEventType_$Impl_$.se_ready = 2;
snow_types__$Types_SystemEventType_$Impl_$.se_tick = 3;
snow_types__$Types_SystemEventType_$Impl_$.se_freeze = 4;
snow_types__$Types_SystemEventType_$Impl_$.se_unfreeze = 5;
snow_types__$Types_SystemEventType_$Impl_$.se_suspend = 6;
snow_types__$Types_SystemEventType_$Impl_$.se_shutdown = 7;
snow_types__$Types_SystemEventType_$Impl_$.se_window = 8;
snow_types__$Types_SystemEventType_$Impl_$.se_input = 9;
snow_types__$Types_SystemEventType_$Impl_$.se_quit = 10;
snow_types__$Types_SystemEventType_$Impl_$.se_app_terminating = 11;
snow_types__$Types_SystemEventType_$Impl_$.se_app_lowmemory = 12;
snow_types__$Types_SystemEventType_$Impl_$.se_app_willenterbackground = 13;
snow_types__$Types_SystemEventType_$Impl_$.se_app_didenterbackground = 14;
snow_types__$Types_SystemEventType_$Impl_$.se_app_willenterforeground = 15;
snow_types__$Types_SystemEventType_$Impl_$.se_app_didenterforeground = 16;
snow_types__$Types_WindowEventType_$Impl_$.we_unknown = 0;
snow_types__$Types_WindowEventType_$Impl_$.we_shown = 1;
snow_types__$Types_WindowEventType_$Impl_$.we_hidden = 2;
snow_types__$Types_WindowEventType_$Impl_$.we_exposed = 3;
snow_types__$Types_WindowEventType_$Impl_$.we_moved = 4;
snow_types__$Types_WindowEventType_$Impl_$.we_resized = 5;
snow_types__$Types_WindowEventType_$Impl_$.we_size_changed = 6;
snow_types__$Types_WindowEventType_$Impl_$.we_minimized = 7;
snow_types__$Types_WindowEventType_$Impl_$.we_maximized = 8;
snow_types__$Types_WindowEventType_$Impl_$.we_restored = 9;
snow_types__$Types_WindowEventType_$Impl_$.we_enter = 10;
snow_types__$Types_WindowEventType_$Impl_$.we_leave = 11;
snow_types__$Types_WindowEventType_$Impl_$.we_focus_gained = 12;
snow_types__$Types_WindowEventType_$Impl_$.we_focus_lost = 13;
snow_types__$Types_WindowEventType_$Impl_$.we_close = 14;
snow_types__$Types_InputEventType_$Impl_$.ie_unknown = 0;
snow_types__$Types_InputEventType_$Impl_$.ie_key = 1;
snow_types__$Types_InputEventType_$Impl_$.ie_text = 2;
snow_types__$Types_InputEventType_$Impl_$.ie_mouse = 3;
snow_types__$Types_InputEventType_$Impl_$.ie_touch = 4;
snow_types__$Types_InputEventType_$Impl_$.ie_gamepad = 5;
snow_types__$Types_InputEventType_$Impl_$.ie_joystick = 6;
snow_App.main();
})(typeof console != "undefined" ? console : {log:function(){}}, typeof window != "undefined" ? window : typeof global != "undefined" ? global : typeof self != "undefined" ? self : this);
