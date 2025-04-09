import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

interface Question {
  _id: string;
  title: string;
  content: string;
  dateCreated: string;
  communityId: number;
  memberId: string;
  score: number;
  views: number;
  answers: number;
}

declare const $: any;

@Component({
  selector: 'app-community',
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css']
})
export class CommunityComponent implements OnInit, AfterViewInit {
  communityId: number | null = null;
  communityName: string = '';
  user: any = null;
  username: string = '';
  searchQuery: string = '';
  communities: any[] = [];
  joinedCommunities: Set<number> = new Set();
  questions: any[] = [];
  relatedQuestions: any[] = [];
  userBadges: any[] = [];
  communityMap: Map<number, string> = new Map();
  userMap: Map<string, string> = new Map();
  isMember: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}
  sidebarCollapsed = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.communityId = id ? +id : null;
      if (!this.communityId) {
        this.toastr.error('Invalid community ID', 'Error');
        this.router.navigate(['/']);
        return;
      }
      this.loadUser();
      this.loadCommunities();
    });
  }

  ngAfterViewInit() {
    if (this.isMember) {
      $('.question-item').hide().fadeIn(500);
    }
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
        response.forEach((community: any) => {
          this.communityMap.set(community.idCommunity, community.name);
        });
        this.communityName = this.communityMap.get(this.communityId!) || 'Unknown';
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
        this.isMember = this.joinedCommunities.has(this.communityId!);
        if (this.isMember) {
          this.loadQuestions();
          this.loadBadges();
          this.loadRecommendedQuestions();
        }
      },
      error: (err: any) => {
        this.toastr.error('Error fetching joined communities', 'Error');
        console.error('Error fetching joined communities:', err);
      }
    });
  }

  loadQuestions() {
    this.http.get<Question[]>(`${environment.apiUrl}/questions`).subscribe({
      next: (response: Question[]) => {
        this.http.get(`${environment.apiUrl}/communities`).subscribe({
          next: (communitiesResponse: any) => {
            const communityMap = new Map<number, string>();
            communitiesResponse.forEach((community: any) => {
              communityMap.set(community.idCommunity, community.name);
            });

            const memberIds: string[] = [...new Set(response.map((q: Question) => q.memberId))];
            this.fetchUsernames(memberIds).subscribe({
              next: () => {
                this.questions = response
                  .filter((question: Question) => question.communityId === this.communityId)
                  .map((question: Question) => ({
                    id: question._id,
                    title: question.title,
                    description: question.content,
                    votes: question.score || 0,
                    answers: question.answers || 0,
                    views: question.views || 0,
                    tags: [communityMap.get(question.communityId) || 'Unknown'],
                    user: this.userMap.get(question.memberId) || 'Unknown',
                    time: this.formatTime(question.dateCreated)
                  }));
              },
              error: (err: any) => {
                this.toastr.error('Error fetching usernames', 'Error');
                console.error('Error fetching usernames:', err);
              }
            });
          },
          error: (err: any) => {
            this.toastr.error('Error fetching communities for questions', 'Error');
            console.error('Error fetching communities for questions:', err);
          }
        });
      },
      error: (err: any) => {
        this.toastr.error('Error fetching questions', 'Error');
        console.error('Error fetching questions:', err);
      }
    });
  }

  fetchUsernames(memberIds: string[]): Observable<void> {
    return new Observable<void>((observer) => {
      const requests = memberIds.map(id =>
        this.http.get(`${environment.apiUrl}/api/users/${id}`, { withCredentials: true }).pipe(
          catchError((err: any) => {
            console.error(`Error fetching user ${id}:`, err);
            return of({ username: 'Unknown' });
          })
        )
      );
      forkJoin(requests).subscribe({
        next: (responses: any[]) => {
          responses.forEach((res, index) => {
            this.userMap.set(memberIds[index], res.username);
          });
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          this.toastr.error('Error fetching usernames', 'Error');
          observer.error(err);
        }
      });
    });
  }

  loadRecommendedQuestions() {
    this.http.get(`${environment.apiUrl}/recommended_questions`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.relatedQuestions = response
          .filter((q: any) => q.communityId === this.communityId)
          .map((q: any) => ({
            id: q._id,
            title: q.title,
            user: q.user,
            time: this.formatTime(q.dateCreated)
          }));
      },
      error: (err: any) => {
        this.toastr.error('Error fetching recommended questions', 'Error');
        console.error('Error fetching recommended questions:', err);
        this.relatedQuestions = [];
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

  voteQuestion(questionId: string, value: number) {
    this.http.post(`${environment.apiUrl}/vote`, { questionId, value }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
          const newVote = response.newVote;
          if (newVote === 0) {
            question.votes -= question.userVote || value;
            question.userVote = 0;
            this.toastr.success('Vote removed', 'Success');
          } else if (question.userVote !== 0) {
            const scoreChange = -question.userVote + value;
            question.votes += scoreChange;
            question.userVote = newVote;
            this.toastr.success(`Question ${value > 0 ? 'upvoted' : 'downvoted'} successfully`, 'Success');
          } else {
            question.votes += value;
            question.userVote = newVote;
            this.toastr.success(`Question ${value > 0 ? 'upvoted' : 'downvoted'} successfully`, 'Success');
          }
        }
      },
      error: (err: any) => {
        this.toastr.error('Error voting on question', 'Error');
        console.error('Error voting on question:', err);
      }
    });
  }

  incrementViews(questionId: string) {
    this.http.post(`${environment.apiUrl}/questions/${questionId}/view`, {}, { withCredentials: true }).subscribe({
      next: () => {
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
          question.views += 1;
        }
      },
      error: (err: any) => {
        console.error('Error incrementing views:', err);
      }
    });
  }

  joinCommunity() {
    if (!this.communityId) return;
    this.http.post(`${environment.apiUrl}/communities/join`, { communityId: this.communityId }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        console.log('Join Community Response:', response);
        this.loadJoinedCommunities();
        this.toastr.success(`Joined ${this.communityName} community`, 'Success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      error: (err: any) => {
        this.toastr.error('Error joining community', 'Error');
        console.error('Error joining community:', err);
      }
    });
  }

  navigateToAskQuestion() {
    this.router.navigate(['/questions'], { queryParams: { communityId: this.communityId } });
  }

  getCommunityName(communityId: number): string {
    return this.communityMap.get(communityId) || 'Unknown';
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

  logout() {
    this.http.get(`${environment.apiUrl}/logout`, { withCredentials: true }).subscribe({
      next: () => {
        this.user = null;
        this.username = '';
        this.toastr.success('Logged out successfully', 'Success');
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        this.toastr.error('Error logging out', 'Error');
        console.error('Error logging out:', err);
        this.router.navigate(['/login']);
      }
    });
  }
  onSidebarToggled(event: boolean) {
    this.sidebarCollapsed = event;
  }
  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }
}