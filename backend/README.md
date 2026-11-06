# NextFlick

NextFlick is a robust and scalable application designed for efficient movie searching and management, leveraging modern architectural patterns and high-performance technologies. This project prioritizes maintainability, scalability, and developer experience, making it ideal for agile development teams.

## Features

-   **Domain-Driven Architecture**: Organized by domain (e.g., movies, favorites) into cohesive modules, facilitating navigation, testing, and future refactoring. This approach aligns with principles like Domain-Driven Design (DDD) and Clean Architecture, common in American tech companies (Google, Meta, SF/NY startups) that value scalability and maintainability.
-   **Error Handling**: Comprehensive error handling implemented.
-   **Movie Duplication Prevention**: Ensures unique movie entries.
-   **Field Validation**: Robust validation for all input fields.
-   **Redis Caching**: High-performance caching for movie searches.
-   **MongoDB**: Scalable persistence for user-favorite movies.
-   **Swagger Documentation**: Automatic and interactive API documentation.
-   **Recommendations**: A TensorFlow.js neural network trained on the users' favorites recommends movies and series (see [Recommendations](#recommendations-recommendations)).

## Technologies Used

-   **NestJS**: A progressive Node.js framework for building efficient, reliable, and scalable server-side applications. It leverages TypeScript and combines elements of OOP, FP, and FRP. NestJS's modular architecture is optimized for domain-driven design, promoting dependency injection and reusability.
-   **Docker**: For containerization, ensuring consistent environments across development and production.
-   **Jest**: A delightful JavaScript Testing Framework with a focus on simplicity, used for unit testing.
-   **MongoDB**: A NoSQL database used for scalable persistence of user favorites.
-   **Redis**: An in-memory data structure store, used as a high-performance cache.
-   **Swagger (OpenAPI)**: For API documentation and interactive testing.
-   **TensorFlow.js**: Trains and runs the recommendation model inside the API (`@tensorflow/tfjs-node` when available, `@tensorflow/tfjs` otherwise).

## Architecture & Design Principles

### Domain-Driven Structure

The project adopts a **domain-driven structure**, where everything related to a specific 

feature (e.g., `movies`, `favorites`) is grouped into a cohesive module. This approach significantly improves navigation, testing, and future refactoring efforts. It adheres to principles such as **Domain-Driven Design (DDD)** and **Clean Architecture**, which are widely adopted by agile teams in American tech companies (like Google, Meta, or startups in San Francisco/New York) that prioritize **scalability** and **maintainability**. For a project of this size, a domain-driven structure effectively prevents the 

'explosion' of files often seen in generic, layer-based folder structures, making the codebase more intuitive and manageable. NestJS is particularly well-suited for this, as its module system naturally encapsulates features, promoting dependency injection and code reuse.

### Redis Caching Strategy

Redis is integrated to significantly enhance application performance and reduce external API calls. The caching strategy is designed with the following benefits:

- **Reduced API Requests**: Caches responses for 24 hours, minimizing calls to the OMDB API.
- **Improved Performance**: Subsequent requests are served from cache in milliseconds.
- **Elegant Fallback**: In case of API errors, the system gracefully attempts to retrieve data from the cache.
- **Useful Statistics**: Logs provide insights into cache hit/miss rates.
- **Easy Maintenance**: Dedicated methods for cache clearing.

**Expected Performance Statistics:**

| Scenario           | Cache Status | API Call | Response Time |
| :----------------- | :----------- | :------- | :------------ |
| First Search       | MISS         | YES      | 200-500ms     |
| Subsequent Searches| HIT          | NO       | ~15ms         |

This strategy is expected to result in approximately **95% reduction** in OMDB API calls for frequently accessed data.

### MongoDB for Favorites

MongoDB is chosen as the persistence layer for managing user favorite movies due to its inherent advantages for this use case:

- **Flexible Schema**: Easily adapts to evolving movie data structures without rigid schema migrations.
- **Native JSON Support**: Seamlessly integrates with the JSON-based OMDB API responses.
- **Rapid Development**: Less configuration overhead compared to traditional SQL databases, accelerating development cycles.
- **Simple Relationships**: Well-suited for straightforward relationships, such as a user's list of favorite movies.

