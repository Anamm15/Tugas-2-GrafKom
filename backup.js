

"use strict";

var canvas;
var gl;
var program;
let towerY = 0.0;
let towerDirection = 1;
let speed = 0.005;

// Objek utama 'app' untuk menyimpan state, mirip hidran.js
var app = {
   gl: null,
   program: null,
   scene: {},
   theta: vec3(0, 0, 0), // [rotasiX, rotasiY, rotasiZ]
   zoomScale: 1.0,
   pan: vec2(0, 0),
   projectionType: "orthographic", // Default
   useTexture: true,

   // State untuk pencahayaan
   light: {
      position: vec4(1.0, 1.0, 1.0, 0.0), // Directional light default
      ambient: vec4(0.2, 0.2, 0.2, 1.0),
      diffuse: vec4(1.0, 1.0, 1.0, 1.0),
      specular: vec4(1.0, 1.0, 1.0, 1.0)
   },
   material: {
      ambient: vec4(0.0, 0.0, 0.2, 1.0),  // Biru gelap
      diffuse: vec4(0.0, 0.0, 1.0, 1.0),  // Biru utama
      specular: vec4(0.5, 0.5, 1.0, 1.0), // Pantulan biru terang
      shininess: 50.0
   },


   // Lokasi Uniform
   uniforms: {},
   lightUniforms: {}
};

// Parameter Viewing (Kamera)
var eye = vec3(0.0, 0.0, 3.0);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var fovy = 45.0;
var aspect;
var texSize = 64;

// ------------------------ Helper dari hidran.js ------------------------

function createAndBufferData(gl, target, data, usage) {
   const buffer = gl.createBuffer();
   gl.bindBuffer(target, buffer);
   gl.bufferData(target, data, usage);
   return buffer;
}

function linkBufferToAttrib(gl, program, attribName, size, type = gl.FLOAT, normalized = false, stride = 0, offset = 0) {
   const location = gl.getAttribLocation(program, attribName);
   gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
   gl.enableVertexAttribArray(location);
}

// ------------------------ Geometri dari hidran.js ------------------------

const Geometry = {
   /**
    * FUNGSI BARU (DITAMBAHKAN DARI HIDRAN.JS)
    * Membuat data silinder standar
    */
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

   /**
    * FUNGSI BARU (DITAMBAHKAN DARI HIDRAN.JS)
    * Membuat data kubus
    */
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
 * Membangun scene, mirip hidran.js
 * Diperbarui untuk membuat TexCoords untuk silinder
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
      if (part.shape === 'createCurvedTubeOval') {
         let pathSegments = part.args[3];
         let radialSegments = part.args[4];
         for (let i = 0; i <= pathSegments; i++) {
            for (let j = 0; j <= radialSegments; j++) {
               scene.texCoords.push(vec2(i / pathSegments, j / radialSegments));
            }
         }
      } else if (part.shape === 'createCylinder') {
         let segments = part.args[2];
         // TexCoord untuk 2 vertex pertama (top_center, bot_center)
         scene.texCoords.push(vec2(0.5, 0.5));
         scene.texCoords.push(vec2(0.5, 0.5));
         // TexCoord untuk sisa vertex (sisi)
         for (let i = 0; i < segments; i++) {
            let angle = (i / segments) * 2.0 * Math.PI;
            let t_top = vec2(0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle));
            let t_bot = vec2(0.5 + 0.5 * Math.cos(angle), 0.5 - 0.5 * Math.sin(angle));
            scene.texCoords.push(t_top);
            scene.texCoords.push(t_bot);
         }
      } else {
         // Fallback (jika ada geometri lain)
         for (let i = 0; i < geometry.vertices.length; i++) {
            scene.texCoords.push(vec2(0.0, 0.0));
         }
      }
      // --- End TexCoord Generation ---

      for (const i of geometry.indices) {
         scene.indices.push(i + currentVertexOffset);
      }
   }
   return scene;
}


// ------------------------ Kalkulasi Normal dari hidran.js ------------------------
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
      out.push(n[0], n[1], n[2]);
   }
   return new Float32Array(out);
}

// ------------------------ Tekstur (dari script.js lama) ------------------------
function configureTexture() {
   var image = new Uint8Array(4 * texSize * texSize);
   for (var i = 0; i < texSize; i++) {
      for (var j = 0; j < texSize; j++) {
         var patchx = Math.floor(i / (texSize / 8));
         var patchy = Math.floor(j / (texSize / 8));
         var c = (patchx % 2 !== patchy % 2 ? 255 : 0);
         var idx = 4 * (i * texSize + j);
         image[idx] = c; image[idx + 1] = c; image[idx + 2] = c; image[idx + 3] = 255;
      }
   }
   var texture = gl.createTexture();
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, texture);
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
   gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   gl.uniform1i(gl.getUniformLocation(program, "uTextureMap"), 0);
}

