ALTER TABLE `commercialRequests` ADD `managedByUserId` int;--> statement-breakpoint
ALTER TABLE `contracts` ADD `managedByUserId` int;--> statement-breakpoint
CREATE INDEX `commercial_request_manager_idx` ON `commercialRequests` (`managedByUserId`);--> statement-breakpoint
CREATE INDEX `contract_manager_idx` ON `contracts` (`managedByUserId`);