import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, forkJoin, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

declare const $: any;

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
  dateCreated: string;
  dateUpdated?: string;
  memberId: string;
  questionId: string;
  score: number;
}

@Component({
  selector: 'app-qdetails',
  templateUrl: './qdetails.component.html',
  styleUrls: ['./qdetails.component.css']
})
export class QdetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  question: any = null;
  answers: any[] = [];
  relatedQuestions: any[] = [];
  communityName: string = '';
  userMap: Map<string, string> = new Map();
  userAvatarMap: Map<string, string> = new Map();
  username: string = '';
  userId: string = '';
  newAnswerContent: string = '';
  isContentRelevant: boolean = false;
  validationError: string | null = null;
  lastFeedbackMessage: string | null = null; // Store feedback for inappropriate content
  private contentSubject = new Subject<string>();
  isValidating: boolean = false;
  isPosting: boolean = false;
  isDeletingQuestion: boolean = false;
  isDeletingAnswer: Map<string, boolean> = new Map();
  isUpdatingAnswer: Map<string, boolean> = new Map();
  editingAnswerId: string | null = null;
  editedAnswerContent: string = '';
  deleteType: 'question' | 'answer' | null = null;
  deleteId: string | null = null;
  isVotingAnswer: Map<string, boolean> = new Map();
  highlightedAnswerId: string | null = null;
  viewedAnswers: Set<string> = new Set();
  loading: boolean = true;
  sidebarCollapsed: boolean = false;
  selectedUser: any = null;
  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    const backdrops = document.getElementsByClassName('modal-backdrop');
    while (backdrops.length > 0) {
      backdrops[0].parentNode?.removeChild(backdrops[0]);
    }
    document.body.classList.remove('modal-open');

    const storedViewedAnswers = localStorage.getItem('viewedAnswers');
    if (storedViewedAnswers) {
      this.viewedAnswers = new Set(JSON.parse(storedViewedAnswers));
    }

    this.route.fragment.subscribe((fragment: string | null) => {
      if (fragment && fragment.startsWith('answer-')) {
        this.highlightedAnswerId = fragment.replace('answer-', '');
        if (this.highlightedAnswerId) {
          this.viewedAnswers.add(this.highlightedAnswerId);
          localStorage.setItem('viewedAnswers', JSON.stringify([...this.viewedAnswers]));
        }
      }
    });

    this.routeSub = this.route.params.subscribe(params => {
      const questionId = params['id'];
      if (questionId) {
        this.loading = true;
        this.loadUser();
        this.loadQuestion(questionId);
        this.loadAnswers(questionId);
        this.loadRecommendedQuestions();
        this.setupContentValidation();
      } else {
        console.error('No question ID found in route parameters');
        this.toastr.error('Invalid question ID', 'Error');
        this.router.navigate(['/']);
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.highlightedAnswerId && !this.viewedAnswers.has(this.highlightedAnswerId)) {
      $(`.answer:not(#answer-${this.highlightedAnswerId})`).fadeTo(500, 0.3);
      const element = document.getElementById(`answer-${this.highlightedAnswerId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    const modals = ['deleteModal', 'successModal', 'userProfileModal'];
    modals.forEach(modalId => {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
    });
    const backdrops = document.getElementsByClassName('modal-backdrop');
    while (backdrops.length > 0) {
      backdrops[0].parentNode?.removeChild(backdrops[0]);
    }
    document.body.classList.remove('modal-open');
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

  validateContent(content: string): Observable<any> {
    if (!content || !this.question?.communityId) {
      this.isContentRelevant = false;
      this.validationError = !content ? 'Content is required' : 'Community ID is missing';
      return of(null);
    }
    return this.http.post(`${environment.apiUrl}/validate-content`, {
      content,
      communityId: this.question.communityId
    }, { withCredentials: true });
  }

  loadUser() {
    this.http.get(`${environment.apiUrl}/api/users/me`, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.username = response.username;
        this.userId = response._id;
        console.log('Current user ID:', this.userId);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching user:', err);
        this.toastr.error('Session expired. Please log in again.', 'Authentication Error');
        this.router.navigate(['/login']);
        this.loading = false;
      }
    });
  }

  onSidebarToggled(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

  loadQuestion(questionId: string) {
    this.http.get<Question>(`${environment.apiUrl}/questions/${questionId}`).subscribe({
      next: (response: Question) => {
        this.http.get(`${environment.apiUrl}/communities`).subscribe({
          next: (communitiesResponse: any) => {
            const communityMap = new Map<number, string>();
            communitiesResponse.forEach((community: any) => {
              communityMap.set(community.idCommunity, community.name);
            });

            const memberIds: string[] = [response.memberId];
            this.fetchUsernames(memberIds).subscribe({
              next: () => {
                this.question = {
                  id: response._id,
                  title: response.title,
                  content: response.content,
                  votes: response.score || 0,
                  views: response.views || 0,
                  answers: response.answers || 0,
                  user: this.userMap.get(response.memberId) || 'Unknown',
                  avatar: this.userAvatarMap.get(response.memberId) || 'https://via.placeholder.com/20',
                  time: this.formatTime(response.dateCreated),
                  communityId: response.communityId,
                  memberId: response.memberId,
                  userVote: 0
                };
                this.communityName = communityMap.get(response.communityId) || 'Unknown';
                console.log('Question loaded successfully:', this.question);
                this.loading = false;
              },
              error: (err: HttpErrorResponse) => {
                console.error('Error fetching usernames in loadQuestion:', err);
                this.toastr.error('Error fetching usernames. Some user information may be missing.', 'Error');
                this.question = {
                  id: response._id,
                  title: response.title,
                  content: response.content,
                  votes: response.score || 0,
                  views: response.views || 0,
                  answers: response.answers || 0,
                  user: 'Unknown',
                  avatar: 'https://via.placeholder.com/20',
                  time: this.formatTime(response.dateCreated),
                  communityId: response.communityId,
                  memberId: response.memberId,
                  userVote: 0
                };
                this.communityName = communityMap.get(response.communityId) || 'Unknown';
                this.loading = false;
              }
            });
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error fetching communities:', err);
            this.toastr.error('Error fetching communities. Community name may be missing.', 'Error');
            const memberIds: string[] = [response.memberId];
            this.fetchUsernames(memberIds).subscribe({
              next: () => {
                this.question = {
                  id: response._id,
                  title: response.title,
                  content: response.content,
                  votes: response.score || 0,
                  views: response.views || 0,
                  answers: response.answers || 0,
                  user: this.userMap.get(response.memberId) || 'Unknown',
                  avatar: this.userAvatarMap.get(response.memberId) || 'https://via.placeholder.com/20',
                  time: this.formatTime(response.dateCreated),
                  communityId: response.communityId,
                  memberId: response.memberId,
                  userVote: 0
                };
                this.communityName = 'Unknown';
                this.loading = false;
              },
              error: (err: HttpErrorResponse) => {
                console.error('Error fetching usernames in loadQuestion:', err);
                this.toastr.error('Error fetching usernames. Some user information may be missing.', 'Error');
                this.question = {
                  id: response._id,
                  title: response.title,
                  content: response.content,
                  votes: response.score || 0,
                  views: response.views || 0,
                  answers: response.answers || 0,
                  user: 'Unknown',
                  avatar: 'https://via.placeholder.com/20',
                  time: this.formatTime(response.dateCreated),
                  communityId: response.communityId,
                  memberId: response.memberId,
                  userVote: 0
                };
                this.communityName = 'Unknown';
                this.loading = false;
              }
            });
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching question:', err);
        this.toastr.error('Error fetching question. It may have been deleted or does not exist.', 'Error');
        this.router.navigate(['/']);
        this.loading = false;
      }
    });
  }

  loadAnswers(questionId: string) {
    this.http.get<Answer[]>(`${environment.apiUrl}/questions/${questionId}/answers`).subscribe({
      next: (response: Answer[]) => {
        console.log('Answers response:', response);
        const memberIds: string[] = [...new Set(response.map((a: Answer) => a.memberId))];
        this.fetchUsernames(memberIds).subscribe({
          next: () => {
            const answerIds = response.map((a: Answer) => a._id);
            this.fetchUserVotesForAnswers(answerIds).subscribe({
              next: (votes: any) => {
                this.answers = response.map((answer: Answer) => {
                  const userVote = votes[answer._id] || 0;
                  return {
                    id: answer._id,
                    content: answer.content,
                    votes: answer.score || 0,
                    user: this.userMap.get(answer.memberId) || 'Unknown',
                    avatar: this.userAvatarMap.get(answer.memberId) || 'https://via.placeholder.com/20',
                    time: this.formatTime(answer.dateCreated),
                    dateCreated: answer.dateCreated,
                    dateUpdated: answer.dateUpdated,
                    memberId: answer.memberId,
                    userVote: userVote
                  };
                });
                console.log('Mapped answers:', this.answers);
              },
              error: (err: HttpErrorResponse) => {
                console.error('Error fetching user votes for answers:', err);
                this.toastr.error('Error fetching user votes for answers. Vote counts may be inaccurate.', 'Error');
                this.answers = response.map((answer: Answer) => {
                  return {
                    id: answer._id,
                    content: answer.content,
                    votes: answer.score || 0,
                    user: this.userMap.get(answer.memberId) || 'Unknown',
                    avatar: this.userAvatarMap.get(answer.memberId) || 'https://via.placeholder.com/20',
                    time: this.formatTime(answer.dateCreated),
                    dateCreated: answer.dateCreated,
                    dateUpdated: answer.dateUpdated,
                    memberId: answer.memberId,
                    userVote: 0
                  };
                });
              }
            });
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error fetching usernames for answers:', err);
            this.toastr.error('Error fetching usernames for answers. Some user information may be missing.', 'Error');
            this.answers = response.map((answer: Answer) => {
              return {
                id: answer._id,
                content: answer.content,
                votes: answer.score || 0,
                user: 'Unknown',
                avatar: 'https://via.placeholder.com/20',
                time: this.formatTime(answer.dateCreated),
                dateCreated: answer.dateCreated,
                dateUpdated: answer.dateUpdated,
                memberId: answer.memberId,
                userVote: 0
              };
            });
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching answers:', err);
        this.toastr.error('Error fetching answers. Answers may not be displayed.', 'Error');
        this.answers = [];
      }
    });
  }

  fetchUserVotesForAnswers(answerIds: string[]): Observable<any> {
    if (!this.userId || answerIds.length === 0) {
      return of({});
    }
    return this.http.post(`${environment.apiUrl}/user-votes`, { answerIds, userId: this.userId }, { withCredentials: true }).pipe(
      catchError(err => {
        console.error('Error fetching user votes:', err);
        return of({});
      })
    );
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
        console.log('Recommended questions loaded:', this.relatedQuestions);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching recommended questions:', err);
        this.toastr.error('Error fetching recommended questions', 'Error');
        this.relatedQuestions = [];
      }
    });
  }

  fetchUsernames(memberIds: string[]): Observable<void> {
    return new Observable<void>((observer) => {
      const requests = memberIds.map(id =>
        this.http.get(`${environment.apiUrl}/api/users/${id}`, { withCredentials: true }).pipe(
          catchError((err: HttpErrorResponse) => {
            console.error(`Error fetching user ${id}:`, err);
            return of({ username: 'Unknown', avatar: 'https://via.placeholder.com/20' });
          })
        )
      );
      forkJoin(requests).subscribe({
        next: (responses: any[]) => {
          console.log('Usernames fetched:', responses);
          responses.forEach((res, index) => {
            this.userMap.set(memberIds[index], res.username);
            this.userAvatarMap.set(memberIds[index], res.avatar || 'https://via.placeholder.com/20');
          });
          observer.next();
          observer.complete();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error in fetchUsernames:', err);
          this.toastr.error('Error fetching usernames', 'Error');
          observer.error(err);
        }
      });
    });
  }

  voteQuestion(value: number) {
    if (this.isOwner(this.question?.memberId)) {
      this.toastr.info('You cannot vote on your own question', 'Info');
      return;
    }
    this.http.post(`${environment.apiUrl}/vote`, { questionId: this.question.id, value }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        const newVote = response.newVote;
        const previousVote = this.question.userVote || 0;
        if (newVote === 0) {
          this.question.votes -= previousVote;
          this.question.userVote = 0;
          this.toastr.success('Vote removed', 'Success');
        } else if (previousVote !== 0) {
          const scoreChange = -previousVote + value;
          this.question.votes += scoreChange;
          this.question.userVote = newVote;
          this.toastr.success(`Question ${value > 0 ? 'upvoted' : 'downvoted'} successfully`, 'Success');
        } else {
          this.question.votes += value;
          this.question.userVote = newVote;
          this.toastr.success(`Question ${value > 0 ? 'upvoted' : 'downvoted'} successfully`, 'Success');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error voting on question:', err);
        this.toastr.error('Error voting on question', 'Error');
      }
    });
  }

  voteAnswer(answerId: string, value: number) {
    const answer = this.answers.find(a => a.id === answerId);
    if (!answer) {
      this.toastr.error('Answer not found', 'Error');
      return;
    }
    if (this.isOwner(answer.memberId)) {
      this.toastr.info('You cannot vote on your own answer', 'Info');
      return;
    }
    if (this.isVotingAnswer.get(answerId)) {
      this.toastr.info('A vote is already in progress', 'Info');
      return;
    }
    this.isVotingAnswer.set(answerId, true);
    this.http.post(`${environment.apiUrl}/vote`, { answerId, value }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        const newVote = response.newVote;
        const previousVote = answer.userVote || 0;
        if (newVote === 0) {
          answer.votes -= previousVote;
          answer.userVote = 0;
          this.toastr.success('Vote removed', 'Success');
        } else if (previousVote !== 0) {
          const scoreChange = -previousVote + value;
          answer.votes += scoreChange;
          answer.userVote = newVote;
          this.toastr.success(`Answer ${value > 0 ? 'upvoted' : 'downvoted'} successfully`, 'Success');
        } else {
          answer.votes += value;
          answer.userVote = newVote;
          this.toastr.success(`Answer ${value > 0 ? 'upvoted' : 'downvoted'} successfully`, 'Success');
        }
        this.isVotingAnswer.set(answerId, false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error voting on answer:', err);
        this.isVotingAnswer.set(answerId, false);
        this.toastr.error('Error voting on answer', 'Error');
      }
    });
  }

  postAnswer(content: string, answerForm: any) {
    if (!content.trim()) {
      this.toastr.error('Answer content cannot be empty', 'Error');
      return;
    }
    this.isPosting = true;
    this.lastFeedbackMessage = null; // Clear previous feedback
    console.log('Posting answer with content:', content);
    this.http.post(`${environment.apiUrl}/questions/${this.question.id}/answers`, { content }, { withCredentials: true }).subscribe({
      next: () => {
        this.isPosting = false;
        this.newAnswerContent = '';
        answerForm.resetForm();
        this.isContentRelevant = false;
        this.validationError = null;
        this.question.answers += 1;
        this.toastr.success('Answer posted successfully', 'Success');
        const successModal = new (window as any).bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
        setTimeout(() => {
          successModal.hide();
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) {
            backdrop.remove();
          }
          document.body.classList.remove('modal-open');
          window.location.reload();
        }, 2000);
      },
      error: (err: HttpErrorResponse) => {
        this.isPosting = false;
        console.error('Error posting answer:', err);
        if (err.status === 400 && err.error.message === 'Content flagged as inappropriate') {
          const feedback = err.error.feedback || 'Your content was flagged as inappropriate.';
          this.lastFeedbackMessage = feedback; // Store for display
          this.showInappropriateContentWarning(feedback);
          this.newAnswerContent = '';
          answerForm.resetForm();
        } else {
          this.toastr.error(err.error.message || 'Error posting answer', 'Error');
        }
      }
    });
  }

  showInappropriateContentWarning(feedback: string) {
    let countdown = 5;
    const toastrRef = this.toastr.error(
      `${feedback} Reloading in ${countdown} seconds...`,
      'Inappropriate Content',
      {
        timeOut: 6000,
        extendedTimeOut: 0,
        closeButton: true,
        tapToDismiss: false,
        toastClass: 'ngx-toastr border-danger'
      }
    );

    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        toastrRef.toastRef.componentInstance.message = `${feedback} Reloading in ${countdown} seconds...`;
      } else {
        clearInterval(countdownInterval);
        console.log('Reloading page...');
        window.location.reload();
      }
    }, 1000);
  }

  openDeleteModal(type: 'question' | 'answer', id: string) {
    this.deleteType = type;
    this.deleteId = id;
    const deleteModal = new (window as any).bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
  }

  confirmDelete() {
    if (this.deleteType === 'question') {
      this.deleteQuestion();
    } else if (this.deleteType === 'answer' && this.deleteId) {
      this.deleteAnswer(this.deleteId);
    }
    const deleteModal = (window as any).bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    deleteModal.hide();
  }

  deleteQuestion() {
    this.isDeletingQuestion = true;
    this.http.delete(`${environment.apiUrl}/questions/${this.question.id}`, { withCredentials: true }).subscribe({
      next: () => {
        this.isDeletingQuestion = false;
        this.toastr.success('Question deleted successfully', 'Success');
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error deleting question:', err);
        this.isDeletingQuestion = false;
        this.toastr.error(err.error.message || 'Error deleting question', 'Error');
      }
    });
  }

  deleteAnswer(answerId: string) {
    this.isDeletingAnswer.set(answerId, true);
    this.http.delete(`${environment.apiUrl}/answers/${answerId}`, { withCredentials: true }).subscribe({
      next: () => {
        this.isDeletingAnswer.set(answerId, false);
        this.answers = this.answers.filter(answer => answer.id !== answerId);
        this.question.answers -= 1;
        this.toastr.success('Answer deleted successfully', 'Success');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error deleting answer:', err);
        this.isDeletingAnswer.set(answerId, false);
        this.toastr.error(err.error.message || 'Error deleting answer', 'Error');
      }
    });
  }

  startEditingAnswer(answer: any) {
    this.editingAnswerId = answer.id;
    this.editedAnswerContent = answer.content;
  }

  cancelEditingAnswer() {
    this.editingAnswerId = null;
    this.editedAnswerContent = '';
  }

  updateAnswer(answerId: string) {
    if (!this.editedAnswerContent.trim()) {
      this.toastr.error('Answer content cannot be empty', 'Error');
      return;
    }
    this.isUpdatingAnswer.set(answerId, true);
    this.http.put(`${environment.apiUrl}/answers/${answerId}`, { content: this.editedAnswerContent }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.isUpdatingAnswer.set(answerId, false);
        const answer = this.answers.find(a => a.id === answerId);
        if (answer) {
          answer.content = this.editedAnswerContent;
          answer.dateUpdated = response.dateUpdated;
          answer.time = this.formatTime(response.dateUpdated);
        }
        this.editingAnswerId = null;
        this.editedAnswerContent = '';
        this.toastr.success('Answer updated successfully', 'Success');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error updating answer:', err);
        this.isUpdatingAnswer.set(answerId, false);
        this.toastr.error(err.error.message || 'Error updating answer', 'Error');
      }
    });
  }

  formatTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `${diffMins} mins ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }
    return date.toLocaleDateString();
  }

  getAnswerTimestampLabel(answer: any): string {
    return answer.dateUpdated ? 'Updated' : 'Answered';
  }

  getAnswerTimestamp(answer: any): string {
    const timestamp = answer.dateUpdated || answer.dateCreated;
    return this.formatTime(timestamp);
  }

showUserProfile(memberId: string) {
  this.http.get(`${environment.apiUrl}/api/users/${memberId}/profile`, { withCredentials: true }).subscribe({
    next: (response: any) => {
      // Format the date here
      const formattedDate = response.dateJoined ? 
        this.formatJoinedDate(response.dateJoined) : 'N/A';
      
      this.selectedUser = {
        username: response.username || 'Unknown',
        avatar: response.avatar || 'https://via.placeholder.com/50',
        questionsCount: response.questionsCount || 0,
        answersCount: response.answersCount || 0,
        status: response.status || 'N/A',
        reputation: response.reputation || 0,
        dateJoined: formattedDate,
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

// Add this new method to format the date
formatJoinedDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}-${month}-${year} at ${hours}:${minutes}`;
}

  isOwner(memberId: string | undefined): boolean {
    return this.userId === memberId;
  }
}