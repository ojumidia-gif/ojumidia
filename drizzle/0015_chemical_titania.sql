ALTER TABLE `communityCareRequests` ADD `trackingCode` varchar(48);--> statement-breakpoint
UPDATE `communityCareRequests` SET `trackingCode` = CONCAT('AC-', `id`) WHERE `trackingCode` IS NULL;--> statement-breakpoint
ALTER TABLE `communityCareRequests` MODIFY `trackingCode` varchar(48) NOT NULL;--> statement-breakpoint
ALTER TABLE `institutions` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `institutions` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `theme` varchar(180);--> statement-breakpoint
ALTER TABLE `communityCareRequests` ADD CONSTRAINT `communityCareRequests_trackingCode_unique` UNIQUE(`trackingCode`);
