var canvas;
var gl;
var program;

// properti utama objek dan transformasi
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
var towerSpeed = 0.0005;
var animatedScene = null;
var sceneBuffers = {
   position: null,
   normal: null,
   texCoord: null,
   index: null
};

// Variabel untuk rotasi kubus 
var cubeRotation = 0.0;
var cubeRotationSpeed = 1.0;

// Variabel untuk kontrol animasi
var isAnimating = true;
var animateTower = true;
var animateCube = true;

// Variabel untuk texture
var checkerTexture;
var imageTexture;
var uTextureMapLoc;
var texSize = 64;
var image1 = new Array()
for (var i = 0; i < texSize; i++)  image1[i] = new Array();
for (var i = 0; i < texSize; i++)
   for (var j = 0; j < texSize; j++)
      image1[i][j] = new Float32Array(4);
for (var i = 0; i < texSize; i++) for (var j = 0; j < texSize; j++) {
   var c = (((i & 0x8) == 0) ^ ((j & 0x8) == 0));
   image1[i][j] = [c, c, 1, 1];
}

// Convert floats to ubytes for texture
var image2 = new Uint8Array(4 * texSize * texSize);
for (var i = 0; i < texSize; i++)
   for (var j = 0; j < texSize; j++)
      for (var k = 0; k < 4; k++)
         image2[4 * texSize * i + 4 * j + k] = 255 * image1[i][j][k];

// TexCoord standar untuk 1 sisi (quad)
var texCoord = [
   vec2(0, 0),
   vec2(0, 1),
   vec2(1, 1),
   vec2(1, 0)
];

// Objek Geometri
const Geometry = {
   createCylinder: function (radius, height, segments) {
      let vertices = [vec4(0, height / 2, 0, 1.0), vec4(0, -height / 2, 0, 1.0)];
      let indices = [];
      // vertex sisi
      for (let i = 0; i < segments; i++) {
         let angle = (i / segments) * 2.0 * Math.PI;
         let x = radius * Math.cos(angle);
         let z = radius * Math.sin(angle);
         vertices.push(vec4(x, height / 2, z, 1.0)); // Top vertex
         vertices.push(vec4(x, -height / 2, z, 1.0)); // Bottom vertex
      }

      // indices
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
      // 8 vertex dasar
      const baseVertices = [
         vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0),
         vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, -0.5, 0.5, 1.0),
         vec4(-0.5, -0.5, -0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),
         vec4(0.5, 0.5, -0.5, 1.0), vec4(0.5, -0.5, -0.5, 1.0)
      ];

      var vertices = [];
      var texCoords = [];
      var indices = [];

      function quad(a, b, c, d) {
         vertices.push(baseVertices[a]);
         texCoords.push(texCoord[0]);

         vertices.push(baseVertices[b]);
         texCoords.push(texCoord[1]);

         vertices.push(baseVertices[c]);
         texCoords.push(texCoord[2]);

         vertices.push(baseVertices[a]);
         texCoords.push(texCoord[0]);

         vertices.push(baseVertices[c]);
         texCoords.push(texCoord[2]);

         vertices.push(baseVertices[d]);
         texCoords.push(texCoord[3]);
      }

      // Bangun 6 sisi
      quad(1, 0, 3, 2); // Depan
      quad(2, 3, 7, 6); // Kanan
      quad(3, 0, 4, 7); // Bawah
      quad(6, 5, 1, 2); // Atas
      quad(4, 5, 6, 7); // Belakang
      quad(5, 4, 0, 1); // Kiri

      for (let i = 0; i < 36; i++) {
         indices.push(i);
      }

      return { vertices, indices, texCoords };
   },

   createSideTaperedBox: function (taperFactor = 0.7) {
      const v7 = vec4(backDimX, -backDimY, back, 1.0); // back-bottom-right

      const baseVertices = [v0, v1, v2, v3, v4, v5, v6, v7];

      var vertices = [];
      var texCoords = [];
      var indices = [];

      function quad(a, b, c, d) {
         vertices.push(baseVertices[a]);
         texCoords.push(texCoord[0]);
         vertices.push(baseVertices[b]);
         texCoords.push(texCoord[1]);
         vertices.push(baseVertices[c]);
         texCoords.push(texCoord[2]);
         vertices.push(baseVertices[a]);
         texCoords.push(texCoord[0]);
         vertices.push(baseVertices[c]);
         texCoords.push(texCoord[2]);
         vertices.push(baseVertices[d]);
         texCoords.push(texCoord[3]);
      }

      quad(1, 0, 3, 2); // Depan
      quad(2, 3, 7, 6); // Kanan
      quad(3, 0, 4, 7); // Bawah
      quad(6, 5, 1, 2); // Atas
      quad(4, 5, 6, 7); // Belakang
      quad(5, 4, 0, 1); // Kiri

      for (let i = 0; i < 36; i++) indices.push(i);

      return { vertices, indices, texCoords };
   }
};

