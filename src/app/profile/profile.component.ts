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

  communityId: number | null = null;
  communityName: string = '';
  communities: any[] = [];
  joinedCommunities: Set<number> = new Set();
  questions: any[] = [];
  relatedQuestions: any[] = [];
  userBadges: any[] = [];
  communityMap: Map<number, string> = new Map();
  userMap: Map<string, string> = new Map();
  isMember: boolean = false;

  
  // Form fields
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  editUsername: string = '';
  editEmail: string = '';

  // Countdown
  countdown: number = 3;
  countdownInterval: any;
  successMessage: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadUser();
  }
  onSidebarToggled(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
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
        this.dateJoined = `Joined in ${dateJoined.toISOString().split('T')[0]}`;
        this.editUsername = this.username;
        this.editEmail = this.email;
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
        this.successMessage = 'Avatar updated successfully';
        this.showSuccessModal();
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
    if (!this.editUsername || !this.editEmail) {
      this.toastr.error('Username and email are required', 'Error');
      return;
    }

    const updateData = { 
      email: this.editEmail, 
      username: this.editUsername 
    };

    this.http.put<UpdateProfileResponse>(`${environment.apiUrl}/profile`, updateData, { withCredentials: true }).subscribe({
      next: (response: UpdateProfileResponse) => {
        this.email = this.editEmail;
        this.username = response.username;
        this.successMessage = response.message;
        this.showSuccessModal();
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();
      },
      error: (err) => {
        this.toastr.error(err.error.message || 'Error updating profile', 'Error');
        console.error('Error updating profile:', err);
      }
    });
  }

  changePassword() {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.toastr.error('All password fields are required', 'Error');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.toastr.error('New passwords do not match', 'Error');
      return;
    }

    if (this.newPassword.length < 8) {
      this.toastr.error('Password must be at least 8 characters long', 'Error');
      return;
    }

    const passwordData = {
      current_password: this.currentPassword,
      password: this.newPassword,
      confirm_password: this.confirmPassword
    };

    this.http.put(`${environment.apiUrl}/password`, passwordData, { withCredentials: true }).subscribe({
      next: () => {
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.successMessage = 'Password changed successfully';
        this.showSuccessModal();
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
        modal.hide();
      },
      error: (err) => {
        this.toastr.error(err.error.message || 'Error changing password', 'Error');
        console.error('Error changing password:', err);
      }
    });
  }

  showSuccessModal() {
    this.countdown = 3;
    const successModal = new (window as any).bootstrap.Modal(document.getElementById('successModal'));
    successModal.show();
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.reloadPage();
      }
    }, 1000);
  }

  reloadPage() {
    clearInterval(this.countdownInterval);
    window.location.reload();
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

  
  getCommunityName(communityId: number): string {
    return this.communityMap.get(communityId) || 'Unknown';
  }
  
  sidebarCollapsed = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}