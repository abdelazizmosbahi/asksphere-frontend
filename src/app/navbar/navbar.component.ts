import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  searchQuery: string = '';
  notifications: any[] = [];
  unreadNotificationsCount: number = 0;
  sidebarCollapsed: boolean = false; // Shared state with sidebar

  @Output() sidebarToggled = new EventEmitter<boolean>(); // Emit toggle event to parent (home)

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.sidebarToggled.emit(this.sidebarCollapsed); // Notify home component
  }

  loadNotifications() {
    this.http.get(`${environment.apiUrl}/notifications`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        if (!Array.isArray(response)) {
          console.error('Expected an array of notifications, but got:', response);
          this.toastr.error('Invalid notifications data received', 'Error');
          this.notifications = [];
          return;
        }

        this.notifications = response.map((notification: any) => ({
          id: notification._id,
          type: notification.type,
          questionId: notification.questionId || null,
          answerId: notification.type === 'answer' ? notification.relatedId : null,
          message: notification.message,
          isRead: notification.read,
          createdAt: this.formatTime(notification.dateCreated)
        }));
        this.unreadNotificationsCount = this.notifications.filter(n => !n.isRead).length;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching notifications:', err);
        this.toastr.error('Error fetching notifications', 'Error');
        this.notifications = [];
      }
    });
  }

  onNotificationClick(notification: any) {
    this.markAsRead(notification.id);
    if (notification.type === 'vote') {
      if (notification.questionId) {
        this.router.navigate(['/question', notification.questionId]);
      } else {
        this.toastr.error('Question ID not available for this notification', 'Error');
      }
    } else if (notification.type === 'answer' && notification.answerId) {
      if (notification.questionId) {
        this.router.navigate(['/question', notification.questionId], { fragment: `answer-${notification.answerId}` });
      } else {
        this.toastr.error('Question ID not available for this notification', 'Error');
      }
    } else {
      this.toastr.error('Invalid notification type or missing related ID', 'Error');
    }
  }

  markAsRead(notificationId: string) {
    this.http.post(
      `${environment.apiUrl}/notifications/mark-read`,
      { notificationIds: [notificationId] },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.isRead = true;
          this.unreadNotificationsCount = this.notifications.filter(n => !n.isRead).length;
        }
        console.log(`Notification ${notificationId} marked as read`);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error marking notification as read:', err);
        this.toastr.error('Error marking notification as read', 'Error');
      }
    });
  }

  logout() {
    this.http.get(`${environment.apiUrl}/logout`, { withCredentials: true }).subscribe({
      next: () => {
        this.authService.logout();
        this.toastr.success('Logged out successfully', 'Success');
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        this.toastr.error('Error logging out', 'Error');
        console.error('Error logging out:', err);
        this.router.navigate(['/login']);
      }
    });
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }

  formatTime(dateCreated: string): string {
    const now = new Date();
    const created = new Date(dateCreated);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `${diffMins} mins ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }
    return created.toLocaleDateString();
  }
}