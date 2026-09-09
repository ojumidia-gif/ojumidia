-- Alinha adminJoinRequests.practice ao schema.ts (varchar 280).
-- 0046 criou enum legado. 0049 documentou varchar mas não converteu a coluna.
-- Sem isto, o canal público Ser parceiro grava rótulos atuais (ex.: Fotógrafo)
-- e o MySQL recusa (Data truncated for column practice).
-- Rollback: só se não houver valores fora do enum 0046.
-- NÃO aplicar em Aiven/Beta nesta fase.

ALTER TABLE `adminJoinRequests`
  MODIFY COLUMN `practice` varchar(280) NOT NULL;
