-- Evolução da base existente: fotógrafo estável, agenda editorial e índices de lista.
SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'publications' AND COLUMN_NAME = 'scheduledAt') = 0,
    'ALTER TABLE `publications` ADD `scheduledAt` timestamp',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'publications' AND COLUMN_NAME = 'highlightExpiresAt') = 0,
    'ALTER TABLE `publications` ADD `highlightExpiresAt` timestamp',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'publications' AND INDEX_NAME = 'publication_home_idx') = 0,
    'ALTER TABLE `publications` ADD INDEX `publication_home_idx` (`status`,`isPublic`,`homePlacement`,`deletedAt`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'publications' AND INDEX_NAME = 'publication_scheduled_idx') = 0,
    'ALTER TABLE `publications` ADD INDEX `publication_scheduled_idx` (`status`,`scheduledAt`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mediaAssets' AND COLUMN_NAME = 'photographerId') = 0,
    'ALTER TABLE `mediaAssets` ADD `photographerId` int',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mediaAssets' AND INDEX_NAME = 'media_photographer_idx') = 0,
    'ALTER TABLE `mediaAssets` ADD INDEX `media_photographer_idx` (`photographerId`,`state`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'networkExecutors' AND COLUMN_NAME = 'publicSlug') = 0,
    'ALTER TABLE `networkExecutors` ADD `publicSlug` varchar(200)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'networkExecutors' AND INDEX_NAME = 'networkExecutors_publicSlug_unique') = 0,
    'ALTER TABLE `networkExecutors` ADD UNIQUE INDEX `networkExecutors_publicSlug_unique` (`publicSlug`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'networkExecutors' AND COLUMN_NAME = 'publicVisible') = 0,
    'ALTER TABLE `networkExecutors` ADD `publicVisible` boolean NOT NULL DEFAULT false',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
