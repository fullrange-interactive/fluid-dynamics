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
    vec2 v = texture2D(velocity, texelCoord).xy;
    v.xy *= 0.999;


    vec2  mouseVelocity;
    float projection;
    float l;
    float taperFactor;
    float projectedFraction;
    float R;
    float m;
    vec2 targetVelocity;`;
for (var i = 0; i < MAX_TOUCHES; i++) {
res += `
    if (isMouseDown${i}) {
      mouseVelocity = -(lastMousePosition${i} - mousePosition${i})/dt;
      
      //compute tapered distance to mouse line segment
      projection;
      l = distanceToSegment(mousePosition${i}, lastMousePosition${i}, p, projection);
      taperFactor = 0.6;//1 => 0 at lastMousePosition${i}, 0 => no tapering
      projectedFraction = 1.0 - clamp(projection, 0.0, 1.0)*taperFactor;
      R = 0.015;
      m = exp(-l/R); //drag coefficient
      m *= projectedFraction * projectedFraction;
      targetVelocity = mouseVelocity * dx * 1.4;
      v += (targetVelocity - v)*m;
    }
`
}
res += `
    gl_FragColor = vec4(v, 0, 1.);
  }
`;

console.log(res);