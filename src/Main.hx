package;

import haxe.Timer;

import snow.modules.opengl.GL;
import snow.types.Types;

import gltoolbox.render.RenderTarget;
import shaderblox.ShaderBase;
import shaderblox.uniforms.UVec2.Vector2;

import js.WebsocketConnection;

typedef UserConfig = {}

typedef Point = { x : Float, y : Float }

class Main extends snow.App{
	// var gl = GL;
	//Simulations
	var fluid:GPUFluid;
	var particles:GPUParticles;
	//Geometry
	var textureQuad:GLBuffer = null; 
	//Framebuffers
	var screenBuffer:GLFramebuffer = null;	//null for all platforms excluding ios, where it references the defaultFramebuffer (UIStageView.mm)
	//Render Targets
	var offScreenTarget:RenderTarget;
	//Shaders
	var screenTextureShader   : ScreenTexture;
	var renderParticlesShader : ColorParticleMotion;
	var updateDyeShader       : MouseDye;
	var mouseForceShader      : MouseForce;
	//Window
	var isMouseDowns:Array<Bool> = new Array<Bool>();
	var mousePositions:Array<Vector2> = new Array<Vector2>();
	var lastMousePositions:Array<Vector2> = new Array<Vector2>();
	var userIds:Map<String, Int> = new Map<String, Int>();
	var mousePositionsXY:Array<Point> = new Array<Point>();
	//
	var isMouseDown:Bool = false;
	var mousePointKnown:Bool = false;
	var lastMousePointKnown:Bool = false;
	var mouse = new Vector2();
	var mouseFluid = new Vector2();
	var lastMouse = new Vector2();
	var lastMouseFluid = new Vector2();
	var time:Float;
	var lastTime:Float;
	//Drawing
	var renderParticlesEnabled:Bool = true;
	var renderFluidEnabled:Bool = true;
	//
	var performanceMonitor:PerformanceMonitor;
	//Parameters
	var particleCount:Int;
	var fluidScale:Float;
	var fluidIterations(default, set):Int;
	var offScreenScale:Float;
	var offScreenFilter:Int;
	var simulationQuality(default, set):SimulationQuality;

	var connection: js.WebsocketConnection;

	static inline var OFFSCREEN_RENDER = true;//seems to be faster when on!
	
