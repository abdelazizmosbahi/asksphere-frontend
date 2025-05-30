import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  signup(signupData: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, signupData, { withCredentials: true }).pipe(
      catchError(error => {
        return throwError(error.error);
      })
    );
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { username, password }, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.get(`${this.apiUrl}/logout`, { withCredentials: true });
  }

  isLoggedIn(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/users/me`, { withCredentials: true });
  }

  validateField(field: string, value: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/validate-field`, { field, value }, { withCredentials: true }).pipe(
      catchError(error => {
        return throwError(error.error);
      })
    );
  }
}