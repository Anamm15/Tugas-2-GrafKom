// Dideklarasikan secara global agar bisa diakses di semua fungsi
var canvas;
var gl;
var program;
var numVertices = 0; // Jumlah vertex yang akan digambar

// --- Variabel State (Penyimpanan) ---
var theta = vec3(0, 0, 0);
var scale = 1.0;
var pan = vec2(0, 0);
var usePerspective = false;
var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
var shininess = 50.0;
var useTexture = false; // NONAKTIFKAN TEKSTUR SECARA DEFAULT
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialAmbient = vec4(1.0, 0.0, 0.0, 1.0); // Default merah
var materialDiffuse = vec4(1.0, 0.0, 0.0, 1.0); // Default merah
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0); // Default putih
var modelViewMatrix, projectionMatrix;

// --- Variabel Kontrol Mouse ---
var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
var mouseButton = -1;

// --- Lokasi Uniform Shader ---
var uThetaLoc, uScaleLoc, uPanLoc;
var uModelViewMatrixLoc, uProjectionMatrixLoc;
var uAmbientProductLoc, uDiffuseProductLoc, uSpecularProductLoc;
var uLightPositionLoc, uShininessLoc, uUseTextureLoc;

// --- Referensi Elemen UI ---
// (Semua variabel referensi UI tetap sama)
var rotateXSlider, rotateYScalder, panXSlider, panYSlider, scaleSlider;
var rotateXSpan, rotateYSpan, panXSpan, panYSpan, scaleSpan;
var perspectiveCheck;
var ambientColorPicker, diffuseColorPicker, specularColorPicker;
var lightXSlider, lightYSlider, lightZSlider;
var lightXSpan, lightYSpan, lightZSpan;
var shininessSlider, shininessSpan;
var textureCheck;
var resetButton;


// --- FUNGSI BARU UNTUK MEMBUAT BOLA ---
// Diadaptasi dari shadedSphere1.js
function generateSphereData(numTimesToSubdivide) {
   var positionsArray = [];
   var normalsArray = [];
   var index = 0;

   var va = vec4(0.0, 0.0, -1.0, 1);
   var vb = vec4(0.0, 0.942809, 0.333333, 1);
   var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
   var vd = vec4(0.816497, -0.471405, 0.333333, 1);

   function triangle(a, b, c) {
      positionsArray.push(a);
      positionsArray.push(b);
      positionsArray.push(c);

      // Normal adalah sama dengan posisi untuk bola unit
      // Kita hanya perlu xyz
      normalsArray.push(vec3(a[0], a[1], a[2]));
      normalsArray.push(vec3(b[0], b[1], b[2]));
      normalsArray.push(vec3(c[0], c[1], c[2]));

      index += 3;
   }

   function divideTriangle(a, b, c, count) {
      if (count > 0) {
         var ab = mix(a, b, 0.5);
         var ac = mix(a, c, 0.5);
         var bc = mix(b, c, 0.5);

         ab = normalize(ab, true);
         ac = normalize(ac, true);
         bc = normalize(bc, true);

         divideTriangle(a, ab, ac, count - 1);
         divideTriangle(ab, b, bc, count - 1);
         divideTriangle(bc, c, ac, count - 1);
         divideTriangle(ab, bc, ac, count - 1);
      } else {
         triangle(a, b, c);
      }
   }

   function tetrahedron(a, b, c, d, n) {
      divideTriangle(a, b, c, n);
      divideTriangle(d, c, b, n);
      divideTriangle(a, d, b, n);
      divideTriangle(a, c, d, n);
   }

   tetrahedron(va, vb, vc, vd, numTimesToSubdivide);

   return { positions: positionsArray, normals: normalsArray, vertexCount: index };
}