	public function new () {
		for (i in 0...30) {
			isMouseDowns.push(false);
			mousePositions.push(new Vector2(0,0));
			lastMousePositions.push(new Vector2(0,0));
			mousePositionsXY.push({x: 0, y: 0});
		}

		connection = new js.WebsocketConnection("192.168.1.103", 8000, 
			function (connection: js.WebsocketConnection) {
				trace("Opened");
				connection.sendMessage({
					type: "saveState",
					data: {
						mood: "Happy"
					}
				});
			},
			function (connection: js.WebsocketConnection, parsedMessage:Dynamic) {
				var messageType:String = parsedMessage.type;
				var messageData:Dynamic = parsedMessage.data;
				if (messageType == 'ping')
					return;

				var userId:String = messageData.userId;
				var x:Float = messageData.x;
				var y:Float = messageData.y;

				var transY = -(y * 2 - 1);
				var transX = (x * 2 - 1);

				switch (messageType) {
					case "touch-start":
						trace('touch start');
						if (!userIds.exists(userId)) {
							for (i in 0...isMouseDowns.length) {
								trace("checking " + i);
								trace(isMouseDowns[i]);
								if (!isMouseDowns[i]) {
									userIds.set(userId, i);
									isMouseDowns[i] = true;
									lastMousePositions[i].set(
										fluid.clipToAspectSpaceX(transX),
										fluid.clipToAspectSpaceY(transY)
									);
									mousePositions[i].set(
										fluid.clipToAspectSpaceX(transX),
										fluid.clipToAspectSpaceY(transY)
									);
									mousePositionsXY[i] = {x: fluid.clipToAspectSpaceX(transX), y: fluid.clipToAspectSpaceY(transY)};
									trace("Found at " + i);
									break;
								}
							}
						}
					case "touch-end":
						trace('touch end');
						if (userIds.exists(userId)) {
							var i:Int = userIds.get(userId);
							isMouseDowns[i] = false;
							userIds.remove(userId);
						}
					case "touch-move":
						trace('touch move');
						if (userIds.exists(userId)) {
							var i:Int = userIds.get(userId);
							lastMousePositions[i].set(
								mousePositionsXY[i].x,
								mousePositionsXY[i].y
							);
							mousePositions[i].set(
								fluid.clipToAspectSpaceX(transX),
								fluid.clipToAspectSpaceY(transY)
							);
							mousePositionsXY[i] = {x: fluid.clipToAspectSpaceX(transX), y: fluid.clipToAspectSpaceY(transY)};
							trace("moved at " + i);
						}
				}
			}
		);

		performanceMonitor = new PerformanceMonitor(35, null, 2000);

		simulationQuality = Medium;

		#if desktop
		simulationQuality = High;
		#elseif ios
		simulationQuality = iOS;
		#end

		#if js
		performanceMonitor.fpsTooLowCallback = lowerQualityRequired; //auto adjust quality

		//Extract quality parameter, ?q= and set simulation quality
		var urlParams = js.Web.getParams();
		if(urlParams.exists('q')){
			var q = StringTools.trim(urlParams.get('q').toLowerCase());
			//match enum
			for(e in Type.allEnums(SimulationQuality)){
				var name = Type.enumConstructor(e).toLowerCase();
				if(q == name){
					simulationQuality = e;
					performanceMonitor.fpsTooLowCallback = null; //disable auto quality adjusting
					break;
				}
			}
		}
		//Extract iterations
		if(urlParams.exists('iterations')){
			var iterationsParam = Std.parseInt(urlParams.get('iterations'));
			if(Std.is(iterationsParam, Int))
				fluidIterations = iterationsParam;
		}
		#end
	}

	override function config( config:AppConfig ) : AppConfig {
		
		#if js
		config.runtime.prevent_default_context_menu = false;
		#end
		config.window.borderless = true;
		config.window.fullscreen = true;
		config.window.title = "GPU Fluid";
		//for some reason, window width and height are set initially from config in browsers and 
		//ignores true size
		#if js
		config.window.width = js.Browser.window.innerWidth;
		config.window.height = js.Browser.window.innerHeight;
		#end

		config.render.antialiasing = 0;


	    return config;
	}

	override function ready(){

		init();

	}

