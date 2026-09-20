ALTER TABLE `waitlistEntries` ADD `telegramOptIn` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD `telegramHandle` varchar(64);--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD `notificationPreference` enum('phone','telegram') DEFAULT 'phone' NOT NULL;