window.onload = function init() {
   canvas = document.getElementById("gl-canvas");

   gl = canvas.getContext('webgl2');
   if (!gl) alert("WebGL 2.0 isn't available");

   gl.viewport(0, 0, canvas.width, canvas.height);
   gl.clearColor(1.0, 1.0, 1.0, 1.0);
   gl.enable(gl.DEPTH_TEST);

   program = initShaders(gl, "vertex-shader", "fragment-shader");
   gl.useProgram(program);

   // --- MODIFIKASI: Hasilkan data BOLA, bukan KUBUS ---
   var sphereData = generateSphereData(5); // 5 subdivisi, ganti jika terlalu berat
   numVertices = sphereData.vertexCount;

   // Kirim data baru ke buffer
   setupGLAndBuffers(sphereData.positions, sphereData.normals);

   getAllUIElements();
   getAllUniformLocations();
   attachEventListeners();
   setInitialShaderState();

   render();
}

// --- MODIFIKASI: Disederhanakan untuk BOLA ---
// (Menghapus aColor dan aTexCoord)
function setupGLAndBuffers(positions, normals) {

   // --- BUFFER NORMAL (nBuffer) ---
   var nBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
   var normalLoc = gl.getAttribLocation(program, "aNormal");
   // Perhatikan: normal kita sekarang vec3, bukan vec4
   gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(normalLoc);

   // --- BUFFER VERTEX (vBuffer) ---
   var vBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
   var positionLoc = gl.getAttribLocation(program, "aPosition");
   gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(positionLoc);

   // --- BUFFER TEKSTUR (tBuffer) DIHAPUS ---
   // Kita tidak punya koordinat tekstur untuk bola ini
}

function getAllUIElements() {
   // ... (Tidak berubah)
   rotateXSlider = document.getElementById('rotateX');
   rotateXSpan = document.getElementById('rotateX-val');
   rotateYSlider = document.getElementById('rotateY');
   rotateYSpan = document.getElementById('rotateY-val');
   panXSlider = document.getElementById('panX');
   panXSpan = document.getElementById('panX-val');
   panYSlider = document.getElementById('panY');
   panYSpan = document.getElementById('panY-val');
   scaleSlider = document.getElementById('scale');
   scaleSpan = document.getElementById('scale-val');
   perspectiveCheck = document.getElementById('perspective');
   ambientColorPicker = document.getElementById('ambientColor');
   diffuseColorPicker = document.getElementById('diffuseColor');
   specularColorPicker = document.getElementById('specularColor');
   lightXSlider = document.getElementById('lightX');
   lightXSpan = document.getElementById('lightX-val');
   lightYSlider = document.getElementById('lightY');
   lightYSpan = document.getElementById('lightY-val');
   lightZSlider = document.getElementById('lightZ');
   lightZSpan = document.getElementById('lightZ-val');
   shininessSlider = document.getElementById('shininess');
   shininessSpan = document.getElementById('shininess-val');
   textureCheck = document.getElementById('texture');
   resetButton = document.getElementById('reset-button');
}

function getAllUniformLocations() {
   // ... (Tidak berubah)
   uThetaLoc = gl.getUniformLocation(program, "uTheta");
   uScaleLoc = gl.getUniformLocation(program, "uScale");
   uPanLoc = gl.getUniformLocation(program, "uPan");
   uModelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
   uProjectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
   uAmbientProductLoc = gl.getUniformLocation(program, "uAmbientProduct");
   uDiffuseProductLoc = gl.getUniformLocation(program, "uDiffuseProduct");
   uSpecularProductLoc = gl.getUniformLocation(program, "uSpecularProduct");
   uLightPositionLoc = gl.getUniformLocation(program, "uLightPosition");
   uShininessLoc = gl.getUniformLocation(program, "uShininess");
   uUseTextureLoc = gl.getUniformLocation(program, "uUseTexture");
}

