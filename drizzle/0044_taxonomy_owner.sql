-- Territórios e taxonomias: quem cadastrou pode editar; catálogo antigo fica com o Super Admin.
ALTER TABLE `taxonomies` ADD `createdBy` int;
