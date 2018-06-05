import { Component, OnInit } from '@angular/core';
import { Repository, RepositoryService } from '../repository.service';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { map, switchMap } from 'rxjs/operators';
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

  private repos$$ = new BehaviorSubject<Repository[]>([]);
  private filteredRepos$$ = new BehaviorSubject<Repository[]>([]);
  private topic$$ = new ReplaySubject<string>();

  constructor(private repoService: RepositoryService) {
    this.topic$$
      .pipe(switchMap(topic => this.repoService.searchRepositories(topic)))
      .subscribe(repos => this.repos$$.next(repos));

    this.languageCounts$ = this.repos$$.pipe(
      map((repos: Repository[]) => this.buildLanguageBreakdown(repos)),
    );
  }

  ngOnInit() {}

  get filteredRepos$(): Observable<Repository[]> {
    return this.filteredRepos$$.asObservable();
  }

  search(): void {
    this.topic$$.next(this.topic);
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

  public filterByLanguage(language: string | null): void {
    if (!language) {
      this.filteredRepos$$.next(this.repos$$.getValue());
      return;
    }
    const filteredRepos = this.repos$$
      .getValue()
      .filter(repo => repo.language === language);
    this.filteredRepos$$.next(filteredRepos);
  }
}
