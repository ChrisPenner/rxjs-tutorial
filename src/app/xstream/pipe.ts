import { XStream } from './api-stream';
import { OperatorFunction } from 'rxjs/interfaces';

export function pipeX<T, A>(xStream: XStream<T>, op1: OperatorFunction<T, A>): XStream<A>;
export function pipeX<T, A, B>(
    xStream: XStream<T>,
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
): XStream<B>;
export function pipeX<T, A, B, C>(
    xStream: XStream<T>,
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
): XStream<C>;
export function pipeX<T, A, B, C, D>(
    xStream: XStream<T>,
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
): XStream<D>;
export function pipeX<T, A, B, C, D, E>(
    xStream: XStream<T>,
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
): XStream<E>;
export function pipeX<T, A, B, C, D, E, F>(
    xStream: XStream<T>,
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
): XStream<F>;
export function pipeX<T, A, B, C, D, E, F, G>(
    xStream: XStream<T>,
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
): XStream<G>;
export function pipeX<T, A, B, C, D, E, F, G, H>(
    xStream: XStream<T>,
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
): XStream<H>;
export function pipeX<T, A, B, C, D, E, F, G, H, I>(
    xStream: XStream<T>,
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
): XStream<I>;

/**
 * Works like `.pipe()` but on XStreams;
 * pipes the `results$` stream through the given operations and returns a new XStream
 */
export function pipeX<T, R>(xStream: XStream<T>, ...operations: OperatorFunction<any, any>[]): XStream<R> {
    const initialStream: XStream<T> = {
        results$: xStream.results$,
        errors$: xStream.errors$,
        loading$: xStream.loading$,
        retry: xStream.retry.bind(xStream),
    };
    return operations.reduce(
        // We can't express the type of this reduce correctly because each operation has a different type.
        // We use 'any' to fill in the holes; Then assert that we have the correct return type from the whole function
        ({ results$, ...rest }: XStream<any>, op: OperatorFunction<any, any>): XStream<any> => ({
            results$: results$.pipe(op),
            ...rest,
        }),
        initialStream,
    );
}

/**
 * Works like `pipeX` but over `errors$`;
 * pipes the `errors$` stream through the given operations and returns a new XStream
 */
export function pipeXError<T>(xStream: XStream<T>, ...operations: OperatorFunction<any, any>[]): XStream<T> {
    const initialStream: XStream<T> = {
        results$: xStream.results$,
        errors$: xStream.errors$,
        loading$: xStream.loading$,
        retry: xStream.retry.bind(xStream),
    };
    return operations.reduce(
        ({ errors$, ...rest }: XStream<T>, op: OperatorFunction<any, any>): XStream<T> => ({
            errors$: errors$.pipe(op),
            ...rest,
        }),
        initialStream,
    );
}
