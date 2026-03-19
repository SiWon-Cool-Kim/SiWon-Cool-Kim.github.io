#version 300 es
layout(location = 0) in vec3 aPos;
uniform vec2 uOffset; // 자바스크립트에서 제어할 이동 값

void main() {
    // 기본 좌표에 오프셋을 더해 최종 위치 결정
    gl_Position = vec4(aPos.x + uOffset.x, aPos.y + uOffset.y, aPos.z, 1.0);
}