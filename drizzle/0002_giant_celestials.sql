ALTER TABLE `publications` MODIFY COLUMN `contentKind` enum('História','Cobertura','Documentário','Projeto','Fotografia documental') NOT NULL DEFAULT 'História';--> statement-breakpoint
ALTER TABLE `publicationMedia` ADD `biography` text;--> statement-breakpoint
ALTER TABLE `publicationMedia` ADD `location` varchar(280);--> statement-breakpoint
ALTER TABLE `publicationMedia` ADD `capturedAt` timestamp;