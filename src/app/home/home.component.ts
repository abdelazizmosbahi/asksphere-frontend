import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  user: any = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.checkUser();
  }

  checkUser() {
    this.authService.getCurrentUser().subscribe({
      next: (response) => {
        this.user = response;
      },
      error: (err) => {
        this.user = null;
        console.log('User check failed:', err);
      }
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.user = null;
        this.router.navigate(['/login']);
      }
    });
  }
}