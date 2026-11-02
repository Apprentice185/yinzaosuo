/* ==========================================================================
   0. Context & State Initialization
   ========================================================================== */
const offscreenCanvas = document.getElementById('offscreenCanvas');
const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

const state = {
  paletteMode: '221',
  activePalette: MARD_221,
  maxColorsLimit: 0,
  boardType: 52,
  isGiant: false,
  gridSize: 52,

  enableOffset: false,
  offsetX: 0,
  offsetY: 0,
  
  h7OutlineLock: true,
  showPegboardBg: true,
  showLabelsOnBeads: true,
  highlightColorId: null,

  materialSortMode: 'qty',

  isEditMode: false,
  currentTool: 'brush',
  brushColor: H7_COLOR,
  history: [],

  zoom: 12,
  panX: 40,
  panY: 40,
  isDragging: false,
  isPainting: false,
  startX: 0,
  startY: 0,
  hoverCell: null,

  grid: null,
  gridWidth: 0,
  gridHeight: 0,
  colorStats: {},
  totalBeads: 0,
  effectiveWidth: 0,
  effectiveHeight: 0,
  sourceImage: null
};

/* ==========================================================================
   1. Board Definitions & Visual Schemas
   ========================================================================== */
const RING_COLORS = [
  "rgba(244, 182, 193, 0.45)",
  "rgba(250, 208, 218, 0.45)",
  "rgba(254, 224, 198, 0.45)",
  "rgba(254, 244, 198, 0.45)",
  "rgba(242, 248, 210, 0.45)",
  "rgba(220, 246, 228, 0.45)",
  "rgba(214, 242, 242, 0.45)",
  "rgba(224, 238, 254, 0.45)",
  "rgba(235, 230, 252, 0.45)",
  "rgba(245, 226, 245, 0.45)"
];

const RING_RGB = [
  [250, 222, 228],
  [252, 234, 239],
  [254, 241, 230],
  [254, 250, 230],
  [249, 252, 235],
  [239, 251, 243],
  [236, 249, 249],
  [241, 248, 254],
  [246, 243, 253],
  [250, 241, 250]
];

const BOARDS = {
  52: { totalPins: 52, corePins: 50, margin: 1, extendDash: false },
  78: { totalPins: 78, corePins: 70, margin: 4, extendDash: true },
  104: { totalPins: 104, corePins: 100, margin: 2, extendDash: true }
};

function getPartitionColor(bx, by) {
  const ringIndex = Math.max(bx, by);
  return RING_COLORS[ringIndex % RING_COLORS.length];
}

/* ==========================================================================
   2. Core Image Processing Algorithm (白底连通泛洪扣除 + 边缘二值化抗杂色)
   ========================================================================== */
function processImage() {
  if (!state.sourceImage) {
    generateDemo();
    return;
  }

  const targetW = state.gridSize;
  const targetH = state.gridSize;
  state.gridWidth = targetW;
  state.gridHeight = targetH;

  offscreenCanvas.width = targetW;
  offscreenCanvas.height = targetH;

  const img = state.sourceImage;
  const imgAspect = img.width / img.height;
  let dw, dh, dx, dy;
  if (imgAspect > 1) {
    dw = targetW;
    dh = Math.round(targetW / imgAspect);
    dx = 0;
    dy = Math.round((targetH - dh) / 2);
  } else {
    dh = targetH;
    dw = Math.round(targetH * imgAspect);
    dx = Math.round((targetW - dw) / 2);
    dy = 0;
  }

  offscreenCtx.clearRect(0, 0, targetW, targetH);

  // 关闭平滑插值：阻断羽化灰阶生成
  offscreenCtx.imageSmoothingEnabled = false;
  offscreenCtx.drawImage(img, dx, dy, dw, dh);

  const imgData = offscreenCtx.getImageData(0, 0, targetW, targetH);
  const d = imgData.data;

  // 四角背景采样自适应判定
  const cornerIndices = [0, targetW - 1, (targetH - 1) * targetW, (targetH - 1) * targetW + targetW - 1];
  let bgRSum = 0, bgGSum = 0, bgBSum = 0, bgSamples = 0;

  cornerIndices.forEach(idx => {
    const pIdx = idx * 4;
    if (d[pIdx + 3] > 100) {
      bgRSum += d[pIdx];
      bgGSum += d[pIdx + 1];
      bgBSum += d[pIdx + 2];
      bgSamples++;
    }
  });

  const refBgR = bgSamples > 0 ? bgRSum / bgSamples : 255;
  const refBgG = bgSamples > 0 ? bgGSum / bgSamples : 255;
  const refBgB = bgSamples > 0 ? bgBSum / bgSamples : 255;

  function isBgPixel(r, g, b, a) {
    if (a < 80) return true;
    const dist = Math.hypot(r - refBgR, g - refBgG, b - refBgB);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return dist < 32 || (lum > 246 && (Math.max(r, g, b) - Math.min(r, g, b) < 15));
  }

  // 四边界向内 BFS 泛洪
  const isOuterVoid = Array.from({ length: targetH }, () => new Uint8Array(targetW));
  const queue = [];

  function checkAndSeed(x, y) {
    const pIdx = (y * targetW + x) * 4;
    if (isBgPixel(d[pIdx], d[pIdx + 1], d[pIdx + 2], d[pIdx + 3])) {
      isOuterVoid[y][x] = 1;
      queue.push([x, y]);
    }
  }

  for (let x = 0; x < targetW; x++) {
    checkAndSeed(x, 0);
    if (targetH > 1) checkAndSeed(x, targetH - 1);
  }
  for (let y = 1; y < targetH - 1; y++) {
    checkAndSeed(0, y);
    if (targetW > 1) checkAndSeed(targetW - 1, y);
  }

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    for (let i = 0; i < 4; i++) {
      const nx = cx + dirs[i][0];
      const ny = cy + dirs[i][1];
      if (nx >= 0 && nx < targetW && ny >= 0 && ny < targetH && !isOuterVoid[ny][nx]) {
        const pIdx = (ny * targetW + nx) * 4;
        if (isBgPixel(d[pIdx], d[pIdx + 1], d[pIdx + 2], d[pIdx + 3])) {
          isOuterVoid[ny][nx] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }

  // 内部像素提取与暗部收紧
  const rawPixels = new Array(targetW * targetH);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = y * targetW + x;
      if (isOuterVoid[y][x]) {
        rawPixels[idx] = null;
        continue;
      }

      const pIdx = idx * 4;
      let r = d[pIdx];
      let g = d[pIdx + 1];
      let b = d[pIdx + 2];

      if (state.h7OutlineLock) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 64) {
          r = 0; g = 0; b = 0;
        }
      }

      rawPixels[idx] = { r, g, b, lab: rgbToLab(r, g, b) };
    }
  }

  // 颜色上限频次截断
  const baseOpaquePalette = state.paletteMode === '221' ? OPAQUE_PALETTE_221 : OPAQUE_PALETTE_291;
  let candidatePalette = baseOpaquePalette;

  if (state.maxColorsLimit > 0 && state.maxColorsLimit < baseOpaquePalette.length) {
    const freqMap = {};
    for (let i = 0; i < rawPixels.length; i++) {
      const p = rawPixels[i];
      if (!p) continue;

      if (p.r === 0 && p.g === 0 && p.b === 0) {
        freqMap['H7'] = (freqMap['H7'] || 0) + 1;
        continue;
      }

      let bestC = baseOpaquePalette[0];
      let bestDist = Infinity;
      for (let k = 0; k < baseOpaquePalette.length; k++) {
        const dist = deltaE(p.lab, baseOpaquePalette[k].lab);
        if (dist < bestDist) {
          bestDist = dist;
          bestC = baseOpaquePalette[k];
        }
      }
      freqMap[bestC.id] = (freqMap[bestC.id] || 0) + 1;
    }

    const sorted = Object.keys(freqMap)
      .sort((a, b) => freqMap[b] - freqMap[a])
      .map(id => baseOpaquePalette.find(c => c.id === id))
      .filter(Boolean);

    candidatePalette = sorted.slice(0, state.maxColorsLimit);
    if (!candidatePalette.some(c => c.id === 'H7')) {
      candidatePalette.push(H7_COLOR);
    }
  }

  // 初始赋值
  const grid = Array.from({ length: targetH }, () => new Array(targetW).fill(null));
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = y * targetW + x;
      const p = rawPixels[idx];
      if (!p) {
        grid[y][x] = null;
        continue;
      }

      if (state.h7OutlineLock && p.r === 0 && p.g === 0 && p.b === 0) {
        grid[y][x] = H7_COLOR;
        continue;
      }

      let bestColor = candidatePalette[0];
      let bestDist = Infinity;
      for (let k = 0; k < candidatePalette.length; k++) {
        const c = candidatePalette[k];
        const dist = deltaE(p.lab, c.lab);
        if (dist < bestDist) {
          bestDist = dist;
          bestColor = c;
        }
      }
      grid[y][x] = bestColor;
    }
  }

  // 邻域降噪平滑滤波（消除笔锋毛刺与孤立单像素）
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < targetH - 1; y++) {
      for (let x = 1; x < targetW - 1; x++) {
        const cur = grid[y][x];
        if (!cur) continue;

        const neighbors = [
          grid[y - 1][x],
          grid[y + 1][x],
          grid[y][x - 1],
          grid[y][x + 1]
        ].filter(Boolean);

        if (neighbors.length >= 3) {
          const sameCount = neighbors.filter(n => n.id === cur.id).length;
          if (sameCount === 0) {
            const neighborVotes = {};
            neighbors.forEach(n => {
              neighborVotes[n.id] = (neighborVotes[n.id] || 0) + 1;
            });
            let domId = null;
            let maxVotes = 0;
            for (const id in neighborVotes) {
              if (neighborVotes[id] > maxVotes) {
                maxVotes = neighborVotes[id];
                domId = id;
              }
            }
            if (domId && maxVotes >= 2) {
              const targetColor = candidatePalette.find(c => c.id === domId);
              if (targetColor) grid[y][x] = targetColor;
            }
          }
        }
      }
    }
  }

  // 封闭空洞填充 H1 透明豆支撑
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const pIdx = (y * targetW + x) * 4;
      const a = d[pIdx + 3];
      if (a < 50 && !isOuterVoid[y][x]) {
        grid[y][x] = H1_COLOR;
      }
    }
  }

  state.grid = grid;
  state.history = [];
  recalculateStats();
  renderCanvas();
}

