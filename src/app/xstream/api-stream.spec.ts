import { TestScheduler } from 'rxjs/Rx';
import { APIStream } from './api-stream';
import { switchMap } from 'rxjs/operators';
import { merge } from 'rxjs/observable/merge';

let sched: TestScheduler;
describe('APIStream', () => {
    beforeEach(() => {
        sched = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    });
    it('sends results to results$', () => {
        const stream = APIStream.of(handleAPI => {
            return sched.createColdObservable('-a').pipe(handleAPI);
        });
        sched.expectObservable(stream.results$).toBe('-a');
        sched.expectObservable(stream.errors$).toBe('');
        sched.flush();
    });

    it('sets loading when created and sets to false when finished; and subscribes to results$', () => {
        const stream = APIStream.of(handleAPI => {
            return sched.createColdObservable('-a').pipe(handleAPI);
        });
        sched.expectObservable(stream.loading$).toBe('tf', { t: true, f: false });
        sched.flush();
    });

    it('merges multiple calls and waits to mark loading done', () => {
        const stream = APIStream.of(handleAPI => {
            return merge(
                sched.createColdObservable('-a').pipe(handleAPI),
                sched.createColdObservable('---b').pipe(handleAPI),
            );
        });
        sched.expectObservable(stream.results$).toBe('-a-b');
        sched.expectObservable(stream.loading$).toBe('t--f', { t: true, f: false });
        sched.flush();
    });

    it('sends errors to errors$', () => {
        const stream = APIStream.of(handleAPI => {
            return sched.createColdObservable('-#', {}, 'error').pipe(handleAPI);
        });
        sched.expectObservable(stream.results$).toBe('');
        sched.expectObservable(stream.errors$).toBe('-e', { e: 'error' });
        sched.flush();
    });

    it('catches errors without completing outer stream', () => {
        const stream = APIStream.of(handleAPI => {
            return sched
                .createColdObservable('-a')
                .pipe(switchMap(() => sched.createColdObservable('--#', {}, 'error').pipe(handleAPI)));
        });
        sched.expectObservable(stream.results$).toBe('');
        sched.expectObservable(stream.errors$).toBe('---e', { e: 'error' });
        sched.flush();
    });

    it('retries when retry() is called (sending errors)', () => {
        const stream = APIStream.of(handleAPI => {
            return sched.createColdObservable('-#', {}, 'error').pipe(handleAPI);
        });
        sched.schedule(() => stream.retry(), sched.createTime('---|'));
        sched.expectObservable(stream.results$).toBe('');
        sched.expectObservable(stream.errors$).toBe('-e--e', { e: 'error' });
        sched.expectObservable(stream.loading$).toBe('tf-tf', { t: true, f: false });
        sched.flush();
    });
    it('retries when retry() is called (sending values)', () => {
        const stream = APIStream.of(handleAPI => {
            return sched.createColdObservable('-a').pipe(handleAPI);
        });
        sched.schedule(() => stream.retry(), sched.createTime('---|'));
        sched.expectObservable(stream.results$).toBe('-a--a');
        sched.expectObservable(stream.errors$).toBe('');
        sched.expectObservable(stream.loading$).toBe('tf-tf', { t: true, f: false });
        sched.flush();
    });
});
