ALTER TABLE `mediaAssets` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD `deletionNote` text;