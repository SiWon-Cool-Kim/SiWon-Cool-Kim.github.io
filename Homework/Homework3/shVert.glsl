#version 300 es
layout(location = 0) in vec3 a_position;

uniform vec4 u_color;

out vec4 v_color;

void main() {
    gl_Position = vec4(a_position, 1.0);
    gl_PointSize = 10.0;
    v_color = u_color;
}