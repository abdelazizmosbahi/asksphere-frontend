import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
declare var $: any;

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {
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
      $('#signupForm').on('submit', () => {
        $('.animate__button').addClass('animate__pulse');
        setTimeout(() => $('.animate__button').removeClass('animate__pulse'), 500);
      });
      $('.animate__error').hide().slideDown(300);
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSignup() {
    this.authService.signup(this.username, this.password).subscribe({
      next: (response) => {
        console.log(response);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.error = err.error.message || 'Signup failed';
      }
    });
  }
}