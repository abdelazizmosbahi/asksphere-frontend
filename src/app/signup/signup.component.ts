import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  animations: [
    trigger('buttonHover', [
      state('default', style({
        opacity: 1,
        transform: 'translateY(0)'
      })),
      state('hovered', style({
        opacity: 0.9,
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)'
      })),
      transition('default <=> hovered', [
        animate('200ms ease-in-out')
      ])
    ]),
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ]),
    trigger('buttonPulse', [
      transition('* => pulse', [
        animate('500ms ease-in-out', style({ transform: 'scale(1.05)' })),
        animate('500ms ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class SignupComponent implements OnInit {
  signupForm: FormGroup;
  error: string = '';
  successMessage: string = '';
  showPassword: boolean = false;
  loading: boolean = false;
  buttonState: string = 'default';
  pulseTrigger: string = '';
  serverErrors: { [key: string]: string } = { username: '', email: '' };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/)
      ]]
    });
  }

  ngOnInit() {
    // Real-time validation for username
    this.signupForm.get('username')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(value => {
        if (value && this.signupForm.get('username')?.valid) {
          return this.authService.validateField('username', value);
        }
        return of({ valid: true });
      })
    ).subscribe({
      next: (response: any) => {
        this.serverErrors['username'] = response.valid ? '' : response.message;
      },
      error: () => {
        this.serverErrors['username'] = 'Error validating username';
      }
    });

    // Real-time validation for email
    this.signupForm.get('email')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(value => {
        if (value && this.signupForm.get('email')?.valid) {
          return this.authService.validateField('email', value);
        }
        return of({ valid: true });
      })
    ).subscribe({
      next: (response: any) => {
        this.serverErrors['email'] = response.valid ? '' : response.message;
      },
      error: () => {
        this.serverErrors['email'] = 'Error validating email';
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSignup() {
    if (this.signupForm.invalid || this.serverErrors['username'] || this.serverErrors['email']) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.pulseTrigger = 'pulse';

    const signupData = {
      username: this.signupForm.get('username')?.value,
      email: this.signupForm.get('email')?.value,
      password: this.signupForm.get('password')?.value
    };

    this.authService.signup(signupData).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMessage = response.message || 'User registered successfully!';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error.message || 'Signup failed. Please try again.';
      }
    });
  }

  onButtonHover() {
    this.buttonState = 'hovered';
  }

  onButtonLeave() {
    this.buttonState = 'default';
  }
}