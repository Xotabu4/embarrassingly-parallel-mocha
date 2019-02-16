# Embarrassingly Parallel Mocha
Mocha adapter to run your tests on Google Cloud Functions (Serverless)


### SUPER-DUPER PRE ALPHA! This experiment is still not finished

xotabu4.github.io


- Finish Mocha UI wrapper
- Prepare tests deployment (+)
- Prepare tests invoking (+)
    - Prepare nested tests invoking
- Test ReportPortal.io server for results publishing (+)
- Try to represent test results as a usual local test run results
- Retries - https://cloud.google.com/functions/docs/bestpractices/retries#functions-tips-infinite-retries-node8
- Do not throw uncaught exceptions from function to avoid cold starts - https://cloud.google.com/functions/docs/monitoring/error-reporting
- Only run for files that where filtered locally. Respect Mocha options. Probably reuse mocha.files array?
- Automatic redeploy on code changes
- Wipe test results queue, Create new queue each time, or think about other solution
- Waiting for all test messages results is finished earlier than needed (BUG)
