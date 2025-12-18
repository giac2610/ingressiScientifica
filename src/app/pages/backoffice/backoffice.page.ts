import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, 
  IonLabel, IonList, IonItem, IonInput, IonButton, IonIcon, IonCard, IonCardContent,
  IonGrid, IonRow, IonCol, IonAvatar, IonSelect, IonSelectOption, 
  IonTextarea, IonSearchbar, IonCardHeader, IonCardTitle
} from '@ionic/angular/standalone';
import { DatabaseService, Startup, Guest, Employee, Reason, Supplier, ThirdParty } from 'src/app/services/database';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs';
import { addIcons } from 'ionicons';
import { trashOutline, businessOutline, peopleOutline, logOutOutline, cloudUploadOutline, personAddOutline, createOutline, arrowBackOutline, saveOutline, settingsOutline, cartOutline, briefcaseOutline, listOutline, eyeOutline, codeSlashOutline, listCircleOutline, informationCircleOutline, openOutline, documentTextOutline } from 'ionicons/icons';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-backoffice',
  templateUrl: './backoffice.page.html',
  styleUrls: ['./backoffice.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, 
    IonLabel, IonList, IonItem, IonInput, IonButton, IonIcon, IonCard, IonCardContent,
    IonGrid, IonRow, IonCol, IonAvatar, IonTextarea,
    IonSearchbar, IonCardHeader, IonCardTitle
  ]
})
export class BackofficePage {

  private _privacyEditor: ElementRef | undefined;
  privacyUrl: string = '';
  

  // deprecato
  get privacyEditor(): ElementRef | undefined {
    return this._privacyEditor;
  }

  private dbService = inject(DatabaseService);

  selectedSegment: string = 'presenze';
  privacyPdf: string = '';
  privacyPdfUrl: string = '';
  rawPrivacyPdf: File | null = null;
  
  //  STARTUP

  //  CREAZIONE STARTUP
  newStartupName: string = '';
  newStartupDesc: string = '';
  newStartupLogo: string = ''; 

  //  GESTIONE STARTUP
  startupSearchTerm: string = '';
  
  // Startup Selezionata per l'editing
  selectedStartup: Startup | null = null;
  
  // Gestione Dipendenti
  empFormName: string = '';
  empFormRole: string = '';
  empFormImage: string = '';
  editingEmployee: Employee | null = null; // Se popolato, siamo in modalità modifica dipendente

  // -- STREAMS --
  // Lista Startup filtrata dalla ricerca
  allStartups$ = this.dbService.getStartups();
  activeGuests$ = this.dbService.getActiveGuests();
  activeEmployees$ = this.dbService.getAllActiveEmployees();

  // -- OSPITI (Motivazioni) --
  newReasonText: string = '';
  reasons$ = this.dbService.getReasons();

  // -- FORNITORI --
  newSupplierName: string = '';
  suppliers$ = this.dbService.getSuppliers();
  activeSuppliers$ = this.dbService.getActiveSuppliers();
  selectedSupplier: Supplier | null = null;
  supplierSearchTerm: string = '';
  allSuppliers$ = this.dbService.getSuppliers()  // -- UTENTI TERZI (Logica identica a Startup) --
  newSupplierLogo: string = '';;

  // --UTENTI TERZI --
  newThirdPartyName: string = '';
  newThirdPartyLogo: string = '';
  selectedThirdParty: ThirdParty | null = null; // Per il dropdown
  thirdParties$ = this.dbService.getThirdParties();
  allThirdParties$ = this.dbService.getThirdParties();
  thirdPartySearchTerm: string = '';
  

  // Variabili form dipendente Terzi (riciclo quelle startup o ne creo nuove per pulizia)
  newTpEmpName: string = '';
  newTpEmpRole: string = '';
  newTpEmpImage: string = '';

  constructor() {
    addIcons({peopleOutline,settingsOutline,businessOutline,cartOutline,briefcaseOutline,logOutOutline,cloudUploadOutline,arrowBackOutline,saveOutline,createOutline,trashOutline,documentTextOutline,informationCircleOutline,openOutline,listOutline,listCircleOutline,eyeOutline,codeSlashOutline,personAddOutline});
  // Carica il testo attuale all'avvio
    this.dbService.getAppConfig().subscribe(config => {
      // Se l'editor è pronto e il testo è diverso, aggiornalo.
      // Questo succede solo al caricamento iniziale o se cambia nel DB.
      if (config.privacyPdfUrl) {
        this.privacyPdf = "File attualmente online"
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.handlePdfFile(file);
  }

  private handlePdfFile(file: File) {
    // 1. Controllo Tipo
    if (file.type !== 'application/pdf') {
      alert('Carica solo file PDF.');
      return;
    }
    // 2. Controllo Peso (IMPORTANTE per non bloccare Firestore)
    // 900 KB = 900 * 1024 bytes
    if (file.size > 700 * 1024) {
      alert(`File troppo grande (${(file.size / 1024 / 1024).toFixed(2)} MB). \nIl limite è 1MB. Comprimi il PDF.`);
      return;
    }

    this.rawPrivacyPdf = file;

    this.privacyPdf = 'file pronto: ' + file.name;
  }
  
  // Getter per filtrare le startup nella vista a griglia
  filterStartups(startups: Startup[]): Startup[] {
    if (!this.startupSearchTerm) return startups;
    return startups.filter(s => s.name.toLowerCase().includes(this.startupSearchTerm.toLowerCase()));
  }

  // --- AZIONI STARTUP ---

  // Crea Nuova
  async addStartup() {
    if (!this.newStartupName.trim()) return;
    this.newStartupLogo = await this.dbService.uploadFile(this.newStartupLogo, `startups/${this.newStartupName}/logo`);
    await this.dbService.addStartup({
      name: this.newStartupName,
      logoUrl: this.newStartupLogo,
      employees: []
    });
    this.newStartupName = ''; this.newStartupDesc = ''; this.newStartupLogo = '';
  }

  // Seleziona (Entra nel dettaglio)
  selectStartup(s: Startup) {
    this.selectedStartup = { ...s }; // Crea una copia per l'editing sicuro
    this.resetEmployeeForm();
  }

  // Deseleziona (Torna alla lista)
  deselectStartup() {
    this.selectedStartup = null;
  }

  // Salva Modifiche Startup (Edit)
  async updateStartup() {
    if (!this.selectedStartup || !this.selectedStartup.id) return;
    this.selectedStartup.logoUrl = await this.dbService.uploadFile(this.selectedStartup.logoUrl!, `startups/${this.selectedStartup.name}/logo`);
    await this.dbService.updateStartup(this.selectedStartup.id, {
      name: this.selectedStartup.name,
      logoUrl: this.selectedStartup.logoUrl
    });
    alert('Startup aggiornata!');
  }

  // Elimina Startup
  deleteStartup(id: string) {
    if(confirm('Eliminare definitivamente questa startup e tutti i dipendenti?')) {
      this.dbService.deleteStartup(id);
      this.deselectStartup();
    }
  }

  // --- AZIONI DIPENDENTI STARTUP---
  // Prepara il form per la modifica
  editEmployee(emp: Employee) {
    this.editingEmployee = emp; // Salviamo chi stiamo modificando
    this.empFormName = emp.name;
    this.empFormImage = emp.imageUrl || '';
  }

  resetEmployeeForm() {
    this.editingEmployee = null;
    this.empFormName = '';
    this.empFormRole = '';
    this.empFormImage = '';
  }

  // Salva (Aggiunge o Modifica)
  async saveEmployee() {
    if (!this.selectedStartup || !this.selectedStartup.id || !this.empFormName) return;
    this.empFormImage = await this.dbService.uploadFile(this.empFormImage, `startups/${this.selectedStartup.name}/employees/${this.empFormName}`);
    const newEmpData: Employee = {
      name: this.empFormName,
      role: this.empFormRole,
      imageUrl: this.empFormImage
    };

    if (this.editingEmployee) {
      // MODIFICA ESISTENTE
      await this.dbService.updateEmployeeDetails(this.selectedStartup.id, this.editingEmployee, newEmpData);
    } else {
      // AGGIUNGI NUOVO
      await this.dbService.addEmployeeToStartup(this.selectedStartup.id, newEmpData);
    }

    this.resetEmployeeForm();
    
    // Aggiorna la vista locale della startup selezionata (trucco per vedere subito le modifiche senza uscire)
    // Nota: La sottoscrizione realtime nell'HTML aggiornerà la lista sotto, ma selectedStartup è una copia locale.
    // L'ideale è ricaricare selectedStartup dallo stream, ma per ora il DB farà il lavoro.
  }

  async deleteEmployee(emp: Employee) {
    if (!this.selectedStartup || !this.selectedStartup.id) return;
    if(confirm('Rimuovere dipendente?')) {
      await this.dbService.removeEmployeeFromStartup(this.selectedStartup.id, emp.name);
    }
  }

  checkEmployeeOut(employee: Employee, startup: Startup) {
    if(confirm('Confermi l\'uscita del dipendente?')) {
      this.dbService.updateEmployeeStatus(startup.id!, employee.name, 'OUT');
    }
  }

  // --- DRAG & DROP ---
  async onDrop(event: DragEvent, target: string) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files[0];
    if (file) this.handleFile(file, target);
  }
  
  onDragOver(event: DragEvent) { event.preventDefault(); }

  private handleFile(file: File, target: string) {
    if (target === 'privacyPdf') {
      this.handlePdfFile(file)
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      if (target === 'newStartup') this.newStartupLogo = res;
      if (target === 'editStartup' && this.selectedStartup) this.selectedStartup.logoUrl = res;
      if (target === 'employee') this.empFormImage = res;
      if (target === 'thirdParty') this.newThirdPartyLogo = res;
      if (target === 'editThirdParty' && this.selectedThirdParty) this.selectedThirdParty.logoUrl = res;
      if (target === 'tpEmployee') this.newTpEmpImage = res;
      if (target === 'newSupplier') this.newSupplierLogo = res;
      if (target === 'editSupplier' && this.selectedSupplier) this.selectedSupplier.logoUrl = res;
      // if (target === 'privacyPdf') this.privacyPdf = res;
    };
    reader.readAsDataURL(file);
  }

async savePrivacyPdf() {
    if (!this.rawPrivacyPdf) {
      alert('Nessun file PDF selezionato.');
      return;
    }
    try {
      // const pdfUrl = await this.dbService.privacyPdfUrl$ .toPromise();
      // const pdfUrl = await this.dbService.uploadFile(this.privacyPdf, 'config');
      await this.dbService.savePrivacyPdf(this.rawPrivacyPdf);
      // await this.dbService.savePrivacyPdf(pdfUrl!);
      alert('PDF Privacy salvato con successo!');

      this.rawPrivacyPdf = null;
    } catch (e) {
      console.error(e);
      alert('Errore nel salvataggio. Riprova.');
    }
  }
  // --- AZIONI OSPITI ---
  async checkOut(guest: Guest) {
    if(confirm(`Confermi l'uscita di ${guest.name}?`)) {
      
      // Il componente non sa nulla di Excel o Firestore, chiede solo il checkout
      const success = await this.dbService.checkOutGuest(guest);
      
      if (success) {
        // Opzionale: Feedback visivo se vuoi
        console.log("Processo di uscita completato perfettamente");
      } else {
        alert("Errore durante l'uscita (controlla connessione o log)");
      }
    }
  }

  // --- AZIONI OSPITI (MOTIVAZIONI) ---
  async addReason() {
    if(!this.newReasonText) return;
    await this.dbService.addReason(this.newReasonText);
    this.newReasonText = '';
  }

  async deleteReason(id: string) {
    if(confirm('Eliminare motivazione?')) this.dbService.deleteReason(id);
  }

  // --- AZIONI FORNITORI ---
  // Crea Nuova
  async addSupplier() {
    if (!this.newSupplierName.trim()) return;
    this.newSupplierLogo = await this.dbService.uploadFile(this.newSupplierLogo, `suppliers/${this.newSupplierName}/logo`);
    await this.dbService.addSupplier({
      name: this.newSupplierName,
      logoUrl: this.newSupplierLogo
    });
    this.newSupplierName = ''; this.newSupplierLogo = '';
  }
  async deleteSupplier(id: string) {
    if(confirm('Eliminare fornitore?')) this.dbService.deleteSupplier(id);
  }
  doSupplierCheckout(supplier: Supplier) {
    if(confirm(`Confermi l'uscita del fornitore ${supplier.name}?`)) {
      this.dbService.updateSupplierStatus(supplier);
    }
  }
  filterSuppliers(supplier: Supplier[]): Supplier[] {
    if (!this.startupSearchTerm) return supplier;
    return supplier.filter(s => s.name.toLowerCase().includes(this.startupSearchTerm.toLowerCase()));
  }
    // Seleziona (Entra nel dettaglio)
  selectSupplier(s: Supplier) {
    this.selectedSupplier = { ...s }; // Crea una copia per l'editing sicuro
    this.resetEmployeeForm();
  }

  // Deseleziona (Torna alla lista)
  deselectSupplier() {
    this.selectedSupplier = null;
  }

    // Salva Modifiche Startup (Edit)
  async updateSupplier() {
    if (!this.selectedSupplier || !this.selectedSupplier.id) return;
    this.selectedSupplier.logoUrl = await this.dbService.uploadFile(this.selectedSupplier.logoUrl!, `suppliers/${this.selectedSupplier.name}/logo`);
    await this.dbService.updateSupplier(this.selectedSupplier.id, {
      name: this.selectedSupplier.name,
      logoUrl: this.selectedSupplier.logoUrl
    });
    alert('Startup aggiornata!');
  }
  // --- AZIONI UTENTI TERZI  ---
  async addThirdParty() {
    if (!this.newThirdPartyName) return;
    this.newThirdPartyLogo = await this.dbService.uploadFile(this.newThirdPartyLogo, `thirdParties/${this.newThirdPartyName}/logo`);
    await this.dbService.addThirdParty({ name: this.newThirdPartyName, logoUrl: this.newThirdPartyLogo, employees: []});
    this.newThirdPartyName = ''; this.newThirdPartyLogo = '';
  }

  async deleteThirdParty(id: string) {
    if(confirm('Eliminare Utente Terzo?')) this.dbService.deleteThirdParty(id);
  }

  async addTpEmployee() {
    if (!this.selectedThirdParty || !this.newTpEmpName) return;
    this.newTpEmpImage = await this.dbService.uploadFile(this.newTpEmpImage, `thirdParties/${this.selectedThirdParty.name}/employees/${this.newTpEmpName}`);
    const emp: Employee = { name: this.newTpEmpName, role: this.newTpEmpRole, imageUrl: this.newTpEmpImage };
    await this.dbService.addEmployeeToThirdParty(this.selectedThirdParty.id!, emp);
    this.newTpEmpName = ''; this.newTpEmpRole = ''; this.newTpEmpImage = '';
  }

  async deleteTpEmployee(emp: Employee) {
    if (!this.selectedThirdParty) return;
    if(confirm('Rimuovere persona?')) this.dbService.removeEmployeeFromThirdParty(this.selectedThirdParty.id!, emp.name);
  }

  async checkTpEmployeeOut(employee: Employee, thirdParty: ThirdParty) {
    if(confirm('Confermi l\'uscita della persona?')) {
      this.dbService.updateTpEmployeeStatus(thirdParty.id!, employee.name, 'OUT');
    }
  }

      // Seleziona (Entra nel dettaglio)
  selectThirdParty(s: ThirdParty) {
    this.selectedThirdParty = { ...s }; // Crea una copia per l'editing sicuro
    this.resetEmployeeForm();
  }

  // Deseleziona (Torna alla lista)
  deselectThirdParty() {
    this.selectedThirdParty = null;
  }
 filterThirdParties(thirdParties: ThirdParty[]): ThirdParty[] {
    if (!this.thirdPartySearchTerm) return thirdParties;
    return thirdParties.filter(s => s.name.toLowerCase().includes(this.thirdPartySearchTerm.toLowerCase()));
  }
    async updateThirdParty() {
    if (!this.selectedThirdParty || !this.selectedThirdParty.id) return;
    await this.dbService.updateThirdParty(this.selectedThirdParty.id, {
      name: this.selectedThirdParty.name,
      logoUrl: this.selectedThirdParty.logoUrl
    });
    alert('Utente Terzo aggiornato!');
  }

  saveTpEmployee() {
    if (this.editingEmployee) {
      this.dbService.updateTpEmployeeDetails(this.selectedThirdParty!.id!, this.editingEmployee, {
        name: this.newTpEmpName,
        role: this.newTpEmpRole,
        imageUrl: this.newTpEmpImage
      });
    } else {
      this.addTpEmployee();
    }
    this.newTpEmpName = '';
    this.newTpEmpRole = '';
    this.newTpEmpImage = '';
    this.editingEmployee = null;
  }

    // Prepara il form per la modifica
  editTpEmployee(emp: Employee) {
    this.editingEmployee = emp; // Salviamo chi stiamo modificando
    this.empFormName = emp.name;
    this.empFormImage = emp.imageUrl || '';
  }

  removeNewStartupLogo() {
    this.newStartupLogo = '';
  }

  // 2. Rimuovi Logo Startup Esistente (Modifica)
  removeSelectedStartupLogo() {
    if (this.selectedStartup) {
      this.selectedStartup.logoUrl = '';
    }
  }

  // 3. Rimuovi Foto Dipendente
  removeEmployeeImage() {
    this.empFormImage = '';
  }

  // 4. Rimuovi Logo Fornitore
  removeSupplierLogo() {
    this.newSupplierLogo = '';
    if (this.selectedSupplier) {
      this.selectedSupplier.logoUrl = ''; // Gestisce anche la modifica
    }
  }

  // 5. Rimuovi Logo Terze Parti
  removeThirdPartyLogo() {
    this.newThirdPartyLogo = '';
  }

  // 6. Rimuovi Foto Dipendente Terze Parti
  removeTpEmployeeImage() {
    this.newTpEmpImage = '';
  }
  
  // 7. Rimuovi PDF Privacy
  removePrivacyPdf() {
    this.privacyPdf = '';
  }

}