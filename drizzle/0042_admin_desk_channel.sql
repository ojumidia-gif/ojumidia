-- Canal Ojú: mensagens de admin para o Super Admin (dúvida, erro, estabilidade).
CREATE TABLE IF NOT EXISTS `adminDeskMessages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `createdBy` int NOT NULL,
  `category` enum('Dúvida','Erro','Estabilidade','Outro') NOT NULL,
  `subject` varchar(180) NOT NULL,
  `body` text NOT NULL,
  `pagePath` varchar(320),
  `status` enum('Aberta','Em atendimento','Resolvida') NOT NULL DEFAULT 'Aberta',
  `reply` text,
  `repliedBy` int,
  `repliedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_desk_status_idx` (`status`,`createdAt`),
  KEY `admin_desk_author_idx` (`createdBy`,`createdAt`)
);
