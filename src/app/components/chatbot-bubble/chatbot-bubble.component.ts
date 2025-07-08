import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { AiService } from '../../services/ai.service';
import { InteractionStateService } from '../../services/interaction-state.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chatbot-bubble',
  templateUrl: './chatbot-bubble.component.html',
  styleUrls: ['./chatbot-bubble.component.css']
})
export class ChatbotBubbleComponent implements OnInit, OnDestroy {
  isChatOpen: boolean = false;
  chatQuery: string = '';
  chatMessages: { text: string; isUser: boolean }[] = [];
  chatLoading: boolean = false;
  chatError: string | null = null;
  isNotificationPopupOpen: boolean = false;
  private userId: string | null = null;
  private authSubscription: Subscription | null = null;
  private notificationSubscription: Subscription | null = null;

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
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching user:', err);
        this.userId = null;
      }
    });
    this.notificationSubscription = this.interactionStateService.getNotificationPopupState().subscribe(isOpen => {
      this.isNotificationPopupOpen = isOpen;
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  toggleChat(): void {
    if (!this.isNotificationPopupOpen) {
      this.isChatOpen = !this.isChatOpen;
      this.interactionStateService.setChatbotState(this.isChatOpen);
    }
  }

  submitChatQuery(): void {
    if (!this.chatQuery.trim()) return;
    if (!this.userId) {
      this.toastr.error('Please log in to use the chatbot', 'Error');
      this.router.navigate(['/login']);
      return;
    }
    this.chatMessages.push({ text: this.chatQuery, isUser: true });
    this.chatLoading = true;
    this.chatError = null;
    this.aiService.askChatbot(this.userId, this.chatQuery).subscribe({
      next: (res) => {
        this.chatMessages.push({ text: res.response, isUser: false });
        this.chatLoading = false;
        this.chatQuery = '';
      },
      error: (err) => {
        this.chatError = err.message;
        this.chatLoading = false;
        this.toastr.error('Error contacting AI chatbot', 'Error');
      }
    });
  }
}