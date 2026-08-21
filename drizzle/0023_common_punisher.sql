CREATE TABLE `administratorResponsibilityTerms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grantId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`roleSnapshot` enum('administrador') NOT NULL DEFAULT 'administrador',
	`status` enum('Gerado','Aguardando assinatura gov.br','Assinado via gov.br','Arquivado') NOT NULL DEFAULT 'Gerado',
	`signatureProvider` enum('gov.br') NOT NULL DEFAULT 'gov.br',
	`templateVersion` varchar(80) NOT NULL DEFAULT 'OJU-AR-1.0',
	`exportedAt` timestamp NOT NULL DEFAULT (now()),
	`signedDocumentUrl` text,
	`signedStorageKey` varchar(512),
	`signedFilename` varchar(280),
	`signedAt` timestamp,
	`uploadedByUserId` int,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `administratorResponsibilityTerms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contracts` ADD `contractAmount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `contracts` ADD `ojuServicePercent` decimal(5,2) DEFAULT '30.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `administratorSharePercent` decimal(5,2) DEFAULT '70.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `payoutStatus` enum('Pendente','Parcial','Pago') DEFAULT 'Pendente' NOT NULL;--> statement-breakpoint
CREATE INDEX `administrator_responsibility_term_grant_idx` ON `administratorResponsibilityTerms` (`grantId`,`status`);