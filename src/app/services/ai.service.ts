import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private aiApiUrl = environment.aiApiUrl;

  constructor(private http: HttpClient) {}

  askChatbot(userId: string, query: string): Observable<{ user_id: string; query: string; response: string }> {
    return this.http
      .post<{ user_id: string; query: string; response: string }>(
        `${this.aiApiUrl}/chatbot`,
        { user_id: userId, query }
      )
      .pipe(
        map((res) => res),
        catchError(this.handleError)
      );
  }

  getNotifications(userId: string, limit: number = 10): Observable<{ id: string; type: string; content: string; priority: string; timestamp: string; read: boolean }[]> {
    return this.http
      .get<{ id: string; type: string; content: string; priority: string; timestamp: string; read: boolean }[]>(
        `${this.aiApiUrl}/notifications/${userId}?limit=${limit}`
      )
      .pipe(
        map((res) => res),
        catchError(this.handleError)
      );
  }

  markNotificationAsRead(notificationId: string): Observable<{ message: string }> {
    return this.http
      .put<{ message: string }>(
        `${this.aiApiUrl}/notifications/${notificationId}/read`,
        {}
      )
      .pipe(
        map((res) => res),
        catchError(this.handleError)
      );
  }

  moderateContent(userId: string, content: string): Observable<{ user_id: string; content: string; toxicity_score: number; action: string; violation_count?: number }> {
    return this.http
      .post<{ user_id: string; content: string; toxicity_score: number; action: string; violation_count?: number }>(
        `${this.aiApiUrl}/moderate`,
        { user_id: userId, content }
      )
      .pipe(
        map((res) => res),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('AI Service Error:', error);
    let errorMessage = 'An error occurred while contacting the AI service.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}