// ------------------------ Setup UI (dari script.js lama) ------------------------
function setupEventListeners() {
   function setupSlider(id, valSpanId, action) {
      var slider = document.getElementById(id);
      var valSpan = document.getElementById(valSpanId);
      slider.addEventListener("input", function (event) {
         var value = event.target.value;
         action(value);
         if (valSpan) {
            if (valSpanId.includes("rotate")) {
               valSpan.textContent = value + "°";
            } else if (id === "scale") {
               valSpan.textContent = parseFloat(value).toFixed(2);
            } else if (id.includes("pan")) {
               valSpan.textContent = parseFloat(value).toFixed(2);
            } else {
               valSpan.textContent = parseFloat(value).toFixed(1);
            }
         }
      });
      return slider;
   }

   function hexToVec4(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ?
         vec4(parseInt(result[1], 16) / 255.0, parseInt(result[2], 16) / 255.0, parseInt(result[3], 16) / 255.0, 1.0)
         : vec4(1.0, 1.0, 1.0, 1.0);
   }

   // Transformasi
   var rotateXSlider = setupSlider("rotateX", "rotateX-val", v => (app.theta[0] = parseFloat(v)));
   var rotateYSlider = setupSlider("rotateY", "rotateY-val", v => (app.theta[1] = parseFloat(v)));
   var panXSlider = setupSlider("panX", "panX-val", v => (app.pan[0] = parseFloat(v)));
   var panYSlider = setupSlider("panY", "panY-val", v => (app.pan[1] = parseFloat(v)));
   var scaleSlider = setupSlider("scale", "scale-val", v => (app.zoomScale = parseFloat(v)));

   // Viewing
   var perspectiveCheck = document.getElementById("perspective");
   perspectiveCheck.addEventListener("change", e => (app.projectionType = e.target.checked ? "perspective" : "orthographic"));

   // Lighting
   var lightXSlider = setupSlider("lightX", "lightX-val", v => (app.light.position[0] = parseFloat(v)));
   var lightYSlider = setupSlider("lightY", "lightY-val", v => (app.light.position[1] = parseFloat(v)));
   var lightZSlider = setupSlider("lightZ", "lightZ-val", v => (app.light.position[2] = parseFloat(v)));
   var shininessSlider = setupSlider("shininess", "shininess-val", v => (app.material.shininess = parseFloat(v)));

   var ambientColorPicker = document.getElementById("ambientColor");
   var diffuseColorPicker = document.getElementById("diffuseColor");
   var specularColorPicker = document.getElementById("specularColor");
   ambientColorPicker.addEventListener("input", e => (app.material.ambient = hexToVec4(e.target.value)));
   diffuseColorPicker.addEventListener("input", e => (app.material.diffuse = hexToVec4(e.target.value)));
   specularColorPicker.addEventListener("input", e => (app.material.specular = hexToVec4(e.target.value)));

   // Tekstur
   var textureCheck = document.getElementById("texture");
   textureCheck.addEventListener("change", e => (app.useTexture = e.target.checked));

   // Tombol Reset
   document.getElementById("reset-button").addEventListener("click", function () {
      // Reset state
      app.theta = vec3(0, 0, 0);
      app.zoomScale = 1.0;
      app.pan = vec2(0, 0);
      app.projectionType = "orthographic";
      app.light.position = vec4(1.0, 1.0, 1.0, 0.0);
      app.material.ambient = vec4(0.0, 0.0, 0.0, 1.0); // Hitam
      app.material.diffuse = vec4(0.0, 0.0, 0.0, 1.0); // Hitam
      app.material.specular = vec4(0.0, 0.0, 0.0, 1.0); // Hitam
      app.material.shininess = 50.0;
      app.useTexture = true;

      // Reset UI
      rotateXSlider.value = 0; document.getElementById("rotateX-val").textContent = "0°";
      rotateYSlider.value = 0; document.getElementById("rotateY-val").textContent = "0°";
      panXSlider.value = 0; document.getElementById("panX-val").textContent = "0.00";
      panYSlider.value = 0; document.getElementById("panY-val").textContent = "0.00";
      scaleSlider.value = 1; document.getElementById("scale-val").textContent = "1.00";
      perspectiveCheck.checked = false;
      lightXSlider.value = 1; document.getElementById("lightX-val").textContent = "1.0";
      lightYSlider.value = 1; document.getElementById("lightY-val").textContent = "1.0";
      lightZSlider.value = 1; document.getElementById("lightZ-val").textContent = "1.0";
      shininessSlider.value = 50; document.getElementById("shininess-val").textContent = "50";
      ambientColorPicker.value = "#000000";
      diffuseColorPicker.value = "#000000";
      specularColorPicker.value = "#000000";
      textureCheck.checked = true;
   });

   // Atur nilai default UI saat load
   ambientColorPicker.value = "#000000";
   diffuseColorPicker.value = "#000000";
   specularColorPicker.value = "#000000";
}

