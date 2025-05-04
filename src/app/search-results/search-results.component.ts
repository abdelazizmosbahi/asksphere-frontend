import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

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

interface Answer {
  _id: string;
  content: string;
  questionId: string;
  memberId: string;
  dateCreated: string;
  score: number;
}

interface MemberCommunity {
  communityId: number;
}

interface SearchResult {
  id: string;
  type: 'question' | 'answer';
  title?: string;
  content: string;
  communityName: string;
  user: string;
  time: string;
  votes: number;
  views: number;
  answersCount?: number;
  questionId?: string;
  avatar: string;
}

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit {
  searchQuery: string = '';
  searchResults: SearchResult[] = [];
  filteredResults: SearchResult[] = [];
  totalResults: number = 0;
  totalPages: number = 0;
  currentPage: number = 1;
  pageSize: number = 10;
  communityMap: Map<number, string> = new Map();
  userMap: Map<string, string> = new Map();
  userAvatarMap: Map<string, string> = new Map();
  sidebarCollapsed: boolean = false;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
      this.currentPage = 1;
      if (this.searchQuery.trim()) {
        this.loadCommunities();
        this.search();
      }
    });
  }

  loadCommunities() {
    this.http.get<any[]>(`${environment.apiUrl}/communities`).subscribe({
      next: (response) => {
        response.forEach((community) => {
          this.communityMap.set(community.idCommunity, community.name);
        });
      },
      error: (err) => {
        this.toastr.error('Error fetching communities', 'Error');
        console.error('Error fetching communities:', err);
      }
    });
  }

  search() {
    this.http.get<MemberCommunity[]>(`${environment.apiUrl}/member_communities`, { withCredentials: true }).pipe(
      switchMap(memberCommunities => {
        const joinedCommunityIds = memberCommunities.map(mc => mc.communityId);
        if (joinedCommunityIds.length === 0) {
          return of([]);
        }
        return this.http.get<Question[]>(`${environment.apiUrl}/questions`).pipe(
          switchMap(questions => {
            const filteredQuestions = questions.filter(question =>
              joinedCommunityIds.includes(question.communityId)
            );
            const answerRequests = filteredQuestions.map(question =>
              this.http.get<Answer[]>(`${environment.apiUrl}/questions/${question._id}/answers`).pipe(
                catchError(() => of([]))
              )
            );
            return forkJoin([of(filteredQuestions), ...answerRequests]);
          })
        );
      })
    ).subscribe({
      next: (result: any) => {
        if (!Array.isArray(result)) {
          this.searchResults = [];
          this.applyFilters();
          return;
        }
        const [questions, ...answerResponses] = result;
        const memberIds = [
          ...new Set([
            ...questions.map((q: Question) => q.memberId),
            ...answerResponses.flat().map((a: Answer) => a.memberId)
          ])
        ];
        this.fetchUserDetails(memberIds).subscribe({
          next: () => {
            this.searchResults = [];
            questions.forEach((question: Question, index: number) => {
              this.searchResults.push({
                id: question._id,
                type: 'question',
                title: question.title,
                content: question.content,
                communityName: this.communityMap.get(question.communityId) || 'Unknown',
                user: this.userMap.get(question.memberId) || 'Unknown',
                avatar: this.userAvatarMap.get(question.memberId) || 'https://via.placeholder.com/20',
                time: this.formatTime(question.dateCreated),
                votes: question.score || 0,
                views: question.views || 0,
                answersCount: question.answers || 0
              });
              const answers = answerResponses[index] || [];
              answers.forEach((answer: Answer) => {
                this.searchResults.push({
                  id: answer._id,
                  type: 'answer',
                  content: answer.content,
                  communityName: this.communityMap.get(question.communityId) || 'Unknown',
                  user: this.userMap.get(answer.memberId) || 'Unknown',
                  avatar: this.userAvatarMap.get(answer.memberId) || 'https://via.placeholder.com/20',
                  time: this.formatTime(answer.dateCreated),
                  votes: answer.score || 0,
                  views: 0,
                  questionId: answer.questionId
                });
              });
            });
            this.applyFilters();
          },
          error: (err) => {
            this.toastr.error('Error fetching user details', 'Error');
            console.error('Error fetching user details:', err);
            this.applyFilters();
          }
        });
      },
      error: (err) => {
        this.toastr.error('Error fetching search results', 'Error');
        console.error('Error fetching search results:', err);
        this.searchResults = [];
        this.applyFilters();
      }
    });
  }

  fetchUserDetails(memberIds: string[]): Observable<void> {
    return new Observable<void>((observer) => {
      const requests = memberIds.map(id =>
        this.http.get<any>(`${environment.apiUrl}/api/users/${id}`, { withCredentials: true }).pipe(
          catchError((err) => {
            console.error(`Error fetching user ${id}:`, err);
            return of({ username: 'Unknown', avatar: 'https://via.placeholder.com/20' });
          })
        )
      );
      forkJoin(requests).subscribe({
        next: (responses) => {
          responses.forEach((res, index) => {
            this.userMap.set(memberIds[index], res.username);
            this.userAvatarMap.set(memberIds[index], res.avatar || 'https://via.placeholder.com/20');
          });
          observer.next();
          observer.complete();
        },
        error: (err) => {
          this.toastr.error('Error fetching user details', 'Error');
          observer.error(err);
        }
      });
    });
  }

  applyFilters() {
    let filtered = this.searchResults;
    if (this.searchQuery.trim()) {
      const keywords = this.searchQuery.toLowerCase().split(/\s+/).filter(keyword => keyword.length > 0);
      if (keywords.length > 0) {
        filtered = filtered.filter(result => {
          const title = result.title?.toLowerCase() || '';
          const content = result.content.toLowerCase();
          return keywords.some(keyword => title.includes(keyword) || content.includes(keyword));
        });
      }
    }
    this.totalResults = filtered.length;
    this.totalPages = Math.ceil(this.totalResults / this.pageSize);
    this.filteredResults = this.paginate(filtered);
  }

  paginate(results: SearchResult[]): SearchResult[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return results.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFilters();
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

  onSidebarToggled(event: boolean) {
    this.sidebarCollapsed = event;
  }
}