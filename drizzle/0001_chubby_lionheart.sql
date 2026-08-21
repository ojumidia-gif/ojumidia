CREATE TABLE `commercialRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientName` varchar(200) NOT NULL,
	`contact` varchar(280) NOT NULL,
	`eventType` varchar(180) NOT NULL,
	`eventDate` timestamp,
	`location` varchar(280),
	`duration` varchar(120),
	`needsPhotography` boolean NOT NULL DEFAULT false,
	`needsVideo` boolean NOT NULL DEFAULT false,
	`objective` text,
	`notes` text,
	`status` enum('Solicitação','Em análise','Orçamento','Contratado','Concluído','Arquivado') NOT NULL DEFAULT 'Solicitação',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercialRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int,
	`publicationId` int,
	`contractor` varchar(240) NOT NULL,
	`documentUrl` text NOT NULL,
	`storageKey` varchar(512),
	`status` enum('Rascunho','Enviado','Assinado','Arquivado') NOT NULL DEFAULT 'Rascunho',
	`signedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editorialActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicationId` int NOT NULL,
	`actorId` int NOT NULL,
	`fromStatus` enum('Rascunho','Em revisão','Aprovada','Publicada','Arquivada'),
	`toStatus` enum('Rascunho','Em revisão','Aprovada','Publicada','Arquivada'),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `editorialActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediaAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mediaType` enum('foto','vídeo') NOT NULL,
	`assetUrl` text NOT NULL,
	`storageKey` varchar(512),
	`filename` varchar(280),
	`origin` varchar(280) NOT NULL,
	`credit` varchar(280) NOT NULL,
	`authorization` enum('Cessão','Licença','Domínio público','Autoral própria','Pendente') NOT NULL,
	`purpose` varchar(280) NOT NULL,
	`publicationAllowed` boolean NOT NULL DEFAULT false,
	`projectCoverage` varchar(280),
	`terms` text,
	`usageExpiresAt` timestamp,
	`state` enum('Ativo','Arquivado') NOT NULL DEFAULT 'Ativo',
	`fileSize` int,
	`backgroundEligible` boolean NOT NULL DEFAULT false,
	`backgroundPriority` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mediaAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publicationMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicationId` int NOT NULL,
	`mediaId` int NOT NULL,
	`caption` text,
	`displayOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `publicationMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publicationRelations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourcePublicationId` int NOT NULL,
	`relatedPublicationId` int NOT NULL,
	`relationType` enum('Relacionado','Parte de','Continua em','Recomendado') NOT NULL DEFAULT 'Relacionado',
	CONSTRAINT `publicationRelations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publicationTaxonomies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicationId` int NOT NULL,
	`taxonomyId` int NOT NULL,
	CONSTRAINT `publicationTaxonomies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(280) NOT NULL,
	`contentKind` enum('História','Cobertura','Documentário','Projeto') NOT NULL DEFAULT 'História',
	`slug` varchar(320) NOT NULL,
	`subtitle` varchar(420),
	`summary` text,
	`body` text,
	`status` enum('Rascunho','Em revisão','Aprovada','Publicada','Arquivada') NOT NULL DEFAULT 'Rascunho',
	`teamId` int,
	`createdBy` int NOT NULL,
	`editedBy` int,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	`isPublic` boolean NOT NULL DEFAULT true,
	`unpublishedAt` timestamp,
	`unpublishedBy` int,
	`coverageStart` timestamp,
	`coverageEnd` timestamp,
	`relevance` int NOT NULL DEFAULT 0,
	`manualFeatured` boolean NOT NULL DEFAULT false,
	`sponsored` boolean NOT NULL DEFAULT false,
	`sponsorDisclosure` varchar(280),
	`homePlacement` enum('Nenhum','Destaque principal','Destaque secundário','Recomendado') NOT NULL DEFAULT 'Nenhum',
	`homeOrder` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `publications_id` PRIMARY KEY(`id`),
	CONSTRAINT `publications_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(120) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `taxonomies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dimension` enum('Tipo de conteúdo','Tema','Localização','Território','Pessoa/organização','Evento','Data') NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`description` text,
	`parentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taxonomies_id` PRIMARY KEY(`id`),
	CONSTRAINT `taxonomies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('criador','editor','aprovador','administrador') NOT NULL DEFAULT 'criador';--> statement-breakpoint
CREATE INDEX `activity_publication_idx` ON `editorialActivities` (`publicationId`);--> statement-breakpoint
CREATE INDEX `publication_media_publication_idx` ON `publicationMedia` (`publicationId`);--> statement-breakpoint
CREATE INDEX `publication_relation_source_idx` ON `publicationRelations` (`sourcePublicationId`);--> statement-breakpoint
CREATE INDEX `publication_relation_target_idx` ON `publicationRelations` (`relatedPublicationId`);--> statement-breakpoint
CREATE INDEX `publication_taxonomy_publication_idx` ON `publicationTaxonomies` (`publicationId`);--> statement-breakpoint
CREATE INDEX `publication_taxonomy_taxonomy_idx` ON `publicationTaxonomies` (`taxonomyId`);--> statement-breakpoint
CREATE INDEX `publication_status_idx` ON `publications` (`status`);--> statement-breakpoint
CREATE INDEX `publication_team_idx` ON `publications` (`teamId`);--> statement-breakpoint
CREATE INDEX `publication_feature_idx` ON `publications` (`manualFeatured`,`relevance`);--> statement-breakpoint
CREATE INDEX `taxonomy_dimension_idx` ON `taxonomies` (`dimension`);