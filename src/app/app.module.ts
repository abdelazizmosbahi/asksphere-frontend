import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { HomeComponent } from './home/home.component';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FilterPipe } from './filter.pipe';
import { QdetailsComponent } from './qdetails/qdetails.component';
import { ToastrModule } from 'ngx-toastr';
import { CommunityComponent } from './community/community.component';
import { QuestionComponent } from './question/question.component';
import { Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component'; // Import ProfileComponent
import { BadgesComponent } from './badges/badges.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { NotificationService } from './notification.service';
import { CommonModule } from '@angular/common';
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'community/:id', component: CommunityComponent },
  { path: 'question/:id', component: QdetailsComponent },
  { path: 'questions', component: QuestionComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: '**', redirectTo: '' }
];
@NgModule({
  declarations: [AppComponent,
    LoginComponent,
    SignupComponent,
    HomeComponent,
    FilterPipe,
    QuestionComponent,
    QdetailsComponent,
    CommunityComponent,
    BadgesComponent,
    ProfileComponent,
    NotificationsComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule, CommonModule,FormsModule, ReactiveFormsModule, BrowserAnimationsModule, ToastrModule.forRoot({ // Configure Toastr
    timeOut: 3000,
    positionClass: 'toast-top-right',
    preventDuplicates: true,
  })
],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }