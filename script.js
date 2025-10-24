// Dideklarasikan secara global agar bisa diakses di semua fungsi
var canvas;
var gl;
var program;

// --- PERUBAHAN ---
// Variabel baru untuk menyimpan jumlah indeks yang akan digambar
var numIndicesToDraw;

var theta = vec3(0, 0, 0);
var scaleNum = 1.0;
var pan = vec2(0, 0);
var usePerspective = false;
var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
var shininess = 50.0;
var useTexture = false;
var radius = 1.5;
var phi = 0.0;

// Properti cahaya
var lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

// Properti material
var materialAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var modelViewMatrix, projectionMatrix;

// Variabel untuk uniform
var uThetaLoc, uScaleLoc, uPanLoc;
var uModelViewMatrixLoc, uProjectionMatrixLoc;
var uAmbientProductLoc, uDiffuseProductLoc, uSpecularProductLoc;
var uLightPositionLoc, uShininessLoc, uUseTextureLoc;

// Variabel untuk controller
var rotateXSlider, rotateYSlider, panXSlider, panYSlider, scaleSlider;
var rotateXSpan, rotateYSpan, panXSpan, panYSpan, scaleSpan;
var perspectiveCheck;
var ambientColorPicker, diffuseColorPicker, specularColorPicker;
var lightXSlider, lightYSlider, lightZSlider;
var lightXSpan, lightYSpan, lightZSpan;
var shininessSlider, shininessSpan;
var textureCheck;
var resetButton;

// --- PERUBAHAN ---
// Fungsi cube() LAMA dihapus.
// Fungsi-fungsi helper dari backup.js ditambahkan di sini.

/**
 * Objek Geometri dari backup.js
 * Berisi fungsi untuk membuat bentuk dasar.
 */
const Geometry = {
   createCylinder: function (radius, height, segments) {
      let vertices = [vec4(0, height / 2, 0, 1.0), vec4(0, -height / 2, 0, 1.0)];
      let indices = [];
      // Tambahkan vertex sisi
      for (let i = 0; i < segments; i++) {
         let angle = (i / segments) * 2.0 * Math.PI;
         let x = radius * Math.cos(angle);
         let z = radius * Math.sin(angle);
         vertices.push(vec4(x, height / 2, z, 1.0)); // Top vertex
         vertices.push(vec4(x, -height / 2, z, 1.0)); // Bottom vertex
      }
      // Tambahkan indices
      for (let i = 0; i < segments; i++) {
         let next = (i + 1) % segments;
         let iTop = 2 + i * 2, iBottom = 3 + i * 2;
         let nextTop = 2 + next * 2, nextBottom = 3 + next * 2;
         // Sisi
         indices.push(iBottom, nextBottom, nextTop, iBottom, nextTop, iTop);
         // Tutup Atas
         indices.push(0, nextTop, iTop);
         // Tutup Bawah
         indices.push(1, iBottom, nextBottom);
      }
      return { vertices, indices };
   },

   createCube: function () {
      const vertices = [
         vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0),
         vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, -0.5, 0.5, 1.0),
         vec4(-0.5, -0.5, -0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),
         vec4(0.5, 0.5, -0.5, 1.0), vec4(0.5, -0.5, -0.5, 1.0)
      ];
      // Indices untuk 12 segitiga (6 sisi)
      const indices = [1, 0, 3, 1, 3, 2, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 6, 5, 1, 6, 1, 2, 4, 5, 6, 4, 6, 7, 5, 4, 0, 5, 0, 1];
      return { vertices, indices };
   },
};

/**
 * Fungsi buildSceneFromParts dari backup.js
 * Merakit scene dari bagian-bagian kecil.
 */
function buildSceneFromParts(parts) {
   const scene = { vertices: [], indices: [], texCoords: [] };

   for (const part of parts) {
      const geometry = Geometry[part.shape](...part.args);
      const currentVertexOffset = scene.vertices.length;

      for (const v of geometry.vertices) {
         scene.vertices.push(mult(part.transform, v));
      }

      // --- Generate TexCoords based on shape ---
      if (part.shape === 'createCylinder') {
         let segments = part.args[2];
         // TexCoord untuk 2 vertex pertama (top_center, bot_center)
         scene.texCoords.push(vec2(0.5, 0.5));
         scene.texCoords.push(vec2(0.5, 0.5));
         // TexCoord untuk sisa vertex (sisi)
         for (let i = 0; i < segments; i++) {
            let angle = (i / segments) * 2.0 * Math.PI;
            // Ini adalah pemetaan planar sederhana, bisa disesuaikan jika perlu
            let u = i / segments;
            scene.texCoords.push(vec2(u, 1.0)); // Top vertex
            scene.texCoords.push(vec2(u, 0.0)); // Bottom vertex
         }
      } else {
         // Fallback untuk createCube atau lainnya
         for (let i = 0; i < geometry.vertices.length; i++) {
            // Pemetaan sederhana untuk kubus (bisa disempurnakan)
            let v = geometry.vertices[i];
            scene.texCoords.push(vec2(v[0] + 0.5, v[1] + 0.5));
         }
      }
      // --- End TexCoord Generation ---

      for (const i of geometry.indices) {
         scene.indices.push(i + currentVertexOffset);
      }
   }
   return scene;
}

function computeNormals(vertices, indices) {
   const nVerts = vertices.length;
   const normals = new Array(nVerts).fill(vec3(0, 0, 0));

   for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i], ib = indices[i + 1], ic = indices[i + 2];
      const a = vec3(vertices[ia][0], vertices[ia][1], vertices[ia][2]);
      const b = vec3(vertices[ib][0], vertices[ib][1], vertices[ib][2]);
      const c = vec3(vertices[ic][0], vertices[ic][1], vertices[ic][2]);
      const t1 = subtract(b, a);
      const t2 = subtract(c, a);
      let normal = normalize(cross(t1, t2));

      if (isNaN(normal[0])) { normal = vec3(0, 1, 0); }

      normals[ia] = add(normals[ia], normal);
      normals[ib] = add(normals[ib], normal);
      normals[ic] = add(normals[ic], normal);
   }

   const out = [];
   for (let i = 0; i < nVerts; i++) {
      let n = normalize(normals[i]);
      if (isNaN(n[0])) { n = vec3(0, 1, 0); }
      out.push(n);
   }

   return out;
}

function createTowerGeometry() {
   // Definisi geometri dari backup.js
   const bodyRadius = 0.2, bodyHeight = 1.05, bodyBottomY = -0.6;
   const bodyTopY = bodyBottomY + bodyHeight;
   const domeHeight = 0.1, ringBaseY = bodyTopY + domeHeight, baseY = ringBaseY + 0.02;

   const panjangKaki = 0.6;
   const tebalKaki = 0.05;
   const posisiKaki = 0.18;
   const kemiringanKaki = 30;
   const Y_kaki = -0.5;

   const rotasiKaki_KN_DPN = mult(rotateZ(kemiringanKaki), rotateX(-kemiringanKaki));
   const rotasiKaki_KN_BLK = mult(rotateZ(kemiringanKaki), rotateX(kemiringanKaki));
   const rotasiKaki_KR_DPN = mult(rotateZ(-kemiringanKaki), rotateX(-kemiringanKaki));
   const rotasiKaki_KR_BLK = mult(rotateZ(-kemiringanKaki), rotateX(kemiringanKaki));
   const skalaKaki = scale(tebalKaki, panjangKaki, tebalKaki);

   // Gabungkan movingParts dan staticParts.
   // Kita tidak membuat animasi CPU di sini, jadi kita anggap semua statis.
   // Kontrol rotasi/pan/zoom dari script.js akan menggerakkan seluruh objek.
   const allParts = [
      // Selang atas
      {
         shape: 'createCylinder',
         args: [0.4, 10, 16],
         transform: mult(
            translate(0, baseY - 0.40, 0),
            mult(
               rotateY(90),
               scale(0.05, 0.03, 0.05)
            )
         )
      },
      // Selang Bawah
      {
         shape: 'createCylinder',
         args: [0.5, 30, 16],
         transform: mult(
            translate(0, baseY - 0.90, 0),
            mult(
               rotateY(90),
               scale(0.05, 0.03, 0.05)
            )
         )
      },
      // KOTAK 3D SEDERHANA DI TENGAH TIANG
      {
         shape: 'createCube',
         args: [],
         transform: mult(
            translate(0, baseY + 0.2, 0),
            scale(0.55, 0.95, 0.55)
         )
      },
      // Kaki 1 (Kanan Depan)
      {
         shape: 'createCylinder',
         args: [0.5, 1.0, 16],
         transform: mult(
            translate(posisiKaki, Y_kaki, posisiKaki),
            mult(
               rotasiKaki_KN_DPN,
               skalaKaki
            )
         )
      },
      // Kaki 2 (Kanan Belakang)
      {
         shape: 'createCylinder',
         args: [0.5, 1.0, 16],
         transform: mult(
            translate(posisiKaki, Y_kaki, -posisiKaki),
            mult(
               rotasiKaki_KN_BLK,
               skalaKaki
            )
         )
      },
      // Kaki 3 (Kiri Depan)
      {
         shape: 'createCylinder',
         args: [0.5, 1.0, 16],
         transform: mult(
            translate(-posisiKaki, Y_kaki, posisiKaki),
            mult(
               rotasiKaki_KR_DPN,
               skalaKaki
            )
         )
      },
      // Kaki 4 (Kiri Belakang)
      {
         shape: 'createCylinder',
         args: [0.5, 1.0, 16],
         transform: mult(
            translate(-posisiKaki, Y_kaki, -posisiKaki),
            mult(
               rotasiKaki_KR_BLK,
               skalaKaki
            )
         )
      }
   ];

   const scene = buildSceneFromParts(allParts);
   const normals = computeNormals(scene.vertices, scene.indices);

   return {
      positions: scene.vertices,
      normals: normals,
      texCoords: scene.texCoords,
      indices: scene.indices
   };
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

   // --- PERUBAHAN ---
   // Ganti pemanggilan cube() dengan createTowerGeometry()
   var { positions, normals, texCoords, indices } = createTowerGeometry();

   // Simpan jumlah indeks untuk di-render
   numIndicesToDraw = indices.length;

   // 1. Setup WebGL dan buffer
   // Kirim 'indices' ke setupGLAndBuffers
   setupGLAndBuffers(positions, normals, texCoords, indices);
   // --- AKHIR PERUBAHAN ---

   // 2. Ambil semua referensi elemen UI dari HTML
   getAllUIElements();

   // 3. Ambil semua lokasi uniform dari shader
   getAllUniformLocations();

   // 4. Pasang event listener ke elemen-elemen UI
   attachEventListeners();

   // 5. Atur nilai awal untuk semua uniform di shader
   setInitialShaderState();

   render();
}

function setupGLAndBuffers(positions, normals, texCoords, indices) {
   // Buat buffer untuk INDICES 
   var iBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
   // Gunakan Uint16Array karena indeks biasanya tidak melebihi 65535
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


   // Buffer untuk NORMAL (Attribute)
   var nBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

   var normalLoc = gl.getAttribLocation(program, "aNormal");
   gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(normalLoc);

   // Buffer untuk POSISI (Attribute)
   var vBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
   var positionLoc = gl.getAttribLocation(program, "aPosition");
   gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(positionLoc);

   // Buffer untuk KOORDINAT TEKSTUR (Attribute)
   var tBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
   var texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
   gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(texCoordLoc);
}

function getAllUIElements() {
   // Grup Transformasi
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

   // Grup Viewing
   perspectiveCheck = document.getElementById('perspective');

   // Grup Lighting
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

   // Grup Texture
   textureCheck = document.getElementById('texture');

   // Tombol Reset
   resetButton = document.getElementById('reset-button');
}

function getAllUniformLocations() {
   // Vertex Shader Uniforms
   uThetaLoc = gl.getUniformLocation(program, "uTheta");
   uScaleLoc = gl.getUniformLocation(program, "uScale");
   uPanLoc = gl.getUniformLocation(program, "uPan");
   uModelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
   uProjectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

   // Fragment Shader Uniforms
   uAmbientProductLoc = gl.getUniformLocation(program, "uAmbientProduct");
   uDiffuseProductLoc = gl.getUniformLocation(program, "uDiffuseProduct");
   uSpecularProductLoc = gl.getUniformLocation(program, "uSpecularProduct");
   uLightPositionLoc = gl.getUniformLocation(program, "uLightPosition");
   uShininessLoc = gl.getUniformLocation(program, "uShininess");
   uUseTextureLoc = gl.getUniformLocation(program, "uUseTexture");
}

function attachEventListeners() {
   // --- TRANSFORMASI ---
   function updateTransformation() {
      theta[0] = parseFloat(rotateXSlider.value);
      theta[1] = parseFloat(rotateYSlider.value);
      pan[0] = parseFloat(panXSlider.value);
      pan[1] = parseFloat(panYSlider.value);
      scale = parseFloat(scaleSlider.value);

      rotateXSpan.textContent = Math.round(theta[0]) + '°';
      rotateYSpan.textContent = Math.round(theta[1]) + '°';
      panXSpan.textContent = pan[0].toFixed(2);
      panYSpan.textContent = pan[1].toFixed(2);
      scaleSpan.textContent = scaleNum.toFixed(2);

      // Mengirim nilai ke shader
      gl.uniform3fv(uThetaLoc, flatten(theta));
      gl.uniform2fv(uPanLoc, flatten(pan));
      gl.uniform1f(uScaleLoc, scaleNum);

      render();
   }

   rotateXSlider.addEventListener('input', updateTransformation);
   rotateYSlider.addEventListener('input', updateTransformation);
   panXSlider.addEventListener('input', updateTransformation);
   panYSlider.addEventListener('input', updateTransformation);
   scaleSlider.addEventListener('input', updateTransformation);
   rotateXSlider.addEventListener('input', updateTransformation);
   rotateYSlider.addEventListener('input', updateTransformation);
   panXSlider.addEventListener('input', updateTransformation);
   panYSlider.addEventListener('input', updateTransformation);
   scaleSlider.addEventListener('input', updateTransformation);

   // --- VIEWING ---
   function updateProjection() {
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
      shininess = parseFloat(shininessSlider.value);
      shininessSpan.textContent = shininess;
      gl.uniform1f(uShininessLoc, shininess);
      render();
   }
   shininessSlider.addEventListener('input', updateShininess);

   function updateMaterialColors() {
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

   // --- TEXTURE ---
   function updateTextureToggle() {
      useTexture = textureCheck.checked;
      gl.uniform1i(uUseTextureLoc, useTexture);
      render();
   }
   textureCheck.addEventListener('change', updateTextureToggle);

   // --- RESET BUTTON ---
   function resetAll() {
      // Reset slider ke nilai default
      rotateXSlider.value = 0;
      rotateYSlider.value = 0;
      panXSlider.value = 0;
      panYSlider.value = 0;
      scaleSlider.value = 1;
      lightXSlider.value = 1;
      lightYSlider.value = 1;
      lightZSlider.value = 1;
      shininessSlider.value = 50;

      // Reset checkbox
      perspectiveCheck.checked = false;
      textureCheck.checked = false;

      // Reset color picker
      ambientColorPicker.value = '#000000';
      diffuseColorPicker.value = '#000000';
      specularColorPicker.value = '#ffffff';

      // Panggil SEMUA fungsi update untuk menerapkan nilai default
      updateTransformation();
      updateProjection();
      updateLightPosition();
      updateShininess();
      updateMaterialColors();
      updateTextureToggle();

      render();
   }
   resetButton.addEventListener('click', resetAll);

   // --- KONTROL MOUSE ---
   // Variabel-variabel ini perlu dideklarasikan di lingkup yang lebih luas
   // agar bisa diakses oleh semua event listener mouse.
   var mouseDown = false;
   var mouseButton = -1;
   var lastMouseX = null;
   var lastMouseY = null;

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
      if (!mouseDown) {
         return;
      }

      var newX = event.clientX;
      var newY = event.clientY;
      var dx = newX - lastMouseX;
      var dy = newY - lastMouseY;

      if (mouseButton === 0) { // Tombol kiri (rotasi)
         theta[0] += dy * 0.5;
         theta[1] += dx * 0.5;

         rotateXSlider.value = theta[0];
         rotateYSlider.value = theta[1];

      } else if (mouseButton === 2) { // Tombol kanan (pan)
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
      event.preventDefault(); // Mencegah scrolling halaman

      var zoomSpeed = 0.1;
      if (event.deltaY < 0) { // Zoom in
         scaleNum += zoomSpeed;
      } else if (event.deltaY > 0) { // Zoom out
         scaleNum -= zoomSpeed;
      }

      scaleNum = Math.max(0.1, Math.min(2.0, scaleNum)); // Batasi zoom
      scaleSlider.value = scaleNum;

      updateTransformation();
   });

   // Mencegah menu konteks muncul saat klik kanan
   canvas.addEventListener('contextmenu', function (event) {
      event.preventDefault();
   });
}

