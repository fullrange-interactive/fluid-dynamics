uniform vec2 mousePosition0;
uniform vec2 mousePosition1;
uniform vec2 mousePosition2;
uniform vec2 mousePosition3;
uniform vec2 mousePosition4;
uniform vec2 mousePosition5;
uniform vec2 mousePosition6;
uniform vec2 mousePosition7;
uniform vec2 mousePosition8;
uniform vec2 mousePosition9;
uniform vec2 mousePosition10;
uniform vec2 mousePosition11;
uniform vec2 mousePosition12;
uniform vec2 mousePosition13;
uniform vec2 mousePosition14;
uniform vec2 mousePosition15;
uniform vec2 mousePosition16;
uniform vec2 mousePosition17;
uniform vec2 mousePosition18;
uniform vec2 mousePosition19;
uniform vec2 mousePosition20;
uniform vec2 mousePosition21;
uniform vec2 mousePosition22;
uniform vec2 mousePosition23;
uniform vec2 mousePosition24;
uniform vec2 mousePosition25;
uniform vec2 mousePosition26;
uniform vec2 mousePosition27;
uniform vec2 mousePosition28;
uniform vec2 mousePosition29;
uniform vec2 lastMousePosition0;
uniform vec2 lastMousePosition1;
uniform vec2 lastMousePosition2;
uniform vec2 lastMousePosition3;
uniform vec2 lastMousePosition4;
uniform vec2 lastMousePosition5;
uniform vec2 lastMousePosition6;
uniform vec2 lastMousePosition7;
uniform vec2 lastMousePosition8;
uniform vec2 lastMousePosition9;
uniform vec2 lastMousePosition10;
uniform vec2 lastMousePosition11;
uniform vec2 lastMousePosition12;
uniform vec2 lastMousePosition13;
uniform vec2 lastMousePosition14;
uniform vec2 lastMousePosition15;
uniform vec2 lastMousePosition16;
uniform vec2 lastMousePosition17;
uniform vec2 lastMousePosition18;
uniform vec2 lastMousePosition19;
uniform vec2 lastMousePosition20;
uniform vec2 lastMousePosition21;
uniform vec2 lastMousePosition22;
uniform vec2 lastMousePosition23;
uniform vec2 lastMousePosition24;
uniform vec2 lastMousePosition25;
uniform vec2 lastMousePosition26;
uniform vec2 lastMousePosition27;
uniform vec2 lastMousePosition28;
uniform vec2 lastMousePosition29;
uniform bool isMouseDown0;
uniform bool isMouseDown1;
uniform bool isMouseDown2;
uniform bool isMouseDown3;
uniform bool isMouseDown4;
uniform bool isMouseDown5;
uniform bool isMouseDown6;
uniform bool isMouseDown7;
uniform bool isMouseDown8;
uniform bool isMouseDown9;
uniform bool isMouseDown10;
uniform bool isMouseDown11;
uniform bool isMouseDown12;
uniform bool isMouseDown13;
uniform bool isMouseDown14;
uniform bool isMouseDown15;
uniform bool isMouseDown16;
uniform bool isMouseDown17;
uniform bool isMouseDown18;
uniform bool isMouseDown19;
uniform bool isMouseDown20;
uniform bool isMouseDown21;
uniform bool isMouseDown22;
uniform bool isMouseDown23;
uniform bool isMouseDown24;
uniform bool isMouseDown25;
uniform bool isMouseDown26;
uniform bool isMouseDown27;
uniform bool isMouseDown28;
uniform bool isMouseDown29;

  void main(){
    int i = 0;
    vec2 v = texture2D(velocity, texelCoord).xy;
    v.xy *= 0.999;


    vec2  mouseVelocity;
    float projection;
    float l;
    float taperFactor;
    float projectedFraction;
    float R;
    float m;
    vec2 targetVelocity;
    if (isMouseDown0) {
      mouseVelocity = -(lastMousePosition0 - mousePosition0)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition0, lastMousePosition0, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition0, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown1) {
      mouseVelocity = -(lastMousePosition1 - mousePosition1)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition1, lastMousePosition1, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition1, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown2) {
      mouseVelocity = -(lastMousePosition2 - mousePosition2)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition2, lastMousePosition2, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition2, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown3) {
      mouseVelocity = -(lastMousePosition3 - mousePosition3)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition3, lastMousePosition3, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition3, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown4) {
      mouseVelocity = -(lastMousePosition4 - mousePosition4)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition4, lastMousePosition4, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition4, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown5) {
      mouseVelocity = -(lastMousePosition5 - mousePosition5)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition5, lastMousePosition5, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition5, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown6) {
      mouseVelocity = -(lastMousePosition6 - mousePosition6)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition6, lastMousePosition6, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition6, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown7) {
      mouseVelocity = -(lastMousePosition7 - mousePosition7)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition7, lastMousePosition7, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition7, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown8) {
      mouseVelocity = -(lastMousePosition8 - mousePosition8)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition8, lastMousePosition8, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition8, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown9) {
      mouseVelocity = -(lastMousePosition9 - mousePosition9)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition9, lastMousePosition9, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition9, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown10) {
      mouseVelocity = -(lastMousePosition10 - mousePosition10)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition10, lastMousePosition10, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition10, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown11) {
      mouseVelocity = -(lastMousePosition11 - mousePosition11)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition11, lastMousePosition11, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition11, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown12) {
      mouseVelocity = -(lastMousePosition12 - mousePosition12)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition12, lastMousePosition12, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition12, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown13) {
      mouseVelocity = -(lastMousePosition13 - mousePosition13)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition13, lastMousePosition13, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition13, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown14) {
      mouseVelocity = -(lastMousePosition14 - mousePosition14)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition14, lastMousePosition14, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition14, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown15) {
      mouseVelocity = -(lastMousePosition15 - mousePosition15)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition15, lastMousePosition15, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition15, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown16) {
      mouseVelocity = -(lastMousePosition16 - mousePosition16)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition16, lastMousePosition16, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition16, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown17) {
      mouseVelocity = -(lastMousePosition17 - mousePosition17)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition17, lastMousePosition17, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition17, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown18) {
      mouseVelocity = -(lastMousePosition18 - mousePosition18)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition18, lastMousePosition18, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition18, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown19) {
      mouseVelocity = -(lastMousePosition19 - mousePosition19)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition19, lastMousePosition19, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition19, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown20) {
      mouseVelocity = -(lastMousePosition20 - mousePosition20)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition20, lastMousePosition20, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition20, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown21) {
      mouseVelocity = -(lastMousePosition21 - mousePosition21)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition21, lastMousePosition21, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition21, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown22) {
      mouseVelocity = -(lastMousePosition22 - mousePosition22)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition22, lastMousePosition22, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition22, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown23) {
      mouseVelocity = -(lastMousePosition23 - mousePosition23)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition23, lastMousePosition23, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition23, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown24) {
      mouseVelocity = -(lastMousePosition24 - mousePosition24)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition24, lastMousePosition24, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition24, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown25) {
      mouseVelocity = -(lastMousePosition25 - mousePosition25)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition25, lastMousePosition25, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition25, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown26) {
      mouseVelocity = -(lastMousePosition26 - mousePosition26)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition26, lastMousePosition26, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition26, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown27) {
      mouseVelocity = -(lastMousePosition27 - mousePosition27)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition27, lastMousePosition27, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition27, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown28) {
      mouseVelocity = -(lastMousePosition28 - mousePosition28)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition28, lastMousePosition28, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition28, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    if (isMouseDown29) {
      mouseVelocity = -(lastMousePosition29 - mousePosition29)/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition29, lastMousePosition29, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition29, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }

    gl_FragColor = vec4(v, 0, 1.);
  }

