ALTER TABLE `waitlistEntries` ADD `onboardingStatus` enum('PENDING_TG','JOIN_REQUESTED','JOINED_TG','RESERVED','PAID') DEFAULT 'PENDING_TG' NOT NULL;--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD `deepLinkToken` varchar(32);--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD `telegramUserId` varchar(64);--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD `telegramChatId` varchar(64);--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD `telegramLinkedAt` timestamp;--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD `joinRequestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD `joinedAt` timestamp;--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD CONSTRAINT `waitlistEntries_deepLinkToken_unique` UNIQUE(`deepLinkToken`);--> statement-breakpoint
ALTER TABLE `waitlistEntries` ADD CONSTRAINT `waitlistEntries_telegramUserId_unique` UNIQUE(`telegramUserId`);