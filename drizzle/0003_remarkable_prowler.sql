CREATE TABLE `advertisements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`advertiserName` varchar(240) NOT NULL,
	`title` varchar(280) NOT NULL,
	`description` text,
	`contact` varchar(280) NOT NULL,
	`services` text,
	`format` enum('Cartão de serviço','Banner','Destaque de parceiro') NOT NULL DEFAULT 'Cartão de serviço',
	`mediaUrl` text,
	`mediaType` enum('foto','vídeo'),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`renewalAt` timestamp,
	`status` enum('Rascunho','Ativo','Pausado','Encerrado') NOT NULL DEFAULT 'Rascunho',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advertisements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `advertisement_status_period_idx` ON `advertisements` (`status`,`startsAt`,`endsAt`);