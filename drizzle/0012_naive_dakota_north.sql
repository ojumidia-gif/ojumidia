CREATE TABLE `commercialActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`actorId` int,
	`activityType` enum('Solicitação','Carteira','Status','Proposta','Contrato','Entrega privada','Autorização editorial') NOT NULL,
	`detail` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercialActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `commercial_activity_request_idx` ON `commercialActivities` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `commercial_activity_actor_idx` ON `commercialActivities` (`actorId`);