// Dideklarasikan secara global agar bisa diakses di semua fungsi
var canvas;
var gl;
var program;
 
// --- PERUBAHAN ---
// Kembali ke satu scene
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
 
// Variabel untuk animasi tower
var towerYOffset = 0.0;
var towerY = 0.0;
var towerDirection = 1;
var towerSpeed = 0.0005; // Menggunakan kecepatan Anda
var animatedScene = null;
var sceneBuffers = {
    position: null,
    normal: null,
    texCoord: null,
    index: null
};
 
// Variabel untuk rotasi kubus 
var cubeRotation = 0.0;
var cubeRotationSpeed = 1.0; // derajat per frame (atur sesuai kecepatan yang diinginkan)
 
// Kontrol animasi
var isAnimating = true; // status animasi aktif/tidak
 
/**
 * Objek Geometri
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
      const indices = [1, 0, 3, 1, 3, 2, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 6, 5, 1, 6, 1, 2, 4, 5, 6, 4, 6, 7, 5, 4, 0, 5, 0, 1];
      return { vertices, indices };
   },
 
   // --- PERUBAHAN: BENTUK BARU (HANYA SISI MENGERUCUT) ---
   createSideTaperedBox: function (taperFactor = 0.7) {
      const front = 0.5;
      const back = -0.5;
 
      // Sisi depan (Z = 0.5)
      const v0 = vec4(-front, -front, front, 1.0); // front-bottom-left
      const v1 = vec4(-front,  front, front, 1.0); // front-top-left
      const v2 = vec4( front,  front, front, 1.0); // front-top-right
      const v3 = vec4( front, -front, front, 1.0); // front-bottom-right
 
      // Sisi belakang (Z = -0.5), X dikali taperFactor, Y tetap
      const backDimX = front * taperFactor;
      const backDimY = front; // Y tetap lurus
 
      const v4 = vec4(-backDimX, -backDimY, back, 1.0); // back-bottom-left
      const v5 = vec4(-backDimX,  backDimY, back, 1.0); // back-top-left
      const v6 = vec4( backDimX,  backDimY, back, 1.0); // back-top-right
      const v7 = vec4( backDimX, -backDimY, back, 1.0); // back-bottom-right
 
      const vertices = [v0, v1, v2, v3, v4, v5, v6, v7];
 
      // Indices (koneksi) tetap sama seperti createCube
      const indices = [
         1, 0, 3, 1, 3, 2, // Depan
         2, 3, 7, 2, 7, 6, // Kanan
         3, 0, 4, 3, 4, 7, // Bawah
         6, 5, 1, 6, 1, 2, // Atas
         4, 5, 6, 4, 6, 7, // Belakang
         5, 4, 0, 5, 0, 1  // Kiri
      ];
 
      return { vertices, indices };
   }
};
 
/**
 * Fungsi buildSceneFromParts
 */
