export class SquarePyramid {
    constructor(gl, options = {}) {
        this.gl = gl;
        
        // VAO 및 버퍼 생성
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // 1. 정점 위치 데이터 (Vertices)
        // 꼭지점(0,1,0), 바닥 네 모서리(-0.5,0,0.5), (0.5,0,0.5), (0.5,0,-0.5), (-0.5,0,-0.5)
        this.vertices = new Float32Array([
            // Front face
            0.0, 1.0, 0.0,   -0.5, 0.0, 0.5,    0.5, 0.0, 0.5,
            // Right face
            0.0, 1.0, 0.0,    0.5, 0.0, 0.5,    0.5, 0.0, -0.5,
            // Back face
            0.0, 1.0, 0.0,    0.5, 0.0, -0.5,  -0.5, 0.0, -0.5,
            // Left face
            0.0, 1.0, 0.0,   -0.5, 0.0, -0.5,  -0.5, 0.0, 0.5,
            // Bottom face (y=0) - dx=dz=1, 중심은 (0,0)
            -0.5, 0.0, -0.5,  0.5, 0.0, -0.5,   0.5, 0.0, 0.5,   -0.5, 0.0, 0.5
        ]);

        // 2. 법선 벡터 데이터 (Normals) - 빛 반사/명암 계산용
        const nY = 0.447213; // 1 / sqrt(5)
        const nXZ = 0.894427; // 2 / sqrt(5)
        this.normals = new Float32Array([
            // Front face normal
            0, nY, nXZ,   0, nY, nXZ,   0, nY, nXZ,
            // Right face normal
            nXZ, nY, 0,   nXZ, nY, 0,   nXZ, nY, 0,
            // Back face normal
            0, nY, -nXZ,  0, nY, -nXZ,  0, nY, -nXZ,
            // Left face normal
            -nXZ, nY, 0,  -nXZ, nY, 0,  -nXZ, nY, 0,
            // Bottom face normal
            0, -1, 0,     0, -1, 0,     0, -1, 0,    0, -1, 0
        ]);

        // 3. 색상 데이터 (Colors) - 면별로 다른 색상 지정
        this.colors = new Float32Array([
            // Front (red)
            1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1,
            // Right (yellow)
            1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1,
            // Back (pink)
            1, 0, 1, 1,   1, 0, 1, 1,   1, 0, 1, 1,
            // Left (cyan)
            0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1,
            // Bottom (blue)
            0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1
        ]);

        // 4. 텍스처 좌표 (TexCoords) - 현재 셰이더 오류 방지용 더미 데이터
        this.texCoords = new Float32Array([
            0.5, 1,  0, 0,  1, 0, // Front
            0.5, 1,  0, 0,  1, 0, // Right
            0.5, 1,  0, 0,  1, 0, // Back
            0.5, 1,  0, 0,  1, 0, // Left
            0, 1,    1, 1,  1, 0,  0, 0  // Bottom
        ]);

        // 5. 정점 인덱스 (Indices) - 삼각형 그리는 순서 (총 6개 삼각형)
        this.indices = new Uint16Array([
            0, 1, 2,       // Front
            3, 4, 5,       // Right
            6, 7, 8,       // Back
            9, 10, 11,     // Left
            12, 13, 14,  14, 15, 12 // Bottom (2개의 삼각형)
        ]);

        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // position
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);  // normal
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);  // color
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);  // texCoord

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        // 총 18개의 인덱스 (삼각형 6개 * 3)
        gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
}