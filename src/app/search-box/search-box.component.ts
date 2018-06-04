import { Component, OnInit } from '@angular/core';
import { Repository, RepositoryService } from '../repository.service';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss'],
})
export class SearchBoxComponent implements OnInit {
  public topic = '';
  public repositories: Repository[] = [];

  constructor(private repoService: RepositoryService) {}

  ngOnInit() {}

  search(): void {
    const topic = this.topic.value;
    this.repoService.searchRepositories(topic).subscribe(repos => {
      this.repositories = repos;
    });
  }
}