	function init():Void {
		GL.disable(GL.DEPTH_TEST);
		GL.disable(GL.CULL_FACE);
		GL.disable(GL.DITHER);

        #if ios screenBuffer = GL.getParameter(GL.FRAMEBUFFER_BINDING); #end

		textureQuad = gltoolbox.GeometryTools.createQuad(0, 0, 1, 1);

		if(OFFSCREEN_RENDER){
			offScreenTarget = new RenderTarget(
				Math.round(app.runtime.window_width()*offScreenScale),
				Math.round(app.runtime.window_height()*offScreenScale),
				gltoolbox.TextureTools.createTextureFactory({
					channelType: GL.RGB,
					dataType: GL.UNSIGNED_BYTE,
					filter: offScreenFilter
				})
			);
		}

		screenTextureShader = new ScreenTexture();
		renderParticlesShader = new ColorParticleMotion();
		updateDyeShader = new MouseDye();
		mouseForceShader = new MouseForce();


      updateDyeShader.mousePosition0.data = mousePositions[0];
      updateDyeShader.lastMousePosition0.data = lastMousePositions[0];
      mouseForceShader.mousePosition0.data = mousePositions[0];
      mouseForceShader.lastMousePosition0.data = lastMousePositions[0];
      updateDyeShader.mousePosition1.data = mousePositions[1];
      updateDyeShader.lastMousePosition1.data = lastMousePositions[1];
      mouseForceShader.mousePosition1.data = mousePositions[1];
      mouseForceShader.lastMousePosition1.data = lastMousePositions[1];
      updateDyeShader.mousePosition2.data = mousePositions[2];
      updateDyeShader.lastMousePosition2.data = lastMousePositions[2];
      mouseForceShader.mousePosition2.data = mousePositions[2];
      mouseForceShader.lastMousePosition2.data = lastMousePositions[2];
      updateDyeShader.mousePosition3.data = mousePositions[3];
      updateDyeShader.lastMousePosition3.data = lastMousePositions[3];
      mouseForceShader.mousePosition3.data = mousePositions[3];
      mouseForceShader.lastMousePosition3.data = lastMousePositions[3];
      updateDyeShader.mousePosition4.data = mousePositions[4];
      updateDyeShader.lastMousePosition4.data = lastMousePositions[4];
      mouseForceShader.mousePosition4.data = mousePositions[4];
      mouseForceShader.lastMousePosition4.data = lastMousePositions[4];
      updateDyeShader.mousePosition5.data = mousePositions[5];
      updateDyeShader.lastMousePosition5.data = lastMousePositions[5];
      mouseForceShader.mousePosition5.data = mousePositions[5];
      mouseForceShader.lastMousePosition5.data = lastMousePositions[5];
      updateDyeShader.mousePosition6.data = mousePositions[6];
      updateDyeShader.lastMousePosition6.data = lastMousePositions[6];
      mouseForceShader.mousePosition6.data = mousePositions[6];
      mouseForceShader.lastMousePosition6.data = lastMousePositions[6];
      updateDyeShader.mousePosition7.data = mousePositions[7];
      updateDyeShader.lastMousePosition7.data = lastMousePositions[7];
      mouseForceShader.mousePosition7.data = mousePositions[7];
      mouseForceShader.lastMousePosition7.data = lastMousePositions[7];
      updateDyeShader.mousePosition8.data = mousePositions[8];
      updateDyeShader.lastMousePosition8.data = lastMousePositions[8];
      mouseForceShader.mousePosition8.data = mousePositions[8];
      mouseForceShader.lastMousePosition8.data = lastMousePositions[8];
      updateDyeShader.mousePosition9.data = mousePositions[9];
      updateDyeShader.lastMousePosition9.data = lastMousePositions[9];
      mouseForceShader.mousePosition9.data = mousePositions[9];
      mouseForceShader.lastMousePosition9.data = lastMousePositions[9];
      updateDyeShader.mousePosition10.data = mousePositions[10];
      updateDyeShader.lastMousePosition10.data = lastMousePositions[10];
      mouseForceShader.mousePosition10.data = mousePositions[10];
      mouseForceShader.lastMousePosition10.data = lastMousePositions[10];
      updateDyeShader.mousePosition11.data = mousePositions[11];
      updateDyeShader.lastMousePosition11.data = lastMousePositions[11];
      mouseForceShader.mousePosition11.data = mousePositions[11];
      mouseForceShader.lastMousePosition11.data = lastMousePositions[11];
      updateDyeShader.mousePosition12.data = mousePositions[12];
      updateDyeShader.lastMousePosition12.data = lastMousePositions[12];
      mouseForceShader.mousePosition12.data = mousePositions[12];
      mouseForceShader.lastMousePosition12.data = lastMousePositions[12];
      updateDyeShader.mousePosition13.data = mousePositions[13];
      updateDyeShader.lastMousePosition13.data = lastMousePositions[13];
      mouseForceShader.mousePosition13.data = mousePositions[13];
      mouseForceShader.lastMousePosition13.data = lastMousePositions[13];
      updateDyeShader.mousePosition14.data = mousePositions[14];
      updateDyeShader.lastMousePosition14.data = lastMousePositions[14];
      mouseForceShader.mousePosition14.data = mousePositions[14];
      mouseForceShader.lastMousePosition14.data = lastMousePositions[14];
      updateDyeShader.mousePosition15.data = mousePositions[15];
      updateDyeShader.lastMousePosition15.data = lastMousePositions[15];
      mouseForceShader.mousePosition15.data = mousePositions[15];
      mouseForceShader.lastMousePosition15.data = lastMousePositions[15];
      updateDyeShader.mousePosition16.data = mousePositions[16];
      updateDyeShader.lastMousePosition16.data = lastMousePositions[16];
      mouseForceShader.mousePosition16.data = mousePositions[16];
      mouseForceShader.lastMousePosition16.data = lastMousePositions[16];
      updateDyeShader.mousePosition17.data = mousePositions[17];
      updateDyeShader.lastMousePosition17.data = lastMousePositions[17];
      mouseForceShader.mousePosition17.data = mousePositions[17];
      mouseForceShader.lastMousePosition17.data = lastMousePositions[17];
      updateDyeShader.mousePosition18.data = mousePositions[18];
      updateDyeShader.lastMousePosition18.data = lastMousePositions[18];
      mouseForceShader.mousePosition18.data = mousePositions[18];
      mouseForceShader.lastMousePosition18.data = lastMousePositions[18];
      updateDyeShader.mousePosition19.data = mousePositions[19];
      updateDyeShader.lastMousePosition19.data = lastMousePositions[19];
      mouseForceShader.mousePosition19.data = mousePositions[19];
      mouseForceShader.lastMousePosition19.data = lastMousePositions[19];
      updateDyeShader.mousePosition20.data = mousePositions[20];
      updateDyeShader.lastMousePosition20.data = lastMousePositions[20];
      mouseForceShader.mousePosition20.data = mousePositions[20];
      mouseForceShader.lastMousePosition20.data = lastMousePositions[20];
      updateDyeShader.mousePosition21.data = mousePositions[21];
      updateDyeShader.lastMousePosition21.data = lastMousePositions[21];
      mouseForceShader.mousePosition21.data = mousePositions[21];
      mouseForceShader.lastMousePosition21.data = lastMousePositions[21];
      updateDyeShader.mousePosition22.data = mousePositions[22];
      updateDyeShader.lastMousePosition22.data = lastMousePositions[22];
      mouseForceShader.mousePosition22.data = mousePositions[22];
      mouseForceShader.lastMousePosition22.data = lastMousePositions[22];
      updateDyeShader.mousePosition23.data = mousePositions[23];
      updateDyeShader.lastMousePosition23.data = lastMousePositions[23];
      mouseForceShader.mousePosition23.data = mousePositions[23];
      mouseForceShader.lastMousePosition23.data = lastMousePositions[23];
      updateDyeShader.mousePosition24.data = mousePositions[24];
      updateDyeShader.lastMousePosition24.data = lastMousePositions[24];
      mouseForceShader.mousePosition24.data = mousePositions[24];
      mouseForceShader.lastMousePosition24.data = lastMousePositions[24];
      updateDyeShader.mousePosition25.data = mousePositions[25];
      updateDyeShader.lastMousePosition25.data = lastMousePositions[25];
      mouseForceShader.mousePosition25.data = mousePositions[25];
      mouseForceShader.lastMousePosition25.data = lastMousePositions[25];
      updateDyeShader.mousePosition26.data = mousePositions[26];
      updateDyeShader.lastMousePosition26.data = lastMousePositions[26];
      mouseForceShader.mousePosition26.data = mousePositions[26];
      mouseForceShader.lastMousePosition26.data = lastMousePositions[26];
      updateDyeShader.mousePosition27.data = mousePositions[27];
      updateDyeShader.lastMousePosition27.data = lastMousePositions[27];
      mouseForceShader.mousePosition27.data = mousePositions[27];
      mouseForceShader.lastMousePosition27.data = lastMousePositions[27];
      updateDyeShader.mousePosition28.data = mousePositions[28];
      updateDyeShader.lastMousePosition28.data = lastMousePositions[28];
      mouseForceShader.mousePosition28.data = mousePositions[28];
      mouseForceShader.lastMousePosition28.data = lastMousePositions[28];
      updateDyeShader.mousePosition29.data = mousePositions[29];
      updateDyeShader.lastMousePosition29.data = lastMousePositions[29];
      mouseForceShader.mousePosition29.data = mousePositions[29];
      mouseForceShader.lastMousePosition29.data = lastMousePositions[29];


		var cellScale = 32;
		fluid = new GPUFluid(Math.round(app.runtime.window_width()*fluidScale), Math.round(app.runtime.window_height()*fluidScale), cellScale, fluidIterations);
		fluid.updateDyeShader = updateDyeShader;
		fluid.applyForcesShader = mouseForceShader;

		particles = new GPUParticles(particleCount);
		//scale from fluid's velocity field to clipSpace, which the particle velocity uses
		particles.flowScaleX = 1/(fluid.cellSize * fluid.aspectRatio);
		particles.flowScaleY = 1/fluid.cellSize;
		particles.dragCoefficient = 1;

		#if ios
		renderParticlesShader.POINT_SIZE = "4.0";
		#end

		lastTime = haxe.Timer.stamp();
	}

