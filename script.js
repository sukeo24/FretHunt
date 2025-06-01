// JavaScript部分（script.js）
const canvas = document.getElementById('fretboard');
const ctx = canvas.getContext('2d');

const dpr = window.devicePixelRatio || 1;
const cssWidth = 1000;
const cssHeight = 240;
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
const startX = 100;
const startY = stringSpacing;
let fretX = [], fretCenters = [], stringCenters = [], hitboxes = [];
let question = {};

function drawFretboard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  fretX = [startX];
  let fw = 70, scale = 0.9439;
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

  const maxX = fretX[fretX.length - 1];
  const gradient = ctx.createLinearGradient(startX, 0, maxX, 0);
  gradient.addColorStop(0, '#deb887');
  gradient.addColorStop(1, '#d2b48c');
  ctx.fillStyle = gradient;
  ctx.fillRect(startX, startY, maxX - startX, stringSpacing * (stringCount - 1));

  for (let i = 0; i < stringCount; i++) {
    const y = stringCenters[i];
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.fillText(`${i + 1}弦`, startX - 50, y + 5);
  }

  for (let i = 0; i < fretX.length; i++) {
    ctx.beginPath();
    ctx.moveTo(fretX[i], startY);
    ctx.lineTo(fretX[i], startY + (stringCount - 1) * stringSpacing);
    ctx.strokeStyle = 'black';
    ctx.stroke();
  }
  

  ctx.beginPath();
  ctx.moveTo(fretX[0] - 2, startY);
  ctx.lineTo(fretX[0] - 2, startY + (stringCount - 1) * stringSpacing);
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.lineWidth = 1;

  [3, 5, 7, 9, 12, 15, 17, 19, 21, 24].forEach(f => {
    if (f < fretCount) {
      const x = fretCenters[f];
      const ySet = (f === 12 || f === 24) ? [1.5, 3.5] : [2.5];
      ySet.forEach(offset => {
        drawDot(x, startY + offset * stringSpacing, 'black', 5);
      });
    }
  });
}

function updateNoteButtonsVisibility() {
  const noteButtonsDiv = document.getElementById("noteButtons");
  const mode = document.querySelector('input[name="mode"]:checked');
  if (!noteButtonsDiv || !mode) return;
  noteButtonsDiv.style.display = mode.value === "octave" ? "none" : "flex";
}


document.addEventListener("DOMContentLoaded", function () {
  drawFretboard();
  updateNoteButtonsVisibility();
  const checkedRadio = document.querySelector('input[name="mode"]:checked');
  if (checkedRadio) {
    checkedRadio.dispatchEvent(new Event("change"));
  }
});

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', () => {
    updateNoteButtonsVisibility();  // ←これ必須！
    newQuestion();
  });
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

function drawDot(x, y, color, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawAnswerCircle(string, fret, color = 'lightgreen', radius = 6) {
  drawNoteCircle(string, fret, color, radius);
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

function newQuestion() {
  const includeSharps = document.getElementById('includeSharps').checked;
  const allowedNotes = includeSharps ? NOTE_NAMES_ALL : NOTE_NAMES_WHITE;

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

  const mode = document.querySelector('input[name="mode"]:checked').value;
  document.getElementById('question').textContent =
    mode === 'octave' ? `${string + 1}弦 ${fret}フレットと同じ音名の場所をクリック！`
    : mode === 'note' ? `${string + 1}弦 ${fret}フレットの音は？`
    : `${string + 1}弦 ${fret}フレットの対応5度の音は？`;

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
    btn.onclick = () => checkAnswer(note);
    btns.appendChild(btn);
  });
}

function checkAnswer(ans) {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  let correct = mode === 'fifth'
    ? NOTE_NAMES_ALL[(NOTE_NAMES_ALL.indexOf(question.note) + 7) % 12]
    : question.note;
  document.getElementById('result').textContent =
    ans === correct ? '✅ 正解！' : `❌ 不正解… 正解は ${correct}`;
  highlightAllSameNotes(correct);
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
  newQuestion();
});

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', () => {
    newQuestion();
  });
});

createButtons();
newQuestion();
updateNoteButtonsVisibility();












