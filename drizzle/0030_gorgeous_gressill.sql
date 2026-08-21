ALTER TABLE `institutions` ADD `directoryScope` enum('Institucional','Serviço comunitário') DEFAULT 'Institucional' NOT NULL;--> statement-breakpoint
ALTER TABLE `institutions` ADD `serviceCategory` varchar(180);--> statement-breakpoint
ALTER TABLE `institutions` ADD `serviceKeywords` text;--> statement-breakpoint
ALTER TABLE `institutions` ADD `neighborhoodText` varchar(180);--> statement-breakpoint
CREATE INDEX `institution_directory_scope_idx` ON `institutions` (`directoryScope`,`serviceCategory`);