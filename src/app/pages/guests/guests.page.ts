import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ElementRef, OnDestroy, AfterViewInit, ViewChild, Renderer2 } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonRow, IonGrid } from '@ionic/angular/standalone';
@Component({
  selector: 'app-guests',
  templateUrl: './guests.page.html',
  styleUrls: ['./guests.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle,],
})
export class GuestsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
