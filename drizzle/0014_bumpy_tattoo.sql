CREATE TABLE `communityCareRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterName` varchar(200) NOT NULL,
	`contact` varchar(320) NOT NULL,
	`territoryId` int,
	`requestType` enum('Intolerância religiosa','Risco ao acervo','Registro documental','Outro') NOT NULL,
	`details` text NOT NULL,
	`status` enum('Recebida','Em acolhimento','Encaminhada','Arquivada') NOT NULL DEFAULT 'Recebida',
	`internalNote` text,
	`managedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communityCareRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communityEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(280) NOT NULL,
	`slug` varchar(320) NOT NULL,
	`description` text,
	`institutionId` int,
	`territoryId` int,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`locationText` varchar(280),
	`locationVisibility` enum('Não divulgar','Aproximada','Pública') NOT NULL DEFAULT 'Não divulgar',
	`coverMediaId` int,
	`publicationId` int,
	`status` enum('Rascunho','Em revisão','Publicada','Arquivada') NOT NULL DEFAULT 'Rascunho',
	`consentStatus` enum('Pendente','Autorizado','Retirado') NOT NULL DEFAULT 'Pendente',
	`consentedAt` timestamp,
	`consentNote` text,
	`managedByUserId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communityEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `communityEvents_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(240) NOT NULL,
	`slug` varchar(260) NOT NULL,
	`institutionType` enum('Casa de tradição','Comunidade','Iniciativa','Coletivo') NOT NULL,
	`description` text,
	`territoryId` int,
	`locationText` varchar(280),
	`locationVisibility` enum('Não divulgar','Aproximada','Pública') NOT NULL DEFAULT 'Não divulgar',
	`contactText` varchar(320),
	`contactVisibility` enum('Não divulgar','Contato institucional') NOT NULL DEFAULT 'Não divulgar',
	`primaryMediaId` int,
	`status` enum('Rascunho','Em revisão','Publicada','Arquivada') NOT NULL DEFAULT 'Rascunho',
	`consentStatus` enum('Pendente','Autorizado','Retirado') NOT NULL DEFAULT 'Pendente',
	`consentedAt` timestamp,
	`consentNote` text,
	`managedByUserId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `institutions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `oralMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(280) NOT NULL,
	`slug` varchar(320) NOT NULL,
	`summary` text,
	`narrative` text,
	`speakerName` varchar(240),
	`speakerNameVisibility` enum('Nome','Pseudônimo','Não divulgar') NOT NULL DEFAULT 'Não divulgar',
	`institutionId` int,
	`territoryId` int,
	`videoMediaId` int,
	`audioUrl` text,
	`audioStorageKey` varchar(512),
	`accessLevel` enum('Público','Comunitário','Pesquisa mediante análise','Preservação restrita') NOT NULL DEFAULT 'Preservação restrita',
	`status` enum('Rascunho','Em revisão','Publicada','Arquivada') NOT NULL DEFAULT 'Rascunho',
	`consentStatus` enum('Pendente','Autorizado','Retirado') NOT NULL DEFAULT 'Pendente',
	`consentedAt` timestamp,
	`consentNote` text,
	`managedByUserId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oralMemories_id` PRIMARY KEY(`id`),
	CONSTRAINT `oralMemories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `care_request_manager_idx` ON `communityCareRequests` (`managedByUserId`,`status`);--> statement-breakpoint
CREATE INDEX `community_event_schedule_idx` ON `communityEvents` (`status`,`startsAt`);--> statement-breakpoint
CREATE INDEX `community_event_manager_idx` ON `communityEvents` (`managedByUserId`);--> statement-breakpoint
CREATE INDEX `community_event_institution_idx` ON `communityEvents` (`institutionId`);--> statement-breakpoint
CREATE INDEX `institution_status_idx` ON `institutions` (`status`,`consentStatus`);--> statement-breakpoint
CREATE INDEX `institution_manager_idx` ON `institutions` (`managedByUserId`);--> statement-breakpoint
CREATE INDEX `institution_territory_idx` ON `institutions` (`territoryId`);--> statement-breakpoint
CREATE INDEX `oral_memory_visibility_idx` ON `oralMemories` (`status`,`consentStatus`,`accessLevel`);--> statement-breakpoint
CREATE INDEX `oral_memory_manager_idx` ON `oralMemories` (`managedByUserId`);--> statement-breakpoint
CREATE INDEX `oral_memory_institution_idx` ON `oralMemories` (`institutionId`);