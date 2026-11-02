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

## Technologies Used

-   **NestJS**: A progressive Node.js framework for building efficient, reliable, and scalable server-side applications. It leverages TypeScript and combines elements of OOP, FP, and FRP. NestJS's modular architecture is optimized for domain-driven design, promoting dependency injection and reusability.
-   **Docker**: For containerization, ensuring consistent environments across development and production.
-   **Jest**: A delightful JavaScript Testing Framework with a focus on simplicity, used for unit testing.
-   **MongoDB**: A NoSQL database used for scalable persistence of user favorites.
-   **Redis**: An in-memory data structure store, used as a high-performance cache.
-   **Swagger (OpenAPI)**: For API documentation and interactive testing.

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

## Development Scripts

```bash
# Development
npm run start:dev
npm run start:debug 

# Testing
npm npm test:favorites
npm npm test:movies

# Code Quality
npm run lint
npm run format
```
## Author

<img src="https://avatars1.githubusercontent.com/u/46221221?s=460&u=0d161e390cdad66e925f3d52cece6c3e65a23eb2&v=4" width=115>  

<sub>@jacksonn455</sub>
