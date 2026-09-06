-- Equipes de crédito: dono, arquivo e exclusão sem perder o histórico das matérias.
ALTER TABLE `teams` ADD `createdBy` int;
ALTER TABLE `teams` ADD `archivedAt` timestamp;
ALTER TABLE `teams` ADD `archivedBy` int;
