import { Component, OnInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Input() sidebarCollapsed: boolean = false; // Receive state from parent (home)
  joinedCommunities: Set<number> = new Set();
  userBadges: any[] = [];
  communityMap: Map<number, string> = new Map();

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadJoinedCommunities();
    this.loadBadges();
    this.loadCommunities();
  }

  loadCommunities() {
    this.http.get(`${environment.apiUrl}/communities`).subscribe({
      next: (response: any) => {
        response.forEach((community: any) => {
          this.communityMap.set(community.idCommunity, community.name);
        });
      },
      error: (err: any) => {
        this.toastr.error('Error fetching communities', 'Error');
        console.error('Error fetching communities:', err);
      }
    });
  }

  loadJoinedCommunities() {
    this.http.get(`${environment.apiUrl}/member_communities`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.joinedCommunities = new Set(response.map((mc: any) => mc.communityId));
      },
      error: (err: any) => {
        this.toastr.error('Error fetching joined communities', 'Error');
        console.error('Error fetching joined communities:', err);
      }
    });
  }

  loadBadges() {
    this.http.get(`${environment.apiUrl}/badges`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.userBadges = response.badges || [];
      },
      error: (err: any) => {
        this.toastr.error('Error fetching badges', 'Error');
        console.error('Error fetching badges:', err);
      }
    });
  }

  getCommunityName(communityId: number): string {
    return this.communityMap.get(communityId) || 'Unknown';
  }
}