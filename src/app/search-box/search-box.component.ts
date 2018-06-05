import { Component, OnInit } from '@angular/core';
import { Repository, RepositoryService } from '../repository.service';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { combineLatest, map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

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
  public languageFilter = '';

  public readonly languageCounts$: Observable<LanguageCount[]>;
  public readonly filteredRepos$: Observable<Repository[]>;

  private topic$$ = new ReplaySubject<string>();
  private languageFilter$$ = new BehaviorSubject<string | null>(null);

  constructor(private repoService: RepositoryService) {
    this.filteredRepos$ = this.topic$$.pipe(
      switchMap(topic => this.repoService.searchRepositories(topic)),
      combineLatest(this.languageFilter$$),
      map(([repos, languageFilter]) =>
        this.filterByLanguage(repos, languageFilter),
      ),
    );

    this.languageCounts$ = this.filteredRepos$.pipe(
      map((repos: Repository[]) => this.buildLanguageBreakdown(repos)),
    );
  }

  ngOnInit() {}

  public search(): void {
    this.topic$$.next(this.topic);
  }

  public changeLanguageFilter(language: string | null): void {
    this.languageFilter$$.next(language);
  }

  private buildLanguageBreakdown(repos: Repository[]): LanguageCount[] {
    // Go through all languages and build up a list of language counts
    const breakdown = repos.reduce<object>((langs: object, { language }) => {
      return {
        ...langs,
        [language]: (langs[language] || 0) + 1,
      };
    }, {});
    // Convert language counts into a list of LanguageCount objects
    return Object.entries(breakdown).map(([language, count]) => ({
      language,
      count,
    }));
  }

  private filterByLanguage(
    repos: Repository[],
    language: string | null,
  ): Repository[] {
    if (!language) {
      return repos;
    }
    return repos.filter(repo => repo.language === language);
  }
}
