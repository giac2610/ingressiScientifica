import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { 
  Firestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  arrayUnion,
  getDoc,
  arrayRemove
} from '@angular/fire/firestore'; 

import { Observable } from 'rxjs';

// INTERFACCE DATI
export interface Guest {
  id?: string;
  name: string;
  reason: string;
  entryTime: string;
  exitTime?: string;
  status: 'IN' | 'OUT';
  signatureUrl?: string;
}

export interface Startup {
  id?: string;
  name: string;
  logoUrl?: string;
  employees: Employee[];
}

export interface Employee {
  name: string;
  role?: string;
  imageUrl?: string;
  status?: 'IN' | 'OUT';
  lastEntryTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  // Inietta l'istanza Firestore di Angular
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  
  // URL del Google Apps Script per logging su Google Sheets
  private googleStartupScriptUrl = 'https://script.google.com/macros/s/AKfycby6IM_hyL-AjcfUkXAsjRW5DONEr6cDDC2zXKr0FcuuEJ6zx_TmgZuJtvJk4Ciyhooa/exec';
  private googleGuestScriptUrl = 'https://script.google.com/macros/s/AKfycbxFpx0-jaKYcHvuFzouPDsSAwvGzKB6JlS5LmHJ7f4YdNrn3cYR7tiVCI5otI4ncoma/exec'

  constructor() { }

  private getCollectionData<T>(queryRef: any): Observable<T[]> {
    return new Observable((observer) => {
      const unsubscribe = onSnapshot(queryRef, 
        (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          }));
          observer.next(data);
        },
        (error: any) => observer.error(error)
      );
      return () => unsubscribe();
    });
  }

  // ==========================================
  // GESTIONE OSPITI
  // ==========================================

  async checkInGuest(guest: Guest) {

    const guestsRef = collection(this.firestore, 'guests');
    return addDoc(guestsRef, {
      ...guest,
      entryTime: new Date().toISOString(),
      status: 'IN'
    });
  }

  async checkOutGuest(guestId: string) {
    // Anche 'doc' deve venire da @angular/fire
    const guestRef = doc(this.firestore, 'guests', guestId);
    return updateDoc(guestRef, {
      exitTime: new Date().toISOString(),
      status: 'OUT'
    });
  }

  getActiveGuests(): Observable<Guest[]> {
    const guestsRef = collection(this.firestore, 'guests');
    // Nota: Se l'ordinamento crea errori di indice mancante, prova a rimuovere temporaneamente orderBy
    const q = query(guestsRef, where('status', '==', 'IN'), orderBy('entryTime', 'desc'));
    return this.getCollectionData<Guest>(q);
  }

  getAllGuestsHistory(): Observable<Guest[]> {
    const guestsRef = collection(this.firestore, 'guests');
    const q = query(guestsRef, orderBy('entryTime', 'desc'));
    return this.getCollectionData<Guest>(q);
  }

// ==========================================
  // GESTIONE STARTUP & DIPENDENTI
  // ==========================================

  // Aggiungi Startup
  async addStartup(startup: Startup) {
    const startupsRef = collection(this.firestore, 'startups');
    // Assicuriamoci che l'array employees sia inizializzato
    if (!startup.employees) {
      startup.employees = [];
    }
    return addDoc(startupsRef, startup);
  }

  // Aggiungi Dipendente a una Startup esistente
