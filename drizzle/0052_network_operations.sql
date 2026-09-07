-- Fase 5 Rede Ojú: operação, notificações internas, encerramento comercial e entrega.
-- NÃO aplicar automaticamente. 0049, 0050 e 0051 permanecem pendentes.
-- Não cria segundo acervo, marketplace, ranking nem gateway de pagamento.
-- Rollback: DROP TABLE networkProductionDeliveries, networkProductionSettlements, networkNotificationPreferences, networkNotifications;

CREATE TABLE IF NOT EXISTS `networkNotifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `recipientUserId` int NOT NULL,
  `type` varchar(80) NOT NULL,
  `referenceType` varchar(80) NOT NULL,
  `referenceId` int NOT NULL,
  `readAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `network_notification_recipient_idx` (`recipientUserId`, `readAt`, `createdAt`),
  INDEX `network_notification_reference_idx` (`referenceType`, `referenceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `networkNotificationPreferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `inApp` boolean NOT NULL DEFAULT true,
  `emailTransactional` boolean NOT NULL DEFAULT false,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_notification_pref_user_unique` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `networkProductionSettlements` (
  `id` int AUTO_INCREMENT NOT NULL,
  `productionId` int NOT NULL,
  `opportunityId` int NOT NULL,
  `commercialRequestId` int,
  `commercialTransactionId` int,
  `totalValue` decimal(12,2) NOT NULL,
  `professionalValue` decimal(12,2) NOT NULL,
  `ojuValue` decimal(12,2) NOT NULL,
  `networkFundValue` decimal(12,2) NOT NULL,
  `captorValue` decimal(12,2) NOT NULL,
  `commercialPolicyId` int NOT NULL,
  `commercialPolicyVersion` int NOT NULL,
  `paymentStatus` enum('Aguardando pagamento','Pagamento recebido','Pagamento parcial','Pagamento confirmado','Pagamento cancelado','Reembolso','Encerrado') NOT NULL DEFAULT 'Aguardando pagamento',
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_production_settlement_production_unique` (`productionId`),
  INDEX `network_production_settlement_opportunity_idx` (`opportunityId`),
  INDEX `network_production_settlement_payment_idx` (`paymentStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `networkProductionDeliveries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `productionId` int NOT NULL,
  `mediaId` int NOT NULL,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_production_delivery_unique` (`productionId`, `mediaId`),
  INDEX `network_production_delivery_media_idx` (`mediaId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
