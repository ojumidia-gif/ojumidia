CREATE TABLE `commercialEditorialAuthorizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`status` enum('Não autorizada','Pendente','Autorização parcial','Autorizada','Revogada') NOT NULL DEFAULT 'Pendente',
	`allowPhotos` boolean NOT NULL DEFAULT false,
	`allowVideos` boolean NOT NULL DEFAULT false,
	`allowOrganizationName` boolean NOT NULL DEFAULT false,
	`allowLocation` boolean NOT NULL DEFAULT false,
	`allowStory` boolean NOT NULL DEFAULT false,
	`allowPeopleIdentification` boolean NOT NULL DEFAULT false,
	`allowPortal` boolean NOT NULL DEFAULT false,
	`allowInstitutional` boolean NOT NULL DEFAULT false,
	`allowSocial` boolean NOT NULL DEFAULT false,
	`authorizedByName` varchar(240),
	`authorizedByRole` varchar(240),
	`authorizedAt` timestamp,
	`expiresAt` timestamp,
	`culturalRestrictions` text,
	`notes` text,
	`recordedByUserId` int NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercialEditorialAuthorizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercialEditorialAuthorizations_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE INDEX `commercial_editorial_authorization_status_idx` ON `commercialEditorialAuthorizations` (`status`,`expiresAt`);