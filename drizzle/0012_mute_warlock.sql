CREATE TABLE `custom_exercise_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `custom_exercise_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_exercise_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `custom_injury_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `custom_injury_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_injury_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `assignments` MODIFY COLUMN `injuryType` varchar(255) NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `assignments` MODIFY COLUMN `exerciseType` varchar(255) NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `exercises` MODIFY COLUMN `exerciseType` varchar(255) NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `injuryType` varchar(255) DEFAULT 'other';