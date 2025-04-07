// import { Component, Output, EventEmitter } from '@angular/core';
// import { Router } from '@angular/router';
// import { HttpClient, HttpErrorResponse } from '@angular/common/http';
// import { ToastrService } from 'ngx-toastr';
// import { environment } from '../../environments/environment';

// @Component({
//   selector: 'app-navbar',
//   templateUrl: './navbar.component.html',
//   styleUrls: ['./navbar.component.css']
// })
// export class NavbarComponent {
//   searchQuery: string = '';
//   notificationCount: number = 0; // Replace with actual logic to fetch count
//   sidebarCollapsed: boolean = false;

//   @Output() sidebarToggled = new EventEmitter<boolean>();

//   constructor(
//     private router: Router,
//     private http: HttpClient,
//     private toastr: ToastrService
//   ) {
//     // Simulate fetching notification count (replace with real API call)
//     this.fetchNotificationCount();
//   }

//   toggleSidebar() {
//     this.sidebarCollapsed = !this.sidebarCollapsed;
//     this.sidebarToggled.emit(this.sidebarCollapsed);
//   }

//   onSearch() {
//     if (this.searchQuery.trim()) {
//       this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
//     }
//   }

//   logout() {
//     this.http.get(`${environment.apiUrl}/logout`, { withCredentials: true }).subscribe({
//       next: () => {
//         this.toastr.success('Logged out successfully', 'Success');
//         this.router.navigate(['/login']);
//       },
//       error: (err: HttpErrorResponse) => {
//         console.error('Error logging out:', err);
//         this.toastr.error('Error logging out', 'Error');
//         this.router.navigate(['/login']);
//       }
//     });
//   }

//   goToNotifications() {
//     this.router.navigate(['/notifications']);
//   }

//   // Placeholder for fetching notification count
//   fetchNotificationCount() {
//     // Replace with actual API call, e.g.:
//     // this.http.get<number>(`${environment.apiUrl}/notifications/count`, { withCredentials: true })
//     //   .subscribe(count => this.notificationCount = count);
//     this.notificationCount = 5; // Dummy value for demonstration
//   }
// }