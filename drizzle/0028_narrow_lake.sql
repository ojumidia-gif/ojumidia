ALTER TABLE `publications` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `publications` ADD `deletedBy` int;--> statement-breakpoint
CREATE INDEX `publication_deleted_idx` ON `publications` (`deletedAt`);