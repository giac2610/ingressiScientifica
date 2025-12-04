import { Component, ElementRef, OnDestroy, AfterViewInit, ViewChild, Renderer2 } from '@angular/core';
import { IonContent, IonSelect, ToastController, IonButton, IonSelectOption, IonRow, IonGrid, IonCol, IonCard, IonCardTitle, IonCardContent, IonInput, IonCardHeader, IonItem, IonIcon, IonModal, IonToolbar, IonHeader, IonTitle, IonButtons, IonFooter, IonAvatar, IonBadge, IonLabel, IonList,IonSearchbar } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService, Guest, Startup, Employee } from 'src/app/services/database';
import { BehaviorSubject, combineLatest, map, Observable, tap } from 'rxjs';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonList, IonLabel, IonFooter, FormsModule, IonButtons, IonTitle, IonHeader, IonCol, IonToolbar, IonModal, IonIcon, IonItem, IonSelect, IonButton, IonSelectOption, IonCardHeader, IonInput, IonCardContent, IonCardTitle, IonCard, IonGrid, IonRow, IonContent, CommonModule, IonSearchbar, IonAvatar, IonBadge],
})

export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('backgroundCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;

  // Dati Utente
  guestName: string = '';
  selectedReason: string = '';
  signatureImage: string | null = null; // Qui è da la firma in base64
  
  
  // Opzioni Menu a Tendina
  reasons: string[] = ['Visita Aziendale', 'Colloquio', 'Consegna Merci', 'Manutenzione', 'Altro'];

  // Stato Modale
  isPrivacyModalOpen: boolean = false;
  
  // Variabili per il disegno
  private signaturePadElement: any;
  private signatureCtx: any;
  private isDrawing: boolean = false;

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
    precision highp float;
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

  currentView:'main' | 'guestsHome' | 'guestsData' | 'startupEmployees' |'guestsExit' |'utenti3'| 'startup' | 'fornitori' | 'exolab' | 'loto' | 'libera' | 'startupChoice' | 'startupAccess'| 'startupExit'  = 'main';

  setView(view: 'main' | 'guestsHome' | 'guestsData' | 'guestsExit' | 'startupEmployees' |  'utenti3'| 'startup' | 'fornitori' | 'startupChoice' | 'startupAccess'| 'startupExit'  ) {
    if (view === 'guestsData') { 
      this.guestName = '';
      this.selectedReason = '';
      this.signatureImage = null;
      
      // Se avevi un metodo per pulire il canvas della firma, chiamalo qui
      // this.clearSignature(); 
    }
    if (view == 'guestsExit'){
      this.activeGuests$ = this.dbService.getActiveGuests();
    }
    this.currentView = view;
  }

  setViewStartup(view: 'startupChoice'  ) {
    this.currentView = view;
  }

  constructor(private renderer: Renderer2, private dbService: DatabaseService, private toastController: ToastController) {
    
  }

  activeGuests$ = this.dbService.getActiveGuests();
  searchTerm$= new BehaviorSubject<string>('');
  startup$:Observable<Startup[]> = this.dbService.getStartups().pipe(
    tap(updatedStartups => {
      if (this.selectedStartup) {
        const found = updatedStartups.find(s => s.id === this.selectedStartup?.id);
        if (found) {
          this.selectedStartup = found;
        }
      }
    })
  );
  selectedStartup: Startup | null = null;
  employeeSearchTerm: string = ''; // Variabile per la ricerca dipendenti

  selectStartup(startup: Startup) {
    this.selectedStartup = startup;
    this.setView('startupEmployees')
  }

  // 2. GESTIONE INGRESSO/USCITA DIPENDENTE
  // Cerca se il dipendente è già nella lista degli ospiti attivi
  getActiveEntry(employee: Employee, activeGuests: Guest[]): Guest | undefined {
    // Cerchiamo una corrispondenza per Nome e Azienda (usiamo 'reason' per salvare il nome azienda)
    return activeGuests.find(g => 
      g.name === employee.name && 
      (g.reason === this.selectedStartup?.name || g.reason === 'Dipendente')
    );
  }

// home.page.ts
  handleEmployeeSearch(event: any) {
    this.employeeSearchTerm = event.detail.value || '';
  }

async toggleEmployeeEntry(employee: Employee) {
    if (!this.selectedStartup || !this.selectedStartup.id) return;

    const startupId = this.selectedStartup.id;
    const startupName = this.selectedStartup.name;
    
    // Leggi stato attuale direttamente dall'oggetto (se manca è OUT)
    const isCurrentlyIn = employee.status === 'IN';
    
    // Determina nuova azione
    const newAction = isCurrentlyIn ? 'USCITA' : 'INGRESSO';
    const newStatus = isCurrentlyIn ? 'OUT' : 'IN';
    
    // Messaggi UI
    const message = isCurrentlyIn 
      ? `Arrivederci ${employee.name}` 
      : `Benvenuto ${employee.name}`;
    const color = isCurrentlyIn ? 'warning' : 'success';

    try {
      // A. Aggiorna DB (cambia lo stato nell'array)
      await this.dbService.updateEmployeeStatus(startupId, employee.name, newStatus);
      
      // B. Invia Log a Google Sheet
      this.dbService.logEmployeeActionToSheet(employee, startupName, newAction);

      // C. Feedback UI
      this.showToast(message, color);
      setTimeout(() => this.setView('startup'), 1000);

    } catch (e) {
      console.error(e);
      this.showToast('Errore aggiornamento', 'danger');
    }
  }

  showToast(message: string, color: 'success' | 'warning' | 'danger') {
    this.toastController.create({
      message,
      duration: 2000,
      color
    }).then(toast => toast.present());
  }
  // 3. FILTRO RICERCA OSPITI
  filteredGuests$ = combineLatest([
    this.dbService.getActiveGuests(), // La tua lista originale dal service
    this.searchTerm$                  // Il testo digitato
  ]).pipe(
    map(([guests, term]) => {
      // Se non c'è testo, restituisci tutto
      if (!term.trim()) return guests;
      
      // Altrimenti filtra per nome (case insensitive)
      return guests.filter(guest => 
        guest.name.toLowerCase().includes(term.toLowerCase())
      );
    })
  );

  doCheckout(guest: Guest) {
    this.dbService.checkOutGuest(guest);
  }

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

  handleSearch(event: any) {
    this.searchTerm$.next(event.detail.value || '');
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

  // --- LOGICA MODALE E FIRMA ---

  openPrivacyModal() {
    this.isPrivacyModalOpen = true;
  }

  closePrivacyModal() {
    this.isPrivacyModalOpen = false;
    this.isDrawing = false;
    if (this.signaturePadElement) {
    this.signatureImage = this.signaturePadElement.toDataURL(); // Ottieni Base64
    }
  }

  // Chiamato quando il modale ha finito di aprirsi (importante per inizializzare il canvas)
  onModalDidPresent() {
    this.initSignatureCanvas();
  }

  initSignatureCanvas() {
    if (!this.signatureCanvas) return;
    
    this.signaturePadElement = this.signatureCanvas.nativeElement;
    // Imposta dimensioni canvas in base al genitore
    const parentWidth = this.signaturePadElement.parentElement.offsetWidth;
    this.signaturePadElement.width = parentWidth;
    this.signaturePadElement.height = 200; // Altezza fissa o dinamica
    
    this.signatureCtx = this.signaturePadElement.getContext('2d');
    this.signatureCtx.lineWidth = 2;
    this.signatureCtx.lineCap = 'round';
    this.signatureCtx.strokeStyle = '#000000';
  }

  // --- EVENTI DISEGNO (Mouse & Touch) ---

  startDrawing(ev: any) {
    this.isDrawing = true;
    const { x, y } = this.getCoordinates(ev);
    this.signatureCtx.beginPath();
    this.signatureCtx.moveTo(x, y);
  }

  moved(ev: any) {
    if (!this.isDrawing) return;
    const { x, y } = this.getCoordinates(ev);
    this.signatureCtx.lineTo(x, y);
    this.signatureCtx.stroke();
  }

  endDrawing() {
    this.isDrawing = false;
  }

  // Calcola coordinate relative al canvas
  getCoordinates(ev: any) {
    let x, y;
    const rect = this.signaturePadElement.getBoundingClientRect();
    
    if (ev.changedTouches && ev.changedTouches.length > 0) {
      // Touch event
      x = ev.changedTouches[0].clientX - rect.left;
      y = ev.changedTouches[0].clientY - rect.top;
    } else {
      // Mouse event
      x = ev.clientX - rect.left;
      y = ev.clientY - rect.top;
    }
    return { x, y };
  }

  clearSignature() {
    if (this.signatureCtx) {
      this.signatureCtx.clearRect(0, 0, this.signaturePadElement.width, this.signaturePadElement.height);
    }
    this.signatureImage = null;
  }

  async acceptAndSign() {
    if (this.signaturePadElement) {
      this.signatureImage = this.signaturePadElement.toDataURL(); // Ottieni Base64
    }
    
    const newGuest: Guest = {
      // id: this.dbService.generateId(), // Genera un ID unico per l'ospite
      name: this.guestName,
      reason: this.selectedReason,
      entryTime: new Date().toISOString(),
      status: 'IN',
      signatureUrl: this.signatureImage || '' // <--- SALVA LA FIRMA QUI
    };

    try {
      if(await this.dbService.checkInGuest(newGuest)){
        this.showToast(`Benvenuto ${this.guestName}`, 'success');
      } else{
        this.showToast(`Errore durante il check-in, contattare amministratore`, 'danger');
      }; // Usa il metodo aggiornato
    } catch (err) {
      console.error(err);
    }
  }

}