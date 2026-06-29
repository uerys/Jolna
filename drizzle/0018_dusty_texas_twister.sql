ALTER TABLE `assignments` MODIFY COLUMN `reps` int;--> statement-breakpoint
ALTER TABLE `exercises` MODIFY COLUMN `defaultReps` int;--> statement-breakpoint
ALTER TABLE `exercises` MODIFY COLUMN `defaultSets` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `assignments` ADD `durationMin` int;--> statement-breakpoint
ALTER TABLE `assignments` ADD `durationSec` int;--> statement-breakpoint
ALTER TABLE `exercises` ADD `defaultDurationMin` int;--> statement-breakpoint
ALTER TABLE `exercises` ADD `defaultDurationSec` int;