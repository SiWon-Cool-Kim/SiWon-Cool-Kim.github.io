const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL is not supported.");
    throw new Error("WebGL not supported");
}

// 힌트 1) render() 호출 전에 scissor test 활성화
gl.enable(gl.SCISSOR_TEST);

function resizeCanvas() {
    // 처음 시작할 때는 500x500
    // 이후 resize 시에는 window 크기에 맞게 1:1 비율 유지
    const size = Math.min(window.innerWidth, window.innerHeight, 500000);

    canvas.width = size;
    canvas.height = size;

    render();
}

function render() {
    const w = canvas.width;
    const h = canvas.height;

    // 힌트 2) viewport를 먼저 지정
    gl.viewport(0, 0, w, h);

    // Z 순서:
    // 왼쪽 위 = 초록
    gl.scissor(0, h / 2, w / 2, h / 2);
    gl.clearColor(0.0, 1.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 오른쪽 위 = 빨강
    gl.scissor(w / 2, h / 2, w / 2, h / 2);
    gl.clearColor(1.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 왼쪽 아래 = 파랑
    gl.scissor(0, 0, w / 2, h / 2);
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 오른쪽 아래 = 노랑
    gl.scissor(w / 2, 0, w / 2, h / 2);
    gl.clearColor(1.0, 1.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// 처음 시작할 때 canvas는 500x500
canvas.width = 500;
canvas.height = 500;
render();

// window resize 시 1:1 비율 유지
window.addEventListener("resize", resizeCanvas);