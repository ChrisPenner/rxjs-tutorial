import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';

export interface Repository {
  name: string;
  author: string;
  url: string;
  description: string;
  topics: string[];
  language: string;
}

const githubApiUrl = `https://api.github.com`;
const githubSearchRepoPath = `/search/repositories`;

@Injectable()
export class RepositoryService {
  constructor(private httpClient: HttpClient) {}

  searchRepositories(topic: string): Observable<Repository[]> {
    const params = { q: `topic:${topic}` };
    return this.httpClient
      .get(githubApiUrl + githubSearchRepoPath, {
        headers: { Accept: 'application/vnd.github.mercy-preview+json' },
        params,
      })
      .pipe(
        map((response: any) => response.items),
        map(repos =>
          repos.map(repo => ({
            name: repo.name,
            author: repo.owner.login,
            url: repo.html_url,
            description: repo.description,
            topics: repo.topics,
            language: repo.language,
          })),
        ),
      );
  }
}
