// JavaScript部分（script.js）
const canvas = document.getElementById('fretboard');
const ctx = canvas.getContext('2d');

const dpr = window.devicePixelRatio || 1;
const cssWidth = 1400;
const cssHeight = 330;
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;
canvas.style.width = cssWidth + 'px';
canvas.style.height = cssHeight + 'px';
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const NOTE_NAMES_ALL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const OPEN_NOTES = ['E', 'B', 'G', 'D', 'A', 'E'];
const fretCount = 25;
const questionFretLimit = 13;
const stringCount = 6;
const stringSpacing = cssHeight / (stringCount + 1);
const startX = cssWidth * 0.06;
const startY = stringSpacing;
let fretX = [], fretCenters = [], stringCenters = [], hitboxes = [];
let question = {};
let highlightedNote = null;

function getNoteWithOctave(string, fret) {
  const openNotesWithOctave = [
    { note: "E", octave: 4 }, // 1弦
    { note: "B", octave: 3 },
    { note: "G", octave: 3 },
    { note: "D", octave: 3 },
    { note: "A", octave: 2 },
    { note: "E", octave: 2 }  // 6弦
  ];

  const open = openNotesWithOctave[string];
  const noteIndex = NOTE_NAMES_ALL.indexOf(open.note);
  const totalIndex = noteIndex + fret;

  const note = NOTE_NAMES_ALL[totalIndex % 12];
  const octave = open.octave + Math.floor((noteIndex + fret) / 12);

  return `${note}${octave}`;  // 例: "G3"
}

function getFingerboardColors() {
  const type = document.getElementById('fingerboardSelect')?.value || 'rosewood';

  switch (type) {
    case 'maple':
      return {
        gradX: ['#ffe3a1', '#d89f3f'],
        gradY: ['#ffe3a1', '#efc878']
      };
    case 'ebony':
      return {
        gradX: ['#0e0e0e', '#1a1a1a'],  // より黒くて引き締まった印象に
        gradY: ['#1c1c1c', '#101010']
      };      
    case 'rosewood':
    default:
      return {
        gradX: ['#3f3222', '#252019'],
        gradY: ['#3f3222', '#252019']
      };
  }
}

// グローバル変数
let woodGrainImage = null;
let currentGrainMaterial = null;
let hasAnswered = false;


function generateWoodGrainImage(material, arcX, controlX, arcY, maxX) {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = canvas.width;
  offCanvas.height = canvas.height;
  const offCtx = offCanvas.getContext('2d');

  offCtx.save();
  offCtx.beginPath();
  offCtx.moveTo(startX, startY - 10);
  offCtx.lineTo(arcX, startY - 10);
  offCtx.quadraticCurveTo(controlX, arcY, arcX, startY + (stringCount - 1) * stringSpacing + 10);
  offCtx.lineTo(startX, startY + (stringCount - 1) * stringSpacing + 10);
  offCtx.closePath();
  offCtx.clip();

  drawWoodGrain(offCtx, startX, startY - 30, maxX - startX + 30, stringSpacing * (stringCount - 1) + 60, material);

  offCtx.restore();

  woodGrainImage = offCanvas;
  currentGrainMaterial = material;
}

