-- Fase 1–2 Rede Ojú. NÃO aplicar automaticamente em produção.
-- Rollback: DROP TABLE mediaOutlets, professionalProfileSpecialties, professionalProfiles;
-- e DROP INDEX/COLUMN em networkExecutors.professionalProfileId e colunas extras de adminJoinRequests.

CREATE TABLE IF NOT EXISTS `professionalProfiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `email` varchar(320) NOT NULL,
  `userId` int,
  `joinRequestId` int,
  `partnerId` int,
  `territoryId` int,
  `displayName` varchar(240) NOT NULL,
  `networkBond` enum('criador-parceiro','parceiro-midia') NOT NULL DEFAULT 'criador-parceiro',
  `hasOwnMedia` boolean NOT NULL DEFAULT false,
  `mediaOutletName` varchar(240),
  `mediaOutletUrl` varchar(320),
  `status` enum('Rascunho','Ativo','Suspenso') NOT NULL DEFAULT 'Rascunho',
  `createdBy` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `professional_profile_email_unique` (`email`),
  UNIQUE KEY `professional_profile_user_unique` (`userId`),
  INDEX `professional_profile_partner_idx` (`partnerId`, `status`),
  INDEX `professional_profile_territory_idx` (`territoryId`, `status`),
  INDEX `professional_profile_bond_idx` (`networkBond`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `professionalProfileSpecialties` (
  `id` int AUTO_INCREMENT NOT NULL,
  `profileId` int NOT NULL,
  `specialtyId` varchar(40) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `professional_profile_specialty_unique` (`profileId`, `specialtyId`),
  INDEX `professional_profile_specialty_id_idx` (`specialtyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mediaOutlets` (
  `id` int AUTO_INCREMENT NOT NULL,
  `profileId` int NOT NULL,
  `name` varchar(240) NOT NULL,
  `instagramHandle` varchar(30),
  `siteUrl` varchar(320),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `media_outlet_profile_idx` (`profileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compatibilidade: candidatura antiga permanece em `practice` (varchar). Colunas novas têm default.
ALTER TABLE `adminJoinRequests`
  ADD COLUMN `networkBond` enum('criador-parceiro','parceiro-midia') NOT NULL DEFAULT 'criador-parceiro',
  ADD COLUMN `hasOwnMedia` boolean NOT NULL DEFAULT false,
  ADD COLUMN `mediaOutletName` varchar(240),
  ADD COLUMN `mediaOutletUrl` varchar(320);

ALTER TABLE `networkExecutors`
  ADD COLUMN `professionalProfileId` int,
  ADD INDEX `network_executor_profile_idx` (`professionalProfileId`);
