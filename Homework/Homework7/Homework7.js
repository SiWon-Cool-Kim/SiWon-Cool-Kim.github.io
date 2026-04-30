import { resizeAspectRatio, Axes } from './util.js';
import { Shader, readShaderFile } from './shader.js';
// 만들어두셨던 파일 및 클래스명으로 임포트
import { SquarePyramid } from './squaredPyramid.js'; 
import { Arcball } from './arcball.js';
import { loadTexture } from './texture.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let isInitialized = false;
let viewMatrix = mat4.create();
let projMatrix = mat4.create();
let modelMatrix = mat4.create();
const axes = new Axes(gl, 1.5); 
const texture = loadTexture(gl, true, './sunrise.jpg');

// 인스턴스 생성
const pyramid = new SquarePyramid(gl);

const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    main().then(success => {
        if (!success) console.log('program terminated');
        isInitialized = true;
    }).catch(error => console.error('program terminated with error:', error));
});

function initWebGL() {
    if (!gl) return false;

    // 과제 조건 1번: 캔버스 크기 700x700 강제 고정
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    viewMatrix = arcball.getViewMatrix();

    shader.use();  
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', viewMatrix);
    shader.setMat4('u_projection', projMatrix);
    
    // 사각뿔 그리기
    pyramid.draw(shader);

    axes.draw(viewMatrix, projMatrix);
    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) throw new Error('WebGL 초기화 실패');
        await initShader();

        mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -3));
        mat4.perspective(projMatrix, glMatrix.toRadian(60), canvas.width / canvas.height, 0.1, 1000.0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        shader.setInt('u_texture', 0);

        requestAnimationFrame(render);
        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        return false;
    }
}