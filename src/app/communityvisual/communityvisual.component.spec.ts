import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityvisualComponent } from './communityvisual.component';

describe('CommunityvisualComponent', () => {
  let component: CommunityvisualComponent;
  let fixture: ComponentFixture<CommunityvisualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityvisualComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommunityvisualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