### Swagger (OpenAPI) Integration

Swagger is integrated to provide comprehensive and interactive API documentation, offering several key benefits:

-   **Automatic Documentation**: Ensures the API documentation is always up-to-date with the codebase.
-   **Interactive Testing**: Allows developers to test API endpoints directly from the UI.
-   **Type Safety**: Leverages TypeScript DTOs for strong type definitions.
-   **Client Generation**: Facilitates automatic generation of API clients.
-   **Team Collaboration**: Provides clear and accessible documentation for efficient team collaboration.

### Third-Party API Integration: OMDB

The NextFlick application integrates with the **OMDB API** (Open Movie Database) to fetch comprehensive movie information. This integration is central to the application's functionality, allowing users to search for movies and retrieve details such as titles, years, genres, and more.

-   **Purpose**: To provide a rich and up-to-date database of movie information.
-   **Efficiency**: Coupled with the Redis caching strategy, API calls are optimized to minimize latency and reduce external requests.
-   **Robustness**: Error handling mechanisms are in place to manage API call failures gracefully, often leveraging cached data as a fallback.

## API Endpoints

### Search Movies (`GET /movies/search`)

This endpoint allows users to search for movies using a query string. Results are cached for 24 hours to improve performance and reduce external API calls.

-   **Method**: `GET`
-   **URL**: `/movies/search`
-   **Summary**: Search movies
-   **Description**: Search for movies using the OMDb API. Results are cached for 24 hours.

#### Query Parameters

| Name | Description | Example | Required | Type |
| :--- | :---------- | :------ | :------- | :--- |
| `q`  | Search query (min 2 characters, max 100 characters) | `batman` | Yes | `string` |

#### Responses

| Status Code | Description | Response Body Example |
| :---------- | :---------- | :-------------------- |
| `200 OK`    | Movies found successfully | ```json
{
  "success": true,
  "data": [
    {
      "Title": "Batman Begins",
      "Year": "2005",
      "imdbID": "tt0372784",
      "Type": "movie",
      "Poster": "https://m.media-amazon.com/images/M/MV5BZmUwNGMyMTMtNWQyOC00NzA4LThlZTMtYjFmZTBlOWU4ODg1XkEyXkFqcGdeQXVyNTIzMzEwNA@@._V1_SX300.jpg"
    }
  ],
  "count": 1,
  "query": "batman",
  "message": "Found 1 movies for \"batman\""
}
``` |
| `400 Bad Request` | Invalid search query | ```json
{
  "statusCode": 400,
  "message": "Validation failed: Search query must be between 2 and 100 characters.",
  "error": "Bad Request"
}
``` |
| `401 Unauthorized` | Invalid OMDb API key | ```json
{
  "statusCode": 401,
  "message": "Invalid OMDb API key",
  "error": "Unauthorized"
}
``` |
| `429 Too Many Requests` | Too many requests to OMDb API | ```json
{
  "statusCode": 429,
  "message": "Too many requests to OMDb API",
  "error": "Too Many Requests"
}
``` |
| `503 Service Unavailable` | OMDb API service unavailable | ```json
{
  "statusCode": 503,
  "message": "OMDb API service unavailable",
  "error": "Service Unavailable"
}
``` |

### Movie Details (`GET /movies/:imdbID`)

Returns the full details of a movie (plot, genre, rating, cast, etc.) from the OMDb API. Results are cached for 24 hours. Fields that OMDb reports as `N/A` are returned as `null`.

-   **Method**: `GET`
-   **URL**: `/movies/:imdbID`

| Status Code | Description |
| :---------- | :---------- |
| `200 OK` | `{ "success": true, "data": { "imdbID": "tt0468569", "Title": "The Dark Knight", "Year": "2008", "Type": "movie", "Poster": "...", "Rated": "PG-13", "Released": "18 Jul 2008", "Runtime": "152 min", "Genre": "Crime, Thriller", "Director": "Christopher Nolan", "Actors": "...", "Plot": "...", "Language": "...", "Country": "...", "imdbRating": "9.1" } }` |
| `400 Bad Request` | IMDb ID is not in the `tt1234567` format |
| `404 Not Found` | No movie with that IMDb ID (`MOVIE_NOT_FOUND`) |

