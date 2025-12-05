import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

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

import { lastValueFrom, Observable } from 'rxjs';

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
export interface ActiveEmployeeResult {
  employee: Employee;
  startup: Startup;
}

export interface Reason { id?: string; text: string; } // Per "Ospiti" (Motivazioni)
export interface Supplier { id?: string; name: string; } // Per "Fornitori"
// Utenti Terzi è identica a Startup come struttura
export interface ThirdParty { id?: string; name: string; logoUrl?: string; employees: Employee[]; }

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
    try {
      const guestsRef = collection(this.firestore, 'guests');
      const docRef = addDoc(guestsRef, {
        ...guest,
        entryTime: new Date().toISOString(),
        status: 'IN'
      });
      console.log('Salvato su Firebase!');
      await lastValueFrom(this.logGuestActionToSheet(guest, "INGRESSO"))
      console.log('Logsheet INGRESSO inviato con successo');
      return true;
    }catch (error) {
      console.log('Errore logsheet, contattare amministratore', error);
      return false;
    } 
  }

async checkOutGuest(guest: Guest) {
    if (!guest.id) return false;

    try {
      // Aggiorna lo stato su Firestore, potenzialmente inutile
      const guestRef = doc(this.firestore, 'guests', guest.id);
      await updateDoc(guestRef, {
        exitTime: new Date().toISOString(),
        status: 'OUT'
      });

      // Logga su Google Sheet
      // Usiamo lastValueFrom per trasformare l'Observable in una Promise e attenderla
      await lastValueFrom(this.logGuestActionToSheet(guest, "USCITA"));
      console.log('Logsheet USCITA inviato con successo');

      await this.deleteGuest(guest.id);
      console.log('Ospite rimosso da Firestore');

      return true;
    } catch (error) {
      console.error('Errore durante il Check-Out (Log fallito?):', error);
      return false;
    }
  }

  logGuestActionToSheet(guest: Guest, action: 'INGRESSO' | 'USCITA'): Observable<any> {
      const now = new Date();
      const dateStr = now.toLocaleDateString('it-IT');
      const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

      let sheetName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);

      const sheetPayload = {
        targetSheet: sheetName,
        action: action,
        data: {
          Data: dateStr,
          Dipendente: guest.name,
          Motivazione: guest.reason,
          Firma: guest.signatureUrl || "N/A",
          Ora: timeStr
        }
      };

      // Ritorna direttamente la chiamata HTTP (Observable)
      return this.http.post(this.googleGuestScriptUrl, JSON.stringify(sheetPayload), {
        headers: { 'Content-Type': 'text/plain' }
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

  deleteGuest(id: string) {
    const docRef = doc(this.firestore, 'guests', id);
    return deleteDoc(docRef);
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
    const newEmp = { ...employee, status: 'OUT' }; // Default OUT
    return updateDoc(startupRef, { employees: arrayUnion(newEmp) });
  }

  getAllActiveEmployees(): Observable<ActiveEmployeeResult[]> {
    // 1. Prendi lo stream delle startup (che si aggiorna in tempo reale)
    return this.getStartups().pipe(
      // 2. Trasforma i dati
      map(startups => {
        const activeList: ActiveEmployeeResult[] = [];

        // Cicla su ogni startup
        for (const startup of startups) {
          if (startup.employees) {
            // Cicla su ogni dipendente della startup
            for (const emp of startup.employees) {
              // Se è PRESENTE, aggiungilo alla lista risultato
              if (emp.status === 'IN') {
                activeList.push({
                  employee: emp,
                  startup: startup // Passiamo l'intera startup (così hai nome, logo, id)
                });
              }
            }
          }
        }
        
        // Opzionale: Ordina per orario di ingresso più recente
        return activeList.sort((a, b) => {
          const timeA = a.employee.lastEntryTime || '';
          const timeB = b.employee.lastEntryTime || '';
          return timeB.localeCompare(timeA);
        });
      })
    );
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

  // 1. Modifica dati Startup (Nome, Logo, Descrizione)
  async updateStartup(startupId: string, data: Partial<Startup>) {
    const ref = doc(this.firestore, 'startups', startupId);
    return updateDoc(ref, data);
  }

  // 2. Modifica dati Dipendente (Trova il vecchio e lo sostituisce col nuovo)
  async updateEmployeeDetails(startupId: string, oldEmp: Employee, newEmp: Employee) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    
    // Leggi array attuale
    const snapshot = await getDoc(startupRef);
    if (!snapshot.exists()) throw new Error("Startup non trovata");
    const employees = (snapshot.data() as Startup).employees || [];

    // Trova e sostituisci
    const updatedEmployees = employees.map(e => {
      // Confrontiamo per nome e ruolo (o potremmo usare un ID se lo avessimo)
      if (e.name === oldEmp.name && e.role === oldEmp.role) {
        return { ...newEmp, status: e.status, lastEntryTime: e.lastEntryTime }; // Mantieni lo stato IN/OUT
      }
      return e;
    });

    return updateDoc(startupRef, { employees: updatedEmployees });
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
    this.logEmployeeActionToSheet(
      updatedEmployees.find(e => e.name === employeeName)!, 
      startupData.name, 
      newStatus === 'IN' ? 'INGRESSO' : 'USCITA'
    );
    // 3. Sovrascrivi l'array nel database
    return updateDoc(startupRef, { employees: updatedEmployees });
  }

  // ==========================================
  // GESTIONE MOTIVAZIONI (Per Ospiti)
  // ==========================================
  getReasons(): Observable<Reason[]> {
    const q = query(collection(this.firestore, 'reasons'), orderBy('text'));
    return this.getCollectionData<Reason>(q);
  }
  async addReason(text: string) {
    return addDoc(collection(this.firestore, 'reasons'), { text });
  }
  async deleteReason(id: string) {
    return deleteDoc(doc(this.firestore, 'reasons', id));
  }

  // ==========================================
  // GESTIONE FORNITORI
  // ==========================================
  getSuppliers(): Observable<Supplier[]> {
    const q = query(collection(this.firestore, 'suppliers'), orderBy('name'));
    return this.getCollectionData<Supplier>(q);
  }
  async addSupplier(name: string) {
    return addDoc(collection(this.firestore, 'suppliers'), { name });
  }
  async deleteSupplier(id: string) {
    return deleteDoc(doc(this.firestore, 'suppliers', id));
  }

  // ==========================================
  // UTENTI TERZI
  // ==========================================
  getThirdParties(): Observable<ThirdParty[]> {
    const q = query(collection(this.firestore, 'third_parties'), orderBy('name'));
    return this.getCollectionData<ThirdParty>(q);
  }
  async addThirdParty(tp: ThirdParty) {
    if (!tp.employees) tp.employees = [];
    return addDoc(collection(this.firestore, 'third_parties'), tp);
  }
  async deleteThirdParty(id: string) {
    return deleteDoc(doc(this.firestore, 'third_parties', id));
  }
  async updateThirdParty(id: string, data: Partial<ThirdParty>) {
    return updateDoc(doc(this.firestore, 'third_parties', id), data);
  }
  
  // Gestione Dipendenti Utenti Terzi
  async addEmployeeToThirdParty(tpId: string, employee: Employee) {
    const ref = doc(this.firestore, 'third_parties', tpId);
    const newEmp = { ...employee, status: 'OUT' };
    return updateDoc(ref, { employees: arrayUnion(newEmp) });
  }
  
  async removeEmployeeFromThirdParty(tpId: string, employeeName: string) {
    const ref = doc(this.firestore, 'third_parties', tpId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const employees = (snapshot.data() as ThirdParty).employees || [];
    const updatedEmployees = employees.filter(e => e.name !== employeeName);
    return updateDoc(ref, { employees: updatedEmployees });
  }

  async updateThirdPartyEmployeeStatus(tpId: string, employeeName: string, newStatus: 'IN' | 'OUT') {
    // Stessa logica di updateEmployeeStatus per Startup ma sulla collezione third_parties
    const ref = doc(this.firestore, 'third_parties', tpId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const employees = (snapshot.data() as ThirdParty).employees || [];
    const updatedEmployees = employees.map(emp => {
      if (emp.name === employeeName) {
        return { ...emp, status: newStatus, lastEntryTime: new Date().toISOString() };
      }
      return emp;
    });
    return updateDoc(ref, { employees: updatedEmployees });
  }

}