function drawWoodGrain(ctx, x, y, w, h, material) {
  ctx.save();
  ctx.strokeStyle = {
    rosewood: 'rgba(120, 50, 50, 0.2)',
    maple: 'rgba(180, 120, 50, 0.2)',
    ebony: 'rgba(80, 80, 80, 0.2)',
  }[material] || 'rgba(100, 100, 100, 0.2)';
  ctx.lineWidth = 1;

  const seed = Math.random() * 100000; // 乱数シードを固定したい場合はMath.seedrandomなど導入

  for (let i = 0; i < 100; i++) {
    const yy = y + Math.random() * h;
    const wobble = Math.sin(i * 0.3) * 5;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy + wobble);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPositionMarkers(style = 'dot') {
  const inlayFrets = style === 'block'
  ? [1, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
  : [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

  const doubleFrets = [12, 24];

  inlayFrets.forEach(f => {
    const x = fretCenters[f];
    const ySet = (
      (style === 'dot' || style === 'diamond') && doubleFrets.includes(f)
    ) ? [1.5, 3.5] : [2.5];    

    ySet.forEach(offset => {
      const y = startY + offset * stringSpacing;

      const material = document.getElementById('fingerboardSelect')?.value || 'rosewood';
      const inlayColor = (material === 'maple' && style === 'dot') ? 'black' : 'white';

      switch (style) {
        case 'dot':
          drawDot(x, y, inlayColor, 8);
          break;

        case 'block': {
          // 細かく制御：低音側ほど太い、ハイフレットほど細く
          const maxBlockWidth = 80;
          const minBlockWidth = 5;
        
          // 0〜1の範囲でフレット位置からスケーリング
          const scaleRatio = 1 - (f / fretCount);
          const width = minBlockWidth + (maxBlockWidth - minBlockWidth) * scaleRatio;
        
          const height = stringSpacing * 2;
        
          drawBlock(x, y, 'white', width, height);
          break;
        }

        case 'dish': {
          const maxBlockWidth = 60;
          const minBlockWidth = 10;
          const scaleRatio = 1 - (f / fretCount);
          const width = minBlockWidth + (maxBlockWidth - minBlockWidth) * scaleRatio;
        
          const height = stringSpacing * 2.2; // blockより縦長
          drawCurvedBlock(x, y, width, height, 'white');
          break;
        }
        

        case 'diamond':
          drawDiamond(x, y);
          break;

        default:
          drawDot(x, y, 'white', 5);
      }
    });
  });
}

// フレット線用のグラデーションを個別に定義
const fretGradient = ctx.createLinearGradient(0, startY, 0, startY + stringSpacing * (stringCount - 1));
fretGradient.addColorStop(0, '#fafdff');  // 上に少し影
fretGradient.addColorStop(1, '#ccced0');


// 補助関数（バード以外）
function drawBlock(x, y, color, width, height) {
  const leftX = x - width / 2;
  const topY = y - height / 2;
  const rightX = x + width / 2;
  const bottomY = y + height / 2;

  // グラデーション（白蝶貝風）
  const grad = ctx.createLinearGradient(leftX, topY, rightX, bottomY);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, '#f0f0f0');
  grad.addColorStop(0.5, '#e0f8ff');
  grad.addColorStop(0.7, '#f0f0f0');
  grad.addColorStop(1, '#ffffff');

  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(leftX, topY, width, height);
  ctx.restore();
}


function drawDiamond(x, y, size = 7) {

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, '#a8f0d4');   // 中心：淡いエメラルドグリーン
  gradient.addColorStop(0.5, '#cceeff'); // 中間：淡い水色
  gradient.addColorStop(1, '#007a5e');   // 外側：深い緑系（高級感）
  
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawCurvedBlock(x, y, width, height, color = 'white') {
  ctx.save();

  const leftX = x - width / 2;
  const rightX = x + width / 2;
  const topY = y - height / 2;
  const bottomY = y + height / 2; // 少し下げて湾曲を強調
  
  const grad = ctx.createLinearGradient(leftX, topY, rightX, bottomY);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, '#f0f0f0');
  grad.addColorStop(0.5, '#e0f8ff'); // 青系ハイライト
  grad.addColorStop(0.7, '#f0f0f0');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  
  ctx.beginPath();

  const curveDepth = height * 0.15; // 上下の内側の湾曲度

  // 左上
  ctx.moveTo(leftX, topY);

  // 上辺：内側に湾曲
  ctx.quadraticCurveTo(rightX - 10, topY + curveDepth, rightX, topY + 15);

  // 右辺（短い直線）
  ctx.lineTo(rightX, bottomY - 15);

  // 下辺：内側に湾曲
  ctx.quadraticCurveTo(rightX - 10, bottomY - curveDepth, leftX, bottomY);

  // 左辺（直線）
  ctx.closePath();

  ctx.fill();
  ctx.restore();
}


function drawFretboard() {
  ctx.lineWidth = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  fretX = [startX];

  let fw = (cssWidth - startX * 2) / fretCount * 1.75;
  let scale = 0.9439;

  for (let i = 0; i < fretCount; i++) {
    fretX.push(fretX[i] + fw);
    fw *= scale;
  }

  fretCenters = [];
  for (let i = 0; i < fretCount; i++) {
    if (i === 0) {
      fretCenters.push(startX - (fretX[1] - fretX[0]) / 2);
    } else {
      fretCenters.push((fretX[i] + fretX[i - 1]) / 2);
    }
  }

  stringCenters = [];
  for (let i = 0; i < stringCount; i++) {
    stringCenters.push(startY + i * stringSpacing);
  }

  hitboxes = [];
  for (let s = 0; s < stringCount; s++) {
    hitboxes[s] = [];
    const y = stringCenters[s];
    const yMin = y - stringSpacing / 2;
    const yMax = y + stringSpacing / 2;
    for (let f = 0; f < fretCount; f++) {
      let xMin, xMax;
      if (f === 0) {
        xMin = fretCenters[0] - (fretX[1] - fretX[0]) / 2;
        xMax = fretCenters[0] + (fretX[1] - fretX[0]) / 2;
      } else {
        xMin = fretCenters[f] - (fretX[f + 1] - fretX[f]) / 2;
        xMax = fretCenters[f] + (fretX[f + 1] - fretX[f]) / 2;
      }
      hitboxes[s][f] = { xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax };
    }
  }

  // 🎨 選択された指板の色を取得
  const { gradX: [gx1, gx2], gradY: [gy1, gy2] } = getFingerboardColors();

  const maxX = fretX[fretX.length - 1];

  // 横グラデーション（木目風）
  const gradX = ctx.createLinearGradient(startX, 0, maxX, 0);
  gradX.addColorStop(0, gx1);
  gradX.addColorStop(1, gx2);

  // 縦グラデーション（影の立体感）
  const gradY = ctx.createLinearGradient(0, startY, 0, startY + stringSpacing * (stringCount - 1));
  gradY.addColorStop(0, gy1);
  gradY.addColorStop(1, gy2);


  // 🎸 ピックガード描画（キャンバスいっぱいまで）
  ctx.beginPath();
  ctx.moveTo(fretX[24], 0);
  ctx.lineTo(canvas.width, 0);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(fretX[24], canvas.height);
  ctx.closePath();
  ctx.fillStyle = '#fffaf0';
  ctx.fill();

  // 一旦描画
  ctx.fillStyle = gradX;
  ctx.fillRect(startX, startY, maxX - startX, stringSpacing * (stringCount - 1));

  ctx.fillStyle = gradY;
  ctx.fillRect(startX, startY, maxX - startX, stringSpacing * (stringCount - 1));

  // 🎸 指板描画
  ctx.fillStyle = gradY;
  const arcRadius = stringSpacing * (stringCount - 1) / 2;
  const arcX = maxX;
  const arcY = startY + arcRadius;
  const controlX = arcX + arcRadius * 0.3;
  ctx.beginPath();
  ctx.moveTo(arcX, startY - 10);
  ctx.quadraticCurveTo(controlX, arcY, arcX, startY + (stringCount - 1) * stringSpacing + 10);
  ctx.lineTo(startX, startY + (stringCount - 1) * stringSpacing + 10);
  ctx.lineTo(startX, startY - 10);
  ctx.closePath();
  ctx.fill();

  // 🎸 ピックアップ描画（縦直線・横曲線 + 影）
  const pickupHeight = 280;
  const pickupWidth = 50;
  const pickupX = maxX + 80;
  const pickupY = arcY - pickupHeight / 2;

  ctx.beginPath();
  ctx.moveTo(pickupX, pickupY + 25);
  ctx.quadraticCurveTo(pickupX + pickupWidth / 2, pickupY, pickupX + pickupWidth, pickupY + 25);
  ctx.lineTo(pickupX + pickupWidth, pickupY + pickupHeight - 25);
  ctx.quadraticCurveTo(pickupX + pickupWidth / 2, pickupY + pickupHeight, pickupX, pickupY + pickupHeight - 25);
  ctx.closePath();
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 10;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  const dotRadius = 5;
  const dotSpacing = pickupHeight / 6;
  for (let i = 0; i < 6; i++) {
    const cy = pickupY + dotSpacing * i + dotSpacing / 2;
    ctx.beginPath();
    ctx.arc(pickupX + pickupWidth / 2, cy, dotRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#4a4a4a';
    ctx.fill();
  }

  // 🎸 指板とピックガードの境に影を描画（←移動済み）
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = gradY;
  ctx.beginPath();
  ctx.moveTo(arcX, startY - 10);
  ctx.quadraticCurveTo(controlX, arcY, arcX, startY + (stringCount - 1) * stringSpacing + 10);
  ctx.lineTo(arcX - 10, startY + (stringCount - 1) * stringSpacing + 10);
  ctx.lineTo(arcX - 10, startY - 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 🎸 指板の木目を描画
  const material = document.getElementById('fingerboardSelect')?.value || 'rosewood';

  if (woodGrainImage === null || currentGrainMaterial !== material) {
    generateWoodGrainImage(material, arcX, controlX, arcY, maxX);
  }
  
  ctx.drawImage(woodGrainImage, 0, 0);

  // ポジションマーク描画
  const inlayStyle = document.getElementById('inlaySelect')?.value || 'dot';
  drawPositionMarkers(inlayStyle);

  // フレット線描画
  for (let i = 0; i < fretX.length; i++) {
    if (i === fretX.length - 1) continue;
    ctx.beginPath();
    ctx.lineWidth = 3.3;
    ctx.moveTo(fretX[i], startY - 10.7);
    ctx.lineTo(fretX[i], startY + (stringCount - 1) * stringSpacing + 10.7);
    ctx.strokeStyle = fretGradient;
    ctx.stroke();
  }

  // ナット線
  ctx.beginPath();
  ctx.moveTo(fretX[0] - 2, startY - 10.7);
  ctx.lineTo(fretX[0] - 2, startY + (stringCount - 1) * stringSpacing + 10.7);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fffaf0';
  ctx.stroke();

  // 弦描画
  for (let i = 0; i < stringCount; i++) {
    const y = stringCenters[i];
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(canvas.width, y);
    ctx.lineWidth = 2.5 - ((stringCount - 1 - i) * 0.4);
    ctx.strokeStyle = '#c0c0c0';
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.fillText(`${i + 1}弦`, startX - 50, y);
  }

  // 音名表示（学習モード）
  const mode = document.querySelector('input[name="mode"]:checked')?.value;
  if (mode === 'learn') {
    const includeSharps = document.getElementById('includeSharps').checked;
    for (let s = 0; s < stringCount; s++) {
      for (let f = 0; f < fretCount; f++) {
        const note = getNote(s, f);
        if (!includeSharps && !NOTE_NAMES_WHITE.includes(note)) continue;

        const x = f === 0 ? fretX[0] : (fretX[f - 1] + fretX[f]) / 2;
        const y = stringCenters[s];

        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);
        ctx.fillStyle = note === highlightedNote ? 'lightgreen' : 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        ctx.font = 'bold 15px sans-serif';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(note, x, y);
        ctx.fillStyle = 'white';
        ctx.fillText(note, x, y);
      }
    }
  }
  if (
    question?.string !== undefined &&
    question?.fret !== undefined &&
    document.querySelector('input[name="mode"]:checked')?.value !== 'learn'  // ← 追加
  ) {
    drawNoteCircle(question.string, question.fret);  // 赤丸を再描画
  }  
}

window.highlightNote = function(note) {
  highlightedNote = note;
  drawFretboard();
};

function updateNoteButtonsVisibility() {
  const nextBtn = document.querySelector('button[onclick="newQuestion()"]');
  const mode = document.querySelector('input[name="mode"]:checked');
  if (!mode) return;

  // ✅ 「次の問題へ」ボタンだけ切り替える
  if (nextBtn) {
    nextBtn.style.display = mode.value === "learn" ? "none" : "inline-block";
  }
}

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', () => {
    updateNoteButtonsVisibility();
    newQuestion();
    drawFretboard();  // ここ追加
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const checkedRadio = document.querySelector('input[name="mode"]:checked');
  if (checkedRadio) {
    checkedRadio.dispatchEvent(new Event("change"));
  }
  drawFretboard();
  updateNoteButtonsVisibility();
});

