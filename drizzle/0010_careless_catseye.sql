ALTER TABLE `commercialRequests` MODIFY COLUMN `status` enum('Solicitação','Em análise','Conversa','Orçamento','Proposta','Aceite','Contratado','Produção','Entrega','Concluído','Arquivado') NOT NULL DEFAULT 'Solicitação';--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `whatsapp` varchar(40);--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `eventTime` varchar(80);--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `state` varchar(120);--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `needsMiniclip` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `needsDocumentary` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `needsFullCoverage` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `needsFormatGuidance` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `proposalSummary` text;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `proposalAmount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `proposalSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `acceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `productionStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `deliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `editorialAuthorized` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `commercialRequests` ADD `editorialAuthorizedAt` timestamp;