function buildSceneFromParts(parts) {
   const scene = { vertices: [], indices: [], texCoords: [] };

   for (const part of parts) {
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
      } else if (geometry.texCoords && geometry.texCoords.length > 0) {
         scene.texCoords.push(...geometry.texCoords);
      } else {
         // Fallback untuk bentuk lain (seperti createCircle3D)
         for (let i = 0; i < geometry.vertices.length; i++) {
            scene.texCoords.push(vec2(0.5, 0.5));
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

Geometry.createFrustum = function (frontWidth = 1.0, frontHeight = 1.0, backWidth = 1, backHeight = 1, depth = 1.0) {
   const vertices = [];
   const fw2 = frontWidth / 2;
   const fh2 = frontHeight / 2;
   const bw2 = backWidth / 2;
   const bh2 = backHeight / 2;

   // 8 vertices dasar
   // Urutan definisi 0-7 ini sudah benar.
   vertices.push(vec4(-fw2, -fh2, depth / 2, 1.0)); // 0: front-bottom-left
   vertices.push(vec4(-fw2, fh2, depth / 2, 1.0));  // 1: front-top-left
   vertices.push(vec4(fw2, fh2, depth / 2, 1.0));   // 2: front-top-right
   vertices.push(vec4(fw2, -fh2, depth / 2, 1.0));  // 3: front-bottom-right
   vertices.push(vec4(-bw2, -bh2, -depth / 2, 1.0)); // 4: back-bottom-left
   vertices.push(vec4(-bw2, bh2, -depth / 2, 1.0));  // 5: back-top-left
   vertices.push(vec4(bw2, bh2, -depth / 2, 1.0));   // 6: back-top-right
   vertices.push(vec4(bw2, -bh2, -depth / 2, 1.0));  // 7: back-bottom-right

   const baseVertices = [...vertices];

   vertices.length = 0;
   var texCoords = [];
   var indices = [];

   function quad(a, b, c, d) {
      vertices.push(baseVertices[a]);
      texCoords.push(texCoord[0]);
      vertices.push(baseVertices[b]);
      texCoords.push(texCoord[1]);
      vertices.push(baseVertices[c]);
      texCoords.push(texCoord[2]);
      vertices.push(baseVertices[a]);
      texCoords.push(texCoord[0]);
      vertices.push(baseVertices[c]);
      texCoords.push(texCoord[2]);
      vertices.push(baseVertices[d]);
      texCoords.push(texCoord[3]);
   }

   quad(1, 0, 3, 2); // Depan
   quad(2, 3, 7, 6); // Kanan
   quad(3, 0, 4, 7); // Bawah
   quad(6, 5, 1, 2); // Atas
   quad(4, 5, 6, 7); // Belakang
   quad(5, 4, 0, 1); // Kiri

   for (let i = 0; i < 36; i++) indices.push(i);

   return { vertices, indices, texCoords };
};

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

function createTowerGeometry(towerYOffset = 0.0, kemiringanKakiInput = 30) {
   // Definisi geometri
   const bodyRadius = 0.2, bodyHeight = 1.05, bodyBottomY = -0.6;
   const bodyTopY = bodyBottomY + bodyHeight;
   const domeHeight = 0.1, ringBaseY = bodyTopY + domeHeight, baseY = ringBaseY + 0.02;

   const panjangKaki = 0.6;
   const tebalKaki = 0.05;
   const kemiringanKaki = kemiringanKakiInput;
   const kemiringanKaki_rad = kemiringanKaki * Math.PI / 180.0;
   const kemiringanAsli_rad = 30.0 * Math.PI / 180.0;
   const heightChangeY = (panjangKaki * Math.cos(kemiringanKaki_rad)) - (panjangKaki * Math.cos(kemiringanAsli_rad));
   const hierarchicalTransform = translate(0, heightChangeY, 0);

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

   // Bagian atas (bergerak)
   const movingParts = [];

   // Selang atas
   movingParts.push({
      shape: 'createCylinder',
      args: [0.4, 12, 16],
      transform: mult(hierarchicalTransform, mult(
         translate(0, baseY - 0.40 + towerYOffset, 0),
         mult(rotateY(-90), scale(0.05, 0.03, 0.05))
      ))
   });


   // Transformasi dasar (posisi & rotasi)
   const speakerBaseTransform = mult(
      hierarchicalTransform, mult(
         translate(0, baseY + 0.2 + towerYOffset, 0),
         rotateY(cubeRotation)
      )
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
            translate(0, -0.2, circleOffsetZ),
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
            buttonParentTransform,
            mult(
               translate(0.0, 0.25, 0.5),
               scale(0.32, 0.3, 0.08)
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
         transform: mult(hierarchicalTransform, mult(
            translate(0, baseY - 0.90, 0),
            mult(rotateY(90), scale(0.05, 0.03, 0.05))
         ))
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
         transform: mult(hierarchicalTransform, mult(
            translate(posisiRadiusKaki * 0.05, Y_kaki - 0.1, -posisiRadiusKaki + 0.3),
            mult(
               rotateY(90), // Arah ke tiang
               rotateZ(60), // Sudut diagonal
               scale(0.5, 0.5, 0.4)
            )
         ))
      },
      {
         // Stik diagonal dari kaki belakang kiri ke tiang utama
         shape: 'createCylinder',
         args: [0.01, 0.25, 100],
         transform: mult(hierarchicalTransform, mult(
            translate(posisiRadiusKaki - 0.26, Y_kaki - 0.12, -posisiRadiusKaki + 0.14),
            mult(
               rotateY(-33), // Arah ke tiang
               rotateZ(60), // Sudut diagonal
               scale(0.5, 0.5, 0.4)
            )
         ))
      },
      {
         // Stik diagonal dari kaki belakang kanan ke tiang utama
         shape: 'createCylinder',
         args: [0.01, 0.25, 100],
         transform: mult(hierarchicalTransform, mult(
            translate(posisiRadiusKaki - 0.1, Y_kaki - 0.12, -posisiRadiusKaki + 0.14),
            mult(
               rotateY(33), // Arah ke tiang
               rotateZ(-60), // Sudut diagonal
               scale(0.5, 0.5, 0.4)
            )
         ))
      },


      // Silinder ekstra 1 (komentar kuning)
      {
         shape: 'createCylinder',
         args: [0.6, 1.5, 16],
         transform: mult(hierarchicalTransform, mult(
            translate(0, baseY - 0.56, 0),
            mult(rotateY(90), scale(0.05, 0.03, 0.05))
         ))
      },

      // Silinder ekstra 2 (komentar kuning)
      {
         shape: 'createCylinder',
         args: [0.9, 1.7, 16],
         transform: mult(hierarchicalTransform, mult(
            translate(0, baseY - 0.81, 0),
            mult(rotateY(90), scale(0.05, 0.03, 0.05))
         ))
      },

      // Kubus 1 di atas kaki (komentar kuning)
      {
         shape: 'createCube',
         args: [],
         transform: mult(hierarchicalTransform, mult(
            translate(posTopKaki1[0], posTopKaki1[1], posTopKaki1[2]),
            skalaKakiKubus
         ))
      },
      // Kubus 2 di atas kaki (komentar kuning)
      {
         shape: 'createCube',
         args: [],
         transform: mult(hierarchicalTransform, mult(
            translate(posTopKaki2[0], posTopKaki2[1], posTopKaki2[2]),
            skalaKakiKubus
         ))
      },
      // Kubus 3 di atas kaki (komentar kuning)
      {
         shape: 'createCube',
         args: [],
         transform: mult(hierarchicalTransform, mult(
            translate(posTopKaki3[0], posTopKaki3[1], posTopKaki3[2]),
            skalaKakiKubus
         ))
      }
   ];

   // Gabungkan semua part
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

   getAllUniformLocations();
   configureTextures();

   animatedScene = createTowerGeometry(0.0, 30.0);
   numIndicesToDraw = animatedScene.indices.length;

   var { positions, normals, texCoords, indices } = createTowerGeometry(0.0, 30.0);
   numIndicesToDraw = indices.length;

   setupGLAndBuffers(
      animatedScene.positions,
      animatedScene.normals,
      animatedScene.texCoords,
      animatedScene.indices
   );

   getAllUIElements();
   attachEventListeners();
   setInitialShaderState();

   animate();
}

function setupGLAndBuffers(positions, normals, texCoords, indices) {
   if (!sceneBuffers.index) {
      sceneBuffers.index = gl.createBuffer();
   }
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sceneBuffers.index);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

   if (!sceneBuffers.normal) {
      sceneBuffers.normal = gl.createBuffer();
   }
   gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffers.normal);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

   var normalLoc = gl.getAttribLocation(program, "aNormal");
   gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(normalLoc);

   if (!sceneBuffers.position) {
      sceneBuffers.position = gl.createBuffer();
   }
   gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffers.position);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
   var positionLoc = gl.getAttribLocation(program, "aPosition");
   gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(positionLoc);

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
   legAngleSlider = document.getElementById('legAngle');
   legAngleSpan = document.getElementById('legAngle-val');

   // Grup Viewing
   perspectiveCheck = document.getElementById('perspective');

   // Tombol animasi baru
   toggleAnimationButton = document.getElementById('toggle-animation');
   towerAnimationCheck = document.getElementById('tower-animation');
   cubeAnimationCheck = document.getElementById('cube-animation');
   bothAnimationButton = document.getElementById('both-animation');

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
   checkerButton = document.getElementById('useCheckerTex');
   imageButton = document.getElementById('useImageTex');

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
   uTextureMapLoc = gl.getUniformLocation(program, "uTextureMap");
}

