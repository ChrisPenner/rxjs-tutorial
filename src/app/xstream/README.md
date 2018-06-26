# XStreams

Observables solve a specific problem: working with asynchronous values; but they also introduce a host of other
difficult problems. I've noticed a few common mistakes that tend to come up almost every time folks are working with
Observables and figured we could avoid a lot of those mistakes by bundling up a 'ready-made' solution for some of the
most common use-cases. I've named that bundled solution 'XStreams'!

Here are a few things XStreams handle for you so you don't need to give them a second thought:

- Error handling on persistent streams
    - Errors are handled in such a way that the stream causing them will NOT complete when an error occurs. This is
        typically desired when dealing with long-lived streams; I've seen a lot of mistakes in this form of error
        handling
    - Errors are subsequently exposed on their own observable which makes them a lot easier to work with and separates
        error logic from 'happy-path' logic, making both more readable.
- Unnecessarily API calls
    - Creating an APIStream automagically calls `shareReplay` for you in the appropriate spots to ensure that you make
        the minimum number of api calls possible.
- Retrying calls on errors
    - Retrying is tricky and usually requires adding extra clunky subjects which just clutter up the code. XStreams
        have a simple `retry()` method on them which you can call at any time to retry the latest call.
    - You can use `retry()` as a response to an error snackbar, or even as a way to force the XStream to update its
        data from the server (e.g. for long-polling!)
 - Automatically injects a retryer() if requested
     - use APIStream.withRetry() to automatically add a `retryer()` to any API calls within the XStream
 - Properly tracking 'loading' status
    - XStreams expose a `loading$` observable which is properly kept up to date no matter how many api calls you're
        making; it even works if an observable upstream updates and we need to remake the API call.
    - This negates the need to painstakingly add in different `loading$$` subjects for every api call.
- Unified and clear interface
    - By using XStreams it's always clear exactly where to get errors, results, loading status and trigger retries;
        it's all grouped together on a single object.

Sound good? I thought so.

So how do I use this magic thing? You just need to build your observable chains slightly differently and insert a
simple `wrapAPI` helper into the pipe:
 
 ```typescript
 // This is the response type from our accountAPI.getAccounts() api call;
type Payload = {accounts: Account[]}
// APIStreams match the XStream interface. Note that we need to pass the APIResponse type (Payload)
// when constructing an APIStream, but can omit it on the XStream type.
const accountsX: XStream<Account[]> = APIStream.of<Account[], Payload>((wrapAPICall) => {
  // Initialize your stream however you like, piping each http call through `wrapAPICall`
  // Ensure you .pipe(wrapAPICall) DIRECTLY on the call itself, BEFORE it gets merged in via switchMap or mergeMap
  return currentBusinessID$.pipe(
    switchMap(bizID => this.accountAPI.getAccounts(bizID).pipe(wrapAPICall)),
    map((payload: Payload): Accounts[] => payload.accounts),
  );
})
 
 // Use your new XStream however you like:
 accountCountX.results$.subscribe(accounts => console.log('Accounts for current business', accounts));
 accountCountX.errors$.subscribe(err => console.error('WHOOPS something went wrong in the accountAPI.getAccounts call!', err));
 accountCountX.loading$.subscribe(loadingStatus => console.log(loadingStatus ? 'Loading accounts...' : 'Done loading accounts!'));

 // You can call this to reload accounts at any time; for instance if you have reason to believe that new accounts have
 // been added in the background. You could even call this method on an interval to keep everything up to date.
 accountCountX.retry();
 ```

## Mapping over XStreams

Now that your data is wrapped up in the `results$` observable how do you work with it? Two options:

- Use `results$.pipe(map(x => x + 1))` just like any other observable; however the result will no longer be part of an XStream
- use `pipeX(myXStream, map(x => x + 1))` which will return a new XStream with the given transformations applied to the
    `results$` stream.

 We've been using XStreams in Digital Ads for a month or two now and it drastically simplifies our services.
 Most of our service constructors consist of just setting up a bunch of XStreams and directly exposing them to
 consumers via `public readonly myStream: XStream<MyDataType>;` properties.

