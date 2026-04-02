import { resizeAspectRatio } from './util.js';
import { Shader, readShaderFile } from './shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let startTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    main().then(success => {
        if (!success) return;
        isInitialized = true;
        requestAnimationFrame(animate);
    });
});

function initWebGL() {
    if (!gl) return false;

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.35, 1.0); 
    return true;
}

function setupBuffers() {
    // 1x1 크기의 기본 정사각형 모델 (중심이 0,0)
    const vertices = new Float32Array([
        -0.5,  0.5,  
        -0.5, -0.5,  
         0.5, -0.5,  
         0.5,  0.5   
    ]);

    const indices = new Uint16Array([
        0, 1, 2, 
        0, 2, 3     
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}

function render(elapsedTime) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    const bigRot = Math.sin(elapsedTime) * Math.PI * 2.0;
    const smallRot = Math.sin(elapsedTime) * Math.PI * -10.0;
    
    const center = [0.0, 0.1, 0.0];

    shader.use();
    gl.bindVertexArray(vao);

    const colorLoc = gl.getAttribLocation(shader.program, "a_color");
    gl.disableVertexAttribArray(colorLoc);

    // 1. 고정된 풍차 기둥 그리기 (갈색)
    let model = mat4.create();
    mat4.translate(model, model, [0.0, -0.3, 0.0]); // 화면 아래쪽으로 이동
    mat4.scale(model, model, [0.2, 0.8, 1.0]); // 기둥 모양으로 스케일
    shader.setMat4("u_transform", model);
    gl.vertexAttrib4f(colorLoc, 0.55, 0.35, 0.15, 1.0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // 2. 중심점을 기준으로 회전하는 큰 날개 1개 그리기 (흰색)
    model = mat4.create();
    mat4.translate(model, model, center); // 회전 중심점으로 이동
    mat4.rotateZ(model, model, bigRot);   // 애니메이션 회전 적용
    mat4.scale(model, model, [0.6, 0.1, 1.0]); // 넓은 직사각형으로 스케일
    shader.setMat4("u_transform", model);
    gl.vertexAttrib4f(colorLoc, 0.9, 0.9, 0.9, 1.0); 
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // 3. 작은 날개 A 그리기 (회색, 큰 날개의 오른쪽 끝)
    model = mat4.create();
    mat4.translate(model, model, center); 
    mat4.rotateZ(model, model, bigRot); // 큰 날개와 함께 회전 (부모 노드의 변환)
    mat4.translate(model, model, [0.3, 0.0, 0.0]); // 큰 날개의 오른쪽 끝으로 이동 (0.8의 절반)
    mat4.rotateZ(model, model, smallRot); // 자신의 중심축을 기준으로 회전
    mat4.scale(model, model, [0.15, 0.05, 1.0]); 
    shader.setMat4("u_transform", model);
    gl.vertexAttrib4f(colorLoc, 0.6, 0.6, 0.6, 1.0); 
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // 4. 작은 날개 B 그리기 (회색, 큰 날개의 왼쪽 끝)
    model = mat4.create();
    mat4.translate(model, model, center); 
    mat4.rotateZ(model, model, bigRot); // 큰 날개와 함께 회전
    mat4.translate(model, model, [-0.3, 0.0, 0.0]); // 큰 날개의 왼쪽 끝으로 이동
    mat4.rotateZ(model, model, smallRot); // 자신의 중심축을 기준으로 회전
    mat4.scale(model, model, [0.15, 0.05, 1.0]); 
    shader.setMat4("u_transform", model);
    gl.vertexAttrib4f(colorLoc, 0.6, 0.6, 0.6, 1.0); 
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function animate(currentTime) {
    if (!startTime) startTime = currentTime;
    
    // elapsedTime = currentTime - startTime (in seconds)
    const elapsedTime = (currentTime - startTime) / 1000.0;
    
    render(elapsedTime);
    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) throw new Error('WebGL 초기화 실패');
        await initShader();
        setupBuffers();
        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        return false;
    }
}
