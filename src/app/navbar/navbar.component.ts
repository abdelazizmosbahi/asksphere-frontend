import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  notifications: any[] = [];
  unreadNotificationsCount: number = 0;
  sidebarCollapsed: boolean = false;
  isNotificationsPage: boolean = false;
  private routerSubscription!: Subscription;

  @Output() sidebarToggled = new EventEmitter<boolean>();

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadNotifications();
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isNotificationsPage = event.url === '/notifications';
        if (!this.isNotificationsPage) {
          this.loadNotifications();
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.sidebarToggled.emit(this.sidebarCollapsed);
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
    // Mark the notification as read
    this.markAsRead(notification.id);

    // Close the modal before navigating
    const modalElement = document.getElementById('notificationsModal');
    if (modalElement) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (bootstrapModal) {
        // Hide the modal and wait for it to finish closing
        bootstrapModal.hide();
        // Listen for the 'hidden.bs.modal' event to ensure the modal is fully closed
        modalElement.addEventListener('hidden.bs.modal', () => {
          // Clean up the backdrop and body classes
          this.cleanupModalBackdrop();
          // Handle navigation after the modal is fully closed
          this.navigateAfterModalClose(notification);
        }, { once: true }); // Ensure the event listener is only called once
      } else {
        // If the modal instance isn’t found, clean up manually and navigate
        this.cleanupModalBackdrop();
        this.navigateAfterModalClose(notification);
      }
    } else {
      // If the modal element isn’t found, just navigate
      this.navigateAfterModalClose(notification);
    }
  }

  private cleanupModalBackdrop() {
    // Remove the backdrop manually
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
    // Remove modal-open class and reset body styles
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  private navigateAfterModalClose(notification: any) {
    // Handle navigation based on notification type
    if (notification.type === 'answer' || notification.type === 'vote') {
      if (notification.questionId) {
        const fragment = notification.type === 'answer' && notification.answerId ? `answer-${notification.answerId}` : undefined;
        this.router.navigate([`/question/${notification.questionId}`], { fragment });
      } else {
        this.toastr.error('The related question or answer has been deleted.', 'Error');
      }
    } else {
      if (notification.type === 'badge') {
        this.toastr.info('Badge earned! No action required.', 'Info');
      }
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