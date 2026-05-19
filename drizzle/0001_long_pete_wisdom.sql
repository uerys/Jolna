CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exerciseId` int NOT NULL,
	`physiotherapistId` int NOT NULL,
	`clientId` int NOT NULL,
	`reps` int NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`instructionsEn` text NOT NULL,
	`instructionsKh` text NOT NULL,
	`videoUrl` varchar(1024) NOT NULL,
	`defaultReps` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exercises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`clientId` int NOT NULL,
	`painScore` int NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`notes` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','client','physiotherapist') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pending','active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `languagePreference` enum('en','kh') DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `physiotherapistId` int;--> statement-breakpoint
CREATE INDEX `assignments_client_idx` ON `assignments` (`clientId`);--> statement-breakpoint
CREATE INDEX `assignments_physio_idx` ON `assignments` (`physiotherapistId`);--> statement-breakpoint
CREATE INDEX `assignments_exercise_idx` ON `assignments` (`exerciseId`);--> statement-breakpoint
CREATE INDEX `exercises_creator_idx` ON `exercises` (`createdBy`);--> statement-breakpoint
CREATE INDEX `feedback_assignment_idx` ON `feedback_logs` (`assignmentId`);--> statement-breakpoint
CREATE INDEX `feedback_client_idx` ON `feedback_logs` (`clientId`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_physio_idx` ON `users` (`physiotherapistId`);