// IMPORTANTE: Quando aggiungi un dipendente, inizializzalo con status 'OUT'
  async addEmployeeToStartup(startupId: string, employee: Employee) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    const newEmp = { ...employee, status: 'OUT' }; // Default OUT
    return updateDoc(startupRef, { employees: arrayUnion(newEmp) });
  }

  // logga l'azione di ingresso/uscita del dipendente su Google Sheets
  logEmployeeActionToSheet(employee: Employee, startupName: string, action: 'INGRESSO' | 'USCITA') {
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT'); // Es. 28/11/2025
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); // Es. 09:30

    // Ottieni "dicembre 2025"
    let sheetName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    // Rendi la prima lettera maiuscola
    sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);

    const sheetPayload = {
      targetSheet: sheetName, // Nome del foglio basato sulla data (es. 28-11-2025)
      action: action, // Diciamo allo script cosa fare
      data: {
        Data: dateStr,
        Dipendente: employee.name,
        Ruolo: employee.role,
        Azienda: startupName,
        Ora: timeStr // Questa sarà usata come Ingresso o Uscita a seconda dell'action
      }
    };

    // Invio
    this.http.post(this.googleStartupScriptUrl, JSON.stringify(sheetPayload), {
      headers: { 'Content-Type': 'text/plain' }
    }).subscribe({
      next: () => console.log(`Log ${action} inviato`),
      error: (e) => console.error('Errore log sheet', e)
    });
  }

  logGuestActionToSheet(guest: Guest, action: 'INGRESSO' | 'USCITA') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT'); // Es. 28/11/2025
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); // Es. 09:30

    // Ottieni "dicembre 2025"
    let sheetName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    // Rendi la prima lettera maiuscola
    sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);

    const sheetPayload = {
      targetSheet: sheetName, // Nome del foglio basato sulla data (es. 28-11-2025)
      action: action, // Diciamo allo script cosa fare
      data: {
        Data: dateStr,
        Dipendente: guest.name,
        Motivazione: guest.reason,
        Firma: guest.signatureUrl || "N/A",
        Ora: timeStr // Questa sarà usata come Ingresso o Uscita a seconda dell'action
      }
    };

    // Invio
    this.http.post(this.googleGuestScriptUrl, JSON.stringify(sheetPayload), {
      headers: { 'Content-Type': 'text/plain' }
    }).subscribe({
      next: () => console.log(`Log ${action} inviato`),
      error: (e) => console.error('Errore log sheet', e)
    });
  }

  // async removeEmployeeFromStartup(startupId: string, employee: Employee) {
  //   const startupRef = doc(this.firestore, 'startups', startupId);
    
  //   // arrayRemove cerca l'oggetto identico nell'array e lo rimuove
  //   return updateDoc(startupRef, {
  //     employees: arrayRemove(employee)
  //   });
  // }

  async removeEmployeeFromStartup(startupId: string, employeeName: string) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    const snapshot = await getDoc(startupRef);
    if (!snapshot.exists()) return;
    const employees = (snapshot.data() as Startup).employees || [];
    const updatedEmployees = employees.filter(e => e.name !== employeeName);
    return updateDoc(startupRef, { employees: updatedEmployees });
  }
  getStartups(): Observable<Startup[]> {
    const startupsRef = collection(this.firestore, 'startups');
    const q = query(startupsRef, orderBy('name', 'asc'));
    return this.getCollectionData<Startup>(q);
  }

  deleteStartup(id: string) {
    const docRef = doc(this.firestore, 'startups', id);
    return deleteDoc(docRef);
  }

  // Aggiorna lo stato del dipendente DENTRO l'array della startup
  async updateEmployeeStatus(startupId: string, employeeName: string, newStatus: 'IN' | 'OUT') {
    const startupRef = doc(this.firestore, 'startups', startupId);
    
    // 1. Leggi il documento attuale
    const snapshot = await getDoc(startupRef);
    if (!snapshot.exists()) throw new Error("Startup non trovata");
    
    const startupData = snapshot.data() as Startup;
    const employees = startupData.employees || [];

    // 2. Trova e modifica il dipendente nell'array locale
    const updatedEmployees = employees.map(emp => {
      if (emp.name === employeeName) {
        return { 
          ...emp, 
          status: newStatus,
          lastEntryTime: new Date().toISOString() // Aggiorna timestamp
        };
      }
      return emp;
    });

    // 3. Sovrascrivi l'array nel database
    return updateDoc(startupRef, { employees: updatedEmployees });
  }
}