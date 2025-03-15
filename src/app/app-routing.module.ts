import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { HomeComponent } from './home/home.component';
import { LandingComponent } from './landing/landing.component';
import { ProfileComponent } from './profile/profile.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { ReferralsComponent } from './referrals/referrals.component';
import { SettingsComponent } from './settings/settings.component';
import { QuestionComponent } from './question/question.component';
import { QdetailsComponent } from './qdetails/qdetails.component';
import { AboutComponent } from './about/about.component';
import { RevisionsComponent } from './revisions/revisions.component';
import { RecoverComponent } from './recover/recover.component';
import { ListComponent } from './list/list.component';
import { BadgesComponent } from './badges/badges.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'landing', component: LandingComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'referrels', component: ReferralsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'question', component: QuestionComponent },
  { path: 'qdetails', component: QdetailsComponent },
  { path: 'about', component: AboutComponent },
  { path: 'revisions', component: RevisionsComponent },
  {path: 'recover', component:RecoverComponent},
  {path: 'list', component:ListComponent},
  {path: 'badges', component:BadgesComponent}


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }