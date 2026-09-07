CREATE TABLE IF NOT EXISTS `coverageOfferDeclines` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requestId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coverage_offer_decline_unique` (`requestId`, `userId`),
  INDEX `coverage_offer_decline_user_idx` (`userId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
