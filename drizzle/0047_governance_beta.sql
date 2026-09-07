-- Governança Beta: identidade operacional, denúncias, legal hold e quarentena.
-- Rollback: DROP das tabelas novas e DROP COLUMN das colunas adicionadas.
-- Não apaga auditEvents nem users.

ALTER TABLE `users` ADD `accountStatus` enum('Ativo','Suspenso','Bloqueado','Revogado') NOT NULL DEFAULT 'Ativo';
ALTER TABLE `users` ADD `sessionEpoch` int NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD `accountStatusReason` text;
ALTER TABLE `users` ADD `accountStatusChangedAt` timestamp;
ALTER TABLE `users` ADD `accountStatusChangedBy` int;
ALTER TABLE `users` ADD `accountStatusCaseId` int;
ALTER TABLE `users` ADD `accountStatusUntil` timestamp;

ALTER TABLE `auditEvents` ADD `requestIp` varchar(64);
ALTER TABLE `auditEvents` ADD `userAgent` varchar(320);
ALTER TABLE `auditEvents` ADD `correlationId` varchar(80);

ALTER TABLE `publications` ADD `quarantinedAt` timestamp;
ALTER TABLE `publications` ADD `quarantinedBy` int;
ALTER TABLE `publications` ADD `quarantineCaseId` int;
ALTER TABLE `publications` ADD `quarantinePreviousPublic` boolean;
ALTER TABLE `publications` ADD INDEX `publication_quarantine_idx` (`quarantinedAt`);

ALTER TABLE `mediaAssets` ADD `quarantinedAt` timestamp;
ALTER TABLE `mediaAssets` ADD `quarantinedBy` int;
ALTER TABLE `mediaAssets` ADD `quarantineCaseId` int;
ALTER TABLE `mediaAssets` ADD INDEX `media_quarantine_idx` (`quarantinedAt`);

CREATE TABLE `governanceCaseCounters` (
  `year` int NOT NULL,
  `lastNumber` int NOT NULL DEFAULT 0,
  CONSTRAINT `governanceCaseCounters_year` PRIMARY KEY(`year`)
);

CREATE TABLE `governanceCases` (
  `id` int AUTO_INCREMENT NOT NULL,
  `publicCode` varchar(32) NOT NULL,
  `kind` enum('Denúncia','Incidente') NOT NULL DEFAULT 'Denúncia',
  `status` enum('Aberta','Em análise','Quarentena','Resolvida','Rejeitada','Arquivada') NOT NULL DEFAULT 'Aberta',
  `outcome` enum('Não confirmada','Violação confirmada'),
  `priority` enum('Baixa','Média','Alta','Urgente') NOT NULL DEFAULT 'Média',
  `category` enum('Violação de direitos de imagem','Uso não autorizado de conteúdo','Conteúdo sensível','Exposição indevida de dados','Violação de regras da plataforma','Abuso de privilégio administrativo','Fraude','Comportamento suspeito','Denúncia jurídica','Solicitação de autoridade','Outros') NOT NULL,
  `title` varchar(280) NOT NULL,
  `description` text NOT NULL,
  `publicationId` int,
  `mediaId` int,
  `subjectUserId` int,
  `assigneeId` int,
  `createdBy` int NOT NULL,
  `decisionNote` text,
  `decidedBy` int,
  `decidedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `governanceCases_id` PRIMARY KEY(`id`),
  CONSTRAINT `governanceCases_publicCode_unique` UNIQUE(`publicCode`)
);

CREATE TABLE `governanceCaseEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `caseId` int NOT NULL,
  `actorId` int,
  `action` varchar(160) NOT NULL,
  `detail` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `governanceCaseEvents_id` PRIMARY KEY(`id`)
);

CREATE TABLE `governanceLegalHolds` (
  `id` int AUTO_INCREMENT NOT NULL,
  `caseId` int NOT NULL,
  `resourceType` varchar(120) NOT NULL,
  `resourceId` int NOT NULL,
  `reason` text NOT NULL,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `releasedAt` timestamp,
  `releasedBy` int,
  `releaseReason` text,
  CONSTRAINT `governanceLegalHolds_id` PRIMARY KEY(`id`)
);

CREATE TABLE `governanceEvidenceExports` (
  `id` int AUTO_INCREMENT NOT NULL,
  `caseId` int NOT NULL,
  `actorId` int NOT NULL,
  `itemCount` int NOT NULL DEFAULT 0,
  `packageChecksum` varchar(128) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `governanceEvidenceExports_id` PRIMARY KEY(`id`)
);

CREATE TABLE `governanceSecurityAlerts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `kind` varchar(80) NOT NULL,
  `severity` enum('info','alerta','critico') NOT NULL DEFAULT 'alerta',
  `status` enum('Aberto','Reconhecido','Encerrado') NOT NULL DEFAULT 'Aberto',
  `title` varchar(280) NOT NULL,
  `detail` text,
  `actorUserId` int,
  `subjectUserId` int,
  `caseId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `governanceSecurityAlerts_id` PRIMARY KEY(`id`)
);

ALTER TABLE `governanceCases` ADD INDEX `governance_case_status_idx` (`status`,`createdAt`);
ALTER TABLE `governanceCases` ADD INDEX `governance_case_subject_idx` (`subjectUserId`,`createdAt`);
ALTER TABLE `governanceCases` ADD INDEX `governance_case_publication_idx` (`publicationId`);
ALTER TABLE `governanceCaseEvents` ADD INDEX `governance_case_event_idx` (`caseId`,`createdAt`);
ALTER TABLE `governanceLegalHolds` ADD INDEX `governance_hold_resource_idx` (`resourceType`,`resourceId`,`releasedAt`);
ALTER TABLE `governanceLegalHolds` ADD INDEX `governance_hold_case_idx` (`caseId`);
ALTER TABLE `governanceEvidenceExports` ADD INDEX `governance_export_case_idx` (`caseId`,`createdAt`);
ALTER TABLE `governanceSecurityAlerts` ADD INDEX `governance_alert_status_idx` (`status`,`createdAt`);
