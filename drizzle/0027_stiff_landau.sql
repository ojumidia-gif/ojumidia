CREATE TABLE `portalContentActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockId` int,
	`action` enum('Criado','Atualizado','Visibilidade','Excluído','Restaurado') NOT NULL,
	`snapshot` text,
	`actorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portalContentActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portalContentBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page` enum('Global','Home','Histórias','Memórias Documentais','Serviços','Comunidade','Sobre') NOT NULL,
	`sectionKey` varchar(120) NOT NULL,
	`label` varchar(240) NOT NULL,
	`contentJson` text NOT NULL,
	`isVisible` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`updatedBy` int,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portalContentBlocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `portal_content_page_section_unique` UNIQUE(`page`,`sectionKey`)
);
--> statement-breakpoint
CREATE INDEX `portal_content_activity_block_idx` ON `portalContentActivities` (`blockId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `portal_content_page_order_idx` ON `portalContentBlocks` (`page`,`displayOrder`);