### Movie Catalog (`GET /catalog`)

The `movies` collection holds the movies the recommendations can use, with the OMDb data already parsed into features (`genres`, `rating`, `runtime`, `year`, `rated`, `type`, `director`, `languages`, `countries`).

-   **Seed**: on startup the API upserts the movies of [`seed-movies.ts`](src/modules/movies/data/seed-movies.ts) (`source: "seed"`). The file already contains the OMDb data, so startup makes no OMDb calls.
-   **Favorites**: when a user favorites a movie that is not in the catalog yet, its details are fetched and it is added with `source: "favorite"`. This never makes favoriting fail.

| Query | Required | Description |
| :---- | :------- | :---------- |
| `genre` | No | Only movies with this genre, e.g. `Drama` |
| `limit` | No | Maximum number of movies |

#### Rebuilding the seed

[`scripts/build-movie-seed.mjs`](scripts/build-movie-seed.mjs) holds the list of titles. With the API running, it calls `GET /movies/search` and `GET /movies/:imdbID` for each one (the OMDb key stays in the API and every response goes through the Redis cache) and rewrites `seed-movies.ts`:

```bash
npm run start:dev                                          # in one terminal
npm run seed:movies:build                                  # API on http://localhost:3000
API_URL=http://localhost:3005 npm run seed:movies:build    # or another URL
```

Each run makes about 2 OMDb calls per title on a cold cache (the free key allows 1000 a day). The script skips shorts and clips that share a title, and lists the titles it could not resolve.

### Users (`/users`)

Users live in the `users` collection (`username` is unique, `name` is the display name). There is no sign-up or authentication yet.

| Method | URL | Description |
| :----- | :-- | :---------- |
| `GET` | `/users` | All users, oldest first |
| `GET` | `/users/:id` | One user (`404` when not found) |
| `POST` | `/users` | Body `{ "username": "ana-lima", "name": "Ana Lima" }`. `400` for an invalid username (3-30 lowercase letters, numbers or `-`), `409` when it is taken |

#### Demo users and favorites

[`demo-users.ts`](src/modules/users/data/demo-users.ts) lists the demo users created on startup: Guest (no favorites, for manual testing) and 16 users with a clear taste (horror, animation, drama, action, sci-fi, crime, comedy, war, romance, fantasy, musicals, TV series, Brazilian and world cinema, action and sci-fi, thrillers, classics), each with 10-12 favorites from the movie catalog.

On startup the API creates the missing demo users and saves the profile favorites of every demo user who has **no** favorites yet. Restarting never duplicates favorites nor brings back the ones a user removed. These users give the recommendation model distinct tastes to learn from; create more users (`POST /users` or the "+" button in the frontend) to test the recommendations by hand.

### Favorites (`/favorites`)

`POST /favorites`, `GET /favorites`, `GET /favorites/:imdbID` and `DELETE /favorites/:imdbID` act on the favorites of the user sent in the `x-user-id` header. Each favorite references its user (`userId` is an `ObjectId` with `ref: 'User'`).

| Header | Required | Description |
| :----- | :------- | :---------- |
| `x-user-id` | Yes | The user's `_id` from `GET /users`. Missing or malformed values return `400 Bad Request`; an id with no user returns `404 Not Found`. |

Different users can favorite the same movie; the same user cannot add a movie twice (`409 Conflict`).

On startup the favorites service also:

- moves favorites saved before the users collection (free-text `userId` such as `user-123`) to a real user; `user-123` becomes Guest;
- syncs the collection indexes, which drops the old unique `imdbID_1` index.

### Recommendations (`/recommendations`)

