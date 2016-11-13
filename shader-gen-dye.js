// var res = `
//   vec2  mouseVelocity;
//   float projection;
//   float l;
//   float taperFactor;
//   float projectedFraction;
//   float R;
//   float m;
//   vec2 targetVelocity;

// `;
// for (var i = 0; i < 30; i++) {
// res += `
//     if (mouseDown${i}) {
//       mouseVelocity = -(lastMousePosition${i} - mousePosition${i})/dt;
      
//       //compute tapered distance to mouse line segment
//       projection;
//       l = distanceToSegment(mousePosition${i}, lastMousePosition${i}, p, projection);
//       taperFactor = 0.6;//1 => 0 at lastMousePositions${i}, 0 => no tapering
//       projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
//       R = 0.015;
//       m = exp(-l/R); //drag coefficient
//       m *= projectedFraction * projectedFraction;
//       targetVelocity = mouseVelocity * dx * 1.4;
//       v += (targetVelocity - v)*m;
//     }
// `
// }
// 
// 

const MAX_TOUCHES = 30;

var res = ``;
for (var i = 0; i < MAX_TOUCHES; i++) {
  res += `uniform vec2 mousePosition${i};
`;
}
for (var i = 0; i < MAX_TOUCHES; i++) {
  res += `uniform vec2 lastMousePosition${i};
`;
}
for (var i = 0; i < MAX_TOUCHES; i++) {
  res += `uniform bool isMouseDown${i};
`;
}

res += `
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

`;
for (var i = 0; i < MAX_TOUCHES; i++) {
  res += `
      if(isMouseDown${i}){      
        vec2 mouseVelocity = (mousePosition${i} - lastMousePosition${i})/dt;
        
        //compute tapered distance to mouse line segment
        float projection;
        float l = distanceToSegment(mousePosition${i}, lastMousePosition${i}, p, projection);
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
`
}
res += `
    gl_FragColor = color;
  }
`;

console.log(res);