document.getElementById('inlaySelect').addEventListener('change', () => {
  drawFretboard();
});

document.getElementById('fingerboardSelect').addEventListener('change', () => {
  rosewoodGrainDrawn = false;  // ✅ 別材質→ローズウッドに戻ったとき再描画を許可
  drawFretboard();
});

function drawDot(x, y, color, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function getNote(string, fret) {
  const openNote = OPEN_NOTES[string];
  const idx = (NOTE_NAMES_ALL.indexOf(openNote) + fret) % 12;
  return NOTE_NAMES_ALL[idx];
}

function drawNoteCircle(string, fret, color = 'red', radius = 8) {
  if (fret >= fretX.length - 1 || string >= stringCenters.length) return;
  const x = fret === 0
    ? fretX[0]
    : (fretX[fret - 1] + fretX[fret]) / 2;
  const y = stringCenters[string];
  drawDot(x, y, color, radius);
}

function drawAnswerCircle(string, fret, color = 'lightgreen', radius = 6) {
  if (fret >= fretX.length - 1 || string >= stringCenters.length) return;
  const x = fret === 0 ? fretX[0] : (fretX[fret - 1] + fretX[fret]) / 2;
  const y = stringCenters[string];
  const note = getNote(string, fret);

  ctx.beginPath();
  ctx.arc(x, y, 12, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.font = 'bold 15px sans-serif';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(note, x, y);
  ctx.fillStyle = 'white';
  ctx.fillText(note, x, y);
}

function getOctaveEquivalentPositions(string, fret) {
  const baseNote = getNote(string, fret);
  const result = [];
  for (let s = 0; s < stringCount; s++) {
    for (let f = 0; f < fretCount; f++) {
      if (getNote(s, f) === baseNote && !(s === string && f === fret)) {
        result.push({ string: s, fret: f });
      }
    }
  }
  return result;
}

function resetActiveButton() {
  document.querySelectorAll('.note-button').forEach(b => b.classList.remove('active'));
}

function newQuestion() {
  hasAnswered = false;
  resetActiveButton();
  const includeSharps = document.getElementById('includeSharps').checked;
  const allowedNotes = includeSharps ? NOTE_NAMES_ALL : NOTE_NAMES_WHITE;

  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode === 'learn') {
    drawFretboard();
    document.getElementById('question').textContent = '';
    document.getElementById('result').textContent = '';
    return;
  }

  let string, fret, note, octaveMatches;
  do {
    string = Math.floor(Math.random() * 6);
    fret = Math.floor(Math.random() * questionFretLimit);
    note = getNote(string, fret);
    octaveMatches = getOctaveEquivalentPositions(string, fret);
  } while (!allowedNotes.includes(note) || octaveMatches.length === 0);

  question = { string, fret, note, octaveMatches };

  drawFretboard();
  drawNoteCircle(string, fret);

  document.getElementById('question').textContent =
    mode === 'octave' ? `${string + 1}弦 ${fret}フレットと同じ音名の場所をクリック！`
    : mode === 'note' ? `${string + 1}弦 ${fret}フレットの音は？`
    : `${string + 1}弦 ${fret}フレットの完全5度の音は？`;

  document.getElementById('result').textContent = '';
}


canvas.addEventListener('click', function (e) {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode !== 'octave') return;

  const x = e.offsetX;
  const y = e.offsetY;

  let clickedString = -1;
  let clickedFret = -1;
  for (let s = 0; s < stringCount; s++) {
    for (let f = 0; f < fretCount; f++) {
      const b = hitboxes[s][f];
      if (x >= b.xMin && x < b.xMax && y >= b.yMin && y < b.yMax) {
        clickedString = s;
        clickedFret = f;
        break;
      }
    }
    if (clickedString !== -1) break;
  }

  if (clickedString < 0 || clickedFret < 0) return;

  const isCorrect = question.octaveMatches.some(
    (p) => p.string === clickedString && p.fret === clickedFret
  );

  drawNoteCircle(clickedString, clickedFret, isCorrect ? 'blue' : 'gray', 6);
  question.octaveMatches.forEach((p) => {
    drawAnswerCircle(p.string, p.fret);
  });

  document.getElementById('result').textContent = isCorrect ? '✅ 正解！' : '❌ 不正解…';
});

