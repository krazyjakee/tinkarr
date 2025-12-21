ALTER TABLE indexers ADD `rss_url_generator_code` text;
ALTER TABLE indexers ADD `rss_method` text DEFAULT 'GET';
