import { Injectable, inject } from '@angular/core';

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

  // 1. Aggiungi Startup (con logo opzionale)
  async addStartup(startup: Startup) {
    const startupsRef = collection(this.firestore, 'startups');
    // Assicuriamoci che l'array employees sia inizializzato
    if (!startup.employees) {
      startup.employees = [];
    }
    return addDoc(startupsRef, startup);
  }

  // 2. Aggiungi Dipendente a una Startup esistente
  async addEmployeeToStartup(startupId: string, employee: Employee) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    // arrayUnion aggiunge l'elemento solo se non esiste già (evita duplicati esatti)
    return updateDoc(startupRef, {
      employees: arrayUnion(employee)
    });
  }

async removeEmployeeFromStartup(startupId: string, employee: Employee) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    
    // arrayRemove cerca l'oggetto identico nell'array e lo rimuove
    return updateDoc(startupRef, {
      employees: arrayRemove(employee)
    });
  }
  // 3. Rimuovi Dipendente (Opzionale, serve logica più complessa per rimuovere da array, 
  // per ora sovrascriviamo l'intero array se necessario, ma arrayRemove richiede l'oggetto esatto)

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