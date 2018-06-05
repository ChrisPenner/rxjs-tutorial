# RXJS Tutorial

Today we'll be building a very simple app which searches and filters
repositories from Github's public API. Along the way we'll be comparing and
contrasting different approaches to problems we encounter.

I'll start us off with a very simple version of the app. There's a search box,
you can type a topic into it and the app will fetch a list of repositories
pertaining to that topic.

You can follow along by checking out this repo and checking out the appropriate `tag` for each section, or you can
follow along in your browser using the provided stack-blitz links.

Here's a peek at the initial basic implementation with a search box and nothing more:
- [Stackblitz](https://stackblitz.com/github/ChrisPenner/rxjs-tutorial/tree/simple-box-search)
- [Github](https://github.com/ChrisPenner/rxjs-tutorial/tree/simple-box-search)
- Check it out locally:
    - `git clone https://github.com/ChrisPenner/rxjs-tutorial.git`
    - `cd rxjs-tutorial`
    - `git fetch --tags`
    - `git checkout simple-box-search`


We'll mostly be taking a look at `src/app/search-box/search-box.component.ts`,
but you can also check out `src/app/repository.service.ts`;

Here's a peek at what it looks like at this point:

```typescript
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
    this.repoService.searchRepositories(this.topic).subscribe(repos => {
      this.repositories = repos;
    });
  }
}
```

`search()` is triggered when the user types in a topic and submits the form; it
simply calls our repository service and gets a new list of repositories
matching the given search. We then subscribe to the result and edit
`this.repositories` to contain the new repos.

This is implemented using **mutable local state**; that is to say that we
subscribe to observables and respond to changes by simply changing local
properties on our component. Angular allows this behaviour and supports it
using something called [Dirty
Checking](https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/).
It's pretty much the simplest way to get up and running quickly, which makes it quite popular to write components
this way. *Unfortunately* it carries with it some baggage:

- We are unable to (easily) detect when a property has changed and react to that change. (using onChanges is a complicated beast)
- When mutating local state we have no guarantees of **order of operations**. We have no way to specify which order
    we'd like a set of mutations to take place in. This VERY often leads to subtle and difficult to understand
    bugs.
- Properties can be mutated from **anywhere** at **any time**, tracking down where and how properties are changing
    is extremely difficult in large components!

Right now our app is small and this doesn't seem so tough to handle, but this
approach does **NOT** scale well. Let's see how our component changes as we add
some new features!

## Adding a language count
Checkout the next **check**-point
- [Stackblitz](https://stackblitz.com/github/ChrisPenner/rxjs-tutorial/tree/lang-count)
- [Github](https://github.com/ChrisPenner/rxjs-tutorial/tree/lang-count)
- Check it out locally:
    - `git checkout lang-count`


```typescript
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
```

Great! We've added a new feature which lists how many repos there are for each
programming language in our search results! We've done this by adding a
`buildLanguageBreakdown()` function in our subscribe block. Let's take a peek
inside that function.

The first line we've got there accesses `this.repositories` and computes the
count for each language type based on that, then it mutates the local
`languageCounts` property with the new list of language counts which angular
will display.

This isn't too spaghetti-ish yet, but there are already a few issues creeping
into this very short block of code. What do you think would happen if we switch the ordering of 
of our two statements within the `search()` function?

```typescript
  search(): void {
    this.repoService.searchRepositories(this.topic).subscribe(repos => {
      // Set the repos as an instance property so it's accessible in the template
      this.repositories = repos;
      // Rebuild our language breakdown
      this.buildLanguageBreakdown();
    });
  }
```

If you're following along in the browser or on your computer, try switching the order so that we
run `this.buildLanguageBreakdown()` BEFORE assigning `repos` to `this.repositories`.

What happens if we run a search now?

I'll save you the effort and tell you straight up; we compute an empty language total! 

This is a simple bug that could easily creep in during a later refactoring, and
probably wouldn't even be caught by unit-tests! Sure, it's easy to say "well
the programmer should have read the code better first!" but our job as
professionals is not only to write code that works, it's also to write code
that prevents future mistakes when possible! 

Just looking at `this.buildLanguageBreakdown()` doesn't tell you *anything*
about its dependencies or side-effects; and this can lead to complicated and
confusing order-of-operations bugs. Any time we're mutating state like this we
need to be VERY careful about how we handle that state, and it's a lot to keep
in our head. Observables are an abstraction we can use to make
data-dependencies clear and difficult to subvert; even when dealing with
non-deterministic asynchronous operations.


## Using Observables to track data-dependencies

- [Stackblitz](https://stackblitz.com/github/ChrisPenner/rxjs-tutorial/tree/observable-refactor)
- [Github](https://github.com/ChrisPenner/rxjs-tutorial/tree/observable-refactor)
- Check it out locally:
    - `git checkout observable-refactor`

```typescript
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
}
```

A few things have changed in this refactor, the first thing to notice is that
`search()` no longer computes anything on its own (maybe the name should be
changed, but we'll keep it the same for continuity). `search()` now simply
emits a new topic into the `topic$$` subject. 

Functions which are called as a result of actions on the component's UI are
asynchronous actions which could happen at any time. As such, we want to use an
observable to track when things occur. Unlike http calls which are embedded
within observables by default, user actions are not, so we'll use a Subject to
make the asynchronous nature of these changes explicit by calling `.next()`.

You'll also notice that each of the properties which were 'local mutable state'
have been converted into observables: `this.repos$` and `this.languageCount$`. We define each of these
**declaratively** in our constructor.

You'll notice that each of these properties are `public readonly`; we define
them as `readonly` because the idea is that though the asynchronous values
emitted down these observable will change, the relationship between observables
and thus the flow of data through the app should **NOT** change over time.
Mutating observable properties is asking for trouble; using `readonly` prevents
this from happening by mistake.

We've also edited `buildLanguageBreakdown()` so that it takes a list of
repositories as a parameter, and returns the breakdown it computes instead of
mutating state directly. Not only does this make the flow of data through the
application much clearer, it also makes unit testing considerably easier.

Remember how rearranging statements in the previous rendition would cause
unexpected behaviour? Try to do that now! Rearranging the order of observable
definitions doesn't actually change execution order, and in this case you'll
get a compiler error if you try to use a stream before it's defined. We've
stopped a whole class of bugs before they even happened!

Lastly, notice how the flow of data through our app reads linearly now? If you
want to know which transformations data goes through to end up in one of our
output observables you can simply read the assignment statement. The subjects
are the only entry points to streams, and everything that happens after that is
written clearly in one place.

## Dealing with External Asyncronous Values

- [Stackblitz](https://stackblitz.com/github/ChrisPenner/rxjs-tutorial/tree/add-lang-filter)
- [Github](https://github.com/ChrisPenner/rxjs-tutorial/tree/add-lang-filter)
- Check it out locally:
    - `git checkout add-lang-filter`

I've grown bored with our app; let's add a filter so we only show repositories
implemented in a specific language.

```typescript
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
```

I went ahead and implemented this in a style that I've seen in the wild a lot;
folks have the rough idea that they need to be handling asynchronous values,
but aren't quite sure how to combine multiple asyncronous streams. People in
this situation tend to lean on **Subjects** a LOT, because they allow you to
**cheat** asynchronicity. That is to say that if you're using a subject you can
alway use `.getValue()` to **escape** from the asyncronous world for a second,
then use `.next()` to merge back in. The downsides are substantial though, as
soon as you escape the stream you also forfeit any data-dependency guarantees
that the observables offered.

Using Subjects is also **pervasive** within a component, once a pattern is
established using subjects, more and more subjects will creep in. Subjects are
worse than Observables for reading code because Subjects **spaghettify** your
code. Observables are **linear**, but Subjects may be altered from anywhere at
any time, making code much more difficult to read. This property is
demonstrated well in the code above. What is the value of `filteredRepos$$` at
any given time? Is it being properly updated when we get new values in
`repos$$`? The more subjects we add, the more difficult it is to track
behaviour through our application.

Notice that the use of a subject has also required us to introduce a
`.subscribe()` call in order to flow data from one chain into another. This is
a bug in our application! Every time the user navigates away and back to this
page a new subscription will be created and they won't ever be cleaned up! This
happens all the time in our real web applications and causes them to crawl to a
stop over time while wasting server resources with dozens or dozens of
unnecessary subscriptions and sometimes hundreds of unneeded API calls as a
result!

Let's see if we can clean that up somehow!

## Preferring Observables over Subjects

- [Stackblitz](https://stackblitz.com/github/ChrisPenner/rxjs-tutorial/tree/subjects-to-observables)
- [Github](https://github.com/ChrisPenner/rxjs-tutorial/tree/subjects-to-observables)
- Check it out locally:
    - `git checkout subjects-to-observables`

```typescript
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
```

We've now rearranged the flow of data through our app and have managed to use
subjects ONLY for merging UI actions into observable streams. It typically
takes a little more thought to figure out how to properly merge and combine all
of your async streams in the way you like, but once you figure it out your flow
of data and data-dependencies will be much clearer!

Just like before we've prevented future programmers from mistakenly messing
around with data-dependencies by using observables properly. It's now clear
which pieces of data depend on which, and we can see where the results of
our computations end up.

Notice that we've re-used our old trick by converting `filterByLanguage()` into
a pure function which accepts arguments and returns a result rather than using
subjects to enact changes, again allowing easier unit-testing and allowing us
to write an implementation that doesn't even know it's executing in an
asynchronous environment.

---

Hopefully working through these exercises has helped make it clear how using
observables properly can simplify complicated asynchronous workflows and make
code more readable and extensible in the future.
