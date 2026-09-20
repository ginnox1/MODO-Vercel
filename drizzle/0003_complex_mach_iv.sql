CREATE TABLE `analyticsEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` varchar(64) NOT NULL,
	`source` varchar(120) NOT NULL,
	`browser` varchar(64) NOT NULL,
	`location` varchar(120) NOT NULL,
	`path` varchar(255) NOT NULL,
	`referrer` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyticsEvents_id` PRIMARY KEY(`id`)
);
