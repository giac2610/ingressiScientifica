import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackofficePage } from './backoffice.page';

describe('BackofficePage', () => {
  let component: BackofficePage;
  let fixture: ComponentFixture<BackofficePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BackofficePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
