CREATE TABLE `commercialPayoutNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientUserId` int NOT NULL,
	`sourceType` enum('Anúncio','Visibilidade institucional') NOT NULL,
	`sourceId` int NOT NULL,
	`payoutStatus` enum('Pendente','Parcial','Pago') NOT NULL,
	`title` varchar(280) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercialPayoutNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commercialPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(240) NOT NULL,
	`scope` enum('Visibilidade institucional','Anúncio','Cobertura','Documentário','Fotografia','Outro') NOT NULL,
	`version` int NOT NULL,
	`status` enum('Rascunho','Ativa','Substituída','Arquivada') NOT NULL DEFAULT 'Rascunho',
	`effectiveAt` timestamp NOT NULL,
	`ojuPercent` decimal(5,2) NOT NULL,
	`developmentPercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`captorPercent` decimal(5,2) NOT NULL,
	`executorPercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`activatedByUserId` int,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercialPolicies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `advertisements` ADD `commercialPolicyId` int;--> statement-breakpoint
ALTER TABLE `advertisements` ADD `commercialPolicyVersion` int;--> statement-breakpoint
ALTER TABLE `institutionVisibilitySubscriptions` ADD `captorPayoutStatus` enum('Pendente','Parcial','Pago') DEFAULT 'Pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `institutionVisibilitySubscriptions` ADD `commercialPolicyId` int;--> statement-breakpoint
ALTER TABLE `institutionVisibilitySubscriptions` ADD `commercialPolicyVersion` int;--> statement-breakpoint
CREATE INDEX `commercial_payout_notice_recipient_idx` ON `commercialPayoutNotifications` (`recipientUserId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `commercial_payout_notice_source_idx` ON `commercialPayoutNotifications` (`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `commercial_policy_scope_status_idx` ON `commercialPolicies` (`scope`,`status`,`effectiveAt`);--> statement-breakpoint
CREATE INDEX `commercial_policy_version_idx` ON `commercialPolicies` (`scope`,`version`);