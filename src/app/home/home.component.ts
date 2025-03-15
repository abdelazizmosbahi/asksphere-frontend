import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
declare var $: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  user: any = null;
  username: string = '';
  searchQuery: string = '';
  questions = [
    {
      id: 1,
      title: 'Bootstrap select pass value with disabled',
      description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.',
      votes: 3,
      answers: 3,
      views: 12,
      tags: ['javascript', 'bootstrap-4', 'jquery'],
      user: 'Arden Smith',
      time: '6 hours ago'
    },
    {
      id: 2,
      title: 'Bootstrap select pass value with disabled',
      description: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.',
      votes: 3,
      answers: 3,
      views: 12,
      tags: ['javascript', 'bootstrap-4', 'jquery'],
      user: 'Arden Smith',
      time: '6 hours ago'
    }
  ];
  relatedQuestions = [
    { id: 3, title: 'Using web3 to precompile contract', user: 'Sudhir Kumbhare', time: '2 mins ago' },
    { id: 4, title: 'Is it true while finding Time Complexity of the algorithm [closed]', user: 'winnax', time: '48 mins ago' },
    { id: 5, title: 'Image picker and store them into firebase flutter', user: 'John Doe', time: '1 hour ago' }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadUser();
    $(document).ready(() => {
      $('.question-item').hide().fadeIn(500);
    });
  }

  loadUser() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
      this.username = this.user.username;
    } else {
      this.router.navigate(['/login']); // Redirect to login if no user
    }
  }

  logout() {
    this.authService.logout();
    this.user = null;
    this.username = '';
    this.router.navigate(['/login']);
  }

  onSearch() {
    if (this.searchQuery) {
      console.log('Searching for:', this.searchQuery);
    }
  }
}