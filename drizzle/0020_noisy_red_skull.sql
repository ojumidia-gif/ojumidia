CREATE TABLE `collaboratorAccessGrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`displayName` varchar(240),
	`role` enum('criador','editor','aprovador','administrador') NOT NULL,
	`status` enum('Autorizado','Revogado') NOT NULL DEFAULT 'Autorizado',
	`note` text,
	`userId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaboratorAccessGrants_id` PRIMARY KEY(`id`),
	CONSTRAINT `collaboratorAccessGrants_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `adminAccess` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `collaborator_grant_status_idx` ON `collaboratorAccessGrants` (`status`,`role`);