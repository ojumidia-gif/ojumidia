-- Fase 6 Rede Ojú: pagamento reconciliado + visibilidade pública do perfil profissional.
-- NÃO aplicar automaticamente. 0049–0052 permanecem pendentes.
-- Não armazena cartão, CVV nem credencial bancária.
-- Rollback: DROP TABLE networkPaymentWebhookReceipts, networkPaymentIntents;
-- ALTER TABLE professionalProfiles DROP INDEX professional_profile_public_idx, DROP COLUMN publicContact, publicBio, publicVisible, publicSlug;

ALTER TABLE `professionalProfiles`
  ADD COLUMN `publicSlug` varchar(260) NULL,
  ADD COLUMN `publicVisible` boolean NOT NULL DEFAULT false,
  ADD COLUMN `publicBio` text NULL,
  ADD COLUMN `publicContact` varchar(320) NULL,
  ADD UNIQUE KEY `professional_profile_public_slug_unique` (`publicSlug`),
  ADD INDEX `professional_profile_public_idx` (`publicVisible`, `status`);

CREATE TABLE IF NOT EXISTS `networkPaymentIntents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `productionId` int NOT NULL,
  `opportunityId` int NOT NULL,
  `settlementId` int,
  `provider` varchar(40) NOT NULL,
  `providerTransactionId` varchar(160) NOT NULL,
  `idempotencyKey` varchar(160) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'BRL',
  `status` enum('Aguardando','Iniciado','Pendente','Pago','Falhou','Cancelado','Estornado','Parcial','Encerrado') NOT NULL DEFAULT 'Aguardando',
  `paidAt` timestamp NULL,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_payment_provider_tx_unique` (`providerTransactionId`),
  UNIQUE KEY `network_payment_idempotency_unique` (`idempotencyKey`),
  INDEX `network_payment_production_idx` (`productionId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `networkPaymentWebhookReceipts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` varchar(160) NOT NULL,
  `providerTransactionId` varchar(160) NOT NULL,
  `payloadHash` varchar(64) NOT NULL,
  `result` varchar(40) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_payment_webhook_event_unique` (`eventId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
