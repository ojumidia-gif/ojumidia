-- Fase 4 Rede Ojú: produção operacional. NÃO aplicar automaticamente.
-- 0049 e 0050 permanecem pendentes. Não duplica mediaAssets.
-- Rollback: DROP TABLE networkProductionMedia, networkProductions;

CREATE TABLE IF NOT EXISTS `networkProductions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `opportunityId` int NOT NULL,
  `commercialRequestId` int,
  `publicationId` int,
  `professionalProfileId` int NOT NULL,
  `professionalUserId` int,
  `executorId` int,
  `partnerId` int,
  `territoryId` int NOT NULL,
  `workType` enum('Cobertura','Documentário','Fotografia','Outro') NOT NULL DEFAULT 'Cobertura',
  `title` varchar(240) NOT NULL,
  `briefing` text NOT NULL,
  `eventDate` timestamp NULL,
  `status` enum('Planejada','Confirmada','Em produção','Aguardando mídia','Em revisão','Concluída','Cancelada') NOT NULL DEFAULT 'Planejada',
  `notes` text,
  `responsibleUserId` int NOT NULL,
  `startedAt` timestamp NULL,
  `submittedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `cancelledAt` timestamp NULL,
  `deliveredAt` timestamp NULL,
  `editorialReady` boolean NOT NULL DEFAULT false,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_production_opportunity_unique` (`opportunityId`),
  INDEX `network_production_profile_idx` (`professionalProfileId`, `status`),
  INDEX `network_production_territory_idx` (`territoryId`, `status`),
  INDEX `network_production_partner_idx` (`partnerId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `networkProductionMedia` (
  `id` int AUTO_INCREMENT NOT NULL,
  `productionId` int NOT NULL,
  `mediaId` int NOT NULL,
  `layer` enum('Operacional','Editorial') NOT NULL DEFAULT 'Editorial',
  `displayOrder` int NOT NULL DEFAULT 0,
  `attachedBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_production_media_unique` (`productionId`, `mediaId`),
  INDEX `network_production_media_media_idx` (`mediaId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
