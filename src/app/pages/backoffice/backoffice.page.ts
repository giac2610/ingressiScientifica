import { Employee } from './../../services/database';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, 
  IonLabel, IonList, IonItem, IonInput, IonButton, IonIcon, IonCard, IonCardContent,
  IonGrid, IonRow, IonCol, IonAvatar, IonBadge
} from '@ionic/angular/standalone';
import { DatabaseService, Startup, Guest } from 'src/app/services/database';
import { Observable } from 'rxjs';
import { addIcons } from 'ionicons';
import { trashOutline, businessOutline, peopleOutline, logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-backoffice',
  templateUrl: './backoffice.page.html',
  styleUrls: ['./backoffice.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, 
    IonLabel, IonList, IonItem, IonInput, IonButton, IonIcon, IonCard, IonCardContent,
    IonAvatar, IonBadge
  ]
})
export class BackofficePage {
  private dbService = inject(DatabaseService);

  // Tab selezionata ('startups' o 'guests')
  selectedSegment: string = 'guests';

  // Dati Form Startup
  newStartupName: string = '';
  newStartupDesc: string = '';

  // Liste Dati (Observable per aggiornamento real-time)
  startups$: Observable<Startup[]> = this.dbService.getStartups();
  activeGuests$: Observable<Guest[]> = this.dbService.getActiveGuests();

  constructor() {
    addIcons({ trashOutline, businessOutline, peopleOutline, logOutOutline });
  }

  // --- AZIONI STARTUP ---
  async addStartup() {
    if (!this.newStartupName.trim()) return;

    await this.dbService.addStartup({
      name: this.newStartupName,
      employees: []
    });

    // Reset Form
    this.newStartupName = '';
    this.newStartupDesc = '';
  }

  deleteStartup(id: string) {
    if(confirm('Sei sicuro di voler eliminare questa startup?')) {
      this.dbService.deleteStartup(id);
    }
  }

  // --- AZIONI OSPITI ---
  checkOut(guestId: string) {
    if(confirm('Confermi l\'uscita dell\'ospite?')) {
      this.dbService.checkOutGuest(guestId);
    }
  }
}