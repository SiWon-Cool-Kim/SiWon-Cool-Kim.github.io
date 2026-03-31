import { Shader, readShaderFile } from './shader.js';

const canvas = document.getElementById('glcanvas');
const info = document.getElementById('info');
const gl = canvas.getContext('webgl2');
const axisBuffer = gl.createBuffer();


if (!gl) {
  alert('WebGL2 is not supported.');
  throw new Error('WebGL2 not supported');
}

let shader = null;

// 상태
let phase = 'circle'; // circle -> line -> done

let isDragging = false;
let dragStart = null;
let dragCurrent = null;

// 원 정보
let circle = null; 
// { center:[x,y], radius:number, vertices:Float32Array }

// 선분 정보
let segment = null;
// { p0:[x,y], p1:[x,y] }

// 교점 정보
let intersections = [];

// GPU 버퍼
const circleBuffer = gl.createBuffer();
const lineBuffer = gl.createBuffer();
const pointBuffer = gl.createBuffer();

// 1) 처음 실행했을 때, canvas의 크기는 700 x 700 이어야 합니다.
canvas.width = 700;
canvas.height = 700;
gl.viewport(0, 0, canvas.width, canvas.height);

function updateInfo() {
  let text = '';

  // 1. 원을 드래그 중일 때: 원 정보 미리보기
  if (phase === 'circle' && isDragging && dragStart && dragCurrent) {
    const r = dist2(dragStart, dragCurrent);
    text =
      `Circle: center (${fmt(dragStart[0])}, ${fmt(dragStart[1])}), ` +
      `radius = ${fmt(r)}`;
  }

  // 2. 원이 확정되고, 아직 직선을 그리기 전일 때
  else if (circle && phase === 'line' && !isDragging) {
    text =
      `Circle: center (${fmt(circle.center[0])}, ${fmt(circle.center[1])}), ` +
      `radius = ${fmt(circle.radius)}`;
  }

  // 3. 직선을 드래그 중일 때: 직선 정보 미리보기
  else if (phase === 'line' && isDragging && dragStart && dragCurrent) {
    text =
      `Circle: center (${fmt(circle.center[0])}, ${fmt(circle.center[1])}), ` +
      `radius = ${fmt(circle.radius)}\n`+
      `Line segment: (${fmt(dragStart[0])}, ${fmt(dragStart[1])}) ~ ` +
      `(${fmt(dragCurrent[0])}, ${fmt(dragCurrent[1])})`;
  }

  // 4. 직선까지 확정된 뒤: 직선 + 교점 정보 표시
  else if (segment) {
    const Text =
      `Circle: center (${fmt(circle.center[0])}, ${fmt(circle.center[1])}), ` +
      `radius = ${fmt(circle.radius)}\n`+
      `Line segment: (${fmt(segment.p0[0])}, ${fmt(segment.p0[1])}) ~ ` +
      `(${fmt(segment.p1[0])}, ${fmt(segment.p1[1])})`;

    let intersectionText = '';

    if (intersections.length === 0) {intersectionText = 'No intersection';}
    else {
       const pts = intersections
    .map((p, i) => `Point ${i + 1}: (${fmt(p[0])}, ${fmt(p[1])})`)
    .join(', ');

  intersectionText = `Intersection Points: ${intersections.length} ${pts}`;
}
    text = `${Text}\n${intersectionText}`;
  }

  // 5. 초기 상태 : 아무것도 없음 
 

  info.textContent = text;
}

function fmt(v) {
  return Number(v).toFixed(2);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist2(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function toNDC(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
  const y = 1 - ((event.clientY - rect.top) / canvas.height) * 2;
  return [x, y];
}

function buildCircleVertices(center, radius, segments = 256) {
  const arr = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2.0;
    const x = center[0] + radius * Math.cos(t);
    const y = center[1] + radius * Math.sin(t);
    arr.push(x, y, 0.0);
  }
  return new Float32Array(arr);
}

// 선분과 원의 교차 계산
function computeSegmentCircleIntersections(c, r, p0, p1) {
  const x1 = p0[0] - c[0];
  const y1 = p0[1] - c[1];
  const x2 = p1[0] - c[0];
  const y2 = p1[1] - c[1];

  const dx = x2 - x1;
  const dy = y2 - y1;

  const a = dx * dx + dy * dy;
  const b = 2.0 * (x1 * dx + y1 * dy);
  const cc = x1 * x1 + y1 * y1 - r * r;

  const eps = 1e-8;
  const result = [];

  if (a < eps) {
    return result;
  }

  const disc = b * b - 4.0 * a * cc;

  if (disc < -eps) {
    return result;
  }

  if (Math.abs(disc) <= eps) {
    const t = -b / (2.0 * a);
    if (t >= 0.0 && t <= 1.0) {
      result.push([
        p0[0] + t * (p1[0] - p0[0]),
        p0[1] + t * (p1[1] - p0[1]),
      ]);
    }
    return result;
  }

  const sqrtD = Math.sqrt(disc);
  const t1 = (-b - sqrtD) / (2.0 * a);
  const t2 = (-b + sqrtD) / (2.0 * a);

  if (t1 >= 0.0 && t1 <= 1.0) {
    result.push([
      p0[0] + t1 * (p1[0] - p0[0]),
      p0[1] + t1 * (p1[1] - p0[1]),
    ]);
  }

  if (t2 >= 0.0 && t2 <= 1.0) {
    const p = [
      p0[0] + t2 * (p1[0] - p0[0]),
      p0[1] + t2 * (p1[1] - p0[1]),
    ];

    if (
      result.length === 0 ||
      Math.abs(result[0][0] - p[0]) > eps ||
      Math.abs(result[0][1] - p[1]) > eps
    ) {
      result.push(p);
    }
  }

  return result;
}

function uploadCircle() {
  if (!circle) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, circle.vertices, gl.STATIC_DRAW);
}

