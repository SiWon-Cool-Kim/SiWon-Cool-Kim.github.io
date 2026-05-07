import { resizeAspectRatio, setupText, updateText } from './util.js';
import { Shader, readShaderFile } from './shader.js';
import { Arcball } from './arcball.js';
import { Cone } from './cone.js';
import { Cube } from './cube.js'; // 광원(Lamp)을 그리기 위해 필요

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

// 셰이더들
let gouraudShader;
let phongShader;
let lampShader;

// 텍스트 오버레이 변수
let textOverlay2;
let textOverlay3;
let isInitialized = false;

// 모드 상태 변수 (초기값은 과제 지시문에 맞춤)
let arcBallMode = 'MODEL';     // 'CAMERA' or 'MODEL'
let shadingMode = 'FLAT';      // 'FLAT' or 'SMOOTH'
let renderingMode = 'PHONG';   // 'PHONG' or 'GOURAUD'

// 행렬 및 객체
let viewMatrix = mat4.create();
let projMatrix = mat4.create();
let modelMatrix = mat4.create();
let lampModelMatrix = mat4.create();

let cone;
let lamp;

// 문제 조건에 따른 파라미터 셋업
const cameraPos = vec3.fromValues(0, 0, 3);
const lightPos = vec3.fromValues(1.0, 0.7, 1.0);
const lightSize = vec3.fromValues(0.1, 0.1, 0.1);

// Arcball 객체: distance를 cameraPos의 z값인 3.0으로 맞춤
const arcball = new Arcball(canvas, 3.0, { rotation: 2.0, zoom: 0.0005 });

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    main().then(success => {
        if (!success) console.log('program terminated');
        isInitialized = true;
    }).catch(error => console.error('program terminated with error:', error));
});

// UI 텍스트 업데이트 함수
function updateOverlayTexts() {
    updateText(textOverlay2, "arcball mode: " + arcBallMode);
    updateText(textOverlay3, "shading mode: " + shadingMode + " (" + renderingMode + ")");
}

function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        
        if (key === 'a') {
            arcBallMode = (arcBallMode === 'CAMERA') ? 'MODEL' : 'CAMERA';
            updateOverlayTexts();
        }
        else if (key === 'r') {
            arcball.reset();
            modelMatrix = mat4.create(); 
            arcBallMode = 'MODEL';
            updateOverlayTexts();
        }
        else if (key === 's') { // Smooth Shading
            cone.copyVertexNormalsToNormals();
            cone.updateNormals();
            shadingMode = 'SMOOTH';
            updateOverlayTexts();
        }
        else if (key === 'f') { // Flat Shading
            cone.copyFaceNormalsToNormals();
            cone.updateNormals();
            shadingMode = 'FLAT';
            updateOverlayTexts();
        }
        else if (key === 'g') { // Gouraud Rendering
            renderingMode = 'GOURAUD';
            updateOverlayTexts();
        }
        else if (key === 'p') { // Phong Rendering
            renderingMode = 'PHONG';
            updateOverlayTexts();
        }
    });
}

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported.');
        return false;
    }
    // 문제 조건: canvas 크기 700x700
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    return true;
}

async function initShaders() {
    // Gouraud Shaders 로드
    let vert = await readShaderFile('shGouraudVert.glsl');
    let frag = await readShaderFile('shGouraudFrag.glsl');
    gouraudShader = new Shader(gl, vert, frag);

    // Phong Shaders 로드
    vert = await readShaderFile('shPhongVert.glsl');
    frag = await readShaderFile('shPhongFrag.glsl');
    phongShader = new Shader(gl, vert, frag);

    // Lamp Shaders 로드
    vert = await readShaderFile('shLampVert.glsl');
    frag = await readShaderFile('shLampFrag.glsl');
    lampShader = new Shader(gl, vert, frag);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    if (arcBallMode === 'CAMERA') {
        viewMatrix = arcball.getViewMatrix();
    } else {
        modelMatrix = arcball.getModelRotMatrix();
        viewMatrix = arcball.getViewCamDistanceMatrix();
    }

    // 1. 상태에 따라 사용할 셰이더 선택 (핵심)
    const activeShader = (renderingMode === 'GOURAUD') ? gouraudShader : phongShader;

    // 2. 선택된 셰이더 사용 및 Uniform 변수 전달
    activeShader.use();
    activeShader.setMat4('u_model', modelMatrix);
    activeShader.setMat4('u_view', viewMatrix);
    activeShader.setMat4('u_projection', projMatrix);
    activeShader.setVec3('u_viewPos', cameraPos); // 정반사(Specular) 연산을 위한 카메라 위치

    // 재질(Material) 및 조명(Light) 설정
    activeShader.setVec3("material.diffuse", vec3.fromValues(1.0, 0.5, 0.31));
    activeShader.setVec3("material.specular", vec3.fromValues(0.5, 0.5, 0.5));
    activeShader.setFloat("material.shininess", 32);

    activeShader.setVec3("light.position", lightPos);
    activeShader.setVec3("light.ambient", vec3.fromValues(0.2, 0.2, 0.2));
    activeShader.setVec3("light.diffuse", vec3.fromValues(0.7, 0.7, 0.7));
    activeShader.setVec3("light.specular", vec3.fromValues(1.0, 1.0, 1.0));

    // 원뿔 그리기
    cone.draw(activeShader);

    // 3. 조명 광원(Lamp - Cube) 그리기
    lampShader.use();
    lampShader.setMat4('u_view', viewMatrix);
    lampShader.setMat4('u_projection', projMatrix);
    
    mat4.identity(lampModelMatrix);
    mat4.translate(lampModelMatrix, lampModelMatrix, lightPos);
    mat4.scale(lampModelMatrix, lampModelMatrix, lightSize);
    lampShader.setMat4('u_model', lampModelMatrix);
    
    lamp.draw(lampShader);

    requestAnimationFrame(render);
}

async function main() {
    if (!initWebGL()) return false;

    mat4.perspective(projMatrix, glMatrix.toRadian(60), canvas.width / canvas.height, 0.1, 100.0);

    // 객체 생성 (32 segments)
    cone = new Cone(gl, 32);
    lamp = new Cube(gl);

    await initShaders();

    // 초기 오버레이 텍스트 설정
    setupText(canvas, "Cone with Lighting", 1);
    textOverlay2 = setupText(canvas, "arcball mode: " + arcBallMode, 2);
    textOverlay3 = setupText(canvas, "shading mode: " + shadingMode + " (" + renderingMode + ")", 3);
    setupText(canvas, "press 'a' to change arcball mode", 4);
    setupText(canvas, "press 'r' to reset arcball", 5);
    setupText(canvas, "press 's' to switch to smooth shading", 6);
    setupText(canvas, "press 'f' to switch to flat shading", 7);
    setupText(canvas, "press 'g' to switch to Gouraud shading", 8);
    setupText(canvas, "press 'p' to switch to Phong shading", 9);

    setupKeyboardEvents();
    
    // 초기 시작을 FLAT 상태로 동기화
    cone.copyFaceNormalsToNormals();
    cone.updateNormals();

    requestAnimationFrame(render);
    return true;
}