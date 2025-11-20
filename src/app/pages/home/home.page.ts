import { Component, ElementRef, OnDestroy, AfterViewInit, ViewChild, Renderer2 } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonRow, IonGrid } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonGrid, IonRow, IonButton, IonContent],
})

export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('backgroundCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private animationFrameId: number | undefined;
  private resizeListener: (() => void) | undefined;
  
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private mouse = { x: 0, y: 0 };
  private circles: any[] = [];
  private width: number = 0;
  private height: number = 0;

  // Codici colore per la tua palette (RGB normalizzato 0-1)
  private readonly circleColors = [
    // [0 / 255, 163 / 255, 225 / 255],     // 1. Primary (#00A3E1)
    [75 / 255, 212 / 255, 242 / 255],   // 2. Secondary (#4bd4f2)
    [136 / 255, 242 / 255, 242 / 255],  // 3. Tertiary (#88f2f2)
    [255 / 255, 255 / 255, 255 / 255],  // 4. White (QUARTO COLORE)
  ];

  private readonly vertexSrc = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(void) {
      v_uv = a_position * 0.5 + 0.5; 
      v_uv.y = 1.0 - v_uv.y; 
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  private readonly fragmentSrc = `
    precision mediump float;
    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform int u_circleCount;
    uniform vec3 u_circlesColor[6];
    uniform vec3 u_circlesPosRad[6];
    uniform vec2 u_mouse;

    void main(void) {
        vec2 st = v_uv * u_resolution;

        // MODIFICATO: Sfondo scuro ma meno nero, con sfumature di blu/viola.
        vec3 topColor = vec3(200.0/255.0, 200.0/255.0, 200.0/255.0); // Medium Dark Blue
        vec3 bottomColor = vec3(255.0/255.0, 255.0/255.0, 255.0/255.0); // Dark Blue
        vec3 bgColor = mix(topColor, bottomColor, st.y / u_resolution.y);

        float fieldSum = 0.0;
        vec3 weightedColorSum = vec3(0.0);
        
        for (int i = 0; i < 6; i++) {
            if (i >= u_circleCount) { break; }
            vec3 posRad = u_circlesPosRad[i];
            vec2 cPos = vec2(posRad.r, posRad.g);
            float radius = posRad.b;
            float dist = length(st - cPos);
            float sigma = radius * 0.5;
            float val = exp(- (dist * dist) / (2.0 * sigma * sigma));
            fieldSum += val;
            weightedColorSum += u_circlesColor[i] * val;
        }

        vec3 finalCirclesColor = vec3(0.0);
        if (fieldSum > 0.0) {
          finalCirclesColor = weightedColorSum / fieldSum;
        }

        // MODIFICATO: Abbassato l'esponente di pow() per un blend più morbido e ampio.
        // Ciò rende il bianco e gli altri colori più diffusi.
        float intensity = pow(fieldSum, 1.7); // Era 1.4
        vec3 finalColor = mix(bgColor, finalCirclesColor, clamp(intensity, 0.0, 1.0));
        gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit() {
    this.initWebGL();
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeListener) {
      window.removeEventListener("resize", this.resizeListener);
    }
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl!.createShader(type);
    if (!shader) return null;
    this.gl!.shaderSource(shader, source);
    this.gl!.compileShader(shader);
    if (!this.gl!.getShaderParameter(shader, this.gl!.COMPILE_STATUS)) {
      console.error("Shader compile error:", this.gl!.getShaderInfoLog(shader));
      this.gl!.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private initCircles() {
    this.circles = [];
    const baseRadius = (this.width + this.height) * 0.35; 
    const numCircles = this.circleColors.length; 

    for (let i = 0; i < numCircles; i++) {
      let radius = baseRadius;
      
      // OPTIONAL: Rende il cerchio bianco leggermente più grande per dargli enfasi
      if (this.circleColors[i][0] === 1 && this.circleColors[i][1] === 1) { 
          radius *= 1.2; 
      }
      
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      
      const speedMultiplier = Math.random() * 17.0 + 10; 
      const vx = (Math.random() - 0.5) * speedMultiplier;
      const vy = (Math.random() - 0.5) * speedMultiplier;
      
      this.circles.push({
        x,
        y,
        radius,
        color: this.circleColors[i],
        vx,
        vy,
        interactive: false,
      });
    }
  }

  private resizeCanvas = () => {
    const canvas = this.canvasRef.nativeElement;
    this.width = canvas.width = window.innerWidth;
    this.height = canvas.height = window.innerHeight;
    this.gl!.viewport(0, 0, this.width, this.height);
    
    this.initCircles(); 
  };

  private updateCircles() {
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      c.x += c.vx;
      c.y += c.vy;
      
      if (c.x - c.radius > this.width) c.x = -c.radius;
      if (c.x + c.radius < 0) c.x = this.width + c.radius;
      if (c.y - c.radius > this.height) c.y = -c.radius;
      if (c.y + c.radius < 0) c.y = this.height + c.radius;
    }
  }


  private render = () => {
    this.updateCircles();

    this.gl!.viewport(0, 0, this.width, this.height);
    this.gl!.clearColor(0, 0, 0, 1);
    this.gl!.clear(this.gl!.COLOR_BUFFER_BIT);

    this.gl!.useProgram(this.program);

    const u_resolution = this.gl!.getUniformLocation(this.program!, "u_resolution");
    const u_circleCount = this.gl!.getUniformLocation(this.program!, "u_circleCount");
    const u_circlesColor = this.gl!.getUniformLocation(this.program!, "u_circlesColor");
    const u_circlesPosRad = this.gl!.getUniformLocation(this.program!, "u_circlesPosRad");
    const u_mouse = this.gl!.getUniformLocation(this.program!, "u_mouse");

    this.gl!.uniform1i(u_circleCount, this.circles.length);
    this.gl!.uniform2f(u_resolution, this.width, this.height);
    this.gl!.uniform2f(u_mouse, this.mouse.x, this.mouse.y); 

    let colorsArr = [];
    let posRadArr = [];
    for (let i = 0; i < 6; i++) {
      if (i < this.circles.length) {
        const c = this.circles[i];
        colorsArr.push(c.color[0], c.color[1], c.color[2]);
        posRadArr.push(c.x, c.y, c.radius);
      } else {
        colorsArr.push(0, 0, 0); 
        posRadArr.push(0, 0, 0); 
      }
    }

    this.gl!.uniform3fv(u_circlesColor, new Float32Array(colorsArr));
    this.gl!.uniform3fv(u_circlesPosRad, new Float32Array(posRadArr));

    this.gl!.drawArrays(this.gl!.TRIANGLES, 0, 6);
    this.animationFrameId = requestAnimationFrame(this.render);
  };


  private initWebGL() {
    const canvas = this.canvasRef.nativeElement;
    this.gl = canvas.getContext("webgl");
    if (!this.gl) {
      console.error("WebGL not supported");
      return;
    }

    this.width = canvas.width = window.innerWidth;
    this.height = canvas.height = window.innerHeight;
    this.mouse.x = this.width / 2;
    this.mouse.y = this.height / 2;

    this.initCircles();
    
    const vertShader = this.createShader(this.gl.VERTEX_SHADER, this.vertexSrc);
    const fragShader = this.createShader(this.gl.FRAGMENT_SHADER, this.fragmentSrc);

    if (!vertShader || !fragShader) return;

    this.program = this.gl.createProgram();
    if (!this.program) return;
    
    this.gl.attachShader(this.program, vertShader);
    this.gl.attachShader(this.program, fragShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error("Program link error:", this.gl.getProgramInfoLog(this.program));
      return;
    }

    this.gl.useProgram(this.program);

    const quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadBuffer);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    const a_position = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.enableVertexAttribArray(a_position);
    this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0);

    this.resizeListener = this.renderer.listen(window, 'resize', this.resizeCanvas);

    this.render();
  }
}