function uploadLine() {
  if (!segment) return;
  const data = new Float32Array([
    segment.p0[0], segment.p0[1], 0.0,
    segment.p1[0], segment.p1[1], 0.0,
  ]);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

function uploadPoints() {
  if (!intersections || intersections.length === 0) return;
  const arr = [];
  for (const p of intersections) {
    arr.push(p[0], p[1], 0.0);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
}

function drawBuffer(buffer, count, mode, color) {
  shader.use();
  shader.setVec4('u_color', color);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  gl.drawArrays(mode, 0, count);
}



function renderPreview() {
  if (!isDragging || !dragStart || !dragCurrent) return;

  if (phase === 'circle') {
    const r = dist2(dragStart, dragCurrent);
    const verts = buildCircleVertices(dragStart, r, 256);

    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

    drawBuffer(circleBuffer, verts.length / 3, gl.LINE_STRIP,[1.0, 0.2, 0.8, 1.0] );
  } else if (phase === 'line') {
    const verts = new Float32Array([
      dragStart[0], dragStart[1], 0.0,
      dragCurrent[0], dragCurrent[1], 0.0,
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

    drawBuffer(lineBuffer, 2, gl.LINES, [0.7, 0.8, 1.0, 1.0] );
  }
}

function drawAxes() {
  const margin = 0.95;

  const vertices = new Float32Array([
    -margin, 0.0, 0.0,
     margin, 0.0, 0.0,

     0.0, -margin, 0.0,
     0.0,  margin, 0.0,
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, axisBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  shader.use();

  // X축 (빨간색)
  shader.setVec4('u_color', [1.0, 0.2, 0.2, 1.0]);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  gl.drawArrays(gl.LINES, 0, 2);

  // Y축 (초록색)
  shader.setVec4('u_color', [0.2, 1.0, 0.2, 1.0]);
  gl.drawArrays(gl.LINES, 2, 2);
}

function render() {
  gl.clearColor(0.03, 0.175, 0.27, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (circle) {
    drawBuffer(circleBuffer, circle.vertices.length / 3, gl.LINE_STRIP, [0.8, 0.2, 0.7, 1.0]);
  }

  if (segment) {
    drawBuffer(lineBuffer, 2, gl.LINES, [0.7, 0.8, 1.0, 1.0] );
  }

  if (intersections.length > 0) {
    // 5) Intersection point의 size는 10.0으로 하며,
    //    vertex shader의 main() 안에서 gl_PointSize = 10.0; 과 같이 크기를 정의합니다.
    drawBuffer(pointBuffer, intersections.length, gl.POINTS, [1.0, 1.0, 0.0, 1.0]);
  }

  renderPreview();
  requestAnimationFrame(render);
  drawAxes();
}

function resetAll() {
  phase = 'circle';
  isDragging = false;
  dragStart = null;
  dragCurrent = null;
  circle = null;
  segment = null;
  intersections = [];
  updateInfo();
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;

  if (phase === 'done') {
    return;
  }

  isDragging = true;
  dragStart = toNDC(e);
  dragCurrent = dragStart;
  updateInfo();
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  dragCurrent = toNDC(e);
  updateInfo();
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button !== 0 || !isDragging) return;

  isDragging = false;
  dragCurrent = toNDC(e);

  if (phase === 'circle') {
    // 2) 먼저 중심점을 왼쪽 마우스버튼 클릭한 채로 dragging하여 반지름을 늘리고 줄이다가
    //    마우스버튼을 놓아 circle을 입력합니다.
    //    Circle은 NDC의 범위가 넘어갈 수도 있으며, 그 경우 NDC의 범위 안에 있는 부분만 그려지게 됩니다.
    //    Circle의 정보가 info 첫번째 line에 나타납니다.
    const center = dragStart;
    const radius = dist2(dragStart, dragCurrent);

    circle = {
      center,
      radius,
      vertices: buildCircleVertices(center, radius, 256),
    };

    uploadCircle();
    phase = 'line';
  } else if (phase === 'line') {
    // 3) 두번째로 line segment를 07_LineSegments 프로그램과 같이 입력합니다.
    //    Line segment의 정보가 info 두번째 line에 나타납니다.
    segment = {
      p0: dragStart,
      p1: dragCurrent,
    };

    uploadLine();

    // 4) Line segment 입력이 끝나자 마자 intersection point를 계산하며,
    //    intersection이 있는 경우, intersection point의 개수와 coordinates가 info 세번째 line에 표시됩니다.
    intersections = computeSegmentCircleIntersections(
      circle.center,
      circle.radius,
      segment.p0,
      segment.p1
    );

    if (intersections.length > 0) {
      uploadPoints();
    }

    phase = 'done';
  }

  dragStart = null;
  dragCurrent = null;
  updateInfo();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    resetAll();
  }
});

async function init() {
  const vertSrc = await readShaderFile('./shVert.glsl');
  const fragSrc = await readShaderFile('./shFrag.glsl');
  shader = new Shader(gl, vertSrc, fragSrc);

  updateInfo();
  render();
}

init();