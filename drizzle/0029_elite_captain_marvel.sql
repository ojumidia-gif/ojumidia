ALTER TABLE `communityEvents` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `communityEvents` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `communityEvents` ADD `deletionNote` text;--> statement-breakpoint
ALTER TABLE `institutions` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `institutions` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `institutions` ADD `deletionNote` text;--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `deletionNote` text;--> statement-breakpoint
CREATE INDEX `community_event_deleted_idx` ON `communityEvents` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `institution_deleted_idx` ON `institutions` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `oral_memory_deleted_idx` ON `oralMemories` (`deletedAt`);