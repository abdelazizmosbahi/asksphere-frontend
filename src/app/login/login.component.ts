import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        console.log(response);
        this.router.navigate(['/']).then(() => {
          window.location.reload(); // Force reload to refresh user state
        });
      },
      error: (err) => {
        this.error = err.error.message || 'Login failed';
      }
    });
  }
}