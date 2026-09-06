-- Presença pública opt-in: @ autorizado de parceiro e fotógrafo, fora da Home nacional.
SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'partners' AND COLUMN_NAME = 'instagramHandle') = 0,
    'ALTER TABLE `partners` ADD `instagramHandle` varchar(30)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'networkExecutors' AND COLUMN_NAME = 'instagramHandle') = 0,
    'ALTER TABLE `networkExecutors` ADD `instagramHandle` varchar(30)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
