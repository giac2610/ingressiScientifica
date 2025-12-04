import { ActiveEmployeeResult, Employee } from './../../services/database';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, 
  IonLabel, IonList, IonItem, IonInput, IonButton, IonIcon, IonCard, IonCardContent,
  IonGrid, IonRow, IonCol, IonAvatar, IonBadge, IonCardHeader, IonCardTitle, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { DatabaseService, Startup, Guest } from 'src/app/services/database';
import { Observable } from 'rxjs';
import { addIcons } from 'ionicons';
import { trashOutline, businessOutline, peopleOutline, logOutOutline, cloudUploadOutline, personAddOutline } from 'ionicons/icons';

@Component({
  selector: 'app-backoffice',
  templateUrl: './backoffice.page.html',
  styleUrls: ['./backoffice.page.scss'],
  standalone: true,
  imports: [IonCardTitle, IonCardHeader, 
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, 
    IonLabel, IonList, IonItem, IonInput, IonButton, IonIcon, IonCard, IonCardContent,
    IonAvatar, IonBadge, IonGrid, IonRow, IonCol, IonSelectOption, IonSelect
  ]
})
export class BackofficePage {
  private dbService = inject(DatabaseService);

  // Tab selezionata ('startups' o 'guests')
  selectedSegment: string = 'guests';

  // Dati nuova Startup
  newStartupName: string = '';
  newStartupDesc: string = '';
  newStartupLogo: string = '';

  // Dati Nuovo Dipendente
  selectedStartupId: string = ''; // ID della startup a cui aggiungere il dipendente
  newEmpName: string = '';
  newEmpRole: string = '';
  newEmpImage: string = ''; // Base64 immagine dipendente

  // Liste Dati (Observable per aggiornamento real-time)
  startups$: Observable<Startup[]> = this.dbService.getStartups();
  activeEmployees$: Observable<ActiveEmployeeResult[]> = this.dbService.getAllActiveEmployees();

  activeGuests$: Observable<Guest[]> = this.dbService.getActiveGuests();

  constructor() {
    addIcons({peopleOutline,businessOutline,logOutOutline,cloudUploadOutline,personAddOutline,trashOutline});
  }

  // --- LOGICA DRAG & DROP ---
  
  // Gestisce il rilascio del file
  async onDrop(event: DragEvent, type: 'startup' | 'employee') {
    event.preventDefault();
    event.stopPropagation();
    
    // Rimuovi classe stile 'dragover' se la usi
    const element = event.target as HTMLElement;
    element.classList.remove('drag-active');

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFile(file, type);
    }
  }

  // Gestisce l'evento "Drag Over" (necessario per permettere il drop)
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const element = event.target as HTMLElement;
    element.classList.add('drag-active'); // Aggiunge effetto visivo
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const element = event.target as HTMLElement;
    element.classList.remove('drag-active');
  }

  // Converte File -> Base64
  private handleFile(file: File, type: 'startup' | 'employee') {
    if (!file.type.startsWith('image/')) {
      alert('Per favore carica solo immagini.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === 'startup') {
        this.newStartupLogo = result;
      } else {
        this.newEmpImage = result;
      }
    };
    reader.readAsDataURL(file);
  }

  // --- AZIONI STARTUP ---
async addStartup() {
    if (!this.newStartupName.trim()) return;

    await this.dbService.addStartup({
      name: this.newStartupName,
      logoUrl: this.newStartupLogo,
      employees: []
    });

    // Reset
    this.newStartupName = '';
    this.newStartupDesc = '';
    this.newStartupLogo = '';
  }

  async addEmployee() {
    if (!this.selectedStartupId || !this.newEmpName.trim()) return;

    const newEmployee: Employee = {
      name: this.newEmpName,
      role: this.newEmpRole,
      imageUrl: this.newEmpImage
    };

    await this.dbService.addEmployeeToStartup(this.selectedStartupId, newEmployee);

    // Reset parziale (mantengo la startup selezionata per aggiungerne altri)
    this.newEmpName = '';
    this.newEmpRole = '';
    this.newEmpImage = '';
  }

  deleteStartup(id: string) {
    if(confirm('Sei sicuro di voler eliminare questa startup?')) {
      this.dbService.deleteStartup(id);
    }
  }

  async deleteEmployee(employee: Employee) {
    if (!this.selectedStartupId) return;

    const confirmDelete = confirm(`Vuoi rimuovere ${employee.name} dal team?`);
    if (!confirmDelete) return;

    try {
      await this.dbService.removeEmployeeFromStartup(this.selectedStartupId, employee.name);
      console.log('Dipendente rimosso');
    } catch (error) {
      console.error('Errore rimozione:', error);
    }
  }

  checkEmployeeOut(employee: Employee) {
    if(confirm('Confermi l\'uscita del dipendente?')) {
      this.dbService.updateEmployeeStatus(this.selectedStartupId, employee.name, 'OUT');
    }

  }
  // --- AZIONI OSPITI ---
  checkOut(guest: Guest) {
    if(confirm('Confermi l\'uscita dell\'ospite?')) {
      this.dbService.checkOutGuest(guest);
    }
  }
}