function buildSceneFromParts(parts) {
   const scene = { vertices: [], indices: [], texCoords: [] };
 
   for (const part of parts) {
      // --- PERUBAHAN: Panggil fungsi geometri baru ---
      const geometry = (part.shape === 'createSideTaperedBox')
         ? Geometry.createSideTaperedBox(...part.args)
         : Geometry[part.shape](...part.args);
 
      const currentVertexOffset = scene.vertices.length;
 
      for (const v of geometry.vertices) {
         scene.vertices.push(mult(part.transform, v));
      }
 
      if (part.shape === 'createCylinder') {
         let segments = part.args[2];
         scene.texCoords.push(vec2(0.5, 0.5));
         scene.texCoords.push(vec2(0.5, 0.5));
         for (let i = 0; i < segments; i++) {
            let u = i / segments;
            scene.texCoords.push(vec2(u, 1.0)); 
            scene.texCoords.push(vec2(u, 0.0)); 
         }
      } else {
         // Fallback untuk createCube, createSideTaperedBox, dll.
         for (let i = 0; i < geometry.vertices.length; i++) {
            let v = geometry.vertices[i];
            scene.texCoords.push(vec2(v[0] + 0.5, v[1] + 0.5));
         }
      }
 
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

// Fungsi baru untuk membuat frustum
Geometry.createFrustum = function (frontWidth = 1.0, frontHeight = 1.0, backWidth = 1, backHeight = 1, depth = 1.0) {
   const vertices = [];
   const indices = [];
   
   // Front face (lebih besar)
   const fw2 = frontWidth / 2;
   const fh2 = frontHeight / 2;
   // Back face (lebih kecil)  
   const bw2 = backWidth / 2;
   const bh2 = backHeight / 2;
   
   // Vertices: front face (z = depth/2)
   vertices.push(vec4(-fw2, -fh2, depth/2, 1.0)); // 0: front-bottom-left
   vertices.push(vec4(-fw2, fh2, depth/2, 1.0));  // 1: front-top-left
   vertices.push(vec4(fw2, fh2, depth/2, 1.0));   // 2: front-top-right
   vertices.push(vec4(fw2, -fh2, depth/2, 1.0));  // 3: front-bottom-right
   
   // Back face (z = -depth/2)
   vertices.push(vec4(-bw2, -bh2, -depth/2, 1.0)); // 4: back-bottom-left
   vertices.push(vec4(-bw2, bh2, -depth/2, 1.0));  // 5: back-top-left
   vertices.push(vec4(bw2, bh2, -depth/2, 1.0));   // 6: back-top-right
   vertices.push(vec4(bw2, -bh2, -depth/2, 1.0));  // 7: back-bottom-right
   
   // Indices untuk 6 faces
   
   // Front face
   indices.push(0, 1, 2, 0, 2, 3);
   
   // Back face
   indices.push(7, 6, 5, 7, 5, 4);
   
   // Top face
   indices.push(1, 5, 6, 1, 6, 2);
   
   // Bottom face
   indices.push(4, 0, 3, 4, 3, 7);
   
   // Left face
   indices.push(4, 5, 1, 4, 1, 0);
   
   // Right face
   indices.push(3, 2, 6, 3, 6, 7);
   
   return { vertices, indices, texCoords: [] };
};

// Fungsi baru untuk membuat lingkaran 3D
Geometry.createCircle3D = function (radius = 0.5, depth = 0.1, segments = 64) {
   const vertices = [];
   const indices = [];
   const halfDepth = depth / 2;
   for (let j = 0; j <= 1; j++) {
      const z = j === 0 ? -halfDepth : halfDepth;
      for (let i = 0; i < segments; i++) {
         const theta = (i / segments) * 2 * Math.PI;
         const x = radius * Math.cos(theta);
         const y = radius * Math.sin(theta);
         vertices.push(vec4(x, y, z, 1));
      }
   }
   for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const frontCurr = i;
      const frontNext = next;
      const backCurr = i + segments;
      const backNext = next + segments;
      indices.push(frontCurr, frontNext, backNext);
      indices.push(frontCurr, backNext, backCurr);
   }
   for (let i = 1; i < segments - 1; i++) {
      indices.push(0, i, i + 1);
   }
   const offset = segments;
   for (let i = 1; i < segments - 1; i++) {
      indices.push(offset, offset + i + 1, offset + i);
   }
   return { vertices, indices };
};
 
// --- FUNGSI createTowerGeometry DIUBAH ---
function createTowerGeometry(towerYOffset = 0.0) {
   // Definisi geometri
   const bodyRadius = 0.2, bodyHeight = 1.05, bodyBottomY = -0.6;
   const bodyTopY = bodyBottomY + bodyHeight;
   const domeHeight = 0.1, ringBaseY = bodyTopY + domeHeight, baseY = ringBaseY + 0.02;
 
   const panjangKaki = 0.6;
   const tebalKaki = 0.05;
   const kemiringanKaki = 30; // 30 derajat
 
   // Kalkulasi 3 Kaki Simetris
   const posisiRadiusKaki = 0.18; 
   const Y_kaki = -0.5; 
   const skalaKaki = scale(tebalKaki, panjangKaki, tebalKaki);
   const skalaKakiKubus = scale(tebalKaki, tebalKaki, tebalKaki);
   const posKaki1 = translate(0, Y_kaki, posisiRadiusKaki);
   const posKaki2 = translate(
      posisiRadiusKaki * Math.sin(120 * Math.PI / 180.0), 
      Y_kaki, 
      posisiRadiusKaki * Math.cos(120 * Math.PI / 180.0)
   );
   const posKaki3 = translate(
      posisiRadiusKaki * Math.sin(240 * Math.PI / 180.0), 
      Y_kaki, 
      posisiRadiusKaki * Math.cos(240 * Math.PI / 180.0)
   );
   const rotKaki1 = rotateX(-kemiringanKaki);
   const rotKaki2 = mult(rotateY(120), mult(rotateX(-kemiringanKaki), rotateY(-120)));
   const rotKaki3 = mult(rotateY(240), mult(rotateX(-kemiringanKaki), rotateY(-240)));
   const posTopKaki1 = vec3(0.0, -0.2402, 0.03); 
   const posTopKaki2 = vec3(0.02598, -0.2402, -0.015);
   const posTopKaki3 = vec3(-0.02598, -0.2402, -0.015);
 
   // =====================
   // Bagian atas (bergerak)
   // =====================
   const movingParts = [];
 
   // Selang atas
   movingParts.push({
      shape: 'createCylinder',
      args: [0.4, 12, 16],
      transform: mult(
         translate(0, baseY - 0.40 + towerYOffset, 0),
         mult(rotateY(-90), scale(0.05, 0.03, 0.05))
      )
   });
 
   // Selang bawah (dihapus sesuai kode Anda)
 
   // --- PERUBAHAN: Bentuk Speaker "Patah" ---
 
   // Transformasi dasar (posisi & rotasi)
   const speakerBaseTransform = mult(
       translate(0, baseY + 0.2 + towerYOffset, 0),
       rotateY(cubeRotation)
   );
 
   // Definisikan dimensi
   const speakerWidth = 0.55;
   const speakerHeight = 0.95;
   const frontDepth = 0.40; // Bagian lurus (sesuai foto)
   const backDepth = 0.15;  // Bagian mengerucut (Total 0.55)
   const taperFactor = 0.7; // Mengerucut 70% di samping
 
   // Part A: Front Box (Lurus)
   const frontBoxTransform = mult(
       speakerBaseTransform,
       mult(
           translate(0, 0, backDepth * 0.1), // Geser ke depan
           scale(1, 1, 0.8)
       )
   );
   movingParts.push({
   shape: 'createFrustum',
   args: [speakerWidth, speakerHeight, speakerWidth * 0.75, speakerHeight * 0.9, frontDepth * 1.5],
   transform: frontBoxTransform
});
 
   // // Part B: Back Box (Mengerucut di samping)
   // const backBoxTransform = mult(
   //     speakerBaseTransform,
   //     mult(
   //         translate(0, 0, -frontDepth * 0.5), // Geser ke belakang
   //         scale(speakerWidth, speakerHeight, backDepth)
   //     )
   // );
   // movingParts.push({
   //     shape: 'createSideTaperedBox', // Menggunakan bentuk kustom baru
   //     args: [taperFactor], 
   //     transform: backBoxTransform
   // });
 
   // ===== Lingkaran depan (disesuaikan) =====
   const cubeNoScale = speakerBaseTransform; // Ganti nama variabel
   const circleOffsetZ = (frontDepth * 0.5) + (backDepth * 0.5) + 0.005; // Z paling depan
 
   movingParts.push({
       shape: 'createCircle3D',
       args: [0.25, 0.05, 32],
       transform: mult(
           cubeNoScale,
           mult(
               translate(0, -0.2, circleOffsetZ), // Z baru
               rotateX(0)
           )
       )
   });
 
   // ===== Tombol kecil di belakang (disesuaikan) =====
   // Kita tempel ke transform dasar, tapi kita pakaikan skala & translasi
   // agar menempel di belakang 'backBox'
   const buttonOffsetZ = (-frontDepth * 0.4) - (backDepth * 0.4); // Z paling belakang
 
   // Transformasi ini akan menskalakan tombol agar pas di area belakang
   const buttonParentTransform = mult(
       cubeNoScale,
       mult(
           translate(0.0, 0.0, buttonOffsetZ), // Pindah ke belakang
           scale(taperFactor, 1.0, 1.0) // Kecilkan sumbu X induknya
       )
   );
 
   movingParts.push({
       shape: 'createCube',
       args: [],
       transform: mult(
           buttonParentTransform, // Nempel ke induk yang sudah diskala X
           mult(
               translate(0.0, -0.35, 0.0), // Posisi Y, Z=0 (relatif)
               scale(0.25, 0.15, 0.08) // Skala tombol
           )
       )
   },
{
       shape: 'createCube',
       args: [],
       transform: mult(
           buttonParentTransform, // Nempel ke induk yang sudah diskala X
           mult(
               translate(0.0, 0.1, 0.0), // Posisi Y, Z=0 (relatif)
               scale(0.25, 0.5, 0.08) // Skala tombol
           )
       )
   },
{
       shape: 'createCube',
       args: [],
       transform: mult(
           buttonParentTransform, // Nempel ke induk yang sudah diskala X
           mult(
               translate(0.0, 0.25, 0.5), // Posisi Y, Z=0 (relatif)
               scale(0.32, 0.3, 0.08) // Skala tombol
           )
       )
   });
   // --- AKHIR PERUBAHAN SPEAKER ---
 
   // =====================
   // Bagian bawah (statis)
   // =====================
   const staticParts = [
      // batang utama
      {
         shape: 'createCylinder',
         args: [0.5, 25, 16],
         transform: mult(
            translate(0, baseY - 0.90, 0),
            mult(rotateY(90), scale(0.05, 0.03, 0.05))
         )
      },
 
      // Kaki 1 (Depan)
      { 
         shape: 'createCylinder',
         args: [0.5, 1.0, 16],
         transform: mult(posKaki1, mult(rotKaki1, skalaKaki))
      },
      // Kaki 2 (Kanan Belakang)
      { 
         shape: 'createCylinder',
         args: [0.5, 1.0, 16],
         transform: mult(posKaki2, mult(rotKaki2, skalaKaki))
      },
      // Kaki 3 (Kiri Belakang)
      { 
         shape: 'createCylinder',
         args: [0.5, 1.0, 16],
         transform: mult(posKaki3, mult(rotKaki3, skalaKaki))
      },// Stik diagonal dari kaki depan ke tiang utama
   {
      // Stik diagonal dari kaki belakang ke tiang utama
      shape: 'createCylinder',
      args: [0.01, 0.25, 100],
      transform: mult(
         translate(posisiRadiusKaki * 0.05, Y_kaki -0.1, -posisiRadiusKaki + 0.3),
         mult(
            rotateY(90), // Arah ke tiang
            rotateZ(60), // Sudut diagonal
            scale(0.5, 0.5, 0.4)
         )
      )
   },
   {
      // Stik diagonal dari kaki belakang kiri ke tiang utama
      shape: 'createCylinder',
      args: [0.01, 0.25, 100],
      transform: mult(
         translate(posisiRadiusKaki -0.26, Y_kaki -0.12, -posisiRadiusKaki + 0.14),
         mult(
            rotateY(-33), // Arah ke tiang
            rotateZ(60), // Sudut diagonal
            scale(0.5, 0.5, 0.4)
         )
      )
   },
   {
      // Stik diagonal dari kaki belakang kanan ke tiang utama
      shape: 'createCylinder',
      args: [0.01, 0.25, 100],
      transform: mult(
         translate(posisiRadiusKaki -0.1, Y_kaki -0.12, -posisiRadiusKaki + 0.14),
         mult(
            rotateY(33), // Arah ke tiang
            rotateZ(-60), // Sudut diagonal
            scale(0.5, 0.5, 0.4)
         )
      )
   },
 
 
      // Silinder ekstra 1 (komentar kuning)
      {
         shape: 'createCylinder',
         args: [0.6, 1.5, 16],
         transform: mult(
            translate(0, baseY - 0.455, 0),
            mult(rotateY(90), scale(0.05, 0.03, 0.05))
         )
      },
 
      // Silinder ekstra 2 (komentar kuning)
      {
         shape: 'createCylinder',
         args: [0.9, 1.7, 16],
         transform: mult(
            translate(0, baseY - 0.81, 0),
            mult(rotateY(90), scale(0.05, 0.03, 0.05))
         )
      },
 
      // Kubus 1 di atas kaki (komentar kuning)
      {
         shape: 'createCube',
         args: [],
         transform: mult(
            translate(posTopKaki1[0], posTopKaki1[1], posTopKaki1[2]),
            skalaKakiKubus
         )
      },
      // Kubus 2 di atas kaki (komentar kuning)
      {
         shape: 'createCube',
         args: [],
         transform: mult(
            translate(posTopKaki2[0], posTopKaki2[1], posTopKaki2[2]),
            skalaKakiKubus
         )
      },
      // Kubus 3 di atas kaki (komentar kuning)
      {
         shape: 'createCube',
         args: [],
         transform: mult(
            translate(posTopKaki3[0], posTopKaki3[1], posTopKaki3[2]),
            skalaKakiKubus
         )
      }
   ];

   
 
   // =====================
   // Gabungkan semua part
   // =====================
   const allParts = [...movingParts, ...staticParts];
 
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
 
 
   // --- PERUBAHAN (Kembali ke 1 scene) ---
   animatedScene = createTowerGeometry(0.0);
   numIndicesToDraw = animatedScene.indices.length;
 
   var { positions, normals, texCoords, indices } = createTowerGeometry(0.0);
   numIndicesToDraw = indices.length;
 
   setupGLAndBuffers(
      animatedScene.positions, 
      animatedScene.normals, 
      animatedScene.texCoords, 
      animatedScene.indices
   );
   // --- AKHIR PERUBAHAN ---
 
   getAllUIElements();
   getAllUniformLocations();
   attachEventListeners();
   setInitialShaderState();
 
   animate();
}
 
function setupGLAndBuffers(positions, normals, texCoords, indices) {
   // Buat atau update buffer untuk INDICES 
   if (!sceneBuffers.index) {
      sceneBuffers.index = gl.createBuffer();
   }
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sceneBuffers.index);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
 
   // Buffer untuk NORMAL (Attribute)
   if (!sceneBuffers.normal) {
      sceneBuffers.normal = gl.createBuffer();
   }
   gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffers.normal);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
 
   var normalLoc = gl.getAttribLocation(program, "aNormal");
   gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(normalLoc);
 
   // Buffer untuk POSISI (Attribute)
   if (!sceneBuffers.position) {
      sceneBuffers.position = gl.createBuffer();
   }
   gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffers.position);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
   var positionLoc = gl.getAttribLocation(program, "aPosition");
   gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(positionLoc);
 
   // Buffer untuk KOORDINAT TEKSTUR (Attribute)
   if (!sceneBuffers.texCoord) {
      sceneBuffers.texCoord = gl.createBuffer();
   }
   gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffers.texCoord);
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
 
   // --- TOGGLE ANIMASI ---
