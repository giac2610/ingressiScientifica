import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  collectionData, 
  query, 
  where, 
  orderBy,
  deleteDoc // Aggiunto se serve per il backoffice
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

// INTERFACCE DATI
export interface Guest {
  id?: string;
  name: string;
  reason: string; 
  entryTime: string;   // ISO String
  exitTime?: string;   // ISO String o null
  status: 'IN' | 'OUT';
  signatureUrl?: string; // Base64 o URL storage
}

export interface Startup {
  id?: string;
  name: string;
  logo?: string;
  employees: Employee[];
}

export interface Employee {
  name: string;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private firestore = inject(Firestore);

  constructor() { }

  // ==========================================
  // GESTIONE OSPITI (Guests)
  // ==========================================

  // 1. Registra Ingresso Ospite
  async checkInGuest(guest: Guest) {
    const guestsRef = collection(this.firestore, 'guests');
    return addDoc(guestsRef, {
      ...guest,
      entryTime: new Date().toISOString(),
      status: 'IN'
    });
  }

  // 2. Registra Uscita Ospite
  async checkOutGuest(guestId: string) {
    const guestRef = doc(this.firestore, 'guests', guestId);
    return updateDoc(guestRef, {
      exitTime: new Date().toISOString(),
      status: 'OUT'
    });
  }

  // 3. Ottieni lista ospiti ATTUALI (Stato 'IN')
  getActiveGuests(): Observable<Guest[]> {
    const guestsRef = collection(this.firestore, 'guests');
    // const q = query(guestsRef, where('status', '==', 'IN'), orderBy('entryTime', 'desc'));
    const q = query(guestsRef, where('status', '==', 'IN'));
    return collectionData(q, { idField: 'id' }) as Observable<Guest[]>;
  }

  // 4. Ottieni storico completo (per Excel)
  getAllGuestsHistory(): Observable<Guest[]> {
    const guestsRef = collection(this.firestore, 'guests');
    const q = query(guestsRef, orderBy('entryTime', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Guest[]>;
  }

  // ==========================================
  // GESTIONE STARTUP
  // ==========================================

  addStartup(startup: Startup) {
    const startupsRef = collection(this.firestore, 'startups');
    return addDoc(startupsRef, startup);
  }

  // Elimina Startup
  deleteStartup(id: string) {
    const docRef = doc(this.firestore, 'startups', id);
    return deleteDoc(docRef);
  }

  getStartups(): Observable<Startup[]> {
    const startupsRef = collection(this.firestore, 'startups');
    return collectionData(startupsRef, { idField: 'id' }) as Observable<Startup[]>;
  }

  getEmployeesOfStartup(startupId: string): Observable<Employee[]> {
    const startupRef = doc(this.firestore, 'startups', startupId);
    return collectionData(collection(startupRef, 'employees'), { idField: 'id' }) as Observable<Employee[]>;
  }

}