import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { Subject, Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit {
  communityId: number | null = null;
  title: string = '';
  content: string = '';
  isPosting: boolean = false;
  isValidating: boolean = false;
  isContentRelevant: boolean = false;
  validationError: string | null = null;
  contentSubject: Subject<string> = new Subject<string>();

  user: any = null;
  searchQuery: string = '';
  communities: any[] = [];
  joinedCommunities: Set<number> = new Set();
  questions: any[] = [];
  userBadges: any[] = [];
  communityMap: Map<number, string> = new Map();
  isMember: boolean = false;
  sidebarCollapsed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.communityId = params['communityId'] ? +params['communityId'] : null;
      if (!this.communityId) {
        this.toastr.error('Community ID is required to ask a question', 'Error');
        this.router.navigate(['/']);
        return;
      }
      this.setupContentValidation();
    });
  }

  postQuestion(form: any) {
    if (!this.communityId || !this.title || !this.content) {
      this.toastr.error('Please fill in all required fields', 'Error');
      return;
    }

    this.isPosting = true;
    const questionData = {
      title: this.title,
      content: this.content,
      communityId: this.communityId
    };

    this.http.post(`${environment.apiUrl}/questions`, questionData, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.isPosting = false;
        this.toastr.success('Question posted successfully', 'Success');
        // Reset the form
        this.title = '';
        this.content = '';
        this.isContentRelevant = false;
        this.validationError = null;
        form.resetForm();

        // Show the success modal
        const successModalElement = document.getElementById('successModal');
        const successModal = new (window as any).bootstrap.Modal(successModalElement);
        successModal.show();

        // Hide the modal and navigate after 2 seconds
        setTimeout(() => {
          successModal.hide(); // Explicitly hide the modal
          // Remove the backdrop manually if it persists
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) {
            backdrop.remove();
          }
          document.body.classList.remove('modal-open'); // Reset body class
          this.router.navigate([`/community/${this.communityId}`]).then(() => {
            console.log('Navigation to community page completed');
          });
        }, 2000);
      },
      error: (err: HttpErrorResponse) => {
        this.isPosting = false;
        this.toastr.error(err.error.message || 'Error posting question', 'Error');
        console.error('Error posting question:', err);
      }
    });
  }

  validateContent(content: string): Observable<any> {
    if (!content || !this.communityId) {
      this.isContentRelevant = false;
      this.validationError = !content ? 'Content is required' : 'Community ID is missing';
      return of(null);
    }
    return this.http.post(`${environment.apiUrl}/validate-content`, {
      content,
      communityId: this.communityId
    }, { withCredentials: true });
  }

  setupContentValidation() {
    this.contentSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(content => {
        this.isValidating = true;
        return this.validateContent(content).pipe(
          catchError(err => {
            this.isValidating = false;
            this.toastr.error('Error validating content', 'Validation Error');
            this.isContentRelevant = false;
            this.validationError = 'Error validating content';
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (result: any) => {
        this.isValidating = false;
        if (result) {
          this.isContentRelevant = result.is_relevant;
          if (!this.isContentRelevant) {
            this.validationError = result.suggested_community
              ? `Content is not relevant to this community. Suggested community: ${result.suggested_community.name} (Similarity: ${result.suggested_community.similarity_score.toFixed(2)})`
              : 'Content is not relevant to this community.';
          } else {
            this.validationError = null;
          }
        }
      },
      error: (err: any) => {
        this.isValidating = false;
        this.toastr.error('Error validating content', 'Validation Error');
        this.isContentRelevant = false;
        this.validationError = 'Error validating content';
      }
    });
  }

  onContentChange(content: string) {
    this.contentSubject.next(content);
  }

  getCommunityName(communityId: number): string {
    return this.communityMap.get(communityId) || 'Unknown';
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
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
      error: (err: HttpErrorResponse) => {
        console.error('Error logging out:', err);
        this.toastr.error('Error logging out', 'Error');
        this.router.navigate(['/login']);
      }
    });
  }
}