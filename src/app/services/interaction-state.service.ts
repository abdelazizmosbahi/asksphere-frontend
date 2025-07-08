import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InteractionStateService {
  private isNotificationPopupOpen = new BehaviorSubject<boolean>(false);
  private isChatbotOpen = new BehaviorSubject<boolean>(false);

  setNotificationPopupState(isOpen: boolean): void {
    this.isNotificationPopupOpen.next(isOpen);
    if (isOpen) {
      this.isChatbotOpen.next(false);
    }
  }

  setChatbotState(isOpen: boolean): void {
    this.isChatbotOpen.next(isOpen);
    if (isOpen) {
      this.isNotificationPopupOpen.next(false);
    }
  }

  getNotificationPopupState(): Observable<boolean> {
    return this.isNotificationPopupOpen.asObservable();
  }

  getChatbotState(): Observable<boolean> {
    return this.isChatbotOpen.asObservable();
  }
}