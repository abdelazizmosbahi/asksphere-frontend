import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { HomeComponent } from './home/home.component';
import { LandingComponent } from './landing/landing.component';
import { ProfileComponent } from './profile/profile.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { SettingsComponent } from './settings/settings.component';
import { QuestionComponent } from './question/question.component';
import { QdetailsComponent } from './qdetails/qdetails.component';
import { RecoverComponent } from './recover/recover.component';
import { BadgesComponent } from './badges/badges.component';
import { CommunityComponent } from './community/community.component';
import { UserVisualComponent } from './uservisual/uservisual.component';
import { CommunityvisualComponent } from './communityvisual/communityvisual.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'landing', component: LandingComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'question', component: QuestionComponent },
  { path: 'questions', component: QuestionComponent }, // Add route for QuestionComponent
  { path: 'question/:id', component: QdetailsComponent },
  { path: 'qdetails', component: QdetailsComponent },
  {path: 'recover', component:RecoverComponent},
  { path: 'badges', component: BadgesComponent },
  { path: 'community/:id', component: CommunityComponent },
  { path: 'community/:id/stats', component: CommunityvisualComponent },
  { path: 'uservisual', component: UserVisualComponent },
  { path: '**', redirectTo: '' }


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }