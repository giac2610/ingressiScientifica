import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, 
  IonLabel, IonList, IonItem, IonInput, IonButton, IonIcon, IonCard, IonCardContent,
  IonGrid, IonRow, IonCol, IonAvatar, IonBadge, IonSelect, IonSelectOption, 
  IonTextarea, IonSearchbar, IonCardHeader, IonCardTitle 
} from '@ionic/angular/standalone';
import { DatabaseService, Startup, Guest, Employee, Reason, Supplier, ThirdParty } from 'src/app/services/database';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs';
import { addIcons } from 'ionicons';
import { trashOutline, businessOutline, peopleOutline, logOutOutline, cloudUploadOutline, personAddOutline, createOutline, arrowBackOutline, saveOutline, settingsOutline, cartOutline, briefcaseOutline } from 'ionicons/icons';

@Component({
  selector: 'app-backoffice',
  templateUrl: './backoffice.page.html',
  styleUrls: ['./backoffice.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, 
    IonLabel, IonList, IonItem, IonInput, IonButton, IonIcon, IonCard, IonCardContent,
    IonGrid, IonRow, IonCol, IonAvatar, IonBadge, IonTextarea,
    IonSearchbar, IonCardHeader, IonCardTitle, IonSelect, IonSelectOption
  ]
})
export class BackofficePage {
  private dbService = inject(DatabaseService);

  selectedSegment: string = 'startups';
  
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
  // -- UTENTI TERZI (Logica identica a Startup) --
  newThirdPartyName: string = '';
  newThirdPartyLogo: string = '';
  selectedThirdPartyId: string = ''; // Per il dropdown
  thirdParties$ = this.dbService.getThirdParties();
  // Variabili form dipendente Terzi (riciclo quelle startup o ne creo nuove per pulizia)
  newTpEmpName: string = '';
  newTpEmpRole: string = '';
  newTpEmpImage: string = '';

  constructor() {
    addIcons({peopleOutline,settingsOutline,businessOutline,cartOutline,briefcaseOutline,logOutOutline,cloudUploadOutline,arrowBackOutline,saveOutline,createOutline,trashOutline,personAddOutline});
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
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      if (target === 'newStartup') this.newStartupLogo = res;
      if (target === 'editStartup' && this.selectedStartup) this.selectedStartup.logoUrl = res;
      if (target === 'employee') this.empFormImage = res;
      if (target === 'thirdParty') this.newThirdPartyLogo = res;
      if (target === 'tpEmployee') this.newTpEmpImage = res;
    };
    reader.readAsDataURL(file);
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
  async addSupplier() {
    if(!this.newSupplierName) return;
    await this.dbService.addSupplier(this.newSupplierName);
    this.newSupplierName = '';
  }
  async deleteSupplier(id: string) {
    if(confirm('Eliminare fornitore?')) this.dbService.deleteSupplier(id);
  }
  doSupplierCheckout(supplier: Supplier) {
    if(confirm(`Confermi l'uscita del fornitore ${supplier.name}?`)) {
      this.dbService.updateSupplierStatus(supplier);
    }
  }
  // --- AZIONI UTENTI TERZI  ---
  async addThirdParty() {
    if (!this.newThirdPartyName) return;
    await this.dbService.addThirdParty({ name: this.newThirdPartyName, logoUrl: this.newThirdPartyLogo, employees: []});
    this.newThirdPartyName = ''; this.newThirdPartyLogo = '';
  }

  async deleteThirdParty(id: string) {
    if(confirm('Eliminare Utente Terzo?')) this.dbService.deleteThirdParty(id);
  }

  async addTpEmployee() {
    if (!this.selectedThirdPartyId || !this.newTpEmpName) return;
    const emp: Employee = { name: this.newTpEmpName, role: this.newTpEmpRole, imageUrl: this.newTpEmpImage };
    await this.dbService.addEmployeeToThirdParty(this.selectedThirdPartyId, emp);
    this.newTpEmpName = ''; this.newTpEmpRole = ''; this.newTpEmpImage = '';
  }

  async deleteTpEmployee(emp: Employee) {
    if (!this.selectedThirdPartyId) return;
    if(confirm('Rimuovere persona?')) this.dbService.removeEmployeeFromThirdParty(this.selectedThirdPartyId, emp.name);
  }

  async checkTpEmployeeOut(employee: Employee, thirdParty: ThirdParty) {
    if(confirm('Confermi l\'uscita della persona?')) {
      this.dbService.updateTpEmployeeStatus(thirdParty.id!, employee.name, 'OUT');
    }
  }
}