ALTER TABLE `users` MODIFY COLUMN `avatarUrl` longtext;--> statement-breakpoint
ALTER TABLE `exercises` ADD `defaultSets` int DEFAULT 1 NOT NULL;--> statement-breakpoint