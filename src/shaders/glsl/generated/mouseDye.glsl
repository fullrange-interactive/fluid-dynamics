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
    vec4 color = texture2D(dye, texelCoord);
    color.r *= (0.9797);
    color.g *= (0.9494);
    color.b *= (0.9696);
    vec2 mouseVelocity;
    float projection;
    float l;
    float taperFactor;
    float projectedFraction;
    float R;
    float m;
    float speed;
    float x;


      if(isMouseDown0){      
        vec2 mouseVelocity = (mousePosition0 - lastMousePosition0)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition0, lastMousePosition0, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown1){      
        vec2 mouseVelocity = (mousePosition1 - lastMousePosition1)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition1, lastMousePosition1, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown2){      
        vec2 mouseVelocity = (mousePosition2 - lastMousePosition2)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition2, lastMousePosition2, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown3){      
        vec2 mouseVelocity = (mousePosition3 - lastMousePosition3)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition3, lastMousePosition3, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown4){      
        vec2 mouseVelocity = (mousePosition4 - lastMousePosition4)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition4, lastMousePosition4, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown5){      
        vec2 mouseVelocity = (mousePosition5 - lastMousePosition5)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition5, lastMousePosition5, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown6){      
        vec2 mouseVelocity = (mousePosition6 - lastMousePosition6)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition6, lastMousePosition6, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown7){      
        vec2 mouseVelocity = (mousePosition7 - lastMousePosition7)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition7, lastMousePosition7, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown8){      
        vec2 mouseVelocity = (mousePosition8 - lastMousePosition8)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition8, lastMousePosition8, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown9){      
        vec2 mouseVelocity = (mousePosition9 - lastMousePosition9)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition9, lastMousePosition9, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown10){      
        vec2 mouseVelocity = (mousePosition10 - lastMousePosition10)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition10, lastMousePosition10, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown11){      
        vec2 mouseVelocity = (mousePosition11 - lastMousePosition11)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition11, lastMousePosition11, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown12){      
        vec2 mouseVelocity = (mousePosition12 - lastMousePosition12)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition12, lastMousePosition12, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown13){      
        vec2 mouseVelocity = (mousePosition13 - lastMousePosition13)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition13, lastMousePosition13, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown14){      
        vec2 mouseVelocity = (mousePosition14 - lastMousePosition14)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition14, lastMousePosition14, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown15){      
        vec2 mouseVelocity = (mousePosition15 - lastMousePosition15)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition15, lastMousePosition15, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown16){      
        vec2 mouseVelocity = (mousePosition16 - lastMousePosition16)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition16, lastMousePosition16, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown17){      
        vec2 mouseVelocity = (mousePosition17 - lastMousePosition17)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition17, lastMousePosition17, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown18){      
        vec2 mouseVelocity = (mousePosition18 - lastMousePosition18)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition18, lastMousePosition18, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown19){      
        vec2 mouseVelocity = (mousePosition19 - lastMousePosition19)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition19, lastMousePosition19, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown20){      
        vec2 mouseVelocity = (mousePosition20 - lastMousePosition20)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition20, lastMousePosition20, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown21){      
        vec2 mouseVelocity = (mousePosition21 - lastMousePosition21)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition21, lastMousePosition21, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown22){      
        vec2 mouseVelocity = (mousePosition22 - lastMousePosition22)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition22, lastMousePosition22, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown23){      
        vec2 mouseVelocity = (mousePosition23 - lastMousePosition23)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition23, lastMousePosition23, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown24){      
        vec2 mouseVelocity = (mousePosition24 - lastMousePosition24)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition24, lastMousePosition24, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown25){      
        vec2 mouseVelocity = (mousePosition25 - lastMousePosition25)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition25, lastMousePosition25, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown26){      
        vec2 mouseVelocity = (mousePosition26 - lastMousePosition26)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition26, lastMousePosition26, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown27){      
        vec2 mouseVelocity = (mousePosition27 - lastMousePosition27)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition27, lastMousePosition27, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown28){      
        vec2 mouseVelocity = (mousePosition28 - lastMousePosition28)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition28, lastMousePosition28, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

      if(isMouseDown29){      
        vec2 mouseVelocity = (mousePosition29 - lastMousePosition29)/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition29, lastMousePosition29, p, projection);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
        float R = 0.025;
        float m = exp(-l/R);
        
        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (
          mix(vec3(2.4, 0, 5.9) / 60.0, vec3(0.2, 51.8, 100) / 30.0, x)
            + (vec3(100) / 100.) * pow(x, 9.)
        );
      }

    gl_FragColor = color;
  }

