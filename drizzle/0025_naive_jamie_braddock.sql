CREATE TABLE `commercialClosings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`executorId` int,
	`responsibleAdministratorId` int,
	`grossAmount` decimal(12,2),
	`commercialPolicyId` int,
	`commercialPolicyVersion` int,
	`executorPercent` decimal(5,2),
	`ojuPercent` decimal(5,2),
	`developmentPercent` decimal(5,2),
	`captorPercent` decimal(5,2),
	`financialStatus` enum('Preparado','Aguardando definição','Arquivado') NOT NULL DEFAULT 'Aguardando definição',
	`notes` text,
	`preparedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercialClosings_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercialClosings_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `commercialMiniclips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`mediaId` int NOT NULL,
	`status` enum('Ativo','Substituído','Arquivado') NOT NULL DEFAULT 'Ativo',
	`authorizedForHome` boolean NOT NULL DEFAULT false,
	`homeFeatured` boolean NOT NULL DEFAULT false,
	`replacedByMiniclipId` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercialMiniclips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `networkExecutors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`displayName` varchar(240) NOT NULL,
	`email` varchar(320),
	`whatsapp` varchar(40),
	`specialty` enum('Fotografia','Vídeo','Documentário','Edição','Produção','Outro') NOT NULL,
	`profileNote` text,
	`linkedUserId` int,
	`status` enum('Ativo','Inativo') NOT NULL DEFAULT 'Ativo',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `networkExecutors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `publicationMedia` ADD CONSTRAINT `publication_media_unique_idx` UNIQUE(`publicationId`,`mediaId`);--> statement-breakpoint
CREATE INDEX `commercial_closing_executor_idx` ON `commercialClosings` (`executorId`);--> statement-breakpoint
CREATE INDEX `commercial_closing_responsible_idx` ON `commercialClosings` (`responsibleAdministratorId`);--> statement-breakpoint
CREATE INDEX `commercial_miniclip_request_idx` ON `commercialMiniclips` (`requestId`,`status`);--> statement-breakpoint
CREATE INDEX `commercial_miniclip_home_idx` ON `commercialMiniclips` (`homeFeatured`,`status`,`authorizedForHome`);--> statement-breakpoint
CREATE INDEX `network_executor_status_idx` ON `networkExecutors` (`status`,`specialty`);--> statement-breakpoint
CREATE INDEX `network_executor_linked_user_idx` ON `networkExecutors` (`linkedUserId`);