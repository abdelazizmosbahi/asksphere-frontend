import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Add this import
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-recover',
  templateUrl: './recover.component.html',
  styleUrls: ['./recover.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule] // Add RouterModule here
})
export class RecoverComponent {
  username: string = '';
  email: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  userId: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  password: string = '';
  error: string = '';
  showPassword: boolean = false;
  loading: boolean = false;

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) {}

  verifyCredentials() {
    if (!this.username || !this.email) {
      this.errorMessage = 'Username and email are required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post(`${environment.apiUrl}/recover`, {
      username: this.username,
      email: this.email
    }).subscribe({
      next: (response: any) => {
        this.userId = response.userId;
        this.showStep(2);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error verifying credentials';
        this.isLoading = false;
      }
    });
  }

  resetPassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Both password fields are required';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters long';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post(`${environment.apiUrl}/recover/reset`, {
      userId: this.userId,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: () => {
        this.successMessage = 'Password reset successfully! Redirecting to login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error resetting password';
        this.isLoading = false;
      }
    });
  }

  showStep(stepNumber: number) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('active');
    });

    // Show the selected step
    const step = document.getElementById(`step${stepNumber}`);
    if (step) {
      step.classList.add('active');
    }
  }
}