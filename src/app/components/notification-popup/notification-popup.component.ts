import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { AiService } from '../../services/ai.service';
import { InteractionStateService } from '../../services/interaction-state.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-notification-popup',
  templateUrl: './notification-popup.component.html',
  styleUrls: ['./notification-popup.component.css']
})
export class NotificationPopupComponent implements OnInit, OnDestroy {
  isPopupOpen: boolean = false;
  notifications: { id: string; type: string; content: string; priority: string; timestamp: string; read: boolean }[] = [];
  unreadCount: number = 0;
  loading: boolean = false;
  error: string | null = null;
  isChatbotOpen: boolean = false;
  private userId: string | null = null;
  private authSubscription: Subscription | null = null;
  private pollSubscription: Subscription | null = null;
  private chatbotSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private aiService: AiService,
    private interactionStateService: InteractionStateService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService.isLoggedIn().subscribe({
      next: (user: any) => {
        this.userId = user._id || null;
        if (this.userId) {
          this.fetchNotifications();
          this.pollSubscription = interval(30000).subscribe(() => this.fetchNotifications());
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching user:', err);
        this.userId = null;
      }
    });
    this.chatbotSubscription = this.interactionStateService.getChatbotState().subscribe(isOpen => {
      this.isChatbotOpen = isOpen;
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
    if (this.chatbotSubscription) {
      this.chatbotSubscription.unsubscribe();
    }
  }

  togglePopup(): void {
    if (!this.isChatbotOpen) {
      this.isPopupOpen = !this.isPopupOpen;
      this.interactionStateService.setNotificationPopupState(this.isPopupOpen);
      if (this.isPopupOpen && this.userId && !this.loading) {
        this.fetchNotifications();
      }
    }
  }

  fetchNotifications(): void {
    if (!this.userId) {
      this.toastr.error('Please log in to view notifications', 'Error');
      this.router.navigate(['/login']);
      return;
    }
    this.loading = true;
    this.error = null;
    this.aiService.getNotifications(this.userId, 10).subscribe({
      next: (notifications) => {
        this.notifications = notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
        this.toastr.error('Error fetching notifications', 'Error');
      }
    });
  }

  markAsRead(notificationId: string): void {
    this.aiService.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
          this.unreadCount = this.notifications.filter(n => !n.read).length;
        }
        this.toastr.success('Notification marked as read', 'Success');
      },
      error: (err) => {
        this.toastr.error('Error marking notification as read', 'Error');
      }
    });
  }

  navigateToContent(notification: any): void {
    if (notification.type === 'question_response' || notification.type === 'vote') {
      const questionId = notification.content.match(/question\/([a-z0-9]+)/i)?.[1];
      if (questionId) {
        this.router.navigate([`/question/${questionId}`]);
      }
    } else if (notification.type === 'ban') {
      this.router.navigate(['/support/appeal']);
    }
  }

  resetUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  getPriorityColor(type: string): string {
    if (type === 'chatbot_response') return 'blue';
    if (type === 'ban') return 'red';
    return 'green';
  }
}