	override function update( dt:Float ){
		dt = 0.016;//@!
		//Physics
		//interaction
      updateDyeShader.isMouseDown0.data = isMouseDowns[0];
      mouseForceShader.isMouseDown0.data = isMouseDowns[0];
      updateDyeShader.isMouseDown1.data = isMouseDowns[1];
      mouseForceShader.isMouseDown1.data = isMouseDowns[1];
      updateDyeShader.isMouseDown2.data = isMouseDowns[2];
      mouseForceShader.isMouseDown2.data = isMouseDowns[2];
      updateDyeShader.isMouseDown3.data = isMouseDowns[3];
      mouseForceShader.isMouseDown3.data = isMouseDowns[3];
      updateDyeShader.isMouseDown4.data = isMouseDowns[4];
      mouseForceShader.isMouseDown4.data = isMouseDowns[4];
      updateDyeShader.isMouseDown5.data = isMouseDowns[5];
      mouseForceShader.isMouseDown5.data = isMouseDowns[5];
      updateDyeShader.isMouseDown6.data = isMouseDowns[6];
      mouseForceShader.isMouseDown6.data = isMouseDowns[6];
      updateDyeShader.isMouseDown7.data = isMouseDowns[7];
      mouseForceShader.isMouseDown7.data = isMouseDowns[7];
      updateDyeShader.isMouseDown8.data = isMouseDowns[8];
      mouseForceShader.isMouseDown8.data = isMouseDowns[8];
      updateDyeShader.isMouseDown9.data = isMouseDowns[9];
      mouseForceShader.isMouseDown9.data = isMouseDowns[9];
      updateDyeShader.isMouseDown10.data = isMouseDowns[10];
      mouseForceShader.isMouseDown10.data = isMouseDowns[10];
      updateDyeShader.isMouseDown11.data = isMouseDowns[11];
      mouseForceShader.isMouseDown11.data = isMouseDowns[11];
      updateDyeShader.isMouseDown12.data = isMouseDowns[12];
      mouseForceShader.isMouseDown12.data = isMouseDowns[12];
      updateDyeShader.isMouseDown13.data = isMouseDowns[13];
      mouseForceShader.isMouseDown13.data = isMouseDowns[13];
      updateDyeShader.isMouseDown14.data = isMouseDowns[14];
      mouseForceShader.isMouseDown14.data = isMouseDowns[14];
      updateDyeShader.isMouseDown15.data = isMouseDowns[15];
      mouseForceShader.isMouseDown15.data = isMouseDowns[15];
      updateDyeShader.isMouseDown16.data = isMouseDowns[16];
      mouseForceShader.isMouseDown16.data = isMouseDowns[16];
      updateDyeShader.isMouseDown17.data = isMouseDowns[17];
      mouseForceShader.isMouseDown17.data = isMouseDowns[17];
      updateDyeShader.isMouseDown18.data = isMouseDowns[18];
      mouseForceShader.isMouseDown18.data = isMouseDowns[18];
      updateDyeShader.isMouseDown19.data = isMouseDowns[19];
      mouseForceShader.isMouseDown19.data = isMouseDowns[19];
      updateDyeShader.isMouseDown20.data = isMouseDowns[20];
      mouseForceShader.isMouseDown20.data = isMouseDowns[20];
      updateDyeShader.isMouseDown21.data = isMouseDowns[21];
      mouseForceShader.isMouseDown21.data = isMouseDowns[21];
      updateDyeShader.isMouseDown22.data = isMouseDowns[22];
      mouseForceShader.isMouseDown22.data = isMouseDowns[22];
      updateDyeShader.isMouseDown23.data = isMouseDowns[23];
      mouseForceShader.isMouseDown23.data = isMouseDowns[23];
      updateDyeShader.isMouseDown24.data = isMouseDowns[24];
      mouseForceShader.isMouseDown24.data = isMouseDowns[24];
      updateDyeShader.isMouseDown25.data = isMouseDowns[25];
      mouseForceShader.isMouseDown25.data = isMouseDowns[25];
      updateDyeShader.isMouseDown26.data = isMouseDowns[26];
      mouseForceShader.isMouseDown26.data = isMouseDowns[26];
      updateDyeShader.isMouseDown27.data = isMouseDowns[27];
      mouseForceShader.isMouseDown27.data = isMouseDowns[27];
      updateDyeShader.isMouseDown28.data = isMouseDowns[28];
      mouseForceShader.isMouseDown28.data = isMouseDowns[28];
      updateDyeShader.isMouseDown29.data = isMouseDowns[29];
      mouseForceShader.isMouseDown29.data = isMouseDowns[29];


		//step physics
		fluid.step(dt);

		particles.flowVelocityField = fluid.velocityRenderTarget.readFromTexture;
		if(renderParticlesEnabled) particles.step(dt);

		updateLastMouse();
	}

