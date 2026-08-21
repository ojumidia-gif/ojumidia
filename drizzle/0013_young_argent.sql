CREATE TABLE `revenueLeadActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`actorId` int,
	`detail` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenueLeadActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenueLeads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadType` enum('Apoio institucional','Licenciamento de mídia','Oficina') NOT NULL,
	`contactName` varchar(200) NOT NULL,
	`organization` varchar(240),
	`whatsapp` varchar(40) NOT NULL,
	`email` varchar(320),
	`purpose` varchar(280) NOT NULL,
	`details` text,
	`publicationId` int,
	`taxonomyId` int,
	`mediaId` int,
	`licenseScope` text,
	`proposalSummary` text,
	`proposalAmount` decimal(12,2),
	`status` enum('Solicitação','Em análise','Conversa','Proposta','Acordo','Concluído','Arquivado') NOT NULL DEFAULT 'Solicitação',
	`managedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenueLeads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `revenue_lead_activity_idx` ON `revenueLeadActivities` (`leadId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `revenue_lead_manager_idx` ON `revenueLeads` (`managedByUserId`,`status`);--> statement-breakpoint
CREATE INDEX `revenue_lead_type_idx` ON `revenueLeads` (`leadType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `revenue_lead_media_idx` ON `revenueLeads` (`mediaId`);