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
@NgModule({
  declarations: [AppComponent, LoginComponent, SignupComponent, HomeComponent, FilterPipe, QdetailsComponent, CommunityComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule, FormsModule, ReactiveFormsModule, BrowserAnimationsModule, ToastrModule.forRoot({ // Configure Toastr
    timeOut: 3000,
    positionClass: 'toast-top-right',
    preventDuplicates: true,
  })
],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }