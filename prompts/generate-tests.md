please, navigate to the NextFlick app at https://nextflick-three.vercel.app and:
- Generate tests for searching a movie on /search (e.g. "matrix") and checking that the results list shows matching titles
- Generate tests for a search with no results (e.g. a random string) and checking the "No results for ..." message
- Generate tests for adding a movie to My List and checking that it appears on /favorites, then removing it so the list returns to its previous state
- Generate tests for the "New user" dialog validation: the Create button stays disabled with an empty name or an invalid username (rule: 3-30 lowercase letters, numbers or "-")

Notes
- The backend runs on Render free tier and can take ~50s on the first request; for tests that depend on API data use test.setTimeout(90_000) and longer per-assertion timeouts
- Data is shared with the production deploy: use a unique name (e.g. with a timestamp) when a test needs to create data, and undo any change the test makes (e.g. remove favorites it added)
