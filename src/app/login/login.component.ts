import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
declare var $: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  error: string = '';
  showPassword: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    $(document).ready(() => {
      $('.card').hide().fadeIn(1000);
      $('.animate__button').hover(
        () => $('.animate__button').animate({ opacity: 0.9 }, 200),
        () => $('.animate__button').animate({ opacity: 1 }, 200)
      );
      $('#loginForm').on('submit', () => {
        $('.animate__button').addClass('animate__pulse');
        setTimeout(() => $('.animate__button').removeClass('animate__pulse'), 500);
      });
      $('.animate__error').hide().slideDown(300);
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = err.error.message || 'Login failed';
      }
    });
  }
}