// ------------------------ Fungsi Init Utama (Struktur hidran.js) ------------------------
window.onload = function init() {
   canvas = document.getElementById("gl-canvas");
   gl = canvas.getContext("webgl2");
   if (!gl) alert("WebGL 2.0 isn't available");

   app.gl = gl;
   aspect = canvas.width / canvas.height;

   gl.viewport(0, 0, canvas.width, canvas.height);
   gl.clearColor(1.0, 1.0, 1.0, 1.0);
   gl.enable(gl.DEPTH_TEST);

   // Inisiasi Shader
   program = initShaders(gl, "vertex-shader", "fragment-shader");
   gl.useProgram(program);
   app.program = program;

   // ==================================================================
   // PERUBAHAN UTAMA: Membuat "Tabung Selang" LURUS
   // ==================================================================

   // new variables for positioning
   const bodyRadius = 0.2, bodyHeight = 1.05, bodyBottomY = -0.6;
   const bodyTopY = bodyBottomY + bodyHeight;
   const domeHeight = 0.1, ringBaseY = bodyTopY + domeHeight, baseY = ringBaseY + 0.02;

   // 1. Definisikan properti kaki
   const panjangKaki = 0.6;
   const tebalKaki = 0.05;
   const posisiKaki = 0.18;
   const kemiringanKaki = 30;
   const Y_kaki = -0.5;

   // 2. Buat 4 matriks rotasi untuk 4 sudut
   const rotasiKaki_KN_DPN = mult(rotateZ(kemiringanKaki), rotateX(-kemiringanKaki));
   const rotasiKaki_KN_BLK = mult(rotateZ(kemiringanKaki), rotateX(kemiringanKaki));
   const rotasiKaki_KR_DPN = mult(rotateZ(-kemiringanKaki), rotateX(-kemiringanKaki));
   const rotasiKaki_KR_BLK = mult(rotateZ(-kemiringanKaki), rotateX(kemiringanKaki));

   // 3. Matriks skala
   const skalaKaki = scale(tebalKaki, panjangKaki, tebalKaki);

   // SIMPAN parts GLOBAL agar bisa diakses di render()
   window.movingParts = [
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
      // ===== KOTAK 3D SEDERHANA DI TENGAH TIANG =====
      {
         shape: 'createCube',
         args: [],
         transform: mult(
            translate(0, baseY + 0.2, 0), // Posisi tepat di tengah tiang
            scale(0.55, 0.95, 0.55) // Kubus simetris
         ),
         material: {
            ambient: vec4(0.2, 0.2, 0.3, 1.0),
            diffuse: vec4(0.2, 0.5, 1.0, 1.0),
            specular: vec4(1.0, 1.0, 1.0, 1.0),
            shininess: 50.0
         }
      }
   ];

   window.staticParts = [
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


   const allParts = [...window.movingParts, ...window.staticParts];

   // ==================================================================
   // AKHIR PERUBAHAN
   // ==================================================================

   // GUNAKAN allParts, bukan parts
   app.scene = buildSceneFromParts(allParts);
   const normalsArray = computeNormals(app.scene.vertices, app.scene.indices);

   // Setup Buffer
   // 1. Element Array Buffer (Indices)
   createAndBufferData(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(app.scene.indices), gl.STATIC_DRAW);

   // 2. Position Buffer
   createAndBufferData(gl, gl.ARRAY_BUFFER, flatten(app.scene.vertices), gl.STATIC_DRAW);
   linkBufferToAttrib(gl, program, "aPosition", 4);

   // 3. Normal Buffer
   createAndBufferData(gl, gl.ARRAY_BUFFER, normalsArray, gl.STATIC_DRAW);
   linkBufferToAttrib(gl, program, "aNormal", 3);

   // 4. Texture Coordinate Buffer
   createAndBufferData(gl, gl.ARRAY_BUFFER, flatten(app.scene.texCoords), gl.STATIC_DRAW);
   linkBufferToAttrib(gl, program, "aTexCoord", 2);

   // Setup Tekstur
   configureTexture();

   // Dapatkan lokasi Uniform
   app.uniforms = {
      theta: gl.getUniformLocation(program, "uTheta"),
      scale: gl.getUniformLocation(program, "uScale"),
      pan: gl.getUniformLocation(program, "uPan"),
      modelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
      projectionMatrix: gl.getUniformLocation(program, "uProjectionMatrix"),
      useTexture: gl.getUniformLocation(program, "uUseTexture")
   };
   app.lightUniforms = {
      lightPosition: gl.getUniformLocation(program, "uLightPosition"),
      shininess: gl.getUniformLocation(program, "uShininess"),
      ambientProduct: gl.getUniformLocation(program, "uAmbientProduct"),
      diffuseProduct: gl.getUniformLocation(program, "uDiffuseProduct"),
      specularProduct: gl.getUniformLocation(program, "uSpecularProduct")
   };

   // Setup Event Listener
   setupEventListeners();

   // Mulai render loop
   render();
};

function render() {
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   // ===== Update posisi tower =====
   towerY += 0.005 * towerDirection;
   if (towerY > 0.2 || towerY < -0.2) {
      towerDirection *= -1;
   }

   // ===== Hitung matriks kamera & proyeksi =====
   var modelViewMatrix = lookAt(eye, at, up);
   var projectionMatrix;

   if (app.projectionType === "perspective") {
      projectionMatrix = perspective(fovy, aspect, 0.1, 100.0);
   } else {
      projectionMatrix = ortho(-2.0 * aspect, 2.0 * aspect, -2.0, 2.0, -10.0, 10.0);
   }

   // ===== Pencahayaan =====
   // ===== Pencahayaan =====
   // Gunakan warna biru khusus untuk kubus
   var ambientProduct = mult(app.light.ambient, vec4(0.2, 0.2, 0.3, 1.0));
   var diffuseProduct = mult(app.light.diffuse, vec4(0.2, 0.5, 1.0, 1.0));
   var specularProduct = mult(app.light.specular, vec4(1.0, 1.0, 1.0, 1.0));

   // ===== Kirim uniform ke shader =====
   gl.uniform3fv(app.uniforms.theta, flatten(app.theta));
   gl.uniform1f(app.uniforms.scale, app.zoomScale);
   gl.uniform2fv(app.uniforms.pan, flatten(app.pan));

   gl.uniformMatrix4fv(app.uniforms.modelViewMatrix, false, flatten(modelViewMatrix));
   gl.uniformMatrix4fv(app.uniforms.projectionMatrix, false, flatten(projectionMatrix));

   gl.uniform4fv(app.lightUniforms.lightPosition, flatten(app.light.position));
   gl.uniform1f(app.lightUniforms.shininess, app.material.shininess);
   gl.uniform4fv(app.lightUniforms.ambientProduct, flatten(ambientProduct));
   gl.uniform4fv(app.lightUniforms.diffuseProduct, flatten(diffuseProduct));
   gl.uniform4fv(app.lightUniforms.specularProduct, flatten(specularProduct));

   gl.uniform1i(app.uniforms.useTexture, app.useTexture);

   // ===== BUAT SCENE BARU DENGAN TRANSFORMASI TOWER =====
   // GUNAKAN window.movingParts dan window.staticParts
   const animatedMovingParts = window.movingParts.map(part => {
      const animatedPart = { ...part };

      // Terapkan transformasi tower hanya untuk selang
      const baseTransform = part.transform;
      const towerTransform = translate(0, towerY, 0);
      animatedPart.transform = mult(towerTransform, baseTransform);

      return animatedPart;
   });

   const animatedAllParts = [...animatedMovingParts, ...window.staticParts];
   const animatedScene = buildSceneFromParts(animatedAllParts);

   // ===== UPDATE BUFFER DENGAN DATA BARU =====
   // Hapus buffer lama dan buat yang baru
   gl.bindBuffer(gl.ARRAY_BUFFER, null);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

   // 1. Element Array Buffer (Indices)
   createAndBufferData(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(animatedScene.indices), gl.STATIC_DRAW);

   // 2. Position Buffer
   createAndBufferData(gl, gl.ARRAY_BUFFER, flatten(animatedScene.vertices), gl.STATIC_DRAW);
   linkBufferToAttrib(gl, program, "aPosition", 4);

   // 3. Normal Buffer
   const animatedNormals = computeNormals(animatedScene.vertices, animatedScene.indices);
   createAndBufferData(gl, gl.ARRAY_BUFFER, animatedNormals, gl.STATIC_DRAW);
   linkBufferToAttrib(gl, program, "aNormal", 3);

   // 4. Texture Coordinate Buffer
   createAndBufferData(gl, gl.ARRAY_BUFFER, flatten(animatedScene.texCoords), gl.STATIC_DRAW);
   linkBufferToAttrib(gl, program, "aTexCoord", 2);

   // ===== Gambar objek =====
   gl.drawElements(gl.TRIANGLES, animatedScene.indices.length, gl.UNSIGNED_SHORT, 0);

   // ===== Lanjut frame berikutnya =====
   requestAnimationFrame(render);
}

