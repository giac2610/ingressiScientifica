import { bootstrapApplication } from '@angular/platform-browser';
// CORRETTO: Spostati gli import di routing in @angular/router
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router'; 
// CORRETTO: Spostati gli import di utility in @angular/core
import { importProvidersFrom } from '@angular/core'; 
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

// === IMPORT FIREBASE/HTTP ===
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { environment } from './environments/environment'; // Importa la configurazione
import { HttpClientModule } from '@angular/common/http'; // Necessario per il service di invio dati

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    
    // === CONFIGURAZIONE FIREBASE ===
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFunctions(() => getFunctions(undefined, environment.firebase.region)), 
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    // 3. Aggiunge il modulo HttpClient
    importProvidersFrom(HttpClientModule) 
  ],
});