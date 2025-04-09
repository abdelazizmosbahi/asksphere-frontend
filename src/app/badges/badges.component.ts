import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

interface Badge {
  name: string;
  description: string;
  type: string;
  earned: boolean;
  count: number;
}

interface User {
  _id: string;
  username: string;
  avatar: string;
}

@Component({
  selector: 'app-badges',
  templateUrl: './badges.component.html',
  styleUrls: ['./badges.component.css']
})
export class BadgesComponent implements OnInit {
  user: User | null = null;
  badges: Badge[] = [];
  filteredBadges: Badge[] = [];
  searchQuery: string = '';
  filterType: string = 'All';
  currentPage: number = 1;
  pageSize: number = 20;
  totalBadges: number = 0;

  communityId: number | null = null;
  communityName: string = '';
  username: string = '';
  communities: any[] = [];
  joinedCommunities: Set<number> = new Set();
  questions: any[] = [];
  relatedQuestions: any[] = [];
  userBadges: any[] = [];
  communityMap: Map<number, string> = new Map();
  userMap: Map<string, string> = new Map();
  isMember: boolean = false;


  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {}

  sidebarCollapsed = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  ngOnInit() {
    this.loadUser();
    this.loadBadges();
  }

  loadUser() {
    this.http.get<User>(`${environment.apiUrl}/api/users/me`, { withCredentials: true }).subscribe({
      next: (response: User) => {
        this.user = response;
      },
      error: () => {
        this.toastr.error('Please log in to view badges', 'Error');
        this.router.navigate(['/login']);
      }
    });
  }

  loadBadges() {
    this.http.get<{ badges: Badge[] }>(`${environment.apiUrl}/badges`, { withCredentials: true }).subscribe({
      next: (response) => {
        this.badges = response.badges;
        this.totalBadges = this.badges.length;
        this.applyFilters();
      },
      error: (err) => {
        this.toastr.error('Error fetching badges', 'Error');
        console.error('Error fetching badges:', err);
      }
    });
  }

  applyFilters() {
    let filtered = this.badges;

    // Filter by search query
    if (this.searchQuery.trim()) {
      filtered = filtered.filter(badge =>
        badge.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (this.filterType !== 'All') {
      filtered = filtered.filter(badge => badge.type === this.filterType);
    }

    this.totalBadges = filtered.length;
    this.currentPage = 1; // Reset to first page on filter change
    this.filteredBadges = this.paginate(filtered);
  }

  paginate(badges: Badge[]): Badge[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return badges.slice(startIndex, startIndex + this.pageSize);
  }

  onSearch() {
    this.applyFilters();
  }

  setFilterType(type: string) {
    this.filterType = type;
    this.applyFilters();
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
  }

  get totalPages(): number {
    return Math.ceil(this.totalBadges / this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages = [];
    const total = this.totalPages;
    let start = Math.max(1, this.currentPage - 1);
    let end = Math.min(total, this.currentPage + 1);

    if (end - start < 2) {
      if (start === 1) {
        end = Math.min(total, start + 2);
      } else {
        start = Math.max(1, end - 2);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Add getters for pagination display
  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalBadges);
  }

  askQuestion() {
    this.router.navigate(['/ask-question']);
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


  onSidebarToggled(event: boolean) {
    this.sidebarCollapsed = event;
  }
  
  getCommunityName(communityId: number): string {
    return this.communityMap.get(communityId) || 'Unknown';
  }
}