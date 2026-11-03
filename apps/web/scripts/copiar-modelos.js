// Copia os modelos do face-api.js para public/, de onde o navegador os carrega.
// Roda antes do build (prebuild), assim os 7 MB de modelos não ficam no repositório.
const fs = require('fs');
const path = require('path');
const origem = path.join(path.dirname(require.resolve('@vladmandic/face-api/package.json')), 'model');
const destino = path.join(__dirname, '..', 'public', 'modelos-rosto');
fs.mkdirSync(destino, { recursive: true });
for (const f of fs.readdirSync(origem)) {
  if (/^(tiny_face_detector|face_landmark_68_model|face_recognition)/.test(f)) fs.copyFileSync(path.join(origem, f), path.join(destino, f));
}
console.log('Modelos do reconhecimento facial copiados para public/modelos-rosto');