	override function tick (delta:Float):Void {
		// time = haxe.Timer.stamp();
		// var dt = time - lastTime; //60fps ~ 0.016
		// lastTime = time;

		//Render
		//render to offScreen
		if(OFFSCREEN_RENDER){
			GL.viewport (0, 0, offScreenTarget.width, offScreenTarget.height);
			GL.bindFramebuffer(GL.FRAMEBUFFER, offScreenTarget.frameBufferObject);
		}else{
			GL.viewport (0, 0, app.runtime.window_width(), app.runtime.window_height());
			GL.bindFramebuffer(GL.FRAMEBUFFER, screenBuffer);
		}

		GL.clearColor(0,0,0,1);
		GL.clear(GL.COLOR_BUFFER_BIT);

		// additive blending
		GL.enable(GL.BLEND);
		GL.blendFunc( GL.SRC_ALPHA, GL.SRC_ALPHA );
		GL.blendEquation(GL.FUNC_ADD);

		if(renderParticlesEnabled) renderParticles();
		if(renderFluidEnabled) renderTexture(fluid.dyeRenderTarget.readFromTexture);

		GL.disable(GL.BLEND);

		//render offScreen texture to screen
		if(OFFSCREEN_RENDER){
			GL.viewport (0, 0, app.runtime.window_width(), app.runtime.window_height());
			GL.bindFramebuffer(GL.FRAMEBUFFER, screenBuffer);
			renderTexture(offScreenTarget.texture);
		}
	}

