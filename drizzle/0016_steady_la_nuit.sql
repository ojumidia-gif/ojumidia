ALTER TABLE `oralMemories` ADD `generatedTranscript` text;--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `generatedSummary` text;--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `aiProcessedAt` timestamp;--> statement-breakpoint
ALTER TABLE `taxonomies` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `taxonomies` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `taxonomies` ADD `mapVisibility` enum('Não divulgar','Aproximada','Pública') DEFAULT 'Não divulgar' NOT NULL;