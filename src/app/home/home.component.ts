import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  user: any = null;
  username: string = '';
  searchQuery: string = '';
  communities: any[] = [];
  joinedCommunities: Set<number> = new Set();
  questions: any[] = [];
  recommendedQuestions: any[] = [];
  badges: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadUser();
    this.loadCommunities();
    this.loadQuestions();
    this.loadRecommendedQuestions();
    this.loadBadges();
  }

  loadUser() {
    this.http.get(`${environment.apiUrl}/api/users/me`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.user = response;
        this.username = response.username;
        this.loadJoinedCommunities();
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  loadCommunities() {
    this.http.get(`${environment.apiUrl}/communities`).subscribe({
      next: (response: any) => {
        this.communities = response.map((community: any) => ({
          id: community.idCommunity,
          name: community.name,
          description: community.description,
          icon: this.getCommunityIcon(community.name)
        }));
      },
      error: (err) => {
        console.error('Error fetching communities:', err);
      }
    });
  }

  loadJoinedCommunities() {
    this.http.get(`${environment.apiUrl}/member_communities`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.joinedCommunities = new Set(response.map((mc: any) => mc.communityId));
      },
      error: (err) => {
        console.error('Error fetching joined communities:', err);
      }
    });
  }

  loadQuestions() {
    this.http.get(`${environment.apiUrl}/questions`).subscribe({
      next: (response: any) => {
        this.http.get(`${environment.apiUrl}/communities`).subscribe({
          next: (communitiesResponse: any) => {
            const communityMap = new Map<number, string>();
            communitiesResponse.forEach((community: any) => {
              communityMap.set(community.idCommunity, community.name);
            });

            // Fetch usernames for all member IDs
            const memberIds = [...new Set(response.map((q: any) => q.memberId))];
            this.http.post(`${environment.apiUrl}/users/batch`, { memberIds }, { withCredentials: true }).subscribe({
              next: (usersResponse: any) => {
                const userMap = new Map<string, string>();
                usersResponse.forEach((user: any) => {
                  userMap.set(user.id, user.username);
                });

                this.questions = response
                  .filter((question: any) => this.joinedCommunities.has(question.communityId))
                  .map((question: any) => ({
                    id: question._id,
                    title: question.title,
                    description: question.content,
                    votes: question.score || 0,
                    answers: question.answers || 0,
                    views: question.views || 0,
                    tags: [...(question.tags || []), communityMap.get(question.communityId) || 'Unknown'],
                    user: userMap.get(question.memberId) || 'Unknown',
                    time: this.formatTime(question.dateCreated)
                  }));
              },
              error: (err) => {
                console.error('Error fetching usernames:', err);
              }
            });
          },
          error: (err) => {
            console.error('Error fetching communities for questions:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error fetching questions:', err);
      }
    });
  }

  loadRecommendedQuestions() {
    this.http.get(`${environment.apiUrl}/recommended_questions`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.recommendedQuestions = response.map((q: any) => ({
          id: q._id,
          title: q.title,
          user: q.username,
          time: this.formatTime(q.dateCreated)
        }));
      },
      error: (err) => {
        console.error('Error fetching recommended questions:', err);
      }
    });
  }

  loadBadges() {
    this.http.get(`${environment.apiUrl}/badges`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.badges = response.badges || [];
      },
      error: (err) => {
        console.error('Error fetching badges:', err);
      }
    });
  }

  getCommunityIcon(communityName: string): string {
    const iconMap: { [key: string]: string } = {
      'Development': 'bi-code-slash',
      'Gaming': 'bi-joystick',
      'Music': 'bi-music-note-beamed',
      'Science': 'bi-gear',
      'Art': 'bi-brush',
      'Sports': 'bi-trophy'
    };
    return iconMap[communityName] || 'bi-question-circle';
  }

  formatTime(dateCreated: string): string {
    const now = new Date();
    const created = new Date(dateCreated);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `${diffMins} mins ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }
    return created.toLocaleDateString();
  }

  joinCommunity(communityId: number) {
    this.http.post(`${environment.apiUrl}/communities/join`, { communityId }, { withCredentials: true }).subscribe({
      next: () => {
        this.joinedCommunities.add(communityId);
        this.loadQuestions();
      },
      error: (err) => {
        console.error('Error joining community:', err);
      }
    });
  }

  leaveCommunity(communityId: number) {
    this.http.post(`${environment.apiUrl}/communities/leave`, { communityId }, { withCredentials: true }).subscribe({
      next: () => {
        this.joinedCommunities.delete(communityId);
        this.loadQuestions();
      },
      error: (err) => {
        console.error('Error leaving community:', err);
      }
    });
  }

  voteQuestion(questionId: string, value: number) {
    this.http.post(`${environment.apiUrl}/vote`, { questionId, value }, { withCredentials: true }).subscribe({
      next: () => {
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
          question.votes += value;
        }
      },
      error: (err) => {
        console.error('Error voting on question:', err);
      }
    });
  }

  logout() {
    this.http.get(`${environment.apiUrl}/logout`, { withCredentials: true }).subscribe({
      next: () => {
        this.authService.logout();
        this.user = null;
        this.username = '';
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error logging out:', err);
        this.router.navigate(['/login']);
      }
    });
  }

  onSearch() {
    if (this.searchQuery) {
      console.log('Searching for:', this.searchQuery);
    }
  }
}