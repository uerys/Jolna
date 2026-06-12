-- Fix: Apply missing migration changes
-- Run each block separately to handle already-applied statements gracefully

-- 1. notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
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

-- 2. audit_logs table
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64) NOT NULL,
	`targetId` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);

-- 3. Modify users.status to add 'suspended'
ALTER TABLE `users` MODIFY COLUMN `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active';

-- 4. Add columns to assignments
ALTER TABLE `assignments` ADD COLUMN IF NOT EXISTS `injuryType` enum('muscle_strain','ligament_sprain','fracture_recovery','post_surgery','joint_pain','back_pain','neck_pain','shoulder_injury','knee_injury','ankle_injury','tendonitis','other') DEFAULT 'other' NOT NULL;
ALTER TABLE `assignments` ADD COLUMN IF NOT EXISTS `exerciseType` enum('strength','flexibility','balance','endurance','mobility','stretching','functional','other') DEFAULT 'other' NOT NULL;

-- 5. Add exerciseType to exercises
ALTER TABLE `exercises` ADD COLUMN IF NOT EXISTS `exerciseType` enum('strength','flexibility','balance','endurance','mobility','stretching','functional','other') DEFAULT 'other' NOT NULL;

-- 6. Add columns to users
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `injuryType` enum('muscle_strain','ligament_sprain','fracture_recovery','post_surgery','joint_pain','back_pain','neck_pain','shoulder_injury','knee_injury','ankle_injury','tendonitis','other');
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `nextClinicVisit` varchar(255);

-- 7. Add indexes (ignore error if they already exist)
ALTER TABLE `notifications` ADD INDEX `notifications_recipient_idx` (`recipientId`);
ALTER TABLE `notifications` ADD INDEX `notifications_recipient_read_idx` (`recipientId`,`readAt`);
ALTER TABLE `audit_logs` ADD INDEX `audit_actor_idx` (`actorId`);
ALTER TABLE `audit_logs` ADD INDEX `audit_target_idx` (`targetType`,`targetId`);
