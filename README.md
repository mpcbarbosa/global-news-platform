# Gobii News API

Multilingual news aggregation platform API built with Node.js, TypeScript, Express, PostgreSQL, and Redis.

## Architecture

```
src/
├── config/          # Environment, database, Redis, logger
├── controllers/     # Request handlers
├── middlewares/      # Auth, validation, error handling, webhook verification
├── repositories/    # Database access layer
├── routes/          # Express route definitions
├── services/        # Business logic
├── types/           # TypeScript type definitions
└── utils/           # Errors, hashing, pagination, response helpers
```

## Tech Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 16 with UUID support
- **Cache:** Redis with ioredis
- **Auth:** JWT (access + refresh tokens) with bcrypt
- **Validation:** Zod schemas
- **Security:** Helmet, CORS, HMAC-SHA256 webhook verification
- **Logging:** Winston

## API Endpoints

### Auth
- `POST /api/v1/auth/register` — Create account
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/refresh` — Refresh tokens
- `POST /api/v1/auth/change-password` — Change password (auth required)
- `GET /api/v1/auth/me` — Current user info (auth required)

### Articles
- `GET /api/v1/articles` — List articles (filterable by category, country, source, language)
- `GET /api/v1/articles/trending` — Trending articles
- `GET /api/v1/articles/saved` — Saved articles (auth required)
- `GET /api/v1/articles/:id` — Article detail
- `POST /api/v1/articles/:id/save` — Save article (auth required)
- `DELETE /api/v1/articles/:id/save` — Unsave article (auth required)
- `POST /api/v1/articles/:id/reactions` — React to article (auth required)
- `DELETE /api/v1/articles/:id/reactions` — Remove reaction (auth required)
- `GET /api/v1/articles/:id/comments` — List comments
- `POST /api/v1/articles/:id/comments` — Add comment (auth required)
- `POST /api/v1/articles/:id/share` — Record share (auth required)

### Feed
- `GET /api/v1/feed` — Personalized feed
- `GET /api/v1/feed/trending` — Trending feed

### Users
- `GET /api/v1/users/profile` — Get profile (auth required)
- `PATCH /api/v1/users/profile` — Update profile (auth required)
- `GET /api/v1/users` — List users (admin only)
- `DELETE /api/v1/users/:id` — Deactivate user (admin only)

### Categories & Countries
- `GET /api/v1/categories?lang=pt` — List categories (with translations)
- `GET /api/v1/categories/:slug` — Category by slug
- `GET /api/v1/countries?lang=fr` — List countries (with translations)
- `GET /api/v1/countries/:code` — Country by code

### Webhooks
- `POST /api/v1/webhooks/ingest` — Ingest articles (HMAC-SHA256 signed)

### Health
- `GET /health` — Health check

## Multilingual Support

Categories and countries include translations in:
- **Portuguese (pt)**
- **Spanish (es)**
- **French (fr)**

Pass `?lang=pt` to any endpoint to get translated content.

## Deployment (Render)

This project includes a `render.yaml` Blueprint that provisions:
- Web service (Node.js)
- PostgreSQL 16 database
- Redis cache

Migrations run automatically on deploy.

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