	inline function renderTexture(texture:GLTexture){
		GL.bindBuffer (GL.ARRAY_BUFFER, textureQuad);

		screenTextureShader.texture.data = texture;
		
		screenTextureShader.activate(true, true);
		GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4);
		screenTextureShader.deactivate();
	}

	inline function renderParticles():Void{
		//set vertices
		GL.bindBuffer(GL.ARRAY_BUFFER, particles.particleUVs);

		//set uniforms
		renderParticlesShader.particleData.data = particles.particleData.readFromTexture;

		//draw points
		renderParticlesShader.activate(true, true);
		GL.drawArrays(GL.POINTS, 0, particles.count);
		renderParticlesShader.deactivate();
	}

	function updateSimulationTextures(){
		//only resize if there is a change
		var w:Int, h:Int;
		w = Math.round(app.runtime.window_width()*fluidScale); h = Math.round(app.runtime.window_height()*fluidScale);
		if(w != fluid.width || h != fluid.height) fluid.resize(w, h);

		w = Math.round(app.runtime.window_width()*offScreenScale); h = Math.round(app.runtime.window_height()*offScreenScale);
		if(w != offScreenTarget.width || h != offScreenTarget.height) offScreenTarget.resize(w, h);

		if(particleCount != particles.count) particles.setCount(particleCount);
	}

	function set_simulationQuality(quality:SimulationQuality):SimulationQuality{
		switch (quality) {
			case UltraHigh:
				particleCount = 1 << 20;
				fluidScale = 1/2;
				fluidIterations = 30;
				offScreenScale = 1/1;
				offScreenFilter = GL.NEAREST;
			case High:
				particleCount = 1 << 20;
				fluidScale = 1/4;
				fluidIterations = 20;
				offScreenScale = 1/1;
				offScreenFilter = GL.NEAREST;
			case Medium:
				particleCount = 1 << 18;
				fluidScale = 1/4;
				fluidIterations = 18;
				offScreenScale = 1/1;
				offScreenFilter = GL.NEAREST;
			case Low:
				particleCount = 1 << 16;
				fluidScale = 1/5;
				fluidIterations = 14;
				offScreenScale = 1/1;
				offScreenFilter = GL.NEAREST;
			case UltraLow:
				particleCount = 1 << 14;
				fluidScale = 1/6;
				fluidIterations = 12;
				offScreenScale = 1/2;
				offScreenFilter = GL.NEAREST;
			case iOS:
				particleCount = 1 << 14;
				fluidScale = 1/10;
				fluidIterations = 6;
				offScreenScale = 1/2;
				offScreenFilter = GL.LINEAR;
		}
		return simulationQuality = quality;
	}

	function set_fluidIterations(v:Int):Int{
		fluidIterations = v;
		if(fluid != null) fluid.solverIterations = v;
		return v;
	}

	var qualityDirection:Int = 0;
	function lowerQualityRequired(magnitude:Float){
		if(qualityDirection>0)return;
		qualityDirection = -1;
		var qualityIndex = Type.enumIndex(this.simulationQuality);
		var maxIndex = Type.allEnums(SimulationQuality).length - 1;
		if(qualityIndex >= maxIndex)return;

		if(magnitude < 0.5) qualityIndex +=1;
		else                qualityIndex +=2;

		if(qualityIndex > maxIndex)qualityIndex = maxIndex;

		var newQuality = Type.createEnumIndex(SimulationQuality, qualityIndex);
		trace('Average FPS: '+performanceMonitor.fpsAverage+', lowering quality to: '+newQuality);
		this.simulationQuality = newQuality;
		updateSimulationTextures();
	}

	//!# Requires better upsampling before use!
	function higherQualityRequired(magnitude:Float){
		if(qualityDirection<0)return;
		qualityDirection = 1;

		var qualityIndex = Type.enumIndex(this.simulationQuality);
		var minIndex = 0;
		if(qualityIndex <= minIndex)return;

		if(magnitude < 0.5) qualityIndex -=1;
		else                qualityIndex -=2;

		if(qualityIndex < minIndex)qualityIndex = minIndex;

		var newQuality = Type.createEnumIndex(SimulationQuality, qualityIndex);
		trace('Raising quality to: '+newQuality);
		this.simulationQuality = newQuality;
		updateSimulationTextures();
	}


	//---- Interface ----//

	function reset():Void{
		particles.reset();	
		fluid.clear();
	}

	//coordinate conversion
	inline function windowToClipSpaceX(x:Float) return (x/app.runtime.window_width())*2 - 1;
	inline function windowToClipSpaceY(y:Float) return ((app.runtime.window_height()-y)/app.runtime.window_height())*2 - 1;

	override function onmousedown( x : Float , y : Float , button : Int, _, _){
		isMouseDowns[0] = true; 
	}
	override function onmouseup( x : Float , y : Float , button : Int, _, _){
		isMouseDowns[0] = false;
	}

	override function onmousemove( x : Float , y : Float , xrel:Int, yrel:Int, _, _) {
		// mouse.set(x, y);
		// mousePositions[0].set(
		// 	fluid.clipToAspectSpaceX(windowToClipSpaceX(x)),
		// 	fluid.clipToAspectSpaceY(windowToClipSpaceY(y))
		// );
		// mousePointKnown = true;
	}

	inline function updateLastMouse(){
		// lastMouse.set(mouse.x, mouse.y);
		// lastMousePositions[0].set(
		// 	fluid.clipToAspectSpaceX(windowToClipSpaceX(mouse.x)),
		// 	fluid.clipToAspectSpaceY(windowToClipSpaceY(mouse.y))
		// );
		// lastMousePointKnown = true && mousePointKnown;
	}

	// override function ontouchdown(x:Float,y:Float,touch_id:Int,_){
	// 	updateTouchCoordinate(x,y);
	// 	updateLastMouse();
	// 	this.isMouseDown = true; 
	// }

	// override function ontouchup(x:Float,y:Float,touch_id:Int,_){
	// 	updateTouchCoordinate(x,y);
	// 	this.isMouseDown = false;
	// }

	// override function ontouchmove(x:Float,y:Float,dx:Float,dy:Float,touch_id:Int,_){
	// 	updateTouchCoordinate(x,y);
	// }


	// function updateTouchCoordinate(x:Float, y:Float){
	// 	x = x*app.runtime.window_width();
	// 	y = y*app.runtime.window_height();
	// 	mouse.set(x, y);
	// 	mouseFluid.set(
	// 		windowToClipSpaceX(x),
	// 		windowToClipSpaceY(y)
	// 	);
	// 	mousePointKnown = true;
	// }


	var lshiftDown = false;
	var rshiftDown = false;
	override function onkeydown( keyCode : Int, _, _, _, _, _){
		switch (keyCode) {
			case Key.lshift: 
				lshiftDown = true;
			case Key.rshift: 
				rshiftDown = true;
		}
	}
	
	override function onkeyup( keyCode : Int , _, _, _, _, _){
		switch (keyCode) {
			case Key.key_r:
				if(lshiftDown || rshiftDown) particles.reset();
				else reset();
			case Key.key_p:
				renderParticlesEnabled = !renderParticlesEnabled;
			case Key.key_d:
				renderFluidEnabled = !renderFluidEnabled;
			case Key.key_s:
				fluid.clear();
			case Key.lshift: 
				lshiftDown = false;
			case Key.rshift: 
				rshiftDown = false;
		}
	}
}

