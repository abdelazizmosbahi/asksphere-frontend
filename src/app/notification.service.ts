import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Notification {
  _id: string;
  message: string;
  type: string;
  relatedId: string | null;
  answerId?: string; // Add answerId for answer notifications
  read: boolean;
  dateCreated: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<Notification[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`, { headers, withCredentials: true });
  }

  markNotificationsAsRead(notificationIds: string[]): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    const body = { notificationIds };
    return this.http.post(`${this.apiUrl}/notifications/mark-read`, body, { headers, withCredentials: true });
  }

  getBadges(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return this.http.get(`${this.apiUrl}/badges`, { headers, withCredentials: true });
  }
}