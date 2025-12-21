ALTER TABLE indexers ADD `rss_url_generator_code` text;
--> statement-breakpoint
ALTER TABLE indexers ADD `rss_method` text DEFAULT 'GET';
