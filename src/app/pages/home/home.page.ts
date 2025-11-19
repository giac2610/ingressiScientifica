import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonRow, IonGrid } from '@ionic/angular/standalone';

// tsParticles engine comes from the scoped package name
// Use dynamic runtime loading of the tsParticles bundle to avoid compile-time
// module/type mismatch between different tsparticles packages installed.


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonGrid, IonRow, IonButton, IonHeader, IonContent],
})

export class HomePage {

  constructor() {}

  async ionViewDidEnter() {
    // Carica l'effetto dinamicamente usando il bundle CDN se necessario.
    // Questo evita errori di compilazione quando i pacchetti npm non sono coerenti.
    const ensure = async () => {
      if (!(window as any).tsParticles) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js';
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load tsParticles script'));
          document.body.appendChild(s);
        });
      }
    };

    try {
      await ensure();
      const tp = (window as any).tsParticles;
      if (tp && typeof tp.load === 'function') {
        await tp.load('tsparticles', {
          fullScreen: { enable: false },
          particles: {
            number: { value: 60 },
            color: { value: "#ffffff" },
            links: {
              enable: true,
              distance: 150,
              color: "#ffffff",
              opacity: 0.4,
              width: 1
            },
            move: { enable: true, speed: 2 },
            size: { value: 2 }
          },
          interactivity: {
            events: {
              onHover: { enable: true, mode: "grab" },
              onClick: { enable: true, mode: "push" }
            }
          }
        });
      }
    } catch (e) {
      // Silenzia l'errore in sviluppo e logga per diagnosi
      // console.error('tsParticles init failed', e);
    }
    
  }
}
