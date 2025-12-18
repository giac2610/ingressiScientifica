# Ingressi Scientifica - Sistema di Gestione Accessi

parla di github secrets e actions!!!

Questo progetto è una **Web App** sviluppata con **Ionic** e **Angular**, progettata per gestire il flusso di ingressi e uscite presso la struttura *Scientifica*.

L'applicazione funge da duplice interfaccia:

1. **Kiosk (Frontend):** Per la registrazione self-service degli ospiti e il check-in rapido dei dipendenti, fornitori e utenti terzi.
2. **Backoffice (Dashboard):** Per l'amministrazione delle anagrafiche (Startup, Dipendenti, Fornitori).

- [Ingressi Scientifica - Sistema di Gestione Accessi](#ingressi-scientifica---sistema-di-gestione-accessi)
  - [Download](#download)
    - [App](#app)
    - [Backoffice](#backoffice)
      - [Windows](#windows)
    - [macOS](#macos)
  - [Tech Stack](#tech-stack)
  - [Architettura e Scelte Progettuali](#architettura-e-scelte-progettuali)
    - [1. Approccio Ibrido ai Dati (Firestore + Google Sheets)](#1-approccio-ibrido-ai-dati-firestore--google-sheets)
    - [2. Struttura Dati](#2-struttura-dati)
  - [Sfondo Animato WebGL](#sfondo-animato-webgl)
    - [Come funziona (`home.page.ts`)\[Punctuation ':'\]](#come-funziona-homepagetspunctuation-)
  - [Funzionalità Principali](#funzionalità-principali)
    - [1. Gestione Firma Ospiti (Kiosk)](#1-gestione-firma-ospiti-kiosk)
    - [2. Gestione Startup \& Dipendenti](#2-gestione-startup--dipendenti)
    - [3. Backoffice Avanzato](#3-backoffice-avanzato)
  - [Installazione e Setup](#installazione-e-setup)
    - [Prerequisiti](#prerequisiti)
    - [Setup Locale](#setup-locale)
    - [Build e run on Android](#build-e-run-on-android)
  - [CI/CD: Build automatica exe e apk](#cicd-build-automatica-exe-e-apk)
    - [Funzionamento](#funzionamento)
  - [Github Secrets](#github-secrets)
  - [Struttura del Progetto](#struttura-del-progetto)

## Download

### App

Per l'app bisogna andare sulle releases e trovare la pre-release con scritto "Android Release vXX" XX è il valore più alto.

### Backoffice

Per il backoffice la prima volta è necessario scaricare la latest release.

#### Windows

Per windows selezionare "ingressiscientifica-Setup-x.x.xx.exe" e scaricherà l'installer che vi guiderà all'istallazione. Successivamente il software si aggiornerà automaticamente

### macOS

Per macOS selezionare "ingressiscientifica-x.x.xx-arm64.dmg" che installerà l'app nelle applicazioni, se all'avvio vi dice che la versione è rotta, aprire il terminal e lanciare questo comando: `sudo xattr -cr /Applications/ingressiscientifica.app` e poi potrete aprire l'app.
Per l'aggiornamento al momento non sarà automatico, ma verrete avvisati che c'è una nuova versione all'avvio. Chiudete l'app e ripetete da capo il processo di installazione.

## Tech Stack

- **Framework:** Ionic 7.2.1 + Angular 20.3.10
- **Architettura:** Angular Standalone Components (No NgModules)
- **Database:** Firebase Firestore (v12)
- **Logging:** Google Sheets (via Google Apps Script)
- **Grafica:** WebGL nativo (GLSL Shaders) + SCSS
- **Linguaggio:** TypeScript
- **Node:** 22.21.1
- **npm:** 10.9.4

| Package | Version |
|:------:|:--:|
|@angular-devkit/architect   |    0.2003.10 |
|@angular-devkit/build-angular|   20.3.10   |
|@angular-devkit/core         |   20.3.10 |
|@angular-devkit/schematics   |   20.3.10 |
|@angular/cli                 |   20.3.10 |
|@angular/fire                |   20.0.1 |
|@schematics/angular          |   20.3.10 |
|rxjs                         |   7.8.2 |
|typescript                   |   5.9.3 |
|zone.js                      |   0.15.1 |

## Architettura e Scelte Progettuali

### 1. Approccio Ibrido ai Dati (Firestore + Google Sheets)

Una delle scelte architetturali più importanti è la separazione netta tra lo **Stato Attuale** e lo **Storico degli Eventi**.

- **Firestore:** Mantiene solo lo stato *live* di chi è presente in struttura.
  - **Guests:** I documenti vengono creati all'ingresso ed **eliminati fisicamente** al momento dell'uscita. Questo mantiene la collezione snella e veloce.
  - **Employees:** Non hanno una collezione separata per le visite. Il loro stato (`status: 'IN' | 'OUT'`) è salvato direttamente nell'array `employees` all'interno del documento della `Startup`. Questo permette di avere un'anagrafica persistente con stato volatile.
- **Firebase storage**: Utilizzato per archiviare file binari pesanti (es. PDF della Privacy, Loghi Startup) mantenendo Firestore leggero (vengono salvati solo i link `https://...` nel DB).
- **Google Sheets (Event Log):** Funge da registro storico permanente.
  - Ogni azione (Ingresso/Uscita) invia una chiamata HTTP "fire-and-forget" a un **Google Apps Script**.
  - Lo script all'ingresso crea una riga, all'uscita *cerca* la riga aperta di quella persona e compila la colonna "Ora Uscita", evitando duplicati.

### 2. Struttura Dati

- `guests`: Collezione temporanea per visitatori esterni (richiede firma).
- `startups`: Collezione principale. Ogni documento contiene i dati aziendali e un array `employees[]` con l'anagrafica e lo stato dei dipendenti.
- `suppliers`: Anagrafica fornitori.
- `reasons`: Motivazioni di ingresso dinamiche.
- `third_parties`: Gestione enti terzi (struttura simile a Startup).
- `config`: Collezione singleton (doc `main`) per impostazioni globali (es. URL Privacy Policy).

## Sfondo Animato WebGL

### Come funziona (`home.page.ts`)[Punctuation ':']

1. **Tecnica Metaballs:**
    L'effetto "liquido" è ottenuto sommando i campi di influenza di diverse particelle circolari.
2. **Fragment Shader (GLSL):**
    Il cuore dell'effetto risiede nello shader. Per ogni pixel dello schermo, calcoliamo la distanza da 6 "cerchi" invisibili che si muovono casualmente.

    ```glsl
    float val = exp(- (dist * dist) / (2.0 * sigma * sigma));
    fieldSum += val;
    ```

    Usando una funzione esponenziale (`exp`) invece di un taglio netto, i cerchi si "fondono" quando si avvicinano, creando gradienti morbidi.

## Funzionalità Principali

### 1. Gestione Firma Ospiti (Kiosk)

- **Firma Digitale:** Acquisita tramite HTML5 Canvas e convertita in Base64.
- **Privacy Policy:** Visualizzazione PDF integrata prima della firma (caricato da Firebase Storage).
- **Integrazione Excel:** Lo script Google riceve il Base64, lo decodifica e inietta l'immagine PNG direttamente nella cella del foglio di calcolo.

### 2. Gestione Startup & Dipendenti

- **Check-in One-Tap:** Dalla Home, basta cliccare sulla card del dipendente per cambiare stato (Verde = IN, Grigio = OUT).
- **Reattività:** Grazie agli `Observable` e `onSnapshot` di Firestore, se un dipendente entra da un tablet, il suo stato si aggiorna istantaneamente su tutti gli altri dispositivi collegati.

### 3. Backoffice Avanzato

- **Drag & Drop:** Implementazione nativa per il caricamento di loghi e foto profilo.
- **Gestione CRUD Completa:** Creazione e modifica di Startup, Dipendenti, Fornitori e Motivazioni.

## Installazione e Setup

### Prerequisiti

- Node.js (LTS)
- Ionic CLI: `npm install -g @ionic/cli`

### Setup Locale

1. **Clona il repository:**

    ```bash
    git clone <url-repo>
    cd ingressiScientifica
    ```

2. **Installa le dipendenze:**

    ```bash
    npm install
    ```

3. **Configura Environment:**
    Crea il file `src/environments/environment.ts` con le chiavi Firebase:

    ```typescript
    export const environment = {
      production: false,
      firebase: {
        apiKey: "AIzaSy...",
        authDomain: "...",
        projectId: "...",
        storageBucket: "...",
        messagingSenderId: "...",
        appId: "..."
      }
    };
    ```

4. **Configura DatabaseService:**

    In `src/app/services/database.ts`, inserisci gli URL dei Web App di Google Apps Script:

    ```typescript
    private googleStartupScriptUrl = '[https://script.google.com/.../exec](https://script.google.com/.../exec)';
    private googleGuestScriptUrl = '[https://script.google.com/.../exec](https://script.google.com/.../exec)';
    private googleThirdPartyScriptUrl = '[https://script.google.com/.../exec](https://script.google.com/.../exec)'
    ```

5. **Avvia:**

    ```bash
    ionic serve
    ```

### Build e run on Android

1. Compila il sito Angular (crea i nuovi file JS/CSS):

     ```Bash
     cd ingressiScientifica
     npm run build
     ```

2. Copia i nuovi file dentro Android:

     ```Bash
     npx cap sync android
     ```

3. Lancia l'app sul tablet:

     ```Bash
     npx cap run android
     ```

## CI/CD: Build automatica exe e apk

Il repository include una [GitHub Action](.github/workflows/build-apk.yml)per l'apk e [una](.github/workflows/build-windows.yml) per l'exe e il dmg, che compilano automaticamente l'applicativo ad ogni push sul branch master per l'apk e sulla branch backoffice per il backoffice.

### Funzionamento

- Installa Node 20, Java 21 e Ionic CLI.

- Genera dinamicamente il file src/environments/environment.prod.ts iniettando i [secret](#github-secrets) di Firebase (per non committare le chiavi nel codice).

- Compila l'APK di debug.

- Crea una Release GitHub e vi allega il file app-debug.apk.

## Github Secrets

Per far funzionare la build, è necessario configurare i seguenti Repository Secrets su GitHub (Settings -> Secrets and variables -> Actions):

|CHIAVE|Spiegazione|
|:--:|:--:|
|`FIREBASE_API_KEY`|Le API di Firebase|
|`FIREBASE_AUTH_DOMAIN`|Dominio Auth (es. xxx.firebaseapp.com)|
|`FIREBASE_PROJECT_ID`|ID Progetto Firebase|
|`FIREBASE_STORAGE_BUCKET`|Nome del bucket (es. xxx.firebasestorage.app)|
|`FIREBASE_MESSAGING_SENDER_ID`|Sender ID numerico|
|`FIREBASE_APP_ID`|App ID Firebase|
|`FIREBASE_MEASUREMENT_ID`|(Opzionale) ID Google Analytics|
|`FIREBASE_REGION`|Regione del progetto (es. europe-west1)|
|`FIREBASE_STORAGE_BUCKET_URL`|URL completo Storage (se diverso dal bucket)|

## Struttura del Progetto

- `src/app/pages/home`: Logica Kiosk, Shader WebGL.
  - `main`: Landing Page, dove si sceglie uno tra i 4 settori (Startup, Visitatori, Fornitori, utenti terzi)
    - `startup`: Qui si sceglie la startup
      - `startupEmployees`: Mostra. i relativi dipendenti della startup selezionata, è possibile fare ingresso uscita
    - `guestsHome`: qui gli ospiti sceglieranno se stanno facendo un ingresso o un'uscita
      - `guestData`: qui è la view per l'ingresso, dove il visitatore inserisce il suo nome, la motivazione e la firma
      - `guestExit`: qui c'è l'elenco di tutti gli ospiti in sede, e possono effettuare l'exit
    - `fornitoriHome`: Qui viene presentata la scelta di accesso o uscita ai fornitori
      - `fornitoriAccess`: ci sono le card con i loghi o i nomi dei fornitori che una volta cliccate effettueranno l'accesso
      - `fornitoriExit`: Qui invece c'è una card sola con un elenco di fornitori presenti in sede, con il tasto per effettuare l'uscita
    - `thirdParties`: Qui sono presentate invece tutti gli utenti terzi
      - `thirdPartyEmployees`: Una volta selezionato l'utente terzo, verranno mostrati i dipendenti
- `src/app/pages/backoffice`: Pannello amministrativo.
- `src/app/services/database.ts`: Servizio centrale. Gestisce la logica ibrida Firestore/Google Sheet.
