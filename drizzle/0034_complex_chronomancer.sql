CREATE TABLE `uploadSessions` (
	`id` varchar(96) NOT NULL,
	`userId` int NOT NULL,
	`partnerId` int,
	`territoryId` int,
	`mediaType` enum('foto','vídeo','áudio','documento') NOT NULL,
	`status` enum('Criado','Upload','Processando','Validando','Processado','Falhou') NOT NULL DEFAULT 'Criado',
	`filename` varchar(280) NOT NULL,
	`contentType` varchar(180) NOT NULL,
	`storageKey` varchar(512),
	`assetUrl` text,
	`fileSize` int,
	`checksum` varchar(128),
	`durationSeconds` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `uploadSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `territoryId` int;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD `territoryId` int;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `upload_session_user_status_idx` ON `uploadSessions` (`userId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `upload_session_partner_territory_idx` ON `uploadSessions` (`partnerId`,`territoryId`,`status`);--> statement-breakpoint
CREATE INDEX `commercial_request_territory_idx` ON `commercialRequests` (`territoryId`,`status`);--> statement-breakpoint
CREATE INDEX `media_territory_status_idx` ON `mediaAssets` (`territoryId`,`uploadStatus`,`state`);