-- Ledger versionado de aceite dos Termos de Uso (não é assinatura gov.br).
-- Evidência de consentimento comunitário: atestação de staff ≠ assinatura do titular.
-- QA primeiro. NÃO aplicar em Aiven/Beta nesta fase.
-- Rollback: DROP TABLE termsOfUseAcceptances; DROP das colunas consentEvidenceKind/consentSubjectName.

CREATE TABLE `termsOfUseAcceptances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320) NOT NULL,
	`documentCode` varchar(80) NOT NULL DEFAULT 'OJU-TU',
	`documentVersion` varchar(80) NOT NULL,
	`context` varchar(80) NOT NULL,
	`status` enum('vigente','substituido') NOT NULL DEFAULT 'vigente',
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	`requestIp` varchar(64),
	`userAgent` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `termsOfUseAcceptances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `terms_of_use_user_version_idx` ON `termsOfUseAcceptances` (`userId`,`documentCode`,`documentVersion`);
--> statement-breakpoint
CREATE INDEX `terms_of_use_email_idx` ON `termsOfUseAcceptances` (`email`,`documentCode`);
--> statement-breakpoint
ALTER TABLE `institutions` ADD `consentEvidenceKind` enum('staff_attestation','subject_signature') NOT NULL DEFAULT 'staff_attestation';
--> statement-breakpoint
ALTER TABLE `institutions` ADD `consentSubjectName` varchar(240);
--> statement-breakpoint
ALTER TABLE `communityEvents` ADD `consentEvidenceKind` enum('staff_attestation','subject_signature') NOT NULL DEFAULT 'staff_attestation';
--> statement-breakpoint
ALTER TABLE `communityEvents` ADD `consentSubjectName` varchar(240);
--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `consentEvidenceKind` enum('staff_attestation','subject_signature') NOT NULL DEFAULT 'staff_attestation';
--> statement-breakpoint
ALTER TABLE `oralMemories` ADD `consentSubjectName` varchar(240);