/* ==========================================================================
   3. Helpers & Stats Calculation
   ========================================================================== */
function getEffectiveDimensions() {
  if (!state.grid || state.totalBeads === 0) {
    return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = state.gridWidth, minY = state.gridHeight, maxX = -1, maxY = -1;
  for (let y = 0; y < state.gridHeight; y++) {
    for (let x = 0; x < state.gridWidth; x++) {
      if (state.grid[y][x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1) return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return {
    width: (maxX - minX + 1),
    height: (maxY - minY + 1),
    minX, minY, maxX, maxY
  };
}

function getSortedColorIds() {
  const ids = Object.keys(state.colorStats);
  if (state.materialSortMode === 'series') {
    return ids.sort((a, b) => {
      const matchA = a.match(/^([A-Za-z]+)(\d+)$/);
      const matchB = b.match(/^([A-Za-z]+)(\d+)$/);
      if (matchA && matchB) {
        const letterCmp = matchA[1].localeCompare(matchB[1]);
        if (letterCmp !== 0) return letterCmp;
        return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
      }
      return a.localeCompare(b);
    });
  }
  return ids.sort((a, b) => state.colorStats[b] - state.colorStats[a]);
}

function recalculateStats() {
  const stats = {};
  let total = 0;
  if (state.grid) {
    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const bead = state.grid[y][x];
        if (bead) {
          stats[bead.id] = (stats[bead.id] || 0) + 1;
          total++;
        }
      }
    }
  }
  state.colorStats = stats;
  state.totalBeads = total;
  const eff = getEffectiveDimensions();
  state.effectiveWidth = eff.width;
  state.effectiveHeight = eff.height;
  updateStatsUI();
  renderMaterialList();
}

function generateDemo() {
  const size = state.gridSize;
  state.gridWidth = size;
  state.gridHeight = size;

  const grid = Array.from({ length: size }, () => new Array(size).fill(null));
  const outlineColor = state.activePalette.find(c => c.id === 'G8') || state.activePalette.find(c => c.id === 'G17') || H7_COLOR;
  const H2 = state.activePalette.find(c => c.id === 'H2') || H7_COLOR;
  const G12 = state.activePalette.find(c => c.id === 'G12') || state.activePalette.find(c => c.id === 'A13') || outlineColor;
  const G10 = state.activePalette.find(c => c.id === 'G10') || state.activePalette.find(c => c.id === 'G7') || outlineColor;
  const E2 = state.activePalette.find(c => c.id === 'E2') || state.activePalette.find(c => c.id === 'E1') || H2;
  const B4 = state.activePalette.find(c => c.id === 'B4') || state.activePalette.find(c => c.id === 'B2') || outlineColor;
  const F3 = state.activePalette.find(c => c.id === 'F3') || state.activePalette.find(c => c.id === 'F2') || outlineColor;
  const A8 = state.activePalette.find(c => c.id === 'A8') || state.activePalette.find(c => c.id === 'A5') || outlineColor;

  const catAscii = [
    "................................",
    "....XXXX............XXXX........",
    "...XGGGGX..........XGGGGX.......",
    "..XGGPPDDX........XGGPPDDX......",
    "..XGPPPDDX........XGPPPDDX......",
    "..XGGPDDDXXXXXXXXXXGGPDDDX......",
    ".XGGGGGGGGGGGGGGGGGGGGGGGGX.....",
    ".XGGDDGGGGGGGGGGGGGGGGDDGGX.....",
    "XGGDDGGGGGGGGGGGGGGGGGGDDGGX....",
    "XGGGGGGGGGGGGGGGGGGGGGGGGGGX....",
    "XGGGGWWWWWWWWWWWWWWWWGGGGGGX....",
    "XGGGWWWWWWWWWWWWWWWWWWGGGGGX....",
    "XGGWWXEEWWWWWWWWWWXEEWWGGGGX....",
    "XGGWWXEEWWWWWWWWWWXEEWWGGGGX....",
    "XGGWWWWWWWWWWPPWWWWWWWWGGGGX....",
    ".XGGWWWWWWWWWWWWWWWWWWGGGGX.....",
    ".XGGPPWWWWWWWWWWWWWWPPGGGGX.....",
    "..XGGGWWWWWWWWWWWWWWGGGGGX......",
    "...XGGGGWWWWWWWWWWGGGGGGX.......",
    "....XXXXRRRRRRRRRRXXXXXX........",
    ".......XRRRRRYYRRRRX...XDDX.....",
    "......XGGGGGRYYRGGGGX..XDDGX....",
    ".....XGGGGGGGRRGGGGGGX.XGGGX....",
    "....XGGGGGGGGWWGGGGGGGXGGGGX....",
    "....XGGGGGGGGWWGGGGGGGXGGGGX....",
    "...XGGGGGGGGWWWWGGGGGGXGGGGX....",
    "...XGGGGGGGGWWWWGGGGGGXGGGX.....",
    "...XWWWWWWWWWWWWWWWWWWXXXX......",
    "...XWWXWWWWWWWWWWWWXWWX.........",
    "....XXXX..XXXXXXXX..XXXX........",
    "................................",
    "................................"
  ];

  const catH = catAscii.length;
  const catW = catAscii[0].length;
  const startX = Math.max(0, Math.floor((size - catW) / 2));
  const startY = Math.max(0, Math.floor((size - catH) / 2));

  for (let y = 0; y < catH; y++) {
    for (let x = 0; x < catW; x++) {
      const char = catAscii[y][x];
      const gy = startY + y;
      const gx = startX + x;
      if (gy >= size || gx >= size) continue;

      if (char === 'X') grid[gy][gx] = outlineColor;
      else if (char === 'G') grid[gy][gx] = G12;
      else if (char === 'D') grid[gy][gx] = G10;
      else if (char === 'W') grid[gy][gx] = H2;
      else if (char === 'P') grid[gy][gx] = E2;
      else if (char === 'E') grid[gy][gx] = B4;
      else if (char === 'R') grid[gy][gx] = F3;
      else if (char === 'Y') grid[gy][gx] = A8;
    }
  }

  state.grid = grid;
  state.history = [];
  recalculateStats();
  renderCanvas();
}

function updateStatsUI() {
  const effW = state.effectiveWidth || state.gridWidth;
  const effH = state.effectiveHeight || state.gridHeight;
  document.getElementById('patternDimPill').innerText = `${effW} × ${effH}`;
  document.getElementById('patternPalettePill').innerText = `Mard-${state.paletteMode}`;
  document.getElementById('patternTotalPill').innerText = `${state.totalBeads} 颗豆子`;

  const bSize = state.boardType;
  const offX = state.enableOffset ? state.offsetX : 0;
  const offY = state.enableOffset ? state.offsetY : 0;
  const extentX = Math.max(bSize, offX + state.gridWidth);
  const extentY = Math.max(bSize, offY + state.gridHeight);
  const boardsX = Math.ceil(extentX / bSize);
  const boardsY = Math.ceil(extentY / bSize);
  const totalBoards = boardsX * boardsY;
  const boardPlanPill = document.getElementById('boardPlanPill');
  if (totalBoards > 1) {
    boardPlanPill.innerText = `${boardsX}×${boardsY} 共${totalBoards}块板 (${bSize}钉)`;
  } else {
    boardPlanPill.innerText = `1 块板 (${bSize}钉)`;
  }

  const distinct = Object.keys(state.colorStats).length;
  document.getElementById('materialCountLabel').innerText = `${distinct} 种用色 (${state.totalBeads} 颗)`;
}

/* ==========================================================================
   4. Material List UI
   ========================================================================== */
function renderMaterialList() {
  const materialList = document.getElementById('materialList');
  materialList.innerHTML = '';
  const sorted = getSortedColorIds();

  if (sorted.length === 0) {
    materialList.innerHTML = `<span class="text-gray-400 text-xs">暂无用料数据</span>`;
    return;
  }

  sorted.forEach(id => {
    const count = state.colorStats[id];
    const color = state.activePalette.find(c => c.id === id);
    if (!color) return;

    const isLight = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) > 155;
    const isHighlight = state.highlightColorId === id;

    const item = document.createElement('div');
    item.className = `flex flex-col items-center justify-center shrink-0 w-12 cursor-pointer transition select-none ${
      isHighlight ? 'scale-110 drop-shadow' : 'opacity-90 hover:opacity-100'
    }`;

    item.innerHTML = `
      <div class="w-11 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs shadow-2xs border border-black/10"
           style="background-color: ${color.hex}; color: ${isLight ? '#1D1D1F' : '#FFFFFF'};">
        ${id}
      </div>
      <span class="text-[11px] font-mono text-gray-700 font-medium mt-1">x${count}</span>
    `;

    item.addEventListener('click', () => {
      setBrushColor(color);
      if (state.highlightColorId === id) {
        state.highlightColorId = null;
      } else {
        state.highlightColorId = id;
        showToast(`已选择画笔色号 ${id}`);
      }
      renderMaterialList();
      renderCanvas();
    });

    materialList.appendChild(item);
  });
}

/* ==========================================================================
   5. Interactive Canvas & Pegboard Renderer
   ========================================================================== */
const beadCanvas = document.getElementById('beadCanvas');
const ctx = beadCanvas.getContext('2d');
const viewport = document.getElementById('viewport');

function resizeCanvas() {
  const rect = viewport.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  beadCanvas.width = rect.width * dpr;
  beadCanvas.height = rect.height * dpr;
  beadCanvas.style.width = `${rect.width}px`;
  beadCanvas.style.height = `${rect.height}px`;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);
  renderCanvas();
}

