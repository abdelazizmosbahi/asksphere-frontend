import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
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
};

interface PieChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  title: ApexTitleSubtitle;
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
};

interface LineChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  colors: string[];
  dataLabels: ApexDataLabels;
};

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

interface HeatmapCell {
  day: string;
  count: number;
  intensity: number;
}

interface TimelineEvent {
  type: string;
  description: string;
  date: Date;
}

interface RadialChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  title: ApexTitleSubtitle;
  colors: string[];
  plotOptions: ApexPlotOptions;
}

@Component({
  selector: 'app-uservisual',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './uservisual.component.html',
  styleUrls: ['./uservisual.component.css']
})
export class UserVisualComponent implements OnInit, OnDestroy {
  loading: boolean = true;
  private dataSub: Subscription | null = null;

  // Chart options
  public barChartOptions: BarChartOptions;
  public pieChartOptions: PieChartOptions;
  public lineChartOptions: LineChartOptions;
  public radialChartOptions: RadialChartOptions;

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
  public heatmapData: HeatmapCell[] = [];
  public recentActivity: TimelineEvent[] = [];

  constructor(private http: HttpClient) {
    // Initialize charts with empty data
    this.barChartOptions = this.createEmptyBarChart();
    this.pieChartOptions = this.createEmptyPieChart();
    this.lineChartOptions = this.createEmptyLineChart();
    this.radialChartOptions = this.createEmptyRadialChart();
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

    // Heatmap data
    this.heatmapData = this.generateHeatmapData(data.weeklyActivity || []);

    // Radial chart
    this.radialChartOptions.series = [
      Math.min(100, ((data.totalQuestions || 0) / 50) * 100),
      Math.min(100, ((data.totalAnswers || 0) / 100) * 100),
      Math.min(100, ((data.totalVotes || 0) / 200) * 100)
    ];
    this.radialChartOptions.labels = ['Questions', 'Answers', 'Votes'];
  }

  private setEmptyData(): void {
    // Initialize all with empty data
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

    this.heatmapData = this.generateHeatmapData([]);
    this.recentActivity = [];
    this.radialChartOptions.series = [0, 0, 0];
    this.radialChartOptions.labels = ['Questions', 'Answers', 'Votes'];
  }

  private generateHeatmapData(weeklyActivity: number[]): HeatmapCell[] {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxValue = Math.max(...weeklyActivity, 1); // Avoid division by zero
    return weeklyActivity.map((count, index) => ({
      day: days[index],
      count,
      intensity: count / maxValue
    }));
  }
}