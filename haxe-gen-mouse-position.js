var res = ``;
for (var i = 0; i < 30; i++) {
  res += `
      updateDyeShader.mousePosition${i}.data = mousePositions[${i}];
      updateDyeShader.lastMousePosition${i}.data = lastMousePositions[${i}];
      mouseForceShader.mousePosition${i}.data = mousePositions[${i}];
      mouseForceShader.lastMousePosition${i}.data = lastMousePositions[${i}];`
}
console.log(res);