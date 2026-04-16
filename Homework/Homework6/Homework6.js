/*-------------------------------------------------------------------------
Homework 06: Split Viewport (Perspective & Orthographic)
---------------------------------------------------------------------------*/
import { setupText, updateText, Axes } from './util.js'; // resizeAspectRatio 제거, updateText 추가
import { Shader, readShaderFile } from './shader.js';
import { Cube } from './cube.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let startTime;
let lastFrameTime;
let isInitialized = false;

let modelMatrix = mat4.create();
let viewMatrix = mat4.create();
let projMatrix = mat4.create();
const cube = new Cube(gl);
const axes = new Axes(gl, 2.0);

// 과제 6번 요구사항: 5개의 큐브 위치
const cubePositions =[
    vec3.fromValues(0.0, 0.0, 0.0),
    vec3.fromValues(2.0, 0.5, -3.0),
    vec3.fromValues(-1.5, -0.5, -2.5),
    vec3.fromValues(3.0, 0.0, -4.0),
    vec3.fromValues(-3.0, 0.0, 1.0)
];

// 카메라 설정
let cameraPos = vec3.fromValues(0, 0, 11);  // 적절히 뒤에서 시작하도록 수정
let cameraFront = vec3.fromValues(0, 0, -1);
let cameraUp = vec3.fromValues(0, 1, 0);
let yaw = -90;
let pitch = 0;
const mouseSensitivity = 0.1;
const cameraSpeed = 2.5;

const keys = { 'w': false, 'a': false, 's': false, 'd': false };

// 텍스트 오버레이 변수
let textLine1, textLine2, textLine3;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    main().then(success => {
        if (success) isInitialized = true;
    }).catch(error => console.error(error));
});

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = true;
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = false;
});

canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        document.addEventListener("mousemove", updateCamera);
    } else {
        document.removeEventListener("mousemove", updateCamera);
    }
});

function updateCamera(e) {
    const xoffset = e.movementX * mouseSensitivity;
    const yoffset = -e.movementY * mouseSensitivity;

    yaw += xoffset;
    pitch += yoffset;

    if (pitch > 89.0) pitch = 89.0;
    if (pitch < -89.0) pitch = -89.0;

    const direction = vec3.create();
    direction[0] = Math.cos(glMatrix.toRadian(yaw)) * Math.cos(glMatrix.toRadian(pitch));
    direction[1] = Math.sin(glMatrix.toRadian(pitch));
    direction[2] = Math.sin(glMatrix.toRadian(yaw)) * Math.cos(glMatrix.toRadian(pitch));
    vec3.normalize(cameraFront, direction);
}

function initWebGL() {
    if (!gl) return false;
    // 과제 요구사항 3): 캔버스 전체 크기는 1400 x 700
    canvas.width = 1400;
    canvas.height = 700;
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

// 씬(5개의 큐브 + 축)을 그리는 공통 함수
function drawScene(currentViewMatrix, currentProjMatrix) {
    shader.use();
    
    // 5개의 큐브 그리기
    for (let i = 0; i < cubePositions.length; i++) {
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, cubePositions[i]);
        
        shader.setMat4('u_model', modelMatrix);
        shader.setMat4('u_view', currentViewMatrix);
        shader.setMat4('u_projection', currentProjMatrix);
        cube.draw(shader);
    }

    // 축 그리기
    axes.draw(currentViewMatrix, currentProjMatrix);
}

function render() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000.0;
    lastFrameTime = currentTime;

    // 카메라 위치 업데이트 (키보드 입력)
    const cameraSpeedWithDelta = cameraSpeed * deltaTime;
    if (keys['w']) vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, cameraSpeedWithDelta);
    if (keys['s']) vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, -cameraSpeedWithDelta);
    if (keys['a']) {
        const cameraRight = vec3.create();
        vec3.cross(cameraRight, cameraFront, cameraUp);
        vec3.normalize(cameraRight, cameraRight);
        vec3.scaleAndAdd(cameraPos, cameraPos, cameraRight, -cameraSpeedWithDelta);
    }
    if (keys['d']) {
        const cameraRight = vec3.create();
        vec3.cross(cameraRight, cameraFront, cameraUp);
        vec3.normalize(cameraRight, cameraRight);
        vec3.scaleAndAdd(cameraPos, cameraPos, cameraRight, cameraSpeedWithDelta);
    }

    // 과제 요구사항 9): 매 프레임 텍스트 업데이트
    const cx = cameraPos[0].toFixed(1);
    const cy = cameraPos[1].toFixed(1);
    const cz = cameraPos[2].toFixed(1);
    updateText(textLine1, `Camera pos: (${cx}, ${cy}, ${cz}) | Yaw: ${yaw.toFixed(1)}° | Pitch: ${pitch.toFixed(1)}°`);

    // Scissor 테스트 활성화 (각 뷰포트의 배경색을 독립적으로 칠하기 위해 필요)
    gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.DEPTH_TEST);

    // =========================================================================
    // 1. 왼쪽 Viewport (Perspective View)
    // =========================================================================
    gl.viewport(0, 0, 700, 700);
    gl.scissor(0, 0, 700, 700);
    gl.clearColor(0.1, 0.2, 0.3, 1.0); // 왼쪽 배경색
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 원근 투영(Perspective) 행렬 생성
    mat4.perspective(projMatrix, glMatrix.toRadian(60), 1.0, 0.1, 100.0);
    
    // FP 카메라 뷰 행렬 생성
    mat4.lookAt(viewMatrix, cameraPos, vec3.add(vec3.create(), cameraPos, cameraFront), cameraUp);
    
    drawScene(viewMatrix, projMatrix);

    // =========================================================================
    // 2. 오른쪽 Viewport (Orthographic Top-Down View)
    // =========================================================================
    gl.viewport(700, 0, 700, 700);
    gl.scissor(700, 0, 700, 700);
    gl.clearColor(0.05, 0.15, 0.2, 1.0); // 오른쪽 배경색
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 직교 투영(Orthographic) 행렬 생성 [-10, 10]
    let orthoProjMatrix = mat4.create();
    mat4.ortho(orthoProjMatrix, -10, 10, -10, 10, 0.1, 100.0);

    // 고정된 Top-Down 카메라 뷰 행렬 생성
    let orthoViewMatrix = mat4.create();
    let orthoCamPos = vec3.fromValues(0, 15, 0); // (0, 15, 0)에 고정
    let orthoTarget = vec3.fromValues(0, 0, 0);  // 원점(0, 0, 0)을 바라봄
    let orthoUp = vec3.fromValues(0, 0, -1);     // up vector = (0, 0, -1)
    
    mat4.lookAt(orthoViewMatrix, orthoCamPos, orthoTarget, orthoUp);
    
    drawScene(orthoViewMatrix, orthoProjMatrix);

    // Scissor 테스트 종료 (안전장치)
    gl.disable(gl.SCISSOR_TEST);

    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) throw new Error('Failed to initialize WebGL');
        await initShader();

        startTime = Date.now();
        lastFrameTime = startTime;

        // 초기 텍스트 설정
        textLine1 = setupText(canvas, "", 1);
        textLine2 = setupText(canvas, "WASD: move | Mouse: look (click to lock) | ESC: unlock", 2);
        textLine3 = setupText(canvas, "Left: Perspective (FP) Right: Orthographic (Top-Down)", 3);

        requestAnimationFrame(render);
        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('Failed to initialize program');
        return false;
    }
}