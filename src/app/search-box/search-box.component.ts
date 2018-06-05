import { Component, OnInit } from '@angular/core';
import { Repository, RepositoryService } from '../repository.service';

interface LanguageCount {
  language: string;
  count: number;
}

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss'],
})
export class SearchBoxComponent implements OnInit {
  public topic = '';
  public repositories: Repository[] = [];
  public languageCounts: LanguageCount[] = [];

  constructor(private repoService: RepositoryService) {}

  ngOnInit() {}

  search(): void {
    this.repoService.searchRepositories(this.topic).subscribe(repos => {
      // Set the repos as an instance property so it's accessible in the template
      this.repositories = repos;
      // Rebuild our language breakdown
      this.buildLanguageBreakdown();
    });
  }

  buildLanguageBreakdown() {
    // Go through all languages and build up a list of language counts
    const breakdown = this.repositories.reduce<object>((langs: object, { language }) => {
      return {
        ...langs,
        [language]: (langs[language] || 0) + 1,
      };
    }, {});
    // Convert language counts into a list of LanguageCount objects
    this.languageCounts = Object.entries(breakdown).map(([language, count]) => ({ language, count }));
  }
}
