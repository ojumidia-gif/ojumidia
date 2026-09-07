-- Fase 3 Rede Ojú: oportunidades territoriais. NÃO aplicar automaticamente.
-- A 0049 permanece pendente. Esta migration não substitui commercialRequests.
-- Rollback: DROP TABLE networkOpportunityInvites, networkOpportunitySpecialties, networkOpportunities;

CREATE TABLE IF NOT EXISTS `networkOpportunities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `commercialRequestId` int,
  `title` varchar(240) NOT NULL,
  `briefing` text NOT NULL,
  `workType` enum('Cobertura','Documentário','Fotografia','Outro') NOT NULL DEFAULT 'Cobertura',
  `origin` enum('Comercial','Mesa','Manual') NOT NULL DEFAULT 'Manual',
  `territoryId` int NOT NULL,
  `partnerId` int,
  `cityLabel` varchar(180) NOT NULL,
  `uf` varchar(2) NOT NULL,
  `eventDate` timestamp NULL,
  `startAt` timestamp NULL,
  `endAt` timestamp NULL,
  `durationText` varchar(120),
  `totalValue` decimal(12,2) NOT NULL,
  `professionalValue` decimal(12,2) NOT NULL,
  `ojuValue` decimal(12,2) NOT NULL,
  `networkFundValue` decimal(12,2) NOT NULL DEFAULT '0.00',
  `captorValue` decimal(12,2) NOT NULL DEFAULT '0.00',
  `executorPercent` decimal(5,2) NOT NULL,
  `ojuPercent` decimal(5,2) NOT NULL,
  `developmentPercent` decimal(5,2) NOT NULL,
  `captorPercent` decimal(5,2) NOT NULL,
  `commercialPolicyId` int NOT NULL,
  `commercialPolicyVersion` int NOT NULL,
  `status` enum('Rascunho','Aberta','Aceita','Cancelada','Expirada') NOT NULL DEFAULT 'Rascunho',
  `acceptanceDeadline` timestamp NULL,
  `createdBy` int NOT NULL,
  `responsibleUserId` int NOT NULL,
  `acceptedProfessionalProfileId` int,
  `acceptedUserId` int,
  `acceptedExecutorId` int,
  `acceptedAt` timestamp NULL,
  `frozenAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `network_opportunity_request_idx` (`commercialRequestId`, `status`),
  INDEX `network_opportunity_territory_idx` (`territoryId`, `status`),
  INDEX `network_opportunity_partner_idx` (`partnerId`, `status`),
  INDEX `network_opportunity_accepted_profile_idx` (`acceptedProfessionalProfileId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `networkOpportunitySpecialties` (
  `id` int AUTO_INCREMENT NOT NULL,
  `opportunityId` int NOT NULL,
  `specialtyId` varchar(40) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_opportunity_specialty_unique` (`opportunityId`, `specialtyId`),
  INDEX `network_opportunity_specialty_id_idx` (`specialtyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `networkOpportunityInvites` (
  `id` int AUTO_INCREMENT NOT NULL,
  `opportunityId` int NOT NULL,
  `professionalProfileId` int NOT NULL,
  `userId` int,
  `executorId` int,
  `status` enum('Pendente','Aceita','Recusada','Expirada','Cancelada','Superada') NOT NULL DEFAULT 'Pendente',
  `invitedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` timestamp NULL,
  `respondedAt` timestamp NULL,
  `declineReason` varchar(480),
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `network_opportunity_invite_target_unique` (`opportunityId`, `professionalProfileId`),
  INDEX `network_opportunity_invite_profile_idx` (`professionalProfileId`, `status`),
  INDEX `network_opportunity_invite_status_idx` (`opportunityId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
