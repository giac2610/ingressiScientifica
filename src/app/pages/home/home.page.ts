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
            number: { value: 2 }, // Slightly increased count
            color: {
                // Use multiple colors from your palette
                value: ["#00A3E1", "#4bd4f2", "#88f2f2"]
            },
            shape: {
                type: "circle" // Explicitly setting shape to circle
            },
            opacity: {
                value: 0.2, // 1. Reduced base opacity for a softer sphere
                random: false
            },
            // links: {
            //   enable: true,
            //   distance: 150,
            //   color: "#ffffff",
            //   opacity: 0.1, // Reduced opacity for links
            //   width: 10
            // },
            move: {
                enable: true,
                speed: 25,
                direction: "none",
                // random: true,
                straight: false,
                out_mode: "out",
                bounce: true,
                // warp: true
            },
            size: {
                value: 700, // Variable, larger sphere sizes (was fixed 2)
                random: false
            },
            shadow: {
                enable: true,
                blur: 2000, // High blur radius creates the soft contour
                color: "#4bd4f2", // Use a light palette color for the glow
                offset: { x: 0, y: 0 },
                opacity: 0.9, // Full opacity for the glow effect
            }
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
