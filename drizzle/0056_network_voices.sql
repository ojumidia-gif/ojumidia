-- Vozes da Rede Ojú: depoimento documental com fluxo editorial.
-- Não é avaliação, ranking, feed nem marketplace.
-- Reutiliza auditEvents. QA primeiro. NÃO aplicar em Aiven/Beta nesta fase.
-- Rollback: DROP TABLE networkVoices;

CREATE TABLE `networkVoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`body` text NOT NULL,
	`speakerName` varchar(240),
	`speakerNameVisibility` enum('Nome','Pseudônimo','Não divulgar') NOT NULL DEFAULT 'Não divulgar',
	`relationKind` enum('Casa','Profissional','Pessoa retratada','Parceiro','Outro') NOT NULL DEFAULT 'Outro',
	`contextNote` varchar(420),
	`status` enum('Aguardando análise','Ajuste solicitado','Aprovado','Publicado','Rejeitado','Retirado') NOT NULL DEFAULT 'Aguardando análise',
	`curationScope` enum('Nenhum','Territorial','Nacional') NOT NULL DEFAULT 'Nenhum',
	`curationDisplayOrder` int NOT NULL DEFAULT 0,
	`adjustmentNote` text,
	`authorEmail` varchar(320),
	`publicationId` int,
	`productionId` int,
	`professionalProfileId` int,
	`institutionId` int,
	`partnerId` int,
	`territoryId` int,
	`publishedAt` timestamp,
	`unpublishedAt` timestamp,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`managedByUserId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `networkVoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `network_voice_status_idx` ON `networkVoices` (`status`,`curationScope`);
--> statement-breakpoint
CREATE INDEX `network_voice_partner_idx` ON `networkVoices` (`partnerId`,`status`);
--> statement-breakpoint
CREATE INDEX `network_voice_territory_idx` ON `networkVoices` (`territoryId`,`status`);
--> statement-breakpoint
CREATE INDEX `network_voice_publication_idx` ON `networkVoices` (`publicationId`);
--> statement-breakpoint
CREATE INDEX `network_voice_production_idx` ON `networkVoices` (`productionId`);
