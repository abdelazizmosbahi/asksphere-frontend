import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {
  transform(communities: any[], joinedCommunities: Set<number>): any[] {
    return communities.filter(community => joinedCommunities.has(community.id));
  }
}