import { Observable } from 'rxjs/Observable';
import {
  catchError,
  distinctUntilChanged,
  map,
  merge,
  scan,
  share,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { EmptyObservable } from 'rxjs/observable/EmptyObservable';
import { ScalarObservable } from 'rxjs/observable/ScalarObservable';

export type Pipeable<T, R> = (call: Observable<T>) => Observable<R>;
export type APIStreamInitializer<StreamResult, APIResponse> = (
  wrapAPICall: Pipeable<APIResponse, APIResponse>,
  handleError: (err: any) => Observable<any>,
) => Observable<StreamResult>;

// The type of an XStream, prefer this type over using APIStream as a type
export interface XStream<Result> {
  errors$: Observable<any>;
  loading$: Observable<boolean>;
  results$: Observable<Result>;
  retry: () => void;
}

/**
 * APIStream wraps a long-lived api call with logic helpful for tracking retries, errors and results.
 * Some features include:
 *
 * - Automatically calls shareReplay on api calls
 * - Automatically injects a retryer() if requested (using APIStream.withRetry())
 * - Catches all api errors and emits them on errors$
 * - Allows collecting any other errors and sending them to errors$ via handleError
 * - Properly tracks 'loading' status, even if multiple calls occur concurrently
 * - Exposes results$, errors$, loading$, and retry() all on one simple object
 * - Suffix APIStream varible names with X just to be cool
 *
 * Usage:
 *
 *  // This is the response type from our accountAPI.getAccounts() api call;
 *  type Payload = {accounts: Account[]}
 *  // APIStreams match the XStream interface. Note that we need to pass the APIResponse type (Payload)
 *  // when constructing an APIStream, but can omit it on the XStream type.
 *  const accountsX: XStream<Account[]> = APIStream.of<Account[], Payload>((wrapAPICall) => {
 *   // Initialize your stream however you like, piping each http call through `wrapAPICall`
 *   // Ensure you .pipe(wrapAPICall) DIRECTLY on the call itself, BEFORE it gets merged in via switchMap or mergeMap
 *   return currentBusinessID$.pipe(
 *     switchMap(bizID => this.accountAPI.getAccounts(bizID).pipe(wrapAPICall)),
 *     map((payload: Payload): Accounts[] => payload.accounts),
 *   );
 * })
 *
 *  // Use your new XStream however you like:
 *  accountX.results$.subscribe(accounts => console.log('Accounts for current business', accounts));
 *  accountX.errors$.subscribe(err => console.error('WHOOPS something went wrong in the accountAPI.getAccounts call!', err));
 *  accountX.loading$.subscribe(loadingStatus => console.log(loadingStatus ? 'Loading accounts...' : 'Done loading accounts!'));
 *
 *  // You can call this to reload accounts at any time; for instance if you have reason to believe that new accounts have
 * // been added in the background. You could even call this method on an interval to keep everything up to date.
 * accountX.retry();
 *
 *
 * // Use them however you like:
 * accountX.results$.subscribe();
 * accountX.errors$.subscribe();
 * accountX.loading$.subscribe();
 * accountX.retry();
 */
export class APIStream<StreamResult, APIResponse = StreamResult>
  implements XStream<StreamResult> {
  public readonly errors$: Observable<any>;
  public readonly loading$: Observable<boolean>;
  public readonly results$: Observable<StreamResult>;

  private errors$$ = new Subject<any>();
  private outStandingCalls$$ = new ReplaySubject<number>();
  private retries$$ = new Subject<null>();

  public static of<StreamResult, APIResponse = StreamResult>(
    streamInitializer: APIStreamInitializer<StreamResult, APIResponse>,
  ): APIStream<StreamResult, APIResponse> {
    return new APIStream(streamInitializer);
  }

  constructor(
    streamInitializer: APIStreamInitializer<StreamResult, APIResponse>,
  ) {
    this.errors$ = this.errors$$.asObservable();
    this.results$ = this.retries$$.pipe(
      startWith(null),
      switchMap(() =>
        streamInitializer(
          this.handleAPICall.bind(this),
          this.handleError.bind(this),
        ),
      ),
      shareReplay(1),
    );

    this.loading$ = this.outStandingCalls$$.pipe(
      scan((sum, next) => sum + next, 0),
      map(x => x > 0),
      // Hack to make sure that results$ is kicked off when someone subscribes to loading$
      // Works by creating a subscription to results$ which has no side-effects, but is subscribed
      // when the loading$ is subscribed to.
      merge(
        this.results$.pipe(switchMap(() => new EmptyObservable<boolean>())),
      ),
      distinctUntilChanged(),
    );
  }

  private handleAPICall(
    call: Observable<APIResponse>,
  ): Observable<APIResponse> {
    this.outStandingCalls$$.next(1);
    return call.pipe(
      catchError(err => {
        this.errors$$.next(err);
        this.outStandingCalls$$.next(-1);
        return new EmptyObservable<APIResponse>();
      }),
      tap(() => this.outStandingCalls$$.next(-1)),
      share(),
    );
  }

  private handleError<T>(err: any): Observable<T> {
    this.errors$$.next(err);
    return new EmptyObservable<T>();
  }

  public retry() {
    this.retries$$.next(null);
  }
}

// mockXStream creates a simple XStream without any error handling or loading logic for use in testing
export function mockXStream<T>(result$: Observable<T>): XStream<T> {
  return {
    errors$: new EmptyObservable(),
    loading$: new ScalarObservable(false),
    results$: result$,
    retry: () => null,
  };
}