function hexToVec4(hex) {
   // Hapus '#' jika ada
   hex = hex.replace('#', '');

   // Konversi rr, gg, bb ke integer
   var r = parseInt(hex.substring(0, 2), 16);
   var g = parseInt(hex.substring(2, 4), 16);
   var b = parseInt(hex.substring(4, 6), 16);

   // Normalisasi ke [0, 1] dan kembalikan sebagai vec4
   return vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);
}

function setInitialShaderState() {
   // Mengatur model view matrix awal
   modelViewMatrix = lookAt(vec3(0, 0, 2), vec3(0, 0, 0), vec3(0, 1, 0));
   gl.uniformMatrix4fv(uModelViewMatrixLoc, false, flatten(modelViewMatrix));


   // Mengambil Nilai Default dari HTML
   theta[0] = parseFloat(rotateXSlider.value);
   theta[1] = parseFloat(rotateYSlider.value);
   pan[0] = parseFloat(panXSlider.value);
   pan[1] = parseFloat(panYSlider.value);
   scale = parseFloat(scaleSlider.value);
   usePerspective = perspectiveCheck.checked;
   lightPosition[0] = parseFloat(lightXSlider.value);
   lightPosition[1] = parseFloat(lightYSlider.value);
   lightPosition[2] = parseFloat(lightZSlider.value);
   shininess = parseFloat(shininessSlider.value);
   materialAmbient = hexToVec4(ambientColorPicker.value);
   materialDiffuse = hexToVec4(diffuseColorPicker.value);
   materialSpecular = hexToVec4(specularColorPicker.value);
   useTexture = textureCheck.checked;

   // Viewing
   if (usePerspective) {
      projectionMatrix = perspective(45.0, 1.0, 0.1, 10.0);
   } else {
      projectionMatrix = ortho(-1.5, 1.5, -1.5, 1.5, -10.0, 10.0);
   }

   // Kirim nilai awal ke shader
   gl.uniform3fv(uThetaLoc, flatten(theta));
   gl.uniform2fv(uPanLoc, flatten(pan));
   gl.uniform1f(uScaleLoc, scale);
   gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));
   gl.uniform4fv(uLightPositionLoc, flatten(lightPosition));
   gl.uniform1f(uShininessLoc, shininess);
   gl.uniform1i(uUseTextureLoc, useTexture);

   // Kirim produk material dan cahaya awal
   gl.uniform4fv(uAmbientProductLoc, flatten(mult(lightAmbient, materialAmbient)));
   gl.uniform4fv(uDiffuseProductLoc, flatten(mult(lightDiffuse, materialDiffuse)));
   gl.uniform4fv(uSpecularProductLoc, flatten(mult(lightSpecular, materialSpecular)));
}

function render() {
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   gl.drawElements(gl.TRIANGLES, numIndicesToDraw, gl.UNSIGNED_SHORT, 0);
}

function configureTexture(image) {
   var texSize = 64;

   var texture = gl.createTexture();
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_D, texture);
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, image);
   gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
      gl.NEAREST_MIPMAP_LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}
