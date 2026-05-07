#version 300 es
precision highp float;
in vec3 lightingColor; // 버텍스 셰이더에서 보간되어 넘어온 색상
out vec4 FragColor;

void main() {
    FragColor = vec4(lightingColor, 1.0);
}