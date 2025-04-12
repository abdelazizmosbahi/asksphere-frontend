import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
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
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  user: any = null;
  username: string = '';
  userId: string = '';
  communities: any[] = [];
  joinedCommunities: Set<number> = new Set();
  questions: any[] = [];
  relatedQuestions: any[] = [];
  userMap: Map<string, string> = new Map();
  userAvatarMap: Map<string, string> = new Map();
  sidebarCollapsed: boolean = false;
  selectedUser: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadUser();
    this.loadCommunities();
    this.loadQuestions();
    this.loadRecommendedQuestions();
  }

  ngAfterViewInit() {
    $('.question-item').hide().fadeIn(500);
  }

  ngOnDestroy() {
    // Close the user profile modal if it's open
    const modalElement = document.getElementById('userProfileModal');
    if (modalElement) {
      const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
    // Remove any lingering modal backdrops
    const backdrops = document.getElementsByClassName('modal-backdrop');
    while (backdrops.length > 0) {
      backdrops[0].parentNode?.removeChild(backdrops[0]);
    }
    // Ensure the body doesn't retain modal-open class
    document.body.classList.remove('modal-open');
  }

  onSidebarToggled(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

  loadUser() {
    this.http.get(`${environment.apiUrl}/api/users/me`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.user = response;
        this.username = response.username;
        this.userId = response._id;
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
                  .filter((question: Question) => this.joinedCommunities.has(question.communityId))
                  .map((question: Question) => ({
                    id: question._id,
                    title: question.title,
                    description: question.content,
                    votes: question.score || 0,
                    answers: question.answers || 0,
                    views: question.views || 0,
                    tags: [communityMap.get(question.communityId) || 'Unknown'],
                    user: this.userMap.get(question.memberId) || 'Unknown',
                    avatar: this.userAvatarMap.get(question.memberId) || 'https://via.placeholder.com/20',
                    time: this.formatTime(question.dateCreated),
                    memberId: question.memberId,
                    userVote: 0
                  }));
              },
              error: (err: any) => {
                this.toastr.error('Error fetching user data', 'Error');
                console.error('Error fetching user data:', err);
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
            return of({ username: 'Unknown', avatar: 'https://via.placeholder.com/20' });
          })
        )
      );
      forkJoin(requests).subscribe({
        next: (responses: any[]) => {
          responses.forEach((res, index) => {
            this.userMap.set(memberIds[index], res.username);
            this.userAvatarMap.set(memberIds[index], res.avatar || 'https://via.placeholder.com/20');
          });
          observer.next();
          observer.complete();
        },
        error: (err: any) => {
          this.toastr.error('Error fetching user data', 'Error');
          observer.error(err);
        }
      });
    });
  }

  loadRecommendedQuestions() {
    this.http.get(`${environment.apiUrl}/recommended_questions`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.relatedQuestions = response.map((q: any) => ({
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

  voteQuestion(questionId: string, value: number) {
    const question = this.questions.find(q => q.id === questionId);
    if (question && this.isOwner(question.memberId)) {
      this.toastr.info('You cannot vote on your own question', 'Info');
      return;
    }
    this.http.post(`${environment.apiUrl}/vote`, { questionId, value }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        if (question) {
          const newVote = response.newVote;
          const previousVote = question.userVote || 0;
          if (newVote === 0) {
            question.votes -= previousVote;
            question.userVote = 0;
            this.toastr.success('Vote removed', 'Success');
          } else if (previousVote !== 0) {
            const scoreChange = -previousVote + value;
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

  joinCommunity(communityId: number) {
    this.http.post(`${environment.apiUrl}/communities/join`, { communityId }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        console.log('Join Community Response:', response);
        this.loadJoinedCommunities();
        this.loadQuestions();
        this.toastr.success(`Joined ${this.getCommunityName(communityId)} community`, 'Success');
      },
      error: (err: any) => {
        this.toastr.error('Error joining community', 'Error');
        console.error('Error joining community:', err);
      }
    });
  }
  
  leaveCommunity(communityId: number) {
    this.http.post(`${environment.apiUrl}/communities/leave`, { communityId }, { withCredentials: true }).subscribe({
      next: () => {
        this.loadJoinedCommunities();
        this.loadQuestions();
        this.toastr.success(`Left ${this.getCommunityName(communityId)} community`, 'Success');
      },
      error: (err: any) => {
        this.toastr.error('Error leaving community', 'Error');
        console.error('Error leaving community:', err);
      }
    });
  }

  getCommunityName(communityId: number): string {
    const community = this.communities.find(c => c.id === communityId);
    return community ? community.name : 'Unknown';
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

  showUserProfile(memberId: string) {
    this.http.get(`${environment.apiUrl}/api/users/${memberId}/profile`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.selectedUser = {
          username: response.username || 'Unknown',
          avatar: response.avatar || 'https://via.placeholder.com/50',
          questionsCount: response.questionsCount || 0,
          answersCount: response.answersCount || 0,
          status: response.status || 'N/A',
          reputation: response.reputation || 0,
          dateJoined: response.dateJoined || 'N/A',
          badges: response.badges || []
        };
        const modal = new (window as any).bootstrap.Modal(document.getElementById('userProfileModal'));
        modal.show();
      },
      error: (err: any) => {
        this.toastr.error('Error fetching user profile', 'Error');
        console.error('Error fetching user profile:', err);
        this.selectedUser = {
          username: this.userMap.get(memberId) || 'Unknown',
          avatar: this.userAvatarMap.get(memberId) || 'https://via.placeholder.com/50',
          questionsCount: 0,
          answersCount: 0,
          status: 'N/A',
          reputation: 0,
          dateJoined: 'N/A',
          badges: []
        };
        const modal = new (window as any).bootstrap.Modal(document.getElementById('userProfileModal'));
        modal.show();
      }
    });
  }

  isOwner(memberId: string): boolean {
    return this.userId === memberId;
  }
}