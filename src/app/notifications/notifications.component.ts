import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  user: any = null;
  username: string = '';
  notifications: any[] = [];
  badges: any[] = [];
  loading: boolean = true;
  displayedNotifications: any[] = [];
  currentIndex: number = 0;
  pageSize: number = 5;
  communityMap: Map<number, string> = new Map();

  communityId: number | null = null;
  communityName: string = '';
  searchQuery: string = '';
  communities: any[] = [];
  joinedCommunities: Set<number> = new Set();
  questions: any[] = [];
  relatedQuestions: any[] = [];
  userBadges: any[] = [];
  userMap: Map<string, string> = new Map();
  isMember: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService,
    private authService: AuthService
  ) {}

  sidebarCollapsed = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  ngOnInit(): void {
    this.authService.isLoggedIn().subscribe({
      next: (response: any) => {
        this.user = response;
        this.username = response.username;
        this.loadCommunities(); // Load communities to map IDs to names
        this.loadNotifications();
        this.loadBadges();
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error('Please log in to view notifications', 'Error');
        this.router.navigate(['/login']);
        this.loading = false;
      }
    });
  }

  loadCommunities() {
    this.http.get(`${environment.apiUrl}/communities`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        response.forEach((community: any) => {
          this.communityMap.set(community.idCommunity, community.name);
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching communities:', err);
        this.toastr.error('Error fetching communities', 'Error');
      }
    });
  }

  loadNotifications() {
    this.http.get(`${environment.apiUrl}/notifications`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        if (!Array.isArray(response)) {
          console.error('Expected an array of notifications, but got:', response);
          this.toastr.error('Invalid notifications data received', 'Error');
          this.notifications = [];
          this.loading = false;
          return;
        }

        this.notifications = response.map((notification: any) => {
          let message = notification.message;
          // Replace community ID with community name for flagged content notifications
          if (notification.message.includes('community')) {
            const match = notification.message.match(/community (\d+)/);
            if (match && match[1]) {
              const communityId = parseInt(match[1], 10);
              const communityName = this.communityMap.get(communityId) || `Community ${communityId}`;
              message = notification.message.replace(`community ${communityId}`, communityName);
            }
          }
          return {
            id: notification._id,
            type: notification.type,
            questionId: notification.questionId || null,
            answerId: notification.type === 'answer' ? notification.relatedId : null,
            message: message,
            isRead: notification.read,
            createdAt: this.formatTime(notification.dateCreated)
          };
        });
        console.log('Notifications loaded:', this.notifications);
        this.updateDisplayedNotifications();
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching notifications:', err);
        this.toastr.error('Error fetching notifications', 'Error');
        this.notifications = [];
        this.loading = false;
      }
    });
  }

  loadBadges() {
    this.http.get(`${environment.apiUrl}/badges`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.badges = response;
        console.log('Badges loaded:', this.badges);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching badges:', err);
        this.toastr.error('Error fetching badges', 'Error');
        this.badges = [];
      }
    });
  }

  formatTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `${diffMins} mins ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }
    return date.toLocaleDateString();
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
        }
        console.log(`Notification ${notificationId} marked as read`);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error marking notification as read:', err);
        this.toastr.error('Error marking notification as read', 'Error');
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

  logout() {
    this.http.get(`${environment.apiUrl}/logout`, { withCredentials: true }).subscribe({
      next: () => {
        this.toastr.success('Logged out successfully', 'Success');
        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error logging out:', err);
        this.toastr.error('Error logging out', 'Error');
        this.router.navigate(['/login']);
      }
    });
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }
  
  getCommunityName(communityId: number): string {
    return this.communityMap.get(communityId) || `Community ${communityId}`;
  }

  onSidebarToggled(event: boolean) {
    this.sidebarCollapsed = event;
  }

  updateDisplayedNotifications() {
    const start = this.currentIndex;
    const end = Math.min(start + this.pageSize, this.notifications.length);
    this.displayedNotifications = this.notifications.slice(start, end);
  }

  showMore() {
    this.currentIndex += this.pageSize;
    this.updateDisplayedNotifications();
  }

  showLess() {
    this.currentIndex = Math.max(0, this.currentIndex - this.pageSize);
    this.updateDisplayedNotifications();
  }
}