import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QdetailsComponent } from './qdetails.component';

describe('QdetailsComponent', () => {
  let component: QdetailsComponent;
  let fixture: ComponentFixture<QdetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QdetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QdetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
