import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import type { MenuItemConstructorOptions } from 'electron';
// Aggiunto 'dialog' agli import per mostrare i messaggi all'utente
import { app, MenuItem, dialog } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();

// Initialize our app. You can pass menu templates into the app here.
// const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// ====================================
//  GESTIONE AGGIORNAMENTI AUTOMATICI 
// ====================================

// 1. Configura il logger per vedere cosa succede nella console
autoUpdater.logger = console;

// 2. GESTIONE ERRORI: Fondamentale per evitare il crash su Error 404 (Release Android)
autoUpdater.on('error', (error) => {
  console.warn('Errore AutoUpdater intercettato (l\'app continuerà a funzionare):', error);
  // Qui non facciamo nulla di visivo per non disturbare l'utente se l'errore è solo "file non trovato"
});

// 3. AGGIORNAMENTO TROVATO: Log opzionale
autoUpdater.on('update-available', () => {
  console.log('Nuovo aggiornamento trovato! Inizio download...');
});

// 4. AGGIORNAMENTO SCARICATO: Chiedi all'utente di riavviare
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Aggiornamento Pronto',
    message: 'Una nuova versione è stata scaricata. Vuoi riavviare l\'applicazione ora per installarla?',
    buttons: ['Riavvia Ora', 'Dopo']
  }).then((result) => {
    // Se l'utente clicca il primo bottone (Indice 0 = Riavvia Ora)
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// ============================================================

// Run Application
(async () => {
  // Wait for electron app to be ready.
  await app.whenReady();
  // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
  // Initialize our app, build windows, and load content.
  await myCapacitorApp.init();

  // Check for updates if we are in a packaged app.
  // MODIFICA: Avviamo il controllo solo se NON siamo in dev mode
  if (!electronIsDev) {
    // MODIFICA: Usiamo .catch() per evitare "Unhandled Promise Rejection" all'avvio
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.log('Check aggiornamenti fallito o nessun aggiornamento (Normale in caso di release Android).');
    });
  }
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When the dock icon is clicked.
app.on('activate', async function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});

// Place all ipc or other electron api calls and custom functionality under this line