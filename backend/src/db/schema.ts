import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  apiKey: text('api_key').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Indexers table
export const indexers = sqliteTable('indexers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  favicon: text('favicon'),
  requiresFlaresolverr: integer('requires_flaresolverr', { mode: 'boolean' }).notNull().default(false),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),

  // Search configuration
  searchType: text('search_type', { enum: ['html_form', 'rest_api', 'none'] }),
  searchUrl: text('search_url'),
  searchMethod: text('search_method', { enum: ['GET', 'POST'] }),
  searchParams: text('search_params'), // JSON string
  searchQueryParam: text('search_query_param'),

  // RSS configuration
  rssUrl: text('rss_url'),
  rssType: text('rss_type', { enum: ['rest_api', 'static', 'none'] }),
  rssParams: text('rss_params'), // JSON string

  // Result parsing
  resultSelector: text('result_selector'),
  resultMapping: text('result_mapping'), // JSON string
  // {
  //   title: '.title',
  //   link: '.download a@href',
  //   size: '.size',
  //   seeders: '.seeders',
  //   leechers: '.leechers',
  //   category: '.category',
  //   pubDate: '.date'
  // }
  resultMappingType: text('result_mapping_type', { enum: ['json', 'code'] }).default('json'),
  resultMappingCode: text('result_mapping_code'),

  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Settings table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Request cache table (optional)
export const requestCache = sqliteTable('request_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cacheKey: text('cache_key').notNull().unique(),
  response: text('response').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Indexer = typeof indexers.$inferSelect;
export type NewIndexer = typeof indexers.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type RequestCache = typeof requestCache.$inferSelect;
export type NewRequestCache = typeof requestCache.$inferInsert;
