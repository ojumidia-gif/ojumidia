-- Pedidos públicos para ser Parceiro / Admin Ojú. Só o Super Admin lê e decide.
CREATE TABLE `adminJoinRequests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(180) NOT NULL,
  `email` varchar(320) NOT NULL,
  `whatsapp` varchar(40) NOT NULL,
  `territoryText` varchar(240) NOT NULL,
  `practice` enum('Fotografia','Vídeo','Produção territorial','Casa ou coletivo','Outro') NOT NULL,
  `message` text NOT NULL,
  `status` enum('Recebida','Em conversa','Aprovada','Recusada','Arquivada') NOT NULL DEFAULT 'Recebida',
  `reviewNote` text,
  `reviewedBy` int,
  `reviewedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `adminJoinRequests_id` PRIMARY KEY(`id`)
);
