import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';

import {
  ApexAxisChartSeries,
  ApexNonAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexLegend,
  ApexPlotOptions
} from 'ng-apexcharts';

interface BarChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
}

interface PieChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  title: ApexTitleSubtitle;
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
}

interface LineChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  colors: string[];
  dataLabels: ApexDataLabels;
}

interface SummaryData {
  totalQuestions: number;
  totalAnswers: number;
  activeUsers: number;
  bannedUsers: number;
  questionTrend: number;
  answerTrend: number;
  userTrend: number;
}

interface RadialChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  title: ApexTitleSubtitle;
  colors: string[];
  plotOptions: ApexPlotOptions;
}

interface Member {
  _id: string;
  username: string;
  avatar: string;
  reputation: number;
  dateJoined: string;
  status: string;
}

@Component({
  selector: 'app-communityvisual',
  templateUrl: './communityvisual.component.html',
  styleUrls: ['./communityvisual.component.css']
})
export class CommunityvisualComponent implements OnInit, OnDestroy {
  loading: boolean = true;
  membersLoading: boolean = true;
  private dataSub: Subscription | null = null;
  private membersSub: Subscription | null = null;
  communityId: number = 0;
  communityName: string = '';
  sidebarCollapsed: boolean = false;

  public barChartOptions: BarChartOptions;
  public pieChartOptions: PieChartOptions;
  public lineChartOptions: LineChartOptions;
  public radialChartOptions: RadialChartOptions;

  public summaryData: SummaryData = {
    totalQuestions: 0,
    totalAnswers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    questionTrend: 0,
    answerTrend: 0,
    userTrend: 0
  };

  public activeMembers: Member[] = [];
  public totalActive: number = 0;
  public membersPerPage: number = 10;
  public currentPage: number = 1;
  public totalPages: number = 1;

  constructor(private http: HttpClient, private route: ActivatedRoute) {
    this.barChartOptions = this.createEmptyBarChart();
    this.pieChartOptions = this.createEmptyPieChart();
    this.lineChartOptions = this.createEmptyLineChart();
    this.radialChartOptions = this.createEmptyRadialChart();
  }

  ngOnInit(): void {
    this.communityId = +this.route.snapshot.params['id'];
    this.loadCommunityStats();
    this.loadCommunityName();
    this.loadMembers();
  }

  ngOnDestroy(): void {
    if (this.dataSub) {
      this.dataSub.unsubscribe();
    }
    if (this.membersSub) {
      this.membersSub.unsubscribe();
    }
  }

  private createEmptyBarChart(): BarChartOptions {
    return {
      series: [],
      chart: {
        type: 'bar',
        height: 350,
        stacked: false,
        toolbar: { show: true },
        zoom: { enabled: true }
      },
      xaxis: {
        categories: []
      },
      title: {
        text: 'Monthly Activity Overview',
        align: 'center'
      },
      colors: ['#007bff', '#28a745', '#ffc107', '#dc3545'],
      dataLabels: {
        enabled: false
      },
      legend: {
        position: 'top'
      }
    };
  }

