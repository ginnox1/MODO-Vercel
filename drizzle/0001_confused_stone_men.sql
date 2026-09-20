CREATE TABLE `waitlistEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(120) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waitlistEntries_id` PRIMARY KEY(`id`)
);