var toggleAnimationButton = document.getElementById('toggle-animation');
toggleAnimationButton.addEventListener('click', function () {
    isAnimating = !isAnimating; // ubah status
    toggleAnimationButton.textContent = isAnimating ? "⏸️ Pause Animasi" : "▶️ Jalankan Animasi";
});
 
   // --- TRANSFORMASI ---
   function updateTransformation() {
      theta[0] = parseFloat(rotateXSlider.value);
      theta[1] = parseFloat(rotateYSlider.value);
      pan[0] = parseFloat(panXSlider.value);
      pan[1] = parseFloat(panYSlider.value);
      scaleNum = parseFloat(scaleSlider.value);
 
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
 
   // --- PERUBAHAN: Kembali ke 1 warna ---
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
      ambientColorPicker.value = '#ff0000';
      diffuseColorPicker.value = '#ffff00';
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
   scaleNum = parseFloat(scaleSlider.value);
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
   gl.uniform1f(uScaleLoc, scaleNum);
   gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));
   gl.uniform4fv(uLightPositionLoc, flatten(lightPosition));
   gl.uniform1f(uShininessLoc, shininess);
   gl.uniform1i(uUseTextureLoc, useTexture);
 
   // Kirim produk material dan cahaya awal
   gl.uniform4fv(uAmbientProductLoc, flatten(mult(lightAmbient, materialAmbient)));
   gl.uniform4fv(uDiffuseProductLoc, flatten(mult(lightDiffuse, materialDiffuse)));
   gl.uniform4fv(uSpecularProductLoc, flatten(mult(lightSpecular, materialSpecular)));
}
 
// Fungsi untuk memperbarui animasi tower, kotak sama tongsis
function updateAnimation() {
  // Update posisi tower naik-turun
  towerYOffset += towerSpeed * towerDirection;
  cubeRotation += cubeRotationSpeed;
  if (cubeRotation > 360.0) cubeRotation -= 360.0;
 
  if (towerYOffset > 0.1 || towerYOffset < -0.1) {
    towerDirection *= -1;
  }
 
  // Buat ulang scene dengan posisi tower baru
  animatedScene = createTowerGeometry(towerYOffset);
  numIndicesToDraw = animatedScene.indices.length;
 
  // Update buffer posisi dan normal
  setupGLAndBuffers(
    animatedScene.positions,
    animatedScene.normals,
    animatedScene.texCoords,
    animatedScene.indices
  );
}
 
// Animasikan loop
function animate() {
    if (isAnimating) {
        updateAnimation();  // update posisi & rotasi jika aktif
        render();           // render frame
    } else {
        render();           // tetap render biar tampilan tidak freeze
    }
    requestAnimationFrame(animate);
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
   gl.texParameteri(gl.TEXTURE_D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}