function attachEventListeners() {

   // --- TOGGLE ANIMASI ---
   var toggleAnimationButton = document.getElementById('toggle-animation');
   toggleAnimationButton.addEventListener('click', function () {
      isAnimating = !isAnimating;
      toggleAnimationButton.textContent = isAnimating ? "⏸️ Pause Animasi" : "▶️ Jalankan Animasi";
   });

   // --- ANIMASI TOWER & CUBE ---
   towerAnimationCheck.addEventListener('change', function () {
      animateTower = this.checked;
      updateAnimationState();
   });

   // --- ANIMASI CUBE ---
   cubeAnimationCheck.addEventListener('change', function () {
      animateCube = this.checked;
      updateAnimationState();
   });

   // --- ANIMASI KEDUANYA ---
   bothAnimationButton.addEventListener('click', function () {
      animateTower = true;
      animateCube = true;
      towerAnimationCheck.checked = true;
      cubeAnimationCheck.checked = true;
      updateAnimationState();
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

   canvas.addEventListener('contextmenu', function (event) {
      event.preventDefault();
   });

   legAngleSlider.addEventListener('input', function () {
      legAngle = parseFloat(legAngleSlider.value);
      legAngleSpan.textContent = legAngle.toFixed(1) + '°';

      if (!isAnimating) {
         updateAnimation();
         render();
      }
   });

   checkerButton.addEventListener('click', function () {
      gl.bindTexture(gl.TEXTURE_2D, checkerTexture);
      render();
   });

   imageButton.addEventListener('click', function () {
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      render();
   });

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
      legAngleSlider.value = 30;

      // Reset checkbox
      perspectiveCheck.checked = false;
      textureCheck.checked = false;

      // Reset color picker
      ambientColorPicker.value = '#000000';
      diffuseColorPicker.value = '#000000';
      specularColorPicker.value = '#ffffff';

      // Reset angle leg
      legAngle = 30.0;
      legAngleSpan.textContent = '30.0°';

      // Panggil semua fungsi update untuk menerapkan nilai default
      updateTransformation();
      updateProjection();
      updateLightPosition();
      updateShininess();
      updateMaterialColors();
      updateTextureToggle();
      updateAnimation();

      render();
   }
   resetButton.addEventListener('click', resetAll);
}

function hexToVec4(hex) {
   hex = hex.replace('#', '');

   // Konversi rr, gg, bb ke integer
   var r = parseInt(hex.substring(0, 2), 16);
   var g = parseInt(hex.substring(2, 4), 16);
   var b = parseInt(hex.substring(4, 6), 16);

   // Normalisasi ke [0, 1] dan kembalikan sebagai vec4
   return vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);
}

