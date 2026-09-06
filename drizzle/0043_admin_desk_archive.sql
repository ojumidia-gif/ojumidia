-- Canal Ojú: Super Admin arquiva tickets sem apagar a conversa.
ALTER TABLE `adminDeskMessages` MODIFY COLUMN `status` enum('Aberta','Em atendimento','Resolvida','Arquivada') NOT NULL DEFAULT 'Aberta';
