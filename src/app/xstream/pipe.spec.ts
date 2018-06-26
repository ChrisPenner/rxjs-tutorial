import { TestScheduler } from 'rxjs/testing/TestScheduler';
import { APIStream, mockXStream, XStream } from './api-stream';
import { pipeX, pipeXError } from './pipe';
import { filter, map, switchMap } from 'rxjs/operators';

let sched: TestScheduler;
describe('pipeX', () => {
    beforeEach(() => {
        sched = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    });

    it('correctly applies piped funcs to results$', () => {
        const streamX = mockXStream(sched.createColdObservable('-a', { a: 1 }));
        const pipedX = pipeX(streamX, map((n: number) => n + 1));
        sched.expectObservable(pipedX.results$).toBe('-a', { a: 2 });
        sched.flush();
    });

    it('correctly applies multiple pipe funcs to results$', () => {
        const streamX = mockXStream(sched.createColdObservable('ab', { a: 1, b: 2 }));
        const pipedX = pipeX(
            streamX,
            map((n: number) => n + 10),
            switchMap(x => sched.createColdObservable('a', { a: x })),
            filter(x => x === 12),
        );
        sched.expectObservable(pipedX.results$).toBe('-a', { a: 12 });
        sched.flush();
    });

    it('maintains retry behaviour', () => {
        const streamX = APIStream.of(handleAPI => {
            return sched.createColdObservable('a', { a: 1 }).pipe(handleAPI);
        });
        const pipedX = pipeX(streamX, map((x: number) => x + 10));
        sched.schedule(() => pipedX.retry(), sched.createTime('--|'));
        sched.expectObservable(pipedX.results$).toBe('a-a', { a: 11 });
        sched.flush();
    });

    it('does not affect errors$', () => {
        const streamX = APIStream.of(handleAPI => {
            return sched.createColdObservable('#', {}, 'an error').pipe(handleAPI);
        });
        const pipedX = pipeX(streamX, map((x: number) => x + 10));
        sched.expectObservable(pipedX.errors$).toBe('e', { e: 'an error' });
        sched.expectObservable(pipedX.results$).toBe('');
        sched.flush();
    });

    it('does not affect loading$', () => {
        const streamX = APIStream.of(handleAPI => {
            return sched.createColdObservable('--a', { a: 1 }).pipe(handleAPI);
        });
        const pipedX = pipeX(streamX, map((x: number) => x + 10));
        sched.expectObservable(pipedX.loading$).toBe('t-f', { t: true, f: false });
        sched.expectObservable(pipedX.results$).toBe('--a', { a: 11 });
        sched.flush();
    });
});

describe('pipeXError', () => {
    let streamX: XStream<any>;
    beforeEach(() => {
        sched = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
        streamX = {
            results$: sched.createColdObservable('a', { a: 1 }),
            errors$: sched.createColdObservable('e', { e: 'an error' }),
            loading$: sched.createColdObservable('t', { t: true }),
            retry: jest.fn(),
        };
    });

    it('correctly applies piped funcs to error$', () => {
        const pipedX = pipeXError(streamX, map((err: string) => err + ' was mapped'));
        sched.expectObservable(pipedX.errors$).toBe('e', { e: 'an error was mapped' });
        sched.flush();
    });

    it('correctly applies multiple pipe funcs to error$', () => {
        const pipedX = pipeXError(streamX, map((err: string) => err + ' was mapped'), map(err => err + ' twice'));
        sched.expectObservable(pipedX.errors$).toBe('e', { e: 'an error was mapped twice' });
        sched.flush();
    });

    it('does not affect results$', () => {
        const pipedX = pipeXError(streamX, map((err: string) => err + ' was mapped'));
        sched.expectObservable(pipedX.errors$).toBe('e', { e: 'an error was mapped' });
        sched.expectObservable(pipedX.results$).toBe('a', { a: 1 });
        sched.flush();
    });

    it('maintains retry behaviour', () => {
        streamX = APIStream.of(handleAPI => {
            return sched.createColdObservable('a#', { a: 1 }, 'an error').pipe(handleAPI);
        });
        const pipedX = pipeXError(streamX, map((err: string) => err + ' was mapped'));
        sched.schedule(() => pipedX.retry(), sched.createTime('--|'));
        sched.expectObservable(pipedX.results$).toBe('a-a', { a: 1 });
        sched.expectObservable(pipedX.errors$).toBe('-e-e', { e: 'an error was mapped' });
        sched.flush();
    });

    it('does not affect loading$', () => {
        streamX = APIStream.of(handleAPI => {
            return sched.createColdObservable('--a', { a: 1 }).pipe(handleAPI);
        });
        // Shouldn't do anything since no errors occur
        const pipedX = pipeXError(streamX, map((err: string) => err + ' was mapped'));
        sched.expectObservable(pipedX.loading$).toBe('t-f', { t: true, f: false });
        sched.expectObservable(pipedX.results$).toBe('--a', { a: 1 });
        sched.flush();
    });
});
