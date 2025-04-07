// import { Component, Input } from '@angular/core';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-sidebar',
//   templateUrl: './sidebar.component.html',
//   styleUrls: ['./sidebar.component.css']
// })
// export class SidebarComponent {
//   @Input() collapsed: boolean = false;
//   joinedCommunities: Set<number> = new Set([1, 2, 3]); // Dummy data, replace with real data
//   userBadges: any[] = ['badge1', 'badge2']; // Dummy data, replace with real data
//   communityMap: Map<number, string> = new Map([
//     [1, 'Angular Devs'],
//     [2, 'React Enthusiasts'],
//     [3, 'Vue Lovers']
//   ]); // Dummy data, replace with real data

//   constructor(private router: Router) {}

//   isActive(route: string): boolean {
//     return this.router.url === route;
//   }

//   getCommunityName(communityId: number): string {
//     return this.communityMap.get(communityId) || 'Unknown';
//   }
// }