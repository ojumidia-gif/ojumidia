CREATE TABLE `authorizationTerms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`authorizationId` int,
	`status` enum('Gerado','Aguardando assinatura gov.br','Assinado via gov.br','Arquivado') NOT NULL DEFAULT 'Gerado',
	`signatureProvider` enum('gov.br') NOT NULL DEFAULT 'gov.br',
	`templateVersion` varchar(80) NOT NULL DEFAULT 'OJU-AE-1.0',
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
	CONSTRAINT `authorizationTerms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `authorization_term_request_idx` ON `authorizationTerms` (`requestId`,`status`);