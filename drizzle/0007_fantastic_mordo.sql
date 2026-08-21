CREATE TABLE `taxonomyMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taxonomyId` int NOT NULL,
	`mediaId` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`displayOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `taxonomyMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `taxonomy_media_taxonomy_idx` ON `taxonomyMedia` (`taxonomyId`);--> statement-breakpoint
CREATE INDEX `taxonomy_media_media_idx` ON `taxonomyMedia` (`mediaId`);