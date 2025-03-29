import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  dateJoined: string;
  reputation: number;
  status: string;
  restrictionLevel: number;
}

interface UpdateProfileResponse {
  message: string;
  username: string;
}

interface AvatarResponse {
  message: string;
  avatar: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  username: string = '';
  email: string = '';
  avatar: string = '';
  dateJoined: string = '';
  reputation: number = 0;
  status: string = '';
  restrictionLevel: number = 0;
  searchQuery: string = '';
  selectedAvatar: File | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadUser();
  }

  loadUser() {
    this.http.get<User>(`${environment.apiUrl}/api/users/me`, { withCredentials: true }).subscribe({
      next: (response: User) => {
        this.user = response;
        this.username = response.username;
        this.email = response.email;
        this.avatar = response.avatar;
        this.reputation = response.reputation || 0;
        this.status = response.status;
        this.restrictionLevel = response.restrictionLevel;
        const dateJoined = new Date(response.dateJoined);
        this.dateJoined = `Joined in ${dateJoined.toISOString().split('T')[0]}`; // Format as "Joined in YYYY-MM-DD"
      },
      error: () => {
        this.toastr.error('Please log in to view your profile', 'Error');
        this.router.navigate(['/login']);
      }
    });
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedAvatar = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.avatar = reader.result as string;
      };
      reader.readAsDataURL(this.selectedAvatar);
    }
  }

  uploadAvatar() {
    if (!this.selectedAvatar) {
      this.toastr.error('Please select an avatar to upload', 'Error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', this.selectedAvatar);

    this.http.post<AvatarResponse>(`${environment.apiUrl}/api/users/avatar`, formData, { withCredentials: true }).subscribe({
      next: (response: AvatarResponse) => {
        this.avatar = response.avatar;
        this.selectedAvatar = null;
        this.toastr.success('Avatar updated successfully', 'Success');
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('editAvatarModal'));
        modal.hide();
      },
      error: (err) => {
        this.toastr.error('Error uploading avatar', 'Error');
        console.error('Error uploading avatar:', err);
      }
    });
  }

  updateProfile() {
    const emailInput = (document.getElementById('editEmail') as HTMLInputElement).value;
    const usernameInput = (document.getElementById('editUsername') as HTMLInputElement).value;

    const updateData = { email: emailInput, username: usernameInput };

    this.http.put<UpdateProfileResponse>(`${environment.apiUrl}/profile`, updateData, { withCredentials: true }).subscribe({
      next: (response: UpdateProfileResponse) => {
        this.email = emailInput;
        this.username = response.username; // Update username from response
        this.toastr.success(response.message, 'Success');
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();
      },
      error: (err) => {
        this.toastr.error(err.error.message || 'Error updating profile', 'Error');
        console.error('Error updating profile:', err);
      }
    });
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }

  logout() {
    this.http.get(`${environment.apiUrl}/logout`, { withCredentials: true }).subscribe({
      next: () => {
        this.toastr.success('Logged out successfully', 'Success');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.toastr.error('Error logging out', 'Error');
        console.error('Error logging out:', err);
        this.router.navigate(['/login']);
      }
    });
  }
}