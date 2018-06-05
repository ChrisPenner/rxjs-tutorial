import { Component, OnInit } from '@angular/core';
import { Repository, RepositoryService } from '../repository.service';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';

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
  public readonly repos$: Observable<Repository[]>;
  public readonly languageCounts$: Observable<LanguageCount[]>;

  private topic$$ = new ReplaySubject<string>();

  constructor(private repoService: RepositoryService) {
    // We use long-lived observables which we define declaratively
    this.repos$ = this.topic$$.pipe(
      switchMap(topic => this.repoService.searchRepositories(topic)),
    );

    // We can 'chain' off of our data if we use observables rather than instance properties
    this.languageCounts$ = this.repos$.pipe(
      map((repos: Repository[]) => this.buildLanguageBreakdown(repos)),
    );
  }

  ngOnInit() {}

  search(): void {
    this.topic$$.next(this.topic);
  }

  private buildLanguageBreakdown(repos: Repository[]) {
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
}
