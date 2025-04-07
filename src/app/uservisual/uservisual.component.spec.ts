import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UservisualComponent } from './uservisual.component';

describe('UservisualComponent', () => {
  let component: UservisualComponent;
  let fixture: ComponentFixture<UservisualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UservisualComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UservisualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
