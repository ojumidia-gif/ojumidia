ALTER TABLE `mediaAssets` MODIFY COLUMN `uploadStatus` enum('Criado','Enviando','Enviado','Processando','Pronto','Aprovado','Publicado','Falhou','Cancelado','Rejeitado') NOT NULL DEFAULT 'Pronto';--> statement-breakpoint
ALTER TABLE `networkExecutors` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `networkExecutors` ADD `territoryId` int;--> statement-breakpoint
CREATE INDEX `network_executor_partner_scope_idx` ON `networkExecutors` (`partnerId`,`territoryId`,`status`);