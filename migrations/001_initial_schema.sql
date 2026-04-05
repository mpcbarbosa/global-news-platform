-- ============================================================
-- Gobii News — Initial Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Roles ───────────────────────────────────────────────────
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users ───────────────────────────────────────────────────
CREATE TABLE users (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email              VARCHAR(255) UNIQUE NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    display_name       VARCHAR(100) NOT NULL,
    avatar_url         TEXT,
    preferred_language VARCHAR(5) DEFAULT 'en',
    is_active          BOOLEAN DEFAULT true,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- ── User Roles (join table) ─────────────────────────────────
CREATE TABLE user_roles (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE (user_id, role_id)
);

-- ── User Preferences ────────────────────────────────────────
CREATE TABLE user_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    categories      JSONB DEFAULT '[]',
    countries       JSONB DEFAULT '[]',
    sources         JSONB DEFAULT '[]',
    notifications   JSONB DEFAULT '{"email": true, "push": false}',
    dark_mode       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Countries ───────────────────────────────────────────────
CREATE TABLE countries (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code       VARCHAR(3) UNIQUE NOT NULL,
    name       VARCHAR(100) NOT NULL,
    flag_emoji VARCHAR(10),
    is_active  BOOLEAN DEFAULT true
);

-- ── Country Translations ────────────────────────────────────
CREATE TABLE country_translations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    language   VARCHAR(5) NOT NULL,
    name       VARCHAR(100) NOT NULL,
    UNIQUE (country_id, language)
);

-- ── Sources ─────────────────────────────────────────────────
CREATE TABLE sources (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(200) NOT NULL,
    slug       VARCHAR(200) UNIQUE NOT NULL,
    url        TEXT NOT NULL,
    feed_url   TEXT,
    language   VARCHAR(5) DEFAULT 'en',
    country_id UUID REFERENCES countries(id),
    logo_url   TEXT,
    is_active  BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_slug ON sources (slug);
CREATE INDEX idx_sources_country ON sources (country_id);

-- ── Categories ──────────────────────────────────────────────
CREATE TABLE categories (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug       VARCHAR(100) UNIQUE NOT NULL,
    name       VARCHAR(100) NOT NULL,
    icon       VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active  BOOLEAN DEFAULT true
);

CREATE INDEX idx_categories_slug ON categories (slug);

-- ── Category Translations ───────────────────────────────────
CREATE TABLE category_translations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    language    VARCHAR(5) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    UNIQUE (category_id, language)
);

-- ── Articles ────────────────────────────────────────────────
CREATE TABLE articles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id     UUID NOT NULL REFERENCES sources(id),
    category_id   UUID REFERENCES categories(id),
    original_url  TEXT NOT NULL,
    content_hash  VARCHAR(64) UNIQUE NOT NULL,
    title         TEXT NOT NULL,
    summary       TEXT,
    content       TEXT,
    image_url     TEXT,
    author        VARCHAR(200),
    published_at  TIMESTAMPTZ NOT NULL,
    language      VARCHAR(5) DEFAULT 'en',
    is_active     BOOLEAN DEFAULT true,
    view_count    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_source ON articles (source_id);
CREATE INDEX idx_articles_category ON articles (category_id);
CREATE INDEX idx_articles_hash ON articles (content_hash);
CREATE INDEX idx_articles_published ON articles (published_at DESC);
CREATE INDEX idx_articles_language ON articles (language);

-- ── Article Translations ────────────────────────────────────
CREATE TABLE article_translations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    language   VARCHAR(5) NOT NULL,
    title      TEXT NOT NULL,
    summary    TEXT,
    content    TEXT,
    UNIQUE (article_id, language)
);

CREATE INDEX idx_article_translations_article ON article_translations (article_id);

-- ── Tags ────────────────────────────────────────────────────
CREATE TABLE tags (
    id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

CREATE INDEX idx_tags_slug ON tags (slug);

-- ── Article Tags (join table) ───────────────────────────────
CREATE TABLE article_tags (
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- ── Article Reactions ───────────────────────────────────────
CREATE TABLE article_reactions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id    UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (article_id, user_id)
);

CREATE INDEX idx_reactions_article ON article_reactions (article_id);

-- ── Article Comments ────────────────────────────────────────
CREATE TABLE article_comments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id  UUID REFERENCES article_comments(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    is_active  BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_article ON article_comments (article_id);
CREATE INDEX idx_comments_parent ON article_comments (parent_id);

-- ── Article Shares ──────────────────────────────────────────
CREATE TABLE article_shares (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform   VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shares_article ON article_shares (article_id);

-- ── Saved Articles ──────────────────────────────────────────
CREATE TABLE saved_articles (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, article_id)
);

CREATE INDEX idx_saved_user ON saved_articles (user_id);