enum SimulationQuality{
	UltraHigh;
	High;
	Medium;
	Low;
	UltraLow;
	iOS;
}


@:vert('#pragma include("src/shaders/glsl/no-transform.vert")')
@:frag('#pragma include("src/shaders/glsl/quad-texture.frag")')
class ScreenTexture extends ShaderBase {}

@:vert('
	const float POINT_SIZE = 1.0;
	void main(){
		vec2 p = texture2D(particleData, particleUV).xy;
		vec2 v = texture2D(particleData, particleUV).zw;
		gl_PointSize = POINT_SIZE;
		gl_Position = vec4(p, 0.0, 1.0);
		float speed = length(v);
		float x = clamp(speed * 2.0, 0., 1.);
		color.rgb = (
				mix(vec3(40.4, 0.0, 35.0) / 300.0, vec3(0.2, 47.8, 100) / 100.0, x)
				+ (vec3(63.1, 92.5, 100) / 100.) * x*x*x * .1
		);
		color.a = 1.0;
	}
')
class ColorParticleMotion extends GPUParticles.RenderParticles{}

@:frag('
	#pragma include("src/shaders/glsl/geom.glsl")
	#pragma include("src/shaders/glsl/generated/mouseDye.glsl")
')
class MouseDye extends GPUFluid.UpdateDye{}

@:frag('
	#pragma include("src/shaders/glsl/geom.glsl")
  #pragma include("src/shaders/glsl/generated/mouseForce.glsl")
')
class MouseForce extends GPUFluid.ApplyForces{}