function createButtons() {
  const btns = document.getElementById('buttons');
  btns.innerHTML = '';
  const includeSharps = document.getElementById('includeSharps').checked;
  const notes = includeSharps ? NOTE_NAMES_ALL : NOTE_NAMES_WHITE;

  notes.forEach(note => {
    const btn = document.createElement('button');
    btn.textContent = note;
    btn.classList.add('note-button');

    btn.addEventListener('click', () => {
      const isActive = btn.classList.contains('active');
      const mode = document.querySelector('input[name="mode"]:checked')?.value;
    
      // すべてのボタンから active クラスを外す
      document.querySelectorAll('.note-button').forEach(b => b.classList.remove('active'));
    
      // ✅ 回答済みのとき、クイズモードでは何もできない
      if (mode !== 'learn' && hasAnswered) return;

      // ✅ もしすでに選択されていたら解除、それ以外なら選択
      if (!isActive) {
        btn.classList.add('active');
        if (mode === 'learn') {
          highlightNote(note);
        } else {
          checkAnswer(note);
        }
      } else {
        highlightNote(null); // 学習モードのとき選択解除で表示も消す
      }
    });    
    btns.appendChild(btn);
  });
}

const correctSound = new Audio('クイズ正解5.mp3');  
const wrongSound = new Audio('クイズ不正解2.mp3');

