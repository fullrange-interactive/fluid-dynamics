var res = ``;
for (var i = 0; i < 30; i++) {
  res += `
      updateDyeShader.isMouseDown${i}.data = isMouseDowns[${i}];
      mouseForceShader.isMouseDown${i}.data = isMouseDowns[${i}];`
}
console.log(res);