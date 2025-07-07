import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { ChatbotBubbleComponent } from './chatbot-bubble.component';
import { AuthService } from '../../auth.service';
import { AiService } from '../../services/ai.service';
import { of } from 'rxjs';

describe('ChatbotBubbleComponent', () => {
  let component: ChatbotBubbleComponent;
  let fixture: ComponentFixture<ChatbotBubbleComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let aiServiceSpy: jasmine.SpyObj<AiService>;
  let toastrServiceSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    aiServiceSpy = jasmine.createSpyObj('AiService', ['askChatbot']);
    toastrServiceSpy = jasmine.createSpyObj('ToastrService', ['error']);

    await TestBed.configureTestingModule({
      imports: [
        ChatbotBubbleComponent,
        HttpClientTestingModule,
        FormsModule,
        RouterTestingModule,
        ToastrModule.forRoot()
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AiService, useValue: aiServiceSpy },
        { provide: ToastrService, useValue: toastrServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle chat window', () => {
    expect(component.isChatOpen).toBeFalse();
    component.toggleChat();
    expect(component.isChatOpen).toBeTrue();
    component.toggleChat();
    expect(component.isChatOpen).toBeFalse();
  });

  it('should require login for chat query', () => {
    component.chatQuery = 'test';
    component.submitChatQuery();
    expect(toastrServiceSpy.error).toHaveBeenCalledWith('Please log in to use the chatbot', 'Error');
  });

  it('should submit chat query and add messages', () => {
    authServiceSpy.isLoggedIn.and.returnValue(of({ _id: 'user123' }));
    aiServiceSpy.askChatbot.and.returnValue(of({ user_id: 'user123', query: 'test', response: 'Test response' }));
    component.ngOnInit(); // Set userId
    component.chatQuery = 'test';
    component.submitChatQuery();
    expect(component.chatMessages).toEqual([
      { text: 'test', isUser: true },
      { text: 'Test response', isUser: false }
    ]);
    expect(component.chatQuery).toBe('');
    expect(component.chatLoading).toBeFalse();
  });
});