const reverb = new Tone.Reverb({
  decay: 1,
  preDelay: 0.01
}).toDestination();

const chorus = new Tone.Chorus(1, 1, 5).start();

const synth = new Tone.PluckSynth({
  attackNoise: 1,  // ノイズのアタック時間
  dampening: 3000,       // 音の減衰をゆるめる（小さいほど余韻長く）
  resonance: 1         // 余韻の強さ（1に近いほど深く鳴る）
}).chain(chorus, reverb);

function playNoteTone(noteWithOctave) {
  // 例: "E3", "C#4", "G2"
  synth.triggerAttackRelease(noteWithOctave, "8n");  // 八分音で再生
}

function checkAnswer(ans) {
  if (hasAnswered) return; // 二重クリック防止
  hasAnswered = true;
  
  if (ans === question.note) {
    correctSound.currentTime = 0;
    correctSound.play();
  } else {
    wrongSound.currentTime = 0;
    wrongSound.play();
  }

  const noteWithOctave = getNoteWithOctave(question.string, question.fret);
  playNoteTone(noteWithOctave);

  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode === 'learn') return;

  let correct = mode === 'fifth'
    ? NOTE_NAMES_ALL[(NOTE_NAMES_ALL.indexOf(question.note) + 7) % 12]
    : question.note;

  document.getElementById('result').textContent =
    ans === correct ? '✅ 正解！' : `❌ 不正解… 正解は ${correct}`;

  drawFretboard();
  drawNoteCircle(question.string, question.fret, 'red', 8);

  for (let string = 0; string < 6; string++) {
    for (let fret = 0; fret < fretCount; fret++) {
      if (getNote(string, fret) === correct) {
        drawAnswerCircle(string, fret);
      }
    }
  }

  highlightSelectedNote(ans);
}


function highlightAllSameNotes(note) {
  for (let string = 0; string < 6; string++) {
    for (let fret = 0; fret < fretCount; fret++) {
      if (getNote(string, fret) === note) {
        drawNoteCircle(string, fret, 'lightgreen', 6);
      }
    }
  }
}

document.getElementById('includeSharps').addEventListener('change', () => {
  createButtons();
  const mode = document.querySelector('input[name="mode"]:checked')?.value;
  if (mode === 'learn') {
    highlightNote(null); // リセット
    drawFretboard();
  } else {
    newQuestion();
  }
});
;

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', () => {
    highlightNote(null);
    newQuestion();
    resetActiveButton();
  });
});

createButtons();
newQuestion();
updateNoteButtonsVisibility();

document.body.addEventListener('click', async () => {
  if (Tone.context.state !== 'running') {
    await Tone.start();
    console.log("✅ Tone.js AudioContext started");
  }
}, { once: true });
