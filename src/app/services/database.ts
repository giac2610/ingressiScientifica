import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// IMPORTA TUTTO DA @angular/fire/firestore
// Questo assicura che le funzioni (collection, addDoc) siano compatibili con l'oggetto Firestore iniettato
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
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  // Inietta l'istanza Firestore di Angular
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  
  // URL del Google Apps Script per logging su Google Sheets
  private googleStartupScriptUrl = 'https://script.google.com/macros/s/AKfycby6IM_hyL-AjcfUkXAsjRW5DONEr6cDDC2zXKr0FcuuEJ6zx_TmgZuJtvJk4Ciyhooa/exec'; // Sostituisci con il tuo URL

  constructor() { }

  // --- HELPER PRIVATO: Crea un Observable manualmente usando onSnapshot ---
  // Usiamo questo approccio "manuale" invece di collectionData per evitare
  // conflitti di versione o errori di tipo "Type does not match"
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
      // Pulizia quando l'observable viene chiuso
      return () => unsubscribe();
    });
  }

  // ==========================================
  // GESTIONE OSPITI
  // ==========================================

  async checkInGuest(guest: Guest) {
    // Ora 'collection' proviene da @angular/fire e accetta 'this.firestore'
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
  async addEmployeeToStartup(startupId: string, employee: Employee) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    // arrayUnion aggiunge l'elemento solo se non esiste già (evita duplicati esatti)
    return updateDoc(startupRef, {
      employees: arrayUnion(employee)
    });
  }

  // logga l'azione di ingresso/uscita del dipendente su Google Sheets
  logEmployeeActionToSheet(employee: Employee, startupName: string, action: 'INGRESSO' | 'USCITA') {
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT'); // Es. 28/11/2025
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); // Es. 09:30

    const sheetPayload = {
      targetSheet: 'Ingressi Startup',
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

async removeEmployeeFromStartup(startupId: string, employee: Employee) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    
    // arrayRemove cerca l'oggetto identico nell'array e lo rimuove
    return updateDoc(startupRef, {
      employees: arrayRemove(employee)
    });
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
}