function setInitialShaderState() {
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
   legAngle = parseFloat(legAngleSlider.value);

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
   gl.uniform4fv(uAmbientProductLoc, flatten(mult(lightAmbient, materialAmbient)));
   gl.uniform4fv(uDiffuseProductLoc, flatten(mult(lightDiffuse, materialDiffuse)));
   gl.uniform4fv(uSpecularProductLoc, flatten(mult(lightSpecular, materialSpecular)));
}

function updateAnimationState() {
   console.log(`Tower Animation: ${animateTower}, Cube Animation: ${animateCube}`);
}

function updateAnimation() {
   // Update posisi tower naik-turun jika aktif
   if (animateTower) {
      towerYOffset += towerSpeed * towerDirection;
      if (towerYOffset > 0.1 || towerYOffset < -0.1) {
         towerDirection *= -1;
      }
   }

   // Update rotasi kubus jika aktif
   if (animateCube) {
      cubeRotation += cubeRotationSpeed;
      if (cubeRotation > 360.0) cubeRotation -= 360.0;
   }

   // Buat ulang scene dengan posisi tower dan rotasi kubus baru
   animatedScene = createTowerGeometry(towerYOffset, legAngle);
   numIndicesToDraw = animatedScene.indices.length;

   // Update buffer posisi dan normal
   setupGLAndBuffers(
      animatedScene.positions,
      animatedScene.normals,
      animatedScene.texCoords,
      animatedScene.indices
   );
}

function animate() {
   if (isAnimating) {
      updateAnimation();
      render();
   } else {
      render();
   }
   requestAnimationFrame(animate);
}

function render() {
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   gl.drawElements(gl.TRIANGLES, numIndicesToDraw, gl.UNSIGNED_SHORT, 0);
}

function configureTextures() {
   // 1. Buat Tekstur Checkerboard 
   checkerTexture = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, checkerTexture);
   gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, image2
   );
   gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

   // 2. Buat Tekstur Gambar
   imageTexture = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, imageTexture);

   const pixel = new Uint8Array([0, 0, 255, 255]);
   gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, pixel
   );

   var image = new Image();
   image.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.texImage2D(
         gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
         gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      render();
   };

   image.src = "texture.jpg";
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, checkerTexture);
   gl.uniform1i(uTextureMapLoc, 0);
}