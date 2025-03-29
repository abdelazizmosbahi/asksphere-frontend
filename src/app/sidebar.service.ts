import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isCollapsedSubject: BehaviorSubject<boolean>;
  isCollapsed$;

  constructor() {
    const savedState = localStorage.getItem('sidebarCollapsed');
    const initialState = savedState ? JSON.parse(savedState) : true;
    this.isCollapsedSubject = new BehaviorSubject<boolean>(initialState);
    this.isCollapsed$ = this.isCollapsedSubject.asObservable();
  }

  toggleSidebar() {
    const newState = !this.isCollapsedSubject.value;
    this.isCollapsedSubject.next(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  }

  setCollapsed(isCollapsed: boolean) {
    this.isCollapsedSubject.next(isCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }

  getCollapsedState(): boolean {
    return this.isCollapsedSubject.value;
  }
}