function attachEventListeners() {
   // --- TRANSFORMASI (Slider) ---
   function updateTransformation() {
      // ... (Tidak berubah)
      theta[0] = parseFloat(rotateXSlider.value);
      theta[1] = parseFloat(rotateYSlider.value);
      pan[0] = parseFloat(panXSlider.value);
      pan[1] = parseFloat(panYSlider.value);
      scale = parseFloat(scaleSlider.value);
      rotateXSpan.textContent = Math.round(theta[0]) + '°';
      rotateYSpan.textContent = Math.round(theta[1]) + '°';
      panXSpan.textContent = pan[0].toFixed(2);
      panYSpan.textContent = pan[1].toFixed(2);
      scaleSpan.textContent = scale.toFixed(2);
      gl.uniform3fv(uThetaLoc, flatten(theta));
      gl.uniform2fv(uPanLoc, flatten(pan));
      gl.uniform1f(uScaleLoc, scale);
      render();
   }
   rotateXSlider.addEventListener('input', updateTransformation);
   rotateYSlider.addEventListener('input', updateTransformation);
   panXSlider.addEventListener('input', updateTransformation);
   panYSlider.addEventListener('input', updateTransformation);
   scaleSlider.addEventListener('input', updateTransformation);

   // --- VIEWING ---
   function updateProjection() {
      // ... (Tidak berubah)
      usePerspective = perspectiveCheck.checked;
      if (usePerspective) {
         projectionMatrix = perspective(45.0, 1.0, 0.1, 10.0);
      } else {
         projectionMatrix = ortho(-1.5, 1.5, -1.5, 1.5, -10.0, 10.0);
      }
      gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));
      render();
   }
   perspectiveCheck.addEventListener('change', updateProjection);

   // --- LIGHTING ---
   function updateLightPosition() {
      // ... (Tidak berubah)
      lightPosition[0] = parseFloat(lightXSlider.value);
      lightPosition[1] = parseFloat(lightYSlider.value);
      lightPosition[2] = parseFloat(lightZSlider.value);
      lightXSpan.textContent = lightPosition[0].toFixed(1);
      lightYSpan.textContent = lightPosition[1].toFixed(1);
      lightZSpan.textContent = lightPosition[2].toFixed(1);
      gl.uniform4fv(uLightPositionLoc, flatten(lightPosition));
      render();
   }
   lightXSlider.addEventListener('input', updateLightPosition);
   lightYSlider.addEventListener('input', updateLightPosition);
   lightZSlider.addEventListener('input', updateLightPosition);

   function updateShininess() {
      // ... (Tidak berubah)
      shininess = parseFloat(shininessSlider.value);
      shininessSpan.textContent = shininess;
      gl.uniform1f(uShininessLoc, shininess);
      render();
   }
   shininessSlider.addEventListener('input', updateShininess);

   function updateMaterialColors() {
      // ... (Tidak berubah)
      materialAmbient = hexToVec4(ambientColorPicker.value);
      materialDiffuse = hexToVec4(diffuseColorPicker.value);
      materialSpecular = hexToVec4(specularColorPicker.value);
      gl.uniform4fv(uAmbientProductLoc, flatten(mult(lightAmbient, materialAmbient)));
      gl.uniform4fv(uDiffuseProductLoc, flatten(mult(lightDiffuse, materialDiffuse)));
      gl.uniform4fv(uSpecularProductLoc, flatten(mult(lightSpecular, materialSpecular)));
      render();
   }
   ambientColorPicker.addEventListener('input', updateMaterialColors);
   diffuseColorPicker.addEventListener('input', updateMaterialColors);
   specularColorPicker.addEventListener('input', updateMaterialColors);

   // --- TEXTURE (MODIFIKASI) ---
   function updateTextureToggle() {
      useTexture = textureCheck.checked;
      // Peringatan: Kita tidak punya data tekstur, jadi
      // mencentang ini akan menghasilkan warna "belang"
      // seperti yang Anda lihat sebelumnya.
      if (useTexture) {
         console.warn("Tekstur diaktifkan tetapi tidak ada data tekstur (texCoords) yang di-bind.");
      }
      gl.uniform1i(uUseTextureLoc, useTexture);
      render();
   }
   textureCheck.addEventListener('change', updateTextureToggle);

   // --- RESET BUTTON (MODIFIKASI) ---
   function resetAll() {
      // ... (Tidak berubah kecuali 'textureCheck')
      rotateXSlider.value = 0;
      rotateYSlider.value = 0;
      panXSlider.value = 0;
      panYSlider.value = 0;
      scaleSlider.value = 1;
      lightXSlider.value = 1;
      lightYSlider.value = 1;
      lightZSlider.value = 1;
      shininessSlider.value = 50;
      perspectiveCheck.checked = false;

      // MODIFIKASI: Pastikan tekstur nonaktif saat di-reset
      textureCheck.checked = false;

      ambientColorPicker.value = '#ff0000';
      diffuseColorPicker.value = '#ff0000';
      specularColorPicker.value = '#ffffff';

      updateTransformation();
      updateProjection();
      updateLightPosition();
      updateShininess();
      updateMaterialColors();
      updateTextureToggle(); // Panggil ini untuk mengirim 'useTexture = false'
   }
   resetButton.addEventListener('click', resetAll);

   // --- EVENT LISTENER MOUSE ---
   // ... (Tidak berubah)
   canvas.addEventListener('mousedown', function (event) {
      mouseDown = true;
      mouseButton = event.button;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
   });
   canvas.addEventListener('mouseup', function (event) {
      mouseDown = false;
      mouseButton = -1;
   });
   canvas.addEventListener('mousemove', function (event) {
      if (!mouseDown) return;
      var newX = event.clientX;
      var newY = event.clientY;
      var dx = newX - lastMouseX;
      var dy = newY - lastMouseY;
      if (mouseButton === 0) {
         theta[0] += dy * 0.5;
         theta[1] += dx * 0.5;
         rotateXSlider.value = theta[0];
         rotateYSlider.value = theta[1];
      } else if (mouseButton === 2) {
         pan[0] += dx * (2.0 / canvas.width);
         pan[1] -= dy * (2.0 / canvas.height);
         pan[0] = Math.max(-1.0, Math.min(1.0, pan[0]));
         pan[1] = Math.max(-1.0, Math.min(1.0, pan[1]));
         panXSlider.value = pan[0];
         panYSlider.value = pan[1];
      }
      lastMouseX = newX;
      lastMouseY = newY;
      updateTransformation();
   });
   canvas.addEventListener('wheel', function (event) {
      event.preventDefault();
      var zoomSpeed = 0.1;
      if (event.deltaY < 0) scale += zoomSpeed;
      else if (event.deltaY > 0) scale -= zoomSpeed;
      scale = Math.max(0.1, Math.min(2.0, scale));
      scaleSlider.value = scale;
      updateTransformation();
   });
   canvas.addEventListener('contextmenu', function (event) {
      event.preventDefault();
   });
}

// --- Fungsi Helper (Pembantu) ---
function hexToVec4(hex) {
   // ... (Tidak berubah)
   hex = hex.replace('#', '');
   var r = parseInt(hex.substring(0, 2), 16);
   var g = parseInt(hex.substring(2, 4), 16);
   var b = parseInt(hex.substring(4, 6), 16);
   return vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);
}

// --- MODIFIKASI: Pastikan tekstur nonaktif saat awal ---
function setInitialShaderState() {
   modelViewMatrix = lookAt(vec3(0, 0, 2), vec3(0, 0, 0), vec3(0, 1, 0));
   gl.uniformMatrix4fv(uModelViewMatrixLoc, false, flatten(modelViewMatrix));

   // Panggil semua fungsi update
   updateTransformation();
   updateProjection();
   updateLightPosition();
   updateShininess();
   updateMaterialColors();

   // MODIFIKASI: Pastikan 'textureCheck' dibaca sebagai nonaktif
   // dan dikirim ke shader
   textureCheck.checked = false; // Set UI
   updateTextureToggle();      // Kirim ke shader
}

// --- MODIFIKASI: Gambar jumlah vertex BOLA ---
function render() {
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   // 'numVertices' diatur di 'init()'
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