  private createEmptyPieChart(): PieChartOptions {
    return {
      series: [],
      chart: {
        type: 'pie',
        width: '100%',
        height: 350
      },
      labels: [],
      title: {
        text: 'Content Breakdown',
        align: 'center'
      },
      colors: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d'],
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any): string => {
          return opts.w.config.series[opts.seriesIndex] + ' (' + val.toFixed(1) + '%)';
        }
      },
      legend: {
        position: 'bottom'
      }
    };
  }

  private createEmptyLineChart(): LineChartOptions {
    return {
      series: [],
      chart: {
        type: 'line',
        height: 350,
        zoom: { enabled: true }
      },
      xaxis: {
        categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      },
      title: {
        text: 'Weekly Activity',
        align: 'center'
      },
      colors: ['#007bff'],
      dataLabels: {
        enabled: false
      }
    };
  }

  private createEmptyRadialChart(): RadialChartOptions {
    return {
      series: [],
      chart: {
        type: 'radialBar',
        height: 350
      },
      labels: [],
      title: {
        text: 'Engagement Rate',
        align: 'center'
      },
      colors: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0'],
      plotOptions: {
        radialBar: {
          dataLabels: {
            name: { fontSize: '14px' },
            value: { fontSize: '16px' },
            total: {
              show: true,
              label: 'Total'
            }
          }
        }
      }
    };
  }

  loadCommunityStats() {
    this.loading = true;
    const url = `${environment.apiUrl}/api/communities/${this.communityId}/stats`;
    console.log('Making request to:', url);
    
    this.dataSub = this.http.get(url, { withCredentials: true }).subscribe({
      next: (data: any) => {
        console.log('API Response:', JSON.stringify(data));
        if (data?.success) {
          this.updateChartsWithRealData(data);
        } else {
          console.error('API returned unsuccessful response');
          this.setEmptyData();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('API Error:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        this.setEmptyData();
        this.loading = false;
      }
    });
  }

  loadCommunityName() {
    this.http.get(`${environment.apiUrl}/api/communities/${this.communityId}`).subscribe({
      next: (data: any) => {
        this.communityName = data.name || 'Community';
      },
      error: (err) => {
        console.error('Error fetching community name:', err);
      }
    });
  }

loadMembers() {
  this.membersLoading = true;
  const url = `${environment.apiUrl}/api/communities/${this.communityId}/members?page=${this.currentPage}&per_page=${this.membersPerPage}`;
  this.membersSub = this.http.get(url, { withCredentials: true }).subscribe({
    next: (data: any) => {
      if (data?.success) {
        this.activeMembers = (data.activeMembers || [])
          .filter((member: any) => member.status === 'active' && member.dateJoined)
          .map((member: any) => ({
            _id: member._id,
            username: member.username,
            avatar: member.avatar || 'assets/default-avatar.png',
            reputation: member.reputation || 0,
            dateJoined: this.formatJoinedDate(member.dateJoined),
            status: member.status || 'active'
          }));
        this.totalActive = data.totalActive || 0;
        this.totalPages = Math.ceil(this.totalActive / this.membersPerPage);
        // Reset scroll to top of members list
        const membersScroll = document.querySelector('.members-scroll');
        if (membersScroll) {
          membersScroll.scrollTop = 0;
        }
      } else {
        this.activeMembers = [];
        this.totalActive = 0;
        this.totalPages = 1;
      }
      this.membersLoading = false;
    },
    error: (err) => {
      console.error('Error loading members:', err);
      this.activeMembers = [];
      this.totalActive = 0;
      this.totalPages = 1;
      this.membersLoading = false;
    }
  });
}

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadMembers();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadMembers();
    }
  }

  private updateChartsWithRealData(data: any): void {
    if (!data) {
      console.error('No data provided to update charts');
      this.setEmptyData();
      return;
    }
  
    console.log('Processing data for charts:', data);
  
    this.barChartOptions = {
      ...this.barChartOptions,
      series: [
        { name: 'Questions', data: data.monthlyQuestions || [] },
        { name: 'Answers', data: data.monthlyAnswers || [] },
        { name: 'New Users', data: data.monthlyUsers || [] }
      ],
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      }
    };
  
    this.pieChartOptions = {
      ...this.pieChartOptions,
      series: [
        data.totalQuestions || 0,
        data.totalAnswers || 0,
        data.activeUsers || 0,
        data.bannedUsers || 0
      ],
      labels: ['Questions', 'Answers', 'Active Users', 'Banned Users']
    };
  
    this.lineChartOptions = {
      ...this.lineChartOptions,
      series: [{
        name: 'Activity',
        data: data.weeklyActivity || []
      }]
    };
  
    this.summaryData = {
      totalQuestions: data.totalQuestions || 0,
      totalAnswers: data.totalAnswers || 0,
      activeUsers: data.activeUsers || 0,
      bannedUsers: data.bannedUsers || 0,
      questionTrend: data.questionTrend || 0,
      answerTrend: data.answerTrend || 0,
      userTrend: data.userTrend || 0
    };
  
    this.radialChartOptions = {
      ...this.radialChartOptions,
      series: [
        Math.min(100, ((data.totalQuestions || 0) / Math.max(data.totalQuestions || 1, 1)) * 100),
        Math.min(100, ((data.totalAnswers || 0) / Math.max(data.totalAnswers || 1, 1)) * 100),
        Math.min(100, ((data.activeUsers || 0) / Math.max(data.activeUsers || 1, 1)) * 100)
      ],
      labels: ['Questions', 'Answers', 'Active Users']
    };
  }
  
  private setEmptyData(): void {
    this.barChartOptions.series = [
      { name: 'Questions', data: [] },
      { name: 'Answers', data: [] },
      { name: 'New Users', data: [] }
    ];
    this.barChartOptions.xaxis.categories = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    this.pieChartOptions.series = [0, 0, 0, 0];
    this.pieChartOptions.labels = ['Questions', 'Answers', 'Active Users', 'Banned Users'];

    this.lineChartOptions.series = [{
      name: 'Activity',
      data: []
    }];

    this.summaryData = {
      totalQuestions: 0,
      totalAnswers: 0,
      activeUsers: 0,
      bannedUsers: 0,
      questionTrend: 0,
      answerTrend: 0,
      userTrend: 0
    };

    this.radialChartOptions.series = [0, 0, 0];
    this.radialChartOptions.labels = ['Questions', 'Answers', 'Active Users'];
  }

  onSidebarToggled(isCollapsed: boolean) {
    this.sidebarCollapsed = isCollapsed;
  }

  formatJoinedDate(dateString: string): string {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      console.warn('Invalid date string received:', dateString);
      return 'N/A';
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date parsed:', dateString);
        return 'N/A';
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      console.error('Date formatting error:', e, 'Input:', dateString);
      return 'N/A';
    }
  }
}