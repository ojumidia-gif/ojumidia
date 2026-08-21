CREATE TABLE `institutionVisibilitySubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`plan` enum('Piloto solidário','Visibilidade institucional','Perfil parceiro') NOT NULL,
	`status` enum('Rascunho','Aguardando confirmação','Ativa','Expirada','Cancelada') NOT NULL DEFAULT 'Rascunho',
	`startsAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`paymentReference` varchar(280),
	`grossAmount` decimal(12,2) NOT NULL,
	`netAmount` decimal(12,2) NOT NULL,
	`ojuAmount` decimal(12,2) NOT NULL,
	`developmentAmount` decimal(12,2) NOT NULL,
	`captorAmount` decimal(12,2) NOT NULL,
	`reserveAmount` decimal(12,2) NOT NULL,
	`capturedByUserId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutionVisibilitySubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `institutions` MODIFY COLUMN `institutionType` enum('Casa de tradição','Ilê/Terreiro','Comunidade','Coletivo','Iniciativa','Centro cultural','Liderança religiosa','Outro') NOT NULL;--> statement-breakpoint
ALTER TABLE `institutions` ADD `profileLabel` varchar(180);--> statement-breakpoint
ALTER TABLE `institutions` ADD `referenceName` varchar(240);--> statement-breakpoint
ALTER TABLE `institutions` ADD `referenceRole` varchar(180);--> statement-breakpoint
CREATE INDEX `institution_visibility_institution_idx` ON `institutionVisibilitySubscriptions` (`institutionId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `institution_visibility_status_idx` ON `institutionVisibilitySubscriptions` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `institution_visibility_captor_idx` ON `institutionVisibilitySubscriptions` (`capturedByUserId`);