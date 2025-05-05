import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';

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
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

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

interface QuestionPerformanceOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
}

interface SummaryData {
  totalQuestions: number;
  totalAnswers: number;
  totalVotes: number;
  totalViews: number;
  questionTrend: number;
  answerTrend: number;
  voteTrend: number;
  viewTrend: number;
}

interface CommunityData {
  name: string;
  score: number;
}

@Component({
  selector: 'app-uservisual',
  templateUrl: './uservisual.component.html',
  styleUrls: ['./uservisual.component.css']
})
export class UserVisualComponent implements OnInit, OnDestroy {
  loading: boolean = true;
  private dataSub: Subscription | null = null;
  sidebarCollapsed: boolean = false;

  // Chart options
  public barChartOptions: BarChartOptions;
  public pieChartOptions: PieChartOptions;
  public lineChartOptions: LineChartOptions;
  public questionPerformanceOptions: QuestionPerformanceOptions;

  // Data properties
  public summaryData: SummaryData = {
    totalQuestions: 0,
    totalAnswers: 0,
    totalVotes: 0,
    totalViews: 0,
    questionTrend: 0,
    answerTrend: 0,
    voteTrend: 0,
    viewTrend: 0
  };
  public topCommunities: CommunityData[] = [];

  constructor(private http: HttpClient) {
    // Initialize charts with empty data
    this.barChartOptions = this.createEmptyBarChart();
    this.pieChartOptions = this.createEmptyPieChart();
    this.lineChartOptions = this.createEmptyLineChart();
    this.questionPerformanceOptions = this.createEmptyQuestionPerformanceChart();
  }

  ngOnInit(): void {
    this.loadUserStats();
  }

  ngOnDestroy(): void {
    if (this.dataSub) {
      this.dataSub.unsubscribe();
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
      colors: ['#007bff', '#28a745', '#ffc107'],
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
        text: 'Contribution Breakdown',
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

  private createEmptyQuestionPerformanceChart(): QuestionPerformanceOptions {
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
        text: 'Question Performance',
        align: 'center'
      },
      colors: ['#28a745', '#dc3545'],
      dataLabels: {
        enabled: true
      },
      legend: {
        position: 'top'
      }
    };
  }

  loadUserStats() {
    this.loading = true;
    this.dataSub = this.http.get(`${environment.apiUrl}/api/users/me/stats`, { withCredentials: true }).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.updateChartsWithRealData(data);
        } else {
          console.error('Failed to load stats:', data.message);
          this.setEmptyData();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching user stats:', err);
        this.setEmptyData();
        this.loading = false;
      }
    });
  }

  private updateChartsWithRealData(data: any): void {
    // Bar Chart - Monthly Activity
    this.barChartOptions.series = [
      { name: 'Questions', data: data.monthlyQuestions || [] },
      { name: 'Answers', data: data.monthlyAnswers || [] },
      { name: 'Votes', data: data.monthlyVotes || [] }
    ];
    this.barChartOptions.xaxis.categories = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Pie Chart - Contribution Breakdown
    this.pieChartOptions.series = [
      data.totalQuestions || 0,
      data.totalAnswers || 0,
      data.totalVotes || 0,
      data.totalViews || 0
    ];
    this.pieChartOptions.labels = [
      'Questions', 'Answers', 'Votes', 'Views'
    ];

    // Line Chart - Weekly Activity
    this.lineChartOptions.series = [{
      name: 'Activity',
      data: data.weeklyActivity || []
    }];

    // Question Performance
    this.questionPerformanceOptions.series = [
      { name: 'Upvotes', data: data.questionUpvotes || [] },
      { name: 'Downvotes', data: data.questionDownvotes || [] }
    ];
    this.questionPerformanceOptions.xaxis.categories = data.questionTitles || [];

    // Summary data
    this.summaryData = {
      totalQuestions: data.totalQuestions || 0,
      totalAnswers: data.totalAnswers || 0,
      totalVotes: data.totalVotes || 0,
      totalViews: data.totalViews || 0,
      questionTrend: data.questionTrend || 0,
      answerTrend: data.answerTrend || 0,
      voteTrend: data.voteTrend || 0,
      viewTrend: data.viewTrend || 0
    };

    // Top Communities
    this.topCommunities = data.topCommunities || [];
  }

  private setEmptyData(): void {
    this.barChartOptions.series = [
      { name: 'Questions', data: [] },
      { name: 'Answers', data: [] },
      { name: 'Votes', data: [] }
    ];
    this.barChartOptions.xaxis.categories = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    this.pieChartOptions.series = [0, 0, 0, 0];
    this.pieChartOptions.labels = ['Questions', 'Answers', 'Votes', 'Views'];

    this.lineChartOptions.series = [{
      name: 'Activity',
      data: []
    }];

    this.questionPerformanceOptions.series = [
      { name: 'Upvotes', data: [] },
      { name: 'Downvotes', data: [] }
    ];
    this.questionPerformanceOptions.xaxis.categories = [];

    this.summaryData = {
      totalQuestions: 0,
      totalAnswers: 0,
      totalVotes: 0,
      totalViews: 0,
      questionTrend: 0,
      answerTrend: 0,
      voteTrend: 0,
      viewTrend: 0
    };

    this.topCommunities = [];
  }

  onSidebarToggled(isCollapsed: boolean) {
    this.sidebarCollapsed = isCollapsed;
  }
}