#version 300 es
precision highp float;
in vec3 fragPos;  
in vec3 normal;  
out vec4 FragColor;

struct Material { vec3 diffuse; vec3 specular; float shininess; };
struct Light { vec3 position; vec3 ambient; vec3 diffuse; vec3 specular; };

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;

void main() {
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
        
    FragColor = vec4(ambient + diffuse + specular, 1.0);
}