function resetView() {
  const rect = viewport.getBoundingClientRect();
  const bSize = state.boardType;
  const offX = state.enableOffset ? state.offsetX : 0;
  const offY = state.enableOffset ? state.offsetY : 0;
  const extentX = Math.max(bSize, offX + state.gridWidth);
  const extentY = Math.max(bSize, offY + state.gridHeight);
  const boardsX = Math.ceil(extentX / bSize);
  const boardsY = Math.ceil(extentY / bSize);
  const totalSpanX = boardsX * bSize;
  const totalSpanY = boardsY * bSize;

  const cell = Math.min((rect.width - 60) / totalSpanX, (rect.height - 60) / totalSpanY);
  state.zoom = Math.max(3, cell);
  state.panX = (rect.width - totalSpanX * state.zoom) / 2;
  state.panY = (rect.height - totalSpanY * state.zoom) / 2;
  renderCanvas();
}

function drawSinglePegboard(ctx, startX, startY, bSize, cfg, labelText) {
  const margin = cfg.margin;
  const numBlocks = Math.ceil(cfg.corePins / 10);

  ctx.save();
  ctx.translate(startX, startY);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, bSize, bSize);

  if (state.showPegboardBg) {
    for (let by = 0; by < numBlocks; by++) {
      for (let bx = 0; bx < numBlocks; bx++) {
        ctx.fillStyle = getPartitionColor(bx, by);
        ctx.fillRect(margin + bx * 10, margin + by * 10, 10, 10);
      }
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(80, 70, 70, 0.28)";
    ctx.font = "bold 4px -apple-system, sans-serif";

    for (let i = 0; i < numBlocks; i++) {
      const num = (i + 1).toString();
      ctx.fillText(num, margin + i * 10 + 5, margin + 4.5);
      if (i > 0) {
        ctx.fillText(num, margin + 5, margin + i * 10 + 4.5);
      }
    }
    ctx.restore();
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  for (let y = 0; y < bSize; y++) {
    for (let x = 0; x < bSize; x++) {
      ctx.beginPath();
      ctx.arc(x + 0.5, y + 0.5, 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const lineStart = cfg.extendDash ? 0 : margin;
  const lineEnd = cfg.extendDash ? bSize : (margin + cfg.corePins);

  ctx.strokeStyle = "rgba(40, 110, 200, 0.65)";
  ctx.lineWidth = 0.08;
  ctx.setLineDash([0.4, 0.25]);

  for (let i = margin + 5; i < margin + cfg.corePins; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, lineStart);
    ctx.lineTo(i, lineEnd);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lineStart, i);
    ctx.lineTo(lineEnd, i);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(20, 90, 175, 0.85)";
  ctx.lineWidth = 0.1;

  for (let i = 0; i <= numBlocks; i++) {
    const p = margin + i * 10;
    if (p > bSize) continue;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, bSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(bSize, p);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(20, 90, 175, 0.55)";
  ctx.lineWidth = 0.18;
  ctx.strokeRect(0, 0, bSize, bSize);

  if (labelText) {
    ctx.fillStyle = "rgba(0, 113, 227, 0.75)";
    ctx.font = "bold 2.2px 'SF Pro Display', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(labelText, 0.8, 0.8);
  }

  ctx.restore();
}

function renderCanvas() {
  const rect = viewport.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  const bSize = state.boardType;
  const cfg = BOARDS[bSize] || { totalPins: bSize, corePins: bSize, margin: 0, extendDash: true };
  
  const offX = state.enableOffset ? state.offsetX : 0;
  const offY = state.enableOffset ? state.offsetY : 0;
  const extentX = Math.max(bSize, offX + state.gridWidth);
  const extentY = Math.max(bSize, offY + state.gridHeight);
  const boardsX = Math.ceil(extentX / bSize);
  const boardsY = Math.ceil(extentY / bSize);
  const isMultiBoard = boardsX > 1 || boardsY > 1;

  for (let by = 0; by < boardsY; by++) {
    for (let bx = 0; bx < boardsX; bx++) {
      const label = isMultiBoard ? `板 ${bx + 1}-${by + 1}` : null;
      drawSinglePegboard(ctx, bx * bSize, by * bSize, bSize, cfg, label);
    }
  }

  if (state.grid) {
    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const bead = state.grid[y][x];
        if (!bead) continue;

        const drawX = offX + x;
        const drawY = offY + y;

        const isMatch = !state.highlightColorId || state.highlightColorId === bead.id;
        ctx.save();
        ctx.globalAlpha = isMatch ? 1.0 : 0.2;

        const pad = 0.06;

        if (bead.id === 'H1') {
          ctx.fillStyle = "rgba(225, 235, 245, 0.42)";
          ctx.beginPath();
          ctx.roundRect(drawX + pad, drawY + pad, 1 - pad * 2, 1 - pad * 2, 0.16);
          ctx.fill();

          ctx.strokeStyle = "rgba(100, 140, 180, 0.55)";
          ctx.lineWidth = 0.05;
          ctx.stroke();

          ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
          ctx.beginPath();
          ctx.arc(drawX + 0.5, drawY + 0.5, 0.18, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = bead.hex;
          ctx.beginPath();
          ctx.roundRect(drawX + pad, drawY + pad, 1 - pad * 2, 1 - pad * 2, 0.16);
          ctx.fill();

          ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
          ctx.beginPath();
          ctx.arc(drawX + 0.5, drawY + 0.5, 0.18, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = bead.hex;
          ctx.beginPath();
          ctx.arc(drawX + 0.5, drawY + 0.5, 0.11, 0, Math.PI * 2);
          ctx.fill();
        }

        if (state.showLabelsOnBeads && state.zoom >= 18) {
          const isLight = bead.id === 'H1' || ((0.299 * bead.r + 0.587 * bead.g + 0.114 * bead.b) > 155);
          ctx.fillStyle = isLight ? "#1D1D1F" : "#FFFFFF";
          ctx.font = `bold ${state.zoom >= 26 ? '0.28px' : '0.23px'} 'SF Mono', monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(bead.id, drawX + 0.5, drawY + 0.5);
        }

        ctx.restore();
      }
    }
  }

  ctx.save();
  ctx.strokeStyle = "rgba(29, 29, 31, 0.75)";
  ctx.lineWidth = 0.1;
  ctx.strokeRect(offX, offY, state.gridWidth, state.gridHeight);
  ctx.restore();

  if (state.isEditMode && state.hoverCell) {
    const { x, y } = state.hoverCell;
    if (x >= 0 && x < state.gridWidth && y >= 0 && y < state.gridHeight) {
      ctx.strokeStyle = state.currentTool === 'eraser' ? "#FF3B30" : "#0071E3";
      ctx.lineWidth = 0.12;
      ctx.strokeRect(offX + x, offY + y, 1, 1);
    }
  }

  ctx.restore();
}

/* ==========================================================================
   6. Touch, Pan, Zoom & Manual Edit Actions
   ========================================================================== */
function recordHistory() {
  if (!state.grid) return;
  const snapshot = state.grid.map(row => [...row]);
  state.history.push(snapshot);
  if (state.history.length > 25) {
    state.history.shift();
  }
}

function undoLastAction() {
  if (!state.history.length) {
    showToast('暂无撤销记录');
    return;
  }
  state.grid = state.history.pop();
  recalculateStats();
  renderCanvas();
  showToast('已撤销');
}

function applyToolAt(cx, cy) {
  if (!state.isEditMode) return;
  if (!state.grid || cx < 0 || cx >= state.gridWidth || cy < 0 || cy >= state.gridHeight) return;

  if (state.currentTool === 'eyedropper') {
    const picked = state.grid[cy][cx];
    if (picked) {
      setBrushColor(picked);
      setTool('brush');
      showToast(`已吸取色号: ${picked.id}`);
    }
    return;
  }

  const targetBead = state.currentTool === 'eraser' ? null : state.brushColor;
  if (state.grid[cy][cx] !== targetBead) {
    state.grid[cy][cx] = targetBead;
    recalculateStats();
    renderCanvas();
  }
}

function setBrushColor(colorObj) {
  state.brushColor = colorObj;
  document.getElementById('activeBrushSwatch').style.backgroundColor = colorObj.hex;
  document.getElementById('activeBrushId').innerText = colorObj.id;
}

function setTool(toolName) {
  state.currentTool = toolName;
  ['toolBrushBtn', 'toolEraserBtn', 'toolEyedropperBtn'].forEach(id => {
    document.getElementById(id).className = "py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-1.5 transition";
  });

  if (toolName === 'brush') {
    document.getElementById('toolBrushBtn').className = "py-1.5 rounded-lg border border-apple-blue bg-blue-50 text-apple-blue font-medium flex items-center justify-center gap-1.5 transition";
  } else if (toolName === 'eraser') {
    document.getElementById('toolEraserBtn').className = "py-1.5 rounded-lg border border-red-500 bg-red-50 text-red-600 font-medium flex items-center justify-center gap-1.5 transition";
  } else if (toolName === 'eyedropper') {
    document.getElementById('toolEyedropperBtn').className = "py-1.5 rounded-lg border border-purple-500 bg-purple-50 text-purple-600 font-medium flex items-center justify-center gap-1.5 transition";
  }
}

function toggleEditMode() {
  state.isEditMode = !state.isEditMode;
  const section = document.getElementById('manualEditSection');
  const indicator = document.getElementById('editModeIndicator');
  const btn = document.getElementById('toggleEditModeBtn');
  const btnText = document.getElementById('toggleEditBtnText');
  const panel = document.getElementById('brushToolsPanel');
  const viewportEl = document.getElementById('viewport');

  if (state.isEditMode) {
    section.classList.remove('bg-gray-50', 'border-gray-200/60');
    section.classList.add('bg-blue-50/40', 'border-apple-blue/50');
    indicator.innerText = '微调中';
    indicator.className = 'px-1.5 py-0.5 rounded text-[10px] font-semibold bg-apple-blue text-white animate-pulse';
    btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-apple-blue text-white hover:bg-apple-hoverBlue transition flex items-center gap-1 shadow-xs';
    btnText.innerText = '完成退出';
    panel.classList.remove('opacity-50', 'pointer-events-none');
    viewportEl.style.cursor = 'crosshair';
    showToast('已进入手动微调模式');
  } else {
    section.classList.add('bg-gray-50', 'border-gray-200/60');
    section.classList.remove('bg-blue-50/40', 'border-apple-blue/50');
    indicator.innerText = '已锁定';
    indicator.className = 'px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600';
    btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition flex items-center gap-1';
    btnText.innerText = '开启微调';
    panel.classList.add('opacity-50', 'pointer-events-none');
    viewportEl.style.cursor = '';
    state.hoverCell = null;
    renderCanvas();
    showToast('已退出并锁定画面');
  }
}

viewport.addEventListener('mousedown', (e) => {
  if (state.isEditMode && e.button === 0 && !e.altKey && !e.shiftKey) {
    const rect = viewport.getBoundingClientRect();
    const offX = state.enableOffset ? state.offsetX : 0;
    const offY = state.enableOffset ? state.offsetY : 0;
    const mx = (e.clientX - rect.left - state.panX) / state.zoom;
    const my = (e.clientY - rect.top - state.panY) / state.zoom;
    const cx = Math.floor(mx) - offX;
    const cy = Math.floor(my) - offY;

    if (cx >= 0 && cx < state.gridWidth && cy >= 0 && cy < state.gridHeight) {
      state.isPainting = true;
      recordHistory();
      applyToolAt(cx, cy);
      return;
    }
  }

  state.isDragging = true;
  state.startX = e.clientX - state.panX;
  state.startY = e.clientY - state.panY;
});

window.addEventListener('mousemove', (e) => {
  if (state.isDragging) {
    state.panX = e.clientX - state.startX;
    state.panY = e.clientY - state.startY;
    renderCanvas();
    return;
  }

  if (!state.isEditMode) return;

  const rect = viewport.getBoundingClientRect();
  const offX = state.enableOffset ? state.offsetX : 0;
  const offY = state.enableOffset ? state.offsetY : 0;
  const mx = (e.clientX - rect.left - state.panX) / state.zoom;
  const my = (e.clientY - rect.top - state.panY) / state.zoom;
  const cx = Math.floor(mx) - offX;
  const cy = Math.floor(my) - offY;

  if (state.isPainting) {
    applyToolAt(cx, cy);
  }

  if (cx >= 0 && cx < state.gridWidth && cy >= 0 && cy < state.gridHeight) {
    state.hoverCell = { x: cx, y: cy };
    renderCanvas();
  } else if (state.hoverCell) {
    state.hoverCell = null;
    renderCanvas();
  }
});

window.addEventListener('mouseup', () => {
  state.isDragging = false;
  state.isPainting = false;
});

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.15 : 0.87;
  const newZoom = Math.min(80, Math.max(3, state.zoom * factor));

  state.panX = mx - (mx - state.panX) * (newZoom / state.zoom);
  state.panY = my - (my - state.panY) * (newZoom / state.zoom);
  state.zoom = newZoom;
  renderCanvas();
}, { passive: false });

let touchDist = 0;
viewport.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    if (state.isEditMode) {
      const rect = viewport.getBoundingClientRect();
      const offX = state.enableOffset ? state.offsetX : 0;
      const offY = state.enableOffset ? state.offsetY : 0;
      const mx = (e.touches[0].clientX - rect.left - state.panX) / state.zoom;
      const my = (e.touches[0].clientY - rect.top - state.panY) / state.zoom;
      const cx = Math.floor(mx) - offX;
      const cy = Math.floor(my) - offY;

      if (cx >= 0 && cx < state.gridWidth && cy >= 0 && cy < state.gridHeight) {
        state.isPainting = true;
        recordHistory();
        applyToolAt(cx, cy);
        return;
      }
    }
    state.isDragging = true;
    state.startX = e.touches[0].clientX - state.panX;
    state.startY = e.touches[0].clientY - state.panY;
  } else if (e.touches.length === 2) {
    state.isDragging = false;
    state.isPainting = false;
    touchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
});

viewport.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (e.touches.length === 1) {
    if (state.isEditMode && state.isPainting) {
      const rect = viewport.getBoundingClientRect();
      const offX = state.enableOffset ? state.offsetX : 0;
      const offY = state.enableOffset ? state.offsetY : 0;
      const mx = (e.touches[0].clientX - rect.left - state.panX) / state.zoom;
      const my = (e.touches[0].clientY - rect.top - state.panY) / state.zoom;
      applyToolAt(Math.floor(mx) - offX, Math.floor(my) - offY);
    } else if (state.isDragging) {
      state.panX = e.touches[0].clientX - state.startX;
      state.panY = e.touches[0].clientY - state.startY;
      renderCanvas();
    }
  } else if (e.touches.length === 2) {
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const factor = d / touchDist;
    state.zoom = Math.min(80, Math.max(3, state.zoom * factor));
    touchDist = d;
    renderCanvas();
  }
}, { passive: false });

viewport.addEventListener('touchend', () => {
  state.isDragging = false;
  state.isPainting = false;
});

/* ==========================================================================
   7. Export Engine (PNG & Vector PDF)
   ========================================================================== */
function renderHighResCanvas() {
  const expCanvas = document.getElementById('exportCanvas');
  const expCtx = expCanvas.getContext('2d');

  const cols = state.gridWidth;
  const rows = state.gridHeight;
  const bSize = state.boardType;
  const cfg = BOARDS[bSize] || { totalPins: bSize, corePins: bSize, margin: 0, extendDash: true };

  const offX = state.enableOffset ? state.offsetX : 0;
  const offY = state.enableOffset ? state.offsetY : 0;
  const extentX = Math.max(bSize, offX + cols);
  const extentY = Math.max(bSize, offY + rows);
  const boardsX = Math.ceil(extentX / bSize);
  const boardsY = Math.ceil(extentY / bSize);
  const totalBoards = boardsX * boardsY;
  const totalPinsX = boardsX * bSize;
  const totalPinsY = boardsY * bSize;

  const sorted = getSortedColorIds();
  const effW = state.effectiveWidth || cols;
  const effH = state.effectiveHeight || rows;

  const cellPx = 36;
  const rulerPx = 54;
  const margin = 70;
  const canvasBoardW = totalPinsX * cellPx;
  const canvasBoardH = totalPinsY * cellPx;

  const headerH = 180;

  let cardsPerRow = 10;
  if (bSize === 104) cardsPerRow = 20;
  else if (bSize === 78) cardsPerRow = 15;
  else cardsPerRow = 10;

  const availWidth = canvasBoardW;
  const gapX = Math.max(8, Math.floor(availWidth * 0.012));
  const cardW = Math.max(64, Math.floor((availWidth - gapX * (cardsPerRow - 1)) / cardsPerRow));
  const cardH = Math.round(cardW * 0.88);
  const gapY = Math.max(12, Math.floor(cardH * 0.22));

  const cardRows = Math.ceil(sorted.length / cardsPerRow);
  const footerH = Math.max(200, cardRows * (cardH + gapY) + 80);

  const totalW = canvasBoardW + rulerPx + margin * 2;
  const totalH = headerH + canvasBoardH + rulerPx + footerH;

  expCanvas.width = totalW;
  expCanvas.height = totalH;

  expCtx.fillStyle = "#FFFFFF";
  expCtx.fillRect(0, 0, totalW, totalH);

  expCtx.fillStyle = "#1D1D1F";
  expCtx.font = "bold 72px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
  expCtx.textAlign = "center";
  expCtx.textBaseline = "middle";

  const boardDesc = totalBoards > 1 ? `${totalBoards}块板 (${bSize}钉)` : `1块板 (${bSize}钉)`;
  const headerTitle = `${effW} × ${effH}   ·   Mard-${state.paletteMode}   ·   ${boardDesc}   ·   ${state.totalBeads} 颗豆子`;
  expCtx.fillText(headerTitle, totalW / 2, 90);

  const startX = margin + rulerPx;
  const startY = headerH + rulerPx;

  expCtx.fillStyle = "#86868B";
  expCtx.font = "bold 16px 'SF Mono', monospace";
  expCtx.textAlign = "center";
  expCtx.textBaseline = "middle";

  for (let x = 0; x < totalPinsX; x++) {
    if ((x + 1) % 5 === 0 || x === 0) {
      expCtx.fillText((x + 1).toString(), startX + x * cellPx + cellPx / 2, startY - 22);
    }
  }
  for (let y = 0; y < totalPinsY; y++) {
    if ((y + 1) % 5 === 0 || y === 0) {
      expCtx.fillText((y + 1).toString(), startX - 26, startY + y * cellPx + cellPx / 2);
    }
  }

  for (let by = 0; by < boardsY; by++) {
    for (let bx = 0; bx < boardsX; bx++) {
      const bxPx = startX + bx * bSize * cellPx;
      const byPx = startY + by * bSize * cellPx;

      expCtx.save();
      expCtx.translate(bxPx, byPx);

      expCtx.fillStyle = "#FFFFFF";
      expCtx.fillRect(0, 0, bSize * cellPx, bSize * cellPx);

      const numBlocks = Math.ceil(cfg.corePins / 10);
      if (state.showPegboardBg) {
        for (let r = 0; r < numBlocks; r++) {
          for (let c = 0; c < numBlocks; c++) {
            expCtx.fillStyle = getPartitionColor(c, r);
            expCtx.fillRect((cfg.margin + c * 10) * cellPx, (cfg.margin + r * 10) * cellPx, 10 * cellPx, 10 * cellPx);
          }
        }

        expCtx.save();
        expCtx.textAlign = "center";
        expCtx.textBaseline = "middle";
        expCtx.fillStyle = "rgba(80, 70, 70, 0.28)";
        expCtx.font = `bold ${cellPx * 3.8}px -apple-system, sans-serif`;

        for (let i = 0; i < numBlocks; i++) {
          const num = (i + 1).toString();
          expCtx.fillText(num, (cfg.margin + i * 10 + 5) * cellPx, (cfg.margin + 4.5) * cellPx);
          if (i > 0) {
            expCtx.fillText(num, (cfg.margin + 5) * cellPx, (cfg.margin + i * 10 + 4.5) * cellPx);
          }
        }
        expCtx.restore();
      }

      expCtx.fillStyle = "rgba(0, 0, 0, 0.08)";
      for (let py = 0; py < bSize; py++) {
        for (let px = 0; px < bSize; px++) {
          expCtx.beginPath();
          expCtx.arc((px + 0.5) * cellPx, (py + 0.5) * cellPx, cellPx * 0.16, 0, Math.PI * 2);
          expCtx.fill();
        }
      }

      const lineStart = (cfg.extendDash ? 0 : cfg.margin) * cellPx;
      const lineEnd = (cfg.extendDash ? bSize : (cfg.margin + cfg.corePins)) * cellPx;

      expCtx.strokeStyle = "rgba(40, 110, 200, 0.65)";
      expCtx.lineWidth = 1.8;
      expCtx.setLineDash([8, 6]);

      for (let i = cfg.margin + 5; i < cfg.margin + cfg.corePins; i += 10) {
        const pos = i * cellPx;
        expCtx.beginPath();
        expCtx.moveTo(pos, lineStart);
        expCtx.lineTo(pos, lineEnd);
        expCtx.stroke();

        expCtx.beginPath();
        expCtx.moveTo(lineStart, pos);
        expCtx.lineTo(lineEnd, pos);
        expCtx.stroke();
      }

      expCtx.setLineDash([]);
      expCtx.strokeStyle = "rgba(20, 90, 175, 0.85)";
      expCtx.lineWidth = 2.4;

      for (let i = 0; i <= numBlocks; i++) {
        const pos = (cfg.margin + i * 10) * cellPx;
        if (pos > bSize * cellPx) continue;
        expCtx.beginPath();
        expCtx.moveTo(pos, 0);
        expCtx.lineTo(pos, bSize * cellPx);
        expCtx.stroke();

        expCtx.beginPath();
        expCtx.moveTo(0, pos);
        expCtx.lineTo(bSize * cellPx, pos);
        expCtx.stroke();
      }

      expCtx.strokeStyle = "rgba(20, 90, 175, 0.55)";
      expCtx.lineWidth = 3.6;
      expCtx.strokeRect(0, 0, bSize * cellPx, bSize * cellPx);

      if (totalBoards > 1) {
        expCtx.fillStyle = "rgba(0, 113, 227, 0.75)";
        expCtx.font = `bold ${cellPx * 2.2}px 'SF Pro Display', sans-serif`;
        expCtx.textAlign = "left";
        expCtx.textBaseline = "top";
        expCtx.fillText(`板 ${bx + 1}-${by + 1}`, 18, 18);
      }

      expCtx.restore();
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const bead = state.grid[y][x];
      if (!bead) continue;

      const px = startX + (offX + x) * cellPx;
      const py = startY + (offY + y) * cellPx;
      const pad = cellPx * 0.06;

      if (bead.id === 'H1') {
        expCtx.fillStyle = "rgba(235, 240, 248, 0.65)";
        expCtx.beginPath();
        expCtx.roundRect(px + pad, py + pad, cellPx - pad * 2, cellPx - pad * 2, 6);
        expCtx.fill();

        expCtx.strokeStyle = "rgba(120, 150, 190, 0.75)";
        expCtx.lineWidth = 1.4;
        expCtx.stroke();

        expCtx.fillStyle = "rgba(0, 0, 0, 0.16)";
        expCtx.beginPath();
        expCtx.arc(px + cellPx / 2, py + cellPx / 2, cellPx * 0.18, 0, Math.PI * 2);
        expCtx.fill();
      } else {
        expCtx.fillStyle = bead.hex;
        expCtx.beginPath();
        expCtx.roundRect(px + pad, py + pad, cellPx - pad * 2, cellPx - pad * 2, 6);
        expCtx.fill();

        expCtx.fillStyle = "rgba(0, 0, 0, 0.16)";
        expCtx.beginPath();
        expCtx.arc(px + cellPx / 2, py + cellPx / 2, cellPx * 0.18, 0, Math.PI * 2);
        expCtx.fill();

        expCtx.fillStyle = bead.hex;
        expCtx.beginPath();
        expCtx.arc(px + cellPx / 2, py + cellPx / 2, cellPx * 0.11, 0, Math.PI * 2);
        expCtx.fill();
      }

      const isLight = bead.id === 'H1' || ((0.299 * bead.r + 0.587 * bead.g + 0.114 * bead.b) > 155);
      expCtx.fillStyle = isLight ? "#1D1D1F" : "#FFFFFF";
      expCtx.font = "bold 13px 'SF Mono', monospace";
      expCtx.textAlign = "center";
      expCtx.textBaseline = "middle";
      expCtx.fillText(bead.id, px + cellPx / 2, py + cellPx / 2);
    }
  }

  expCtx.strokeStyle = "rgba(29, 29, 31, 0.85)";
  expCtx.lineWidth = 2.8;
  expCtx.strokeRect(startX + offX * cellPx, startY + offY * cellPx, cols * cellPx, rows * cellPx);

  const footerY = startY + canvasBoardH + 45;
  const swatchH = Math.round(cardH * 0.62);

  sorted.forEach((id, idx) => {
    const count = state.colorStats[id];
    const color = state.activePalette.find(c => c.id === id);
    if (!color) return;

    const rIdx = Math.floor(idx / cardsPerRow);
    const cIdx = idx % cardsPerRow;
    const cx = startX + cIdx * (cardW + gapX);
    const cy = footerY + rIdx * (cardH + gapY);

    const isLight = color.id === 'H1' || ((0.299 * color.r + 0.587 * color.g + 0.114 * color.b) > 155);

    if (color.id === 'H1') {
      expCtx.fillStyle = "rgba(240, 244, 250, 0.9)";
      expCtx.beginPath();
      expCtx.roundRect(cx, cy, cardW, swatchH, 8);
      expCtx.fill();
      expCtx.strokeStyle = "rgba(120, 150, 190, 0.8)";
      expCtx.lineWidth = 1.6;
      expCtx.stroke();
    } else {
      expCtx.fillStyle = color.hex;
      expCtx.beginPath();
      expCtx.roundRect(cx, cy, cardW, swatchH, 8);
      expCtx.fill();
    }

    expCtx.fillStyle = isLight ? "#1D1D1F" : "#FFFFFF";
    expCtx.font = `bold ${Math.round(cardW * 0.26)}px 'SF Mono', monospace`;
    expCtx.textAlign = "center";
    expCtx.textBaseline = "middle";
    expCtx.fillText(id, cx + cardW / 2, cy + swatchH / 2);

    expCtx.fillStyle = "#1D1D1F";
    expCtx.font = `bold ${Math.round(cardW * 0.22)}px 'SF Mono', monospace`;
    expCtx.fillText(`x${count}`, cx + cardW / 2, cy + swatchH + (cardH - swatchH) * 0.62);
  });

  return expCanvas;
}

function exportVectorPDF() {
  showToast('正在生成纯矢量 PDF...');
  const { jsPDF } = window.jspdf;

  const cols = state.gridWidth;
  const rows = state.gridHeight;
  const bSize = state.boardType;
  const cfg = BOARDS[bSize] || { totalPins: bSize, corePins: bSize, margin: 0, extendDash: true };

  const offX = state.enableOffset ? state.offsetX : 0;
  const offY = state.enableOffset ? state.offsetY : 0;
  const extentX = Math.max(bSize, offX + cols);
  const extentY = Math.max(bSize, offY + rows);
  const boardsX = Math.ceil(extentX / bSize);
  const boardsY = Math.ceil(extentY / bSize);
  const totalBoards = boardsX * boardsY;
  const totalPinsX = boardsX * bSize;
  const totalPinsY = boardsY * bSize;

  const sorted = getSortedColorIds();
  const effW = state.effectiveWidth || cols;
  const effH = state.effectiveHeight || rows;

  const cellPt = 16;
  const rulerPt = 26;
  const marginPt = 36;
  const canvasBoardW = totalPinsX * cellPt;
  const canvasBoardH = totalPinsY * cellPt;

  const headerH = 80;

  let cardsPerRow = 10;
  if (bSize === 104) cardsPerRow = 20;
  else if (bSize === 78) cardsPerRow = 15;
  else cardsPerRow = 10;

  const availWidth = canvasBoardW;
  const gapX = Math.max(4, Math.floor(availWidth * 0.012));
  const cardW = Math.max(28, (availWidth - gapX * (cardsPerRow - 1)) / cardsPerRow);
  const cardH = cardW * 0.88;
  const gapY = Math.max(6, cardH * 0.25);

  const cardRows = Math.ceil(sorted.length / cardsPerRow);
  const footerH = Math.max(100, cardRows * (cardH + gapY) + 40);

  const pageW = canvasBoardW + rulerPt + marginPt * 2;
  const pageH = headerH + canvasBoardH + rulerPt + footerH;

  const pdf = new jsPDF({
    orientation: pageW > pageH ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pageW, pageH]
  });

  const titleCanvas = document.createElement('canvas');
  titleCanvas.width = Math.round(pageW * 3);
  titleCanvas.height = Math.round(headerH * 3);
  const tCtx = titleCanvas.getContext('2d');
  tCtx.scale(3, 3);
  tCtx.fillStyle = "#1D1D1F";
  tCtx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
  tCtx.textAlign = "center";
  tCtx.textBaseline = "middle";

  const boardDesc = totalBoards > 1 ? `${totalBoards}块板 (${bSize}钉)` : `1块板 (${bSize}钉)`;
  const headerTitle = `${effW} × ${effH}   ·   Mard-${state.paletteMode}   ·   ${boardDesc}   ·   ${state.totalBeads} 颗豆子`;
  tCtx.fillText(headerTitle, pageW / 2, headerH / 2);

  pdf.addImage(titleCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, headerH);

  const startX = marginPt + rulerPt;
  const startY = headerH + rulerPt;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(134, 134, 139);

  for (let x = 0; x < totalPinsX; x++) {
    if ((x + 1) % 5 === 0 || x === 0) {
      pdf.text((x + 1).toString(), startX + x * cellPt + cellPt / 2, startY - 8, { align: 'center', baseline: 'bottom' });
    }
  }
  for (let y = 0; y < totalPinsY; y++) {
    if ((y + 1) % 5 === 0 || y === 0) {
      pdf.text((y + 1).toString(), startX - 8, startY + y * cellPt + cellPt / 2 + 1, { align: 'right', baseline: 'middle' });
    }
  }

  for (let by = 0; by < boardsY; by++) {
    for (let bx = 0; bx < boardsX; bx++) {
      const bxPt = startX + bx * bSize * cellPt;
      const byPt = startY + by * bSize * cellPt;

      pdf.setFillColor(255, 255, 255);
      pdf.rect(bxPt, byPt, bSize * cellPt, bSize * cellPt, 'F');

      const numBlocks = Math.ceil(cfg.corePins / 10);
      if (state.showPegboardBg) {
        for (let r = 0; r < numBlocks; r++) {
          for (let c = 0; c < numBlocks; c++) {
            const ringIdx = Math.max(c, r);
            const rgb = RING_RGB[ringIdx % RING_RGB.length];
            pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
            pdf.rect(bxPt + (cfg.margin + c * 10) * cellPt, byPt + (cfg.margin + r * 10) * cellPt, 10 * cellPt, 10 * cellPt, 'F');
          }
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(cellPt * 3.2);
        pdf.setTextColor(215, 205, 205);
        for (let i = 0; i < numBlocks; i++) {
          const num = (i + 1).toString();
          pdf.text(num, bxPt + (cfg.margin + i * 10 + 5) * cellPt, byPt + (cfg.margin + 6.8) * cellPt, { align: 'center' });
          if (i > 0) {
            pdf.text(num, bxPt + (cfg.margin + 5) * cellPt, byPt + (cfg.margin + i * 10 + 6.8) * cellPt, { align: 'center' });
          }
        }
      }

      pdf.setFillColor(220, 224, 230);
      for (let py = 0; py < bSize; py++) {
        for (let px = 0; px < bSize; px++) {
          pdf.circle(bxPt + (px + 0.5) * cellPt, byPt + (py + 0.5) * cellPt, cellPt * 0.14, 'F');
        }
      }

      pdf.setDrawColor(40, 110, 200);
      pdf.setLineWidth(0.65);
      const lineStart = cfg.extendDash ? 0 : cfg.margin * cellPt;
      const lineEnd = (cfg.extendDash ? bSize : (cfg.margin + cfg.corePins)) * cellPt;

      for (let i = cfg.margin + 5; i < cfg.margin + cfg.corePins; i += 10) {
        const p = i * cellPt;
        const step = 4;
        for (let l = lineStart; l < lineEnd; l += step * 2) {
          const segEnd = Math.min(l + step, lineEnd);
          pdf.line(bxPt + p, byPt + l, bxPt + p, byPt + segEnd);
          pdf.line(bxPt + l, byPt + p, bxPt + segEnd, byPt + p);
        }
      }

      pdf.setDrawColor(20, 90, 175);
      pdf.setLineWidth(1.2);
      for (let i = 0; i <= numBlocks; i++) {
        const p = (cfg.margin + i * 10) * cellPt;
        if (p > bSize * cellPt) continue;
        pdf.line(bxPt + p, byPt, bxPt + p, byPt + bSize * cellPt);
        pdf.line(bxPt, byPt + p, bxPt + bSize * cellPt, byPt + p);
      }

      pdf.setDrawColor(20, 90, 175);
      pdf.setLineWidth(1.8);
      pdf.rect(bxPt, byPt, bSize * cellPt, bSize * cellPt, 'S');

      if (totalBoards > 1) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 113, 227);
        pdf.text(`Board ${bx + 1}-${by + 1}`, bxPt + 6, byPt + 10);
      }
    }
  }

  pdf.setFont('courier', 'bold');
  pdf.setFontSize(cellPt * 0.46);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const bead = state.grid[y][x];
      if (!bead) continue;

      const px = startX + (offX + x) * cellPt;
      const py = startY + (offY + y) * cellPt;

      if (bead.id === 'H1') {
        pdf.setFillColor(242, 246, 252);
        pdf.setDrawColor(120, 160, 200);
        pdf.setLineWidth(0.6);
        pdf.roundedRect(px + 0.6, py + 0.6, cellPt - 1.2, cellPt - 1.2, 1.8, 1.8, 'FD');
        pdf.setTextColor(29, 29, 31);
      } else {
        pdf.setFillColor(bead.r, bead.g, bead.b);
        pdf.roundedRect(px + 0.6, py + 0.6, cellPt - 1.2, cellPt - 1.2, 1.8, 1.8, 'F');

        const isLight = (0.299 * bead.r + 0.587 * bead.g + 0.114 * bead.b) > 155;
        if (isLight) {
          pdf.setTextColor(29, 29, 31);
        } else {
          pdf.setTextColor(255, 255, 255);
        }
      }
      pdf.text(bead.id, px + cellPt / 2, py + cellPt / 2 + 1.8, { align: 'center', baseline: 'middle' });
    }
  }

  pdf.setDrawColor(29, 29, 31);
  pdf.setLineWidth(1.8);
  pdf.rect(startX + offX * cellPt, startY + offY * cellPt, cols * cellPt, rows * cellPt, 'S');

  const footerY = startY + canvasBoardH + 28;
  const swatchH = cardH * 0.62;

  pdf.setFont('courier', 'bold');

  sorted.forEach((id, idx) => {
    const count = state.colorStats[id];
    const color = state.activePalette.find(c => c.id === id);
    if (!color) return;

    const rIdx = Math.floor(idx / cardsPerRow);
    const cIdx = idx % cardsPerRow;
    const cx = startX + cIdx * (cardW + gapX);
    const cy = footerY + rIdx * (cardH + gapY);

    if (color.id === 'H1') {
      pdf.setFillColor(242, 246, 252);
      pdf.setDrawColor(120, 160, 200);
      pdf.setLineWidth(0.8);
      pdf.roundedRect(cx, cy, cardW, swatchH, 3, 3, 'FD');
      pdf.setTextColor(29, 29, 31);
    } else {
      pdf.setFillColor(color.r, color.g, color.b);
      pdf.roundedRect(cx, cy, cardW, swatchH, 3, 3, 'F');

      const isLight = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) > 155;
      if (isLight) {
        pdf.setTextColor(29, 29, 31);
      } else {
        pdf.setTextColor(255, 255, 255);
      }
    }

    pdf.setFontSize(Math.max(7, cardW * 0.25));
    pdf.text(id, cx + cardW / 2, cy + swatchH / 2 + 1.5, { align: 'center', baseline: 'middle' });

    pdf.setFontSize(Math.max(6.5, cardW * 0.22));
    pdf.setTextColor(40, 40, 45);
    pdf.text(`x${count}`, cx + cardW / 2, cy + swatchH + (cardH - swatchH) * 0.65, { align: 'center', baseline: 'middle' });
  });

  const exportFileName = `${state.paletteMode}色-${effW}X${effH}-${state.totalBeads}.pdf`;
  pdf.save(exportFileName);
  showToast('矢量 PDF 导出成功！');
}

/* ==========================================================================
   8. Global Event Listeners & Bootstrapping
   ========================================================================== */
const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('dropZone');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imageActiveState = document.getElementById('imageActiveState');
const imageThumb = document.getElementById('imageThumb');
const imageName = document.getElementById('imageName');
const removeImageBtn = document.getElementById('removeImageBtn');

dropZone.addEventListener('click', (e) => {
  if (e.target.closest('#removeImageBtn')) return;
  imageInput.click();
});
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('border-apple-blue', 'bg-blue-50/40');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-apple-blue', 'bg-blue-50/40'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-apple-blue', 'bg-blue-50/40');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
imageInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.sourceImage = img;
      imageName.innerText = file.name;
      imageThumb.src = e.target.result;
      uploadPlaceholder.classList.add('hidden');
      imageActiveState.classList.remove('hidden');
      processImage();
      resetView();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

removeImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  state.sourceImage = null;
  imageInput.value = '';
  imageThumb.src = '';
  imageActiveState.classList.add('hidden');
  uploadPlaceholder.classList.remove('hidden');
  generateDemo();
  resetView();
});

const sortQtyBtn = document.getElementById('sortQtyBtn');
const sortSeriesBtn = document.getElementById('sortSeriesBtn');

sortQtyBtn.addEventListener('click', () => {
  state.materialSortMode = 'qty';
  sortQtyBtn.className = "px-2 py-0.5 rounded-md font-medium text-[10px] transition bg-white text-gray-900 shadow-2xs";
  sortSeriesBtn.className = "px-2 py-0.5 rounded-md font-medium text-[10px] transition text-gray-500 hover:text-gray-800";
  renderMaterialList();
  showToast('用料已按用量排序');
});

sortSeriesBtn.addEventListener('click', () => {
  state.materialSortMode = 'series';
  sortSeriesBtn.className = "px-2 py-0.5 rounded-md font-medium text-[10px] transition bg-white text-gray-900 shadow-2xs";
  sortQtyBtn.className = "px-2 py-0.5 rounded-md font-medium text-[10px] transition text-gray-500 hover:text-gray-800";
  renderMaterialList();
  showToast('用料已按系列排序');
});

const palette221Btn = document.getElementById('palette221Btn');
const palette291Btn = document.getElementById('palette291Btn');

palette221Btn.addEventListener('click', () => {
  state.paletteMode = '221';
  state.activePalette = MARD_221;
  palette221Btn.className = "py-1 rounded-lg font-medium text-center transition bg-white text-gray-900 shadow-xs";
  palette291Btn.className = "py-1 rounded-lg font-medium text-center transition text-gray-500 hover:text-gray-900";
  processImage();
});

palette291Btn.addEventListener('click', () => {
  state.paletteMode = '291';
  state.activePalette = MARD_291;
  palette291Btn.className = "py-1 rounded-lg font-medium text-center transition bg-white text-gray-900 shadow-xs";
  palette221Btn.className = "py-1 rounded-lg font-medium text-center transition text-gray-500 hover:text-gray-900";
  processImage();
});

const colorLimitBtns = document.querySelectorAll('.color-limit-btn');
const colorLimitSlider = document.getElementById('colorLimitSlider');
const maxColorsVal = document.getElementById('maxColorsVal');
const sliderValDisplay = document.getElementById('sliderValDisplay');

colorLimitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.val, 10);
    state.maxColorsLimit = val;
    maxColorsVal.innerText = val === 0 ? '不限' : `${val} 色`;
    sliderValDisplay.innerText = val === 0 ? '全' : val;
    colorLimitSlider.value = val === 0 ? 100 : val;

    colorLimitBtns.forEach(b => {
      b.className = "color-limit-btn py-1 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50";
    });
    btn.className = "color-limit-btn py-1 rounded border border-apple-blue bg-blue-50 text-apple-blue font-medium";

    processImage();
  });
});

colorLimitSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  if (val >= 100) {
    state.maxColorsLimit = 0;
    maxColorsVal.innerText = '不限';
    sliderValDisplay.innerText = '全';
  } else {
    state.maxColorsLimit = val;
    maxColorsVal.innerText = `${val} 色`;
    sliderValDisplay.innerText = val;
  }
  colorLimitBtns.forEach(b => {
    b.className = "color-limit-btn py-1 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50";
  });
  processImage();
});

const giantToggle = document.getElementById('giantToggle');
const gridSizeSlider = document.getElementById('gridSizeSlider');
const gridSizeLabel = document.getElementById('gridSizeLabel');
const minGridText = document.getElementById('minGridText');
const maxGridText = document.getElementById('maxGridText');

giantToggle.addEventListener('change', (e) => {
  state.isGiant = e.target.checked;
  if (state.isGiant) {
    gridSizeSlider.min = "104";
    gridSizeSlider.max = "500";
    gridSizeSlider.step = "1";
    gridSizeSlider.value = "104";
    minGridText.innerText = "104";
    maxGridText.innerText = "500";
  } else {
    gridSizeSlider.min = "20";
    gridSizeSlider.max = "104";
    gridSizeSlider.step = "1";
    gridSizeSlider.value = "52";
    minGridText.innerText = "20";
    maxGridText.innerText = "104";
  }
  const val = parseInt(gridSizeSlider.value, 10);
  gridSizeLabel.innerText = val;
  state.gridSize = val;
  processImage();
  resetView();
});

gridSizeSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  gridSizeLabel.innerText = val;
  state.gridSize = val;
  processImage();
});

const offsetToggle = document.getElementById('offsetToggle');
const offsetInputsContainer = document.getElementById('offsetInputsContainer');
const offsetXInput = document.getElementById('offsetXInput');
const offsetYInput = document.getElementById('offsetYInput');

offsetToggle.addEventListener('change', (e) => {
  state.enableOffset = e.target.checked;
  if (state.enableOffset) {
    offsetInputsContainer.classList.remove('hidden');
    offsetInputsContainer.classList.add('grid');
  } else {
    offsetInputsContainer.classList.add('hidden');
    offsetInputsContainer.classList.remove('grid');
  }
  renderCanvas();
});

offsetXInput.addEventListener('input', (e) => {
  state.offsetX = Math.max(0, parseInt(e.target.value, 10) || 0);
  renderCanvas();
});

offsetYInput.addEventListener('input', (e) => {
  state.offsetY = Math.max(0, parseInt(e.target.value, 10) || 0);
  renderCanvas();
});

document.getElementById('toggleEditModeBtn').addEventListener('click', toggleEditMode);

const boardBtns = document.querySelectorAll('.board-type-btn');
boardBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.board, 10);
    state.boardType = val;

    boardBtns.forEach(b => {
      b.className = "board-type-btn py-2 px-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-center transition";
    });
    btn.className = "board-type-btn py-2 px-1 rounded-xl border border-apple-blue bg-blue-50/50 text-apple-blue font-semibold text-center transition";

    updateStatsUI();
    renderCanvas();
    resetView();
  });
});

document.getElementById('toolBrushBtn').addEventListener('click', () => setTool('brush'));
document.getElementById('toolEraserBtn').addEventListener('click', () => setTool('eraser'));
document.getElementById('toolEyedropperBtn').addEventListener('click', () => setTool('eyedropper'));
document.getElementById('undoBtn').addEventListener('click', undoLastAction);

const replaceColorBtn = document.getElementById('replaceColorBtn');
const replaceColorDropdown = document.getElementById('replaceColorDropdown');
const replaceColorGrid = document.getElementById('replaceColorGrid');
const closeReplaceBtn = document.getElementById('closeReplaceBtn');

function openReplaceDropdown() {
  const activeIds = Object.keys(state.colorStats).filter(id => id !== state.brushColor.id);
  replaceColorGrid.innerHTML = '';

  if (activeIds.length === 0) {
    replaceColorGrid.innerHTML = `<span class="text-[10px] text-gray-400 col-span-4 py-2 text-center">暂无其他可替换颜色</span>`;
  } else {
    activeIds.forEach(id => {
      const col = state.activePalette.find(c => c.id === id);
      if (!col) return;
      const isLight = (0.299 * col.r + 0.587 * col.g + 0.114 * col.b) > 155;
      const btn = document.createElement('button');
      btn.className = "flex flex-col items-center justify-center p-1 rounded-md border border-gray-200 hover:border-apple-blue hover:scale-105 transition";
      btn.innerHTML = `
        <div class="w-full h-5 rounded flex items-center justify-center font-mono font-bold text-[10px]" style="background-color: ${col.hex}; color: ${isLight ? '#1D1D1F' : '#FFFFFF'};">
          ${id}
        </div>
        <span class="text-[9px] text-gray-500 font-mono mt-0.5">x${state.colorStats[id]}</span>
      `;
      btn.addEventListener('click', () => {
        replaceColorInGrid(id, state.brushColor);
        replaceColorDropdown.classList.add('hidden');
      });
      replaceColorGrid.appendChild(btn);
    });
  }

  replaceColorDropdown.classList.remove('hidden');
}

function replaceColorInGrid(fromId, toColor) {
  if (!state.grid) return;
  recordHistory();
  let replacedCount = 0;
  for (let y = 0; y < state.gridHeight; y++) {
    for (let x = 0; x < state.gridWidth; x++) {
      if (state.grid[y][x] && state.grid[y][x].id === fromId) {
        state.grid[y][x] = toColor;
        replacedCount++;
      }
    }
  }
  recalculateStats();
  renderCanvas();
  showToast(`已将 ${replacedCount} 颗 ${fromId} 替换为 ${toColor.id}`);
}

replaceColorBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (replaceColorDropdown.classList.contains('hidden')) {
    openReplaceDropdown();
  } else {
    replaceColorDropdown.classList.add('hidden');
  }
});

closeReplaceBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  replaceColorDropdown.classList.add('hidden');
});

window.addEventListener('click', (e) => {
  if (!e.target.closest('#replaceColorDropdown') && !e.target.closest('#replaceColorBtn')) {
    replaceColorDropdown.classList.add('hidden');
  }
});

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undoLastAction();
  }
});

document.getElementById('h7OutlineLock').addEventListener('change', (e) => {
  state.h7OutlineLock = e.target.checked;
  processImage();
});
document.getElementById('showPegboardBgToggle').addEventListener('change', (e) => {
  state.showPegboardBg = e.target.checked;
  renderCanvas();
});
document.getElementById('showLabelsOnBeadsToggle').addEventListener('change', (e) => {
  state.showLabelsOnBeads = e.target.checked;
  renderCanvas();
});

document.getElementById('zoomInBtn').addEventListener('click', () => {
  state.zoom = Math.min(80, state.zoom * 1.25);
  renderCanvas();
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
  state.zoom = Math.max(3, state.zoom * 0.8);
  renderCanvas();
});
document.getElementById('fitViewBtn').addEventListener('click', resetView);
document.getElementById('resetViewBtn').addEventListener('click', resetView);

const sidebar = document.getElementById('sidebar');
document.getElementById('toggleSidebarBtn').addEventListener('click', () => {
  sidebar.classList.toggle('-translate-x-full');
});

const exportDropdownBtn = document.getElementById('exportDropdownBtn');
const exportMenu = document.getElementById('exportMenu');
exportDropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle('hidden');
});
window.addEventListener('click', () => exportMenu.classList.add('hidden'));

document.getElementById('exportPngBtn').addEventListener('click', () => {
  showToast('正在生成超高清大图...');
  setTimeout(() => {
    const c = renderHighResCanvas();
    const a = document.createElement('a');
    const effW = state.effectiveWidth || state.gridWidth;
    const effH = state.effectiveHeight || state.gridHeight;
    a.download = `${state.paletteMode}色-${effW}X${effH}-${state.totalBeads}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
    showToast('高清 PNG 已下载！');
  }, 50);
});

document.getElementById('exportPdfBtn').addEventListener('click', exportVectorPDF);

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.remove('opacity-0', 'translate-y-2');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
  }, 2000);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  generateDemo();
  resetView();
});