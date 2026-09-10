-- Labels opcionais dos links externos editoriais (produção completa).
-- Não altera limites de mídia (5 JPG + 1 miniclip). QA primeiro. NÃO aplicar em Aiven/Beta nesta fase.
-- Rollback: ALTER TABLE publications DROP COLUMN externalAlbumLabel; ALTER TABLE publications DROP COLUMN externalVideoLabel;

ALTER TABLE `publications` ADD `externalAlbumLabel` varchar(80);--> statement-breakpoint
ALTER TABLE `publications` ADD `externalVideoLabel` varchar(80);
