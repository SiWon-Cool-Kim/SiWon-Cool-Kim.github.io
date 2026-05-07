#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;

out vec3 lightingColor; // 프래그먼트 셰이더로 넘겨줄 최종 색상

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

struct Material { vec3 diffuse; vec3 specular; float shininess; };
struct Light { vec3 position; vec3 ambient; vec3 diffuse; vec3 specular; };

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
    vec3 fragPos = vec3(u_model * vec4(a_position, 1.0));
    vec3 normal = mat3(transpose(inverse(u_model))) * a_normal;

    vec3 rgb = material.diffuse;
    vec3 ambient = light.ambient * rgb;

    vec3 norm = normalize(normal);
    vec3 lightDir = normalize(light.position - fragPos);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = light.diffuse * diff * rgb;  

    vec3 viewDir = normalize(u_viewPos - fragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = 0.0;
    if (diff > 0.0) spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    vec3 specular = light.specular * spec * material.specular;  

    lightingColor = ambient + diffuse + specular;
}