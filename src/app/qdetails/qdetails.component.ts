import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

declare const $: any; // Declare jQuery for animations

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
export class QdetailsComponent implements OnInit, AfterViewInit {
  question: any = null;
  answers: any[] = [];
  relatedQuestions: any[] = [];
  communityName: string = '';
  userMap: Map<string, string> = new Map();
  username: string = '';
  userId: string = '';
  newAnswerContent: string = '';
  isContentRelevant: boolean = false;
  validationError: string | null = null;
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
  loading: boolean = true; // Add loading state

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
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

    const questionId = this.route.snapshot.paramMap.get('id');
    if (questionId) {
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
                  time: this.formatTime(response.dateCreated),
                  communityId: response.communityId,
                  memberId: response.memberId
                };
                this.communityName = communityMap.get(response.communityId) || 'Unknown';
                console.log('Question loaded successfully:', this.question);
                this.loading = false; // Set loading to false once critical data is loaded
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
                  time: this.formatTime(response.dateCreated),
                  communityId: response.communityId,
                  memberId: response.memberId
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
                  time: this.formatTime(response.dateCreated),
                  communityId: response.communityId,
                  memberId: response.memberId
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
                  time: this.formatTime(response.dateCreated),
                  communityId: response.communityId,
                  memberId: response.memberId
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
                  const mappedAnswer = {
                    id: answer._id,
                    content: answer.content,
                    votes: answer.score || 0,
                    user: this.userMap.get(answer.memberId) || 'Unknown',
                    time: this.formatTime(answer.dateCreated),
                    dateCreated: answer.dateCreated,
                    dateUpdated: answer.dateUpdated,
                    memberId: answer.memberId,
                    userVote: userVote
                  };
                  return mappedAnswer;
                });
                console.log('Mapped answers:', this.answers);
              },
              error: (err: HttpErrorResponse) => {
                console.error('Error fetching user votes for answers:', err);
                this.toastr.error('Error fetching user votes for answers. Vote counts may be inaccurate.', 'Error');
                this.answers = response.map((answer: Answer) => {
                  const mappedAnswer = {
                    id: answer._id,
                    content: answer.content,
                    votes: answer.score || 0,
                    user: this.userMap.get(answer.memberId) || 'Unknown',
                    time: this.formatTime(answer.dateCreated),
                    dateCreated: answer.dateCreated,
                    dateUpdated: answer.dateUpdated,
                    memberId: answer.memberId,
                    userVote: 0
                  };
                  return mappedAnswer;
                });
              }
            });
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error fetching usernames for answers:', err);
            this.toastr.error('Error fetching usernames for answers. Some user information may be missing.', 'Error');
            this.answers = response.map((answer: Answer) => {
              const mappedAnswer = {
                id: answer._id,
                content: answer.content,
                votes: answer.score || 0,
                user: 'Unknown',
                time: this.formatTime(answer.dateCreated),
                dateCreated: answer.dateCreated,
                dateUpdated: answer.dateUpdated,
                memberId: answer.memberId,
                userVote: 0
              };
              return mappedAnswer;
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
            return of({ username: 'Unknown' });
          })
        )
      );
      forkJoin(requests).subscribe({
        next: (responses: any[]) => {
          console.log('Usernames fetched:', responses);
          responses.forEach((res, index) => {
            this.userMap.set(memberIds[index], res.username);
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
    this.http.post(`${environment.apiUrl}/vote`, { questionId: this.question.id, value }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        const newVote = response.newVote;
        if (newVote === 0) {
          this.question.votes -= this.question.userVote || value;
          this.question.userVote = 0;
          this.toastr.success('Vote removed', 'Success');
        } else if (this.question.userVote !== 0) {
          const scoreChange = -this.question.userVote + value;
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
    if (this.isVotingAnswer.get(answerId)) {
      return;
    }
    this.isVotingAnswer.set(answerId, true);
    this.http.post(`${environment.apiUrl}/vote`, { answerId, value }, { withCredentials: true }).subscribe({
      next: (response: any) => {
        const answer = this.answers.find(a => a.id === answerId);
        if (answer) {
          const newVote = response.newVote;
          if (newVote === 0) {
            answer.votes -= answer.userVote;
            answer.userVote = 0;
            this.toastr.success('Vote removed', 'Success');
          } else if (answer.userVote !== 0) {
            const scoreChange = -answer.userVote + value;
            answer.votes += scoreChange;
            answer.userVote = newVote;
            this.toastr.success(`Answer ${value > 0 ? 'upvoted' : 'downvoted'} successfully`, 'Success');
          } else {
            answer.votes += value;
            answer.userVote = newVote;
            this.toastr.success(`Answer ${value > 0 ? 'upvoted' : 'downvoted'} successfully`, 'Success');
          }
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
    this.isPosting = true;
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
          window.location.reload();
        }, 2000);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error posting answer:', err);
        this.isPosting = false;
        this.toastr.error(err.error.message || 'Error posting answer', 'Error');
      }
    });
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