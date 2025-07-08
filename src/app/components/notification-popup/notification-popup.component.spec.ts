import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { NotificationPopupComponent } from './notification-popup.component';
import { AuthService } from '../../auth.service';
import { AiService } from '../../services/ai.service';
import { InteractionStateService } from '../../services/interaction-state.service';
import { of } from 'rxjs';

describe('NotificationPopupComponent', () => {
  let component: NotificationPopupComponent;
  let fixture: ComponentFixture<NotificationPopupComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let aiServiceSpy: jasmine.SpyObj<AiService>;
  let toastrServiceSpy: jasmine.SpyObj<ToastrService>;
  let interactionStateServiceSpy: jasmine.SpyObj<InteractionStateService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    aiServiceSpy = jasmine.createSpyObj('AiService', ['getNotifications', 'markNotificationAsRead']);
    toastrServiceSpy = jasmine.createSpyObj('ToastrService', ['error', 'success']);
    interactionStateServiceSpy = jasmine.createSpyObj('InteractionStateService', ['setNotificationPopupState', 'getNotificationPopupState', 'getChatbotState']);
    interactionStateServiceSpy.getChatbotState.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [
        NotificationPopupComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        ToastrModule.forRoot()
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AiService, useValue: aiServiceSpy },
        { provide: ToastrService, useValue: toastrServiceSpy },
        { provide: InteractionStateService, useValue: interactionStateServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle popup, fetch notifications, and not mark as read automatically', () => {
    authServiceSpy.isLoggedIn.and.returnValue(of({ _id: 'user123' }));
    const mockNotifications = [
      { id: '1', type: 'question_response', content: 'New response to your question', priority: 'high', timestamp: '2025-07-08T12:00:00Z', read: false },
      { id: '2', type: 'vote', content: 'Vote on question/abc123', priority: 'medium', timestamp: '2025-07-08T12:01:00Z', read: false }
    ];
    aiServiceSpy.getNotifications.and.returnValue(of(mockNotifications));
    component.userId = 'user123';
    component.togglePopup();
    expect(component.isPopupOpen).toBeTrue();
    expect(aiServiceSpy.getNotifications).toHaveBeenCalledWith('user123', 10);
    expect(component.loading).toBeTrue();
    fixture.detectChanges();
    expect(component.notifications.length).toBe(2);
    expect(component.unreadCount).toBe(2);
    expect(component.notifications.every(n => !n.read)).toBeTrue();
  });

  it('should not toggle popup when chatbot is open', () => {
    interactionStateServiceSpy.getChatbotState.and.returnValue(of(true));
    component.ngOnInit();
    component.togglePopup();
    expect(component.isPopupOpen).toBeFalse();
    expect(interactionStateServiceSpy.setNotificationPopupState).not.toHaveBeenCalled();
  });

  it('should require login for notifications', () => {
    component.fetchNotifications();
    expect(toastrServiceSpy.error).toHaveBeenCalledWith('Please log in to view notifications', 'Error');
  });

  it('should fetch notifications and update unread count', () => {
    authServiceSpy.isLoggedIn.and.returnValue(of({ _id: 'user123' }));
    const mockNotifications = [
      { id: '1', type: 'question_response', content: 'New response to your question', priority: 'high', timestamp: '2025-07-08T12:00:00Z', read: false },
      { id: '2', type: 'vote', content: 'Vote on question/abc123', priority: 'medium', timestamp: '2025-07-08T12:01:00Z', read: true }
    ];
    aiServiceSpy.getNotifications.and.returnValue(of(mockNotifications));
    component.ngOnInit();
    expect(component.notifications.length).toBe(2);
    expect(component.unreadCount).toBe(1);
  });

  it('should mark notification as read and update unread count only when explicitly marked', () => {
    authServiceSpy.isLoggedIn.and.returnValue(of({ _id: 'user123' }));
    const mockNotifications = [
      { id: '1', type: 'question_response', content: 'New response to your question', priority: 'high', timestamp: '2025-07-08T12:00:00Z', read: false }
    ];
    aiServiceSpy.getNotifications.and.returnValue(of(mockNotifications));
    aiServiceSpy.markNotificationAsRead.and.returnValue(of({ message: 'Notification marked as read' }));
    component.ngOnInit();
    component.markAsRead('1');
    expect(component.notifications[0].read).toBeTrue();
    expect(component.unreadCount).toBe(0);
    expect(toastrServiceSpy.success).toHaveBeenCalledWith('Notification marked as read', 'Success');
  });
});