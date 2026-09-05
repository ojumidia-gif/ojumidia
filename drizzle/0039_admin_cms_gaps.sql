-- Idempotent: não duplica colunas se a 0039 já tiver sido aplicada parcialmente.
SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'collaboratorAccessGrants' AND COLUMN_NAME = 'partnerId') = 0,
    'ALTER TABLE `collaboratorAccessGrants` ADD `partnerId` int',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'collaboratorAccessGrants' AND COLUMN_NAME = 'territoryId') = 0,
    'ALTER TABLE `collaboratorAccessGrants` ADD `territoryId` int',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'partnerMembers' AND COLUMN_NAME = 'territoryId') = 0,
    'ALTER TABLE `partnerMembers` ADD `territoryId` int',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
