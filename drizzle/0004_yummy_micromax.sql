ALTER TABLE `advertisements` ADD `capturedByUserId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `advertisements` ADD `contractedAmount` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `advertisements` ADD `ojuSharePercent` decimal(5,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `advertisements` ADD `captorSharePercent` decimal(5,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `advertisements` ADD `payoutStatus` enum('Pendente','Parcial','Pago') DEFAULT 'Pendente' NOT NULL;