CREATE TABLE `commercialRefundPolicies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `version` int NOT NULL,
  `status` enum('Rascunho','Ativa','Substituída','Arquivada') NOT NULL DEFAULT 'Rascunho',
  `requestWindowDays` int NOT NULL,
  `maximumRefundPercent` decimal(5,2) NOT NULL,
  `retentionExplanation` text NOT NULL,
  `createdByUserId` int NOT NULL,
  `activatedByUserId` int,
  `activatedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `commercialRefundPolicies_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE `commercialRefundRequests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requestId` int NOT NULL,
  `originalTransactionId` int NOT NULL,
  `refundPolicyId` int NOT NULL,
  `refundPolicyVersion` int NOT NULL,
  `requestedAmount` decimal(12,2) NOT NULL,
  `approvedAmount` decimal(12,2),
  `retainedCostsAmount` decimal(12,2),
  `reason` text NOT NULL,
  `decisionNote` text,
  `status` enum('Solicitado','Em análise','Aprovado','Recusado','Compensado','Cancelado') NOT NULL DEFAULT 'Solicitado',
  `requestedByUserId` int NOT NULL,
  `decidedByUserId` int,
  `decidedAt` timestamp,
  `compensatedTransactionId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `commercialRefundRequests_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE `commercialTransactions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requestId` int NOT NULL,
  `partnerId` int,
  `territoryId` int,
  `transactionType` enum('Cobrança','Reembolso','Ajuste') NOT NULL,
  `status` enum('Registrada','Compensada','Cancelada') NOT NULL DEFAULT 'Registrada',
  `grossAmount` decimal(12,2) NOT NULL,
  `executorAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `partnerGrossAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `partnerNetAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `ojuAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `retainedCostsAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commercialPolicyId` int,
  `commercialPolicyVersion` int,
  `refundPolicyId` int,
  `refundPolicyVersion` int,
  `originalTransactionId` int,
  `reason` text,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `commercialTransactions_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE `highlightSuggestions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `publicationId` int NOT NULL,
  `partnerId` int,
  `territoryId` int,
  `note` text,
  `status` enum('Sugerida','Aprovada','Recusada','Retirada') NOT NULL DEFAULT 'Sugerida',
  `suggestedBy` int NOT NULL,
  `decidedBy` int,
  `decidedAt` timestamp,
  `decisionNote` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `highlightSuggestions_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
ALTER TABLE `partners` MODIFY COLUMN `status` enum('Rascunho','Em revisão','Ativo','Suspenso','Arquivado','Desativado') NOT NULL DEFAULT 'Rascunho';--> statement-breakpoint
UPDATE `partners` SET `status` = 'Desativado' WHERE `status` = 'Arquivado';--> statement-breakpoint
ALTER TABLE `partners` MODIFY COLUMN `status` enum('Rascunho','Em revisão','Ativo','Suspenso','Desativado') NOT NULL DEFAULT 'Rascunho';--> statement-breakpoint
ALTER TABLE `partnerTerritories` DROP INDEX `partner_territory_unique_idx`;--> statement-breakpoint
ALTER TABLE `partnerTerritories` ADD `status` enum('Ativa','Encerrada') NOT NULL DEFAULT 'Ativa';--> statement-breakpoint
ALTER TABLE `partnerTerritories` ADD `activeKey` varchar(80);--> statement-breakpoint
ALTER TABLE `partnerTerritories` ADD `startsAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `partnerTerritories` ADD `endsAt` timestamp;--> statement-breakpoint
UPDATE `partnerTerritories` SET `activeKey` = CONCAT(`partnerId`, ':', `territoryId`) WHERE `activeKey` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `partner_territory_active_key_unique_idx` ON `partnerTerritories` (`activeKey`);--> statement-breakpoint
CREATE INDEX `partner_territory_active_idx` ON `partnerTerritories` (`partnerId`,`status`,`territoryId`);--> statement-breakpoint
ALTER TABLE `uploadSessions` MODIFY COLUMN `status` enum('Criado','Upload','Validando','Processando','Processado','Falhou','Enviando','Enviado','Pronto','Aprovado','Publicado','Cancelado','Rejeitado') NOT NULL DEFAULT 'Criado';--> statement-breakpoint
UPDATE `uploadSessions` SET `status` = CASE `status` WHEN 'Upload' THEN 'Enviando' WHEN 'Validando' THEN 'Processando' WHEN 'Processado' THEN 'Pronto' ELSE `status` END;--> statement-breakpoint
ALTER TABLE `uploadSessions` MODIFY COLUMN `status` enum('Criado','Enviando','Enviado','Processando','Pronto','Aprovado','Publicado','Falhou','Cancelado','Rejeitado') NOT NULL DEFAULT 'Criado';--> statement-breakpoint
ALTER TABLE `mediaAssets` MODIFY COLUMN `uploadStatus` enum('Criado','Upload','Validando','Processando','Processado','Falhou','Enviando','Enviado','Pronto','Aprovado','Publicado','Cancelado','Rejeitado') NOT NULL DEFAULT 'Processado';--> statement-breakpoint
UPDATE `mediaAssets` SET `uploadStatus` = 'Pronto' WHERE `uploadStatus` = 'Processado';--> statement-breakpoint
ALTER TABLE `mediaAssets` MODIFY COLUMN `uploadStatus` enum('Criado','Enviando','Enviado','Processando','Pronto','Aprovado','Publicado','Falhou','Cancelado','Rejeitado') NOT NULL DEFAULT 'Pronto';--> statement-breakpoint
ALTER TABLE `uploadSessions` ADD `attemptCount` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `uploadSessions` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `uploadSessions` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `uploadSessions` ADD `rejectedBy` int;--> statement-breakpoint
ALTER TABLE `uploadSessions` ADD `rejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `uploadSessions` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `uploadSessions` ADD `publishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `commercialMiniclips` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `commercialMiniclips` ADD `territoryId` int;--> statement-breakpoint
ALTER TABLE `commercialMiniclips` ADD `contractorNameSnapshot` varchar(240);--> statement-breakpoint
CREATE INDEX `refund_policy_status_version_idx` ON `commercialRefundPolicies` (`status`,`version`);--> statement-breakpoint
CREATE INDEX `refund_request_request_idx` ON `commercialRefundRequests` (`requestId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `refund_request_original_transaction_idx` ON `commercialRefundRequests` (`originalTransactionId`,`status`);--> statement-breakpoint
CREATE INDEX `commercial_transaction_request_idx` ON `commercialTransactions` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `commercial_transaction_partner_idx` ON `commercialTransactions` (`partnerId`,`territoryId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `highlight_suggestion_publication_idx` ON `highlightSuggestions` (`publicationId`,`status`);--> statement-breakpoint
CREATE INDEX `highlight_suggestion_partner_idx` ON `highlightSuggestions` (`partnerId`,`status`);