A neural network trained with TensorFlow.js recommends movies and series from the [catalog](#movie-catalog-get-catalog). It follows the same steps as the e-commerce recommender from the course (`exemplo-01`), with movies in place of products and favorites in place of purchases.

| Endpoint | Description |
| :------- | :---------- |
| `GET /recommendations?limit=20` | Recommendations for the user in the `x-user-id` header (required). `limit` goes from 1 to 50 |
| `GET /recommendations/status` | Training state (`idle`, `training`, `ready`, `failed`), progress and loss/accuracy per epoch |
| `POST /recommendations/train` | Retrains in the background with the current favorites (`202 Accepted`); the previous model keeps answering until it finishes |

`GET /recommendations` returns `source: "model"` with a `score` (0-1) per title, or `source: "popular"` (most favorited, then best rated) while the model is training or when the user has no favorites.

#### How it works

All the code is in [`src/modules/recommendations`](src/modules/recommendations):

1.  **Features** ([`ml/feature-encoder.ts`](src/modules/recommendations/ml/feature-encoder.ts)): `makeContext` reads the catalog's min/max values and categories; `encodeMovie` turns a movie into a vector of normalized numbers (rating, runtime, year, popularity) and weighted one-hot blocks (genres as multi-hot, type, rated); `encodeUser` is the average of the user's favorite movies. Plain arrays, no tensors, so it is easy to test and leaks no memory.
2.  **Training data** ([`ml/training-data.ts`](src/modules/recommendations/ml/training-data.ts)): each row is `[...userVector, ...movieVector]` with label `1` for a favorite. Unlike the course example, which pairs every user with every product, only 3 non-favorites per favorite are sampled as `0`, otherwise ~95% of the labels would be 0.
3.  **Model** ([`ml/model.ts`](src/modules/recommendations/ml/model.ts)): `Dense(128, relu) → Dense(64, relu) → Dense(32, relu) → Dense(1, sigmoid)`, `binaryCrossentropy`, Adam (0.001), 30 epochs, batch 32.
4.  **Service** ([`services/recommendations.service.ts`](src/modules/recommendations/services/recommendations.service.ts)): trains on startup (after the demo favorites are seeded) and scores every movie the user hasn't favorited. The user vector is built from the current favorites at request time, so new favorites change the recommendations without retraining; new users and new movies enter the model on the next training.

#### Evaluation and tuning

The model was checked by hiding one favorite of each of the 16 demo users, training without it, and counting how often it came back in that user's top 10 (*hit rate@10*). Two changes came out of it:

| Setting | hit rate@10 | Notes |
| :------ | :---------- | :---- |
| Popularity weight 0.1, 100 epochs | 2/16 | **Label leakage**: popularity comes from the favorites themselves, so every positive had popularity > 0 and the model learned "popular = favorite" |
| Popularity weight 0, 100 epochs | 10/16 | Most top scores end at 1.00 (memorized), so the ranking is mostly ties |
| **Popularity weight 0, 30 epochs** (current) | **10/16** | No saturated scores, trains 3x faster |
| No model, cosine similarity (baseline) | 9/16 | |

Popularity is still computed: it ranks the popular fallback.

#### TensorFlow backend

`@tensorflow/tfjs-node` (native, faster) only ships binaries for some platforms: it works on Linux (WSL, Render) but usually not on Windows. [`ml/tf.ts`](src/modules/recommendations/ml/tf.ts) tries it first and falls back to `@tensorflow/tfjs` (pure JavaScript) automatically; `GET /recommendations/status` reports which one loaded in `backend`. With the current data, training takes about 10 seconds with the pure JavaScript backend.

## Development Scripts

```bash
# Development
npm run start:dev
npm run start:debug 

# Testing
npm test
npm run test:favorites
npm run test:movies
npm run test:recommendations

# Code Quality
npm run lint
npm run format

# Movie catalog seed (needs the API running)
npm run seed:movies:build
```
## Author

<img src="https://avatars1.githubusercontent.com/u/46221221?s=460&u=0d161e390cdad66e925f3d52cece6c3e65a23eb2&v=4" width=115>  

<sub>@jacksonn455</sub>
