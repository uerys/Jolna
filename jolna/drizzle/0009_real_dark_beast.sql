CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64) NOT NULL,
	`targetId` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`actorId` int,
	`type` enum('assignment_created','assignment_status_updated','feedback_submitted') NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`href` varchar(1024),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `assignments` ADD `injuryType` enum('muscle_strain','ligament_sprain','fracture_recovery','post_surgery','joint_pain','back_pain','neck_pain','shoulder_injury','knee_injury','ankle_injury','tendonitis','other') DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `assignments` ADD `exerciseType` enum('strength','flexibility','balance','endurance','mobility','stretching','functional','other') DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercises` ADD `exerciseType` enum('strength','flexibility','balance','endurance','mobility','stretching','functional','other') DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `injuryType` enum('muscle_strain','ligament_sprain','fracture_recovery','post_surgery','joint_pain','back_pain','neck_pain','shoulder_injury','knee_injury','ankle_injury','tendonitis','other');--> statement-breakpoint
ALTER TABLE `users` ADD `nextClinicVisit` date;--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actorId`);--> statement-breakpoint
CREATE INDEX `audit_target_idx` ON `audit_logs` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipientId`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_read_idx` ON `notifications` (`recipientId`,`readAt`);