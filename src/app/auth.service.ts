import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  signup(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { username, password }, { withCredentials: true });
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { username, password }, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.get(`${this.apiUrl}/logout`, { withCredentials: true });
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/users/me`, { withCredentials: true });
  }

  isLoggedIn(): Observable<any> {
    return this.getCurrentUser(); // Check if user is logged in by hitting a protected route
  }
}