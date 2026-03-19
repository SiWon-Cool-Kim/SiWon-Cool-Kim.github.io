import { resizeAspectRatio, setupText } from './util.js';
import { Shader, readShaderFile } from './shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let shader;
let vao;
let xOffset = 0.0;
let yOffset = 0.0;

const moveStep = 0.01;   // 조건 3) 이동 단위
const halfSize = 0.1;    // 조건 2) 한 변이 0.2이므로 중심에서 끝까지 거리는 0.1
const limit = 1.0 - halfSize; // 0.9 (정사각형이 캔버스 1.0/-1.0을 넘지 않게 함)

async function init() {
    if (!gl) {
        alert("WebGL2를 지원하지 않는 브라우저입니다.");
        return;
    }

    // 조건 1) 초기 설정: 600x600
    canvas.width = 600;
    canvas.height = 600;

    // 조건 8) 가로세로 비율 1:1 유지 (util.js 함수 사용)
    resizeAspectRatio(gl, canvas);

    // 조건 7) 메시지 표시 (util.js 함수 사용)
    setupText(canvas, "Use arrow keys to move the rectangle");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // 배경 검은색

    // 조건 6) 셰이더 파일 읽기 및 객체 생성 (shader.js 함수/클래스 사용)
    const vSource = await readShaderFile('./shVert.glsl');
    const fSource = await readShaderFile('./shFrag.glsl');
    shader = new Shader(gl, vSource, fSource);

    // 조건 2) 정사각형 좌표 설정 (중앙 위치, 한 변 길이 0.2)
    const vertices = new Float32Array([
        -halfSize, -halfSize, 0.0, // 좌하
         halfSize, -halfSize, 0.0, // 우하
         halfSize,  halfSize, 0.0, // 우상
        -halfSize,  halfSize, 0.0  // 좌상
    ]);

    // VAO/VBO 설정
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // shader.js의 setAttribPointer 활용
    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);

    // 키보드 이벤트 리스너 등록
    window.addEventListener('keydown', handleKeyDown);

    // 렌더링 루프 시작
    tick();
}

function handleKeyDown(event) {
    // 조건 3) 화살표 키 이동 및 캔버스 밖으로 나가지 않도록 제한
    // 정사각형은 부분적으로도 나갈 수 없으므로 offset + halfSize 가 1.0을 넘지 않아야 함
    switch(event.key) {
        case 'ArrowUp':
            if (yOffset + moveStep <= limit) yOffset += moveStep;
            break;
        case 'ArrowDown':
            if (yOffset - moveStep >= -limit) yOffset -= moveStep;
            break;
        case 'ArrowLeft':
            if (xOffset - moveStep >= -limit) xOffset -= moveStep;
            break;
        case 'ArrowRight':
            if (xOffset + moveStep <= limit) xOffset += moveStep;
            break;
    }
}

function tick() {
    render();
    requestAnimationFrame(tick); // 애니메이션을 위해 반복 호출
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    shader.use();
    
    // 조건 4) Vertex Shader의 uniform 변수 'uOffset'으로 오프셋 전달
    shader.setVec2('uOffset', xOffset, yOffset);

    gl.bindVertexArray(vao);
    
    // 조건 5) TRIANGLE_FAN을 사용하여 그리기 (인덱스 미사용)
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

// 프로그램 시작
init();