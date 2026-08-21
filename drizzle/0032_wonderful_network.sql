CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`partnerId` int,
	`territoryId` int,
	`resourceType` varchar(120) NOT NULL,
	`resourceId` int,
	`action` varchar(160) NOT NULL,
	`previousState` text,
	`nextState` text,
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partnerMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`userId` int NOT NULL,
	`operationalRole` enum('Gestor territorial','Operador territorial','Curador territorial') NOT NULL DEFAULT 'Operador territorial',
	`status` enum('Convidado','Ativo','Suspenso','Revogado') NOT NULL DEFAULT 'Convidado',
	`createdBy` int NOT NULL,
	`activatedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partnerMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_member_unique_idx` UNIQUE(`partnerId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `partnerTerritories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`territoryId` int NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partnerTerritories_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_territory_unique_idx` UNIQUE(`partnerId`,`territoryId`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`displayName` varchar(240) NOT NULL,
	`slug` varchar(260) NOT NULL,
	`description` text,
	`contactText` varchar(320),
	`logoMediaId` int,
	`profileMediaId` int,
	`publicVisibility` boolean NOT NULL DEFAULT false,
	`status` enum('Rascunho','Em revisão','Ativo','Suspenso','Arquivado') NOT NULL DEFAULT 'Rascunho',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `partners_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `advertisements` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `communityCareRequests` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `communityEvents` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `contracts` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `institutions` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD `uploadStatus` enum('Criado','Upload','Processando','Validando','Processado','Falhou') DEFAULT 'Processado' NOT NULL;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD `uploadId` varchar(96);--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD `checksum` varchar(128);--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `publications` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `revenueLeads` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `mediaAssets` ADD CONSTRAINT `mediaAssets_uploadId_unique` UNIQUE(`uploadId`);--> statement-breakpoint
CREATE INDEX `audit_actor_created_idx` ON `auditEvents` (`actorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_partner_created_idx` ON `auditEvents` (`partnerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_resource_idx` ON `auditEvents` (`resourceType`,`resourceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `partner_member_user_status_idx` ON `partnerMembers` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `partner_territory_territory_idx` ON `partnerTerritories` (`territoryId`);--> statement-breakpoint
CREATE INDEX `partner_status_idx` ON `partners` (`status`,`publicVisibility`);--> statement-breakpoint
CREATE INDEX `advertisement_partner_idx` ON `advertisements` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `commercial_request_partner_idx` ON `commercialRequests` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `care_request_partner_idx` ON `communityCareRequests` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `community_event_partner_idx` ON `communityEvents` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `contract_partner_idx` ON `contracts` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `institution_partner_idx` ON `institutions` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `media_partner_status_idx` ON `mediaAssets` (`partnerId`,`uploadStatus`,`state`);--> statement-breakpoint
CREATE INDEX `oral_memory_partner_idx` ON `oralMemories` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `publication_partner_idx` ON `publications` (`partnerId`,`status`);--> statement-breakpoint
CREATE INDEX `revenue_lead_partner_idx` ON `revenueLeads` (`partnerId`,`status`);