import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Persistent login identifier. Google OAuth stores `google:<sub>`. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["criador", "editor", "aprovador", "administrador", "administrador principal"]).default("criador").notNull(),
  adminAccess: boolean("adminAccess").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const collaboratorRoles = ["criador", "editor", "aprovador", "administrador"] as const;
export const collaboratorGrantStatuses = ["Autorizado", "Revogado"] as const;
export const partnerStatuses = ["Rascunho", "Em revisão", "Ativo", "Suspenso", "Desativado"] as const;
export const partnerMemberRoles = ["Gestor territorial", "Operador territorial", "Curador territorial"] as const;
export const partnerMemberStatuses = ["Convidado", "Ativo", "Suspenso", "Revogado"] as const;
export const partnerTerritoryStatuses = ["Ativa", "Encerrada"] as const;
export const uploadStatuses = ["Criado", "Enviando", "Enviado", "Processando", "Pronto", "Aprovado", "Publicado", "Falhou", "Cancelado", "Rejeitado"] as const;

export const partners = mysqlTable("partners", {
  id: int("id").autoincrement().primaryKey(),
  displayName: varchar("displayName", { length: 240 }).notNull(),
  slug: varchar("slug", { length: 260 }).notNull().unique(),
  description: text("description"),
  contactText: varchar("contactText", { length: 320 }),
  logoMediaId: int("logoMediaId"),
  profileMediaId: int("profileMediaId"),
  publicVisibility: boolean("publicVisibility").default(false).notNull(),
  instagramHandle: varchar("instagramHandle", { length: 30 }),
  status: mysqlEnum("status", partnerStatuses).default("Rascunho").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  version: int("version").default(1).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("partner_status_idx").on(table.status, table.publicVisibility),
]);

export const partnerTerritories = mysqlTable("partnerTerritories", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  territoryId: int("territoryId").notNull(),
  status: mysqlEnum("status", partnerTerritoryStatuses).default("Ativa").notNull(),
  activeKey: varchar("activeKey", { length: 80 }).unique(),
  startsAt: timestamp("startsAt").defaultNow().notNull(),
  endsAt: timestamp("endsAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("partner_territory_active_idx").on(table.partnerId, table.status, table.territoryId),
  index("partner_territory_territory_idx").on(table.territoryId),
]);

export const partnerMembers = mysqlTable("partnerMembers", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  userId: int("userId").notNull(),
  territoryId: int("territoryId"),
  operationalRole: mysqlEnum("operationalRole", partnerMemberRoles).default("Operador territorial").notNull(),
  status: mysqlEnum("status", partnerMemberStatuses).default("Convidado").notNull(),
  createdBy: int("createdBy").notNull(),
  activatedAt: timestamp("activatedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("partner_member_unique_idx").on(table.partnerId, table.userId),
  index("partner_member_user_status_idx").on(table.userId, table.status),
]);

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId"),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  resourceType: varchar("resourceType", { length: 120 }).notNull(),
  resourceId: int("resourceId"),
  action: varchar("action", { length: 160 }).notNull(),
  previousState: text("previousState"),
  nextState: text("nextState"),
  detail: text("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("audit_actor_created_idx").on(table.actorId, table.createdAt),
  index("audit_partner_created_idx").on(table.partnerId, table.createdAt),
  index("audit_resource_idx").on(table.resourceType, table.resourceId, table.createdAt),
]);

export const collaboratorAccessGrants = mysqlTable("collaboratorAccessGrants", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: varchar("displayName", { length: 240 }),
  role: mysqlEnum("role", collaboratorRoles).notNull(),
  status: mysqlEnum("status", collaboratorGrantStatuses).default("Autorizado").notNull(),
  note: text("note"),
  userId: int("userId"),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("collaborator_grant_status_idx").on(table.status, table.role),
]);

export const administratorResponsibilityTermStatuses = ["Gerado", "Aguardando assinatura gov.br", "Assinado via gov.br", "Arquivado"] as const;

export const administratorResponsibilityTerms = mysqlTable("administratorResponsibilityTerms", {
  id: int("id").autoincrement().primaryKey(),
  grantId: int("grantId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  roleSnapshot: mysqlEnum("roleSnapshot", ["administrador"]).default("administrador").notNull(),
  status: mysqlEnum("status", administratorResponsibilityTermStatuses).default("Gerado").notNull(),
  signatureProvider: mysqlEnum("signatureProvider", ["gov.br"]).default("gov.br").notNull(),
  templateVersion: varchar("templateVersion", { length: 80 }).default("OJU-AR-1.0").notNull(),
  exportedAt: timestamp("exportedAt").defaultNow().notNull(),
  signedDocumentUrl: text("signedDocumentUrl"),
  signedStorageKey: varchar("signedStorageKey", { length: 512 }),
  signedFilename: varchar("signedFilename", { length: 280 }),
  signedAt: timestamp("signedAt"),
  uploadedByUserId: int("uploadedByUserId"),
  notes: text("notes"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("administrator_responsibility_term_grant_idx").on(table.grantId, table.status),
]);

export const editorialStatuses = ["Rascunho", "Em revisão", "Aprovada", "Publicada", "Arquivada"] as const;
export const taxonomyDimensions = [
  "Tipo de conteúdo",
  "Tema",
  "Localização",
  "Território",
  "Pessoa/organização",
  "Evento",
  "Data",
] as const;

export const institutionTypes = [
  "Casa de tradição",
  "Ilê/Terreiro",
  "Comunidade",
  "Coletivo",
  "Iniciativa",
  "Centro cultural",
  "Liderança religiosa",
  "Outro",
] as const;
export const institutionVisibilityPlans = ["Piloto solidário", "Visibilidade institucional", "Perfil parceiro"] as const;
export const institutionVisibilityStatuses = ["Rascunho", "Aguardando confirmação", "Ativa", "Expirada", "Cancelada"] as const;
export const commercialPolicyScopes = ["Visibilidade institucional", "Anúncio", "Cobertura", "Documentário", "Fotografia", "Outro"] as const;
export const commercialPolicyStatuses = ["Rascunho", "Ativa", "Substituída", "Arquivada"] as const;
export const payoutStatuses = ["Pendente", "Parcial", "Pago"] as const;
export const executorSpecialties = ["Fotografia", "Vídeo", "Documentário", "Edição", "Produção", "Outro"] as const;
export const executorStatuses = ["Ativo", "Inativo"] as const;
export const commercialClosingStatuses = ["Preparado", "Aguardando definição", "Arquivado"] as const;
export const commercialMiniclipStatuses = ["Ativo", "Substituído", "Arquivado"] as const;

export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const taxonomies = mysqlTable("taxonomies", {
  id: int("id").autoincrement().primaryKey(),
  dimension: mysqlEnum("dimension", taxonomyDimensions).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  parentId: int("parentId"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  mapVisibility: mysqlEnum("mapVisibility", ["Não divulgar", "Aproximada", "Pública"]).default("Não divulgar").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("taxonomy_dimension_idx").on(table.dimension)]);

export const publications = mysqlTable("publications", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 280 }).notNull(),
  contentKind: mysqlEnum("contentKind", ["História", "Cobertura", "Documentário", "Projeto", "Fotografia documental"]).default("História").notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  subtitle: varchar("subtitle", { length: 420 }),
  summary: text("summary"),
  body: text("body"),
  status: mysqlEnum("status", editorialStatuses).default("Rascunho").notNull(),
  teamId: int("teamId"),
  createdBy: int("createdBy").notNull(),
  editedBy: int("editedBy"),
  approvedBy: int("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
  isPublic: boolean("isPublic").default(true).notNull(),
  unpublishedAt: timestamp("unpublishedAt"),
  unpublishedBy: int("unpublishedBy"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: int("deletedBy"),
  deletionNote: text("deletionNote"),
  coverageStart: timestamp("coverageStart"),
  coverageEnd: timestamp("coverageEnd"),
  relevance: int("relevance").default(0).notNull(),
  manualFeatured: boolean("manualFeatured").default(false).notNull(),
  sponsored: boolean("sponsored").default(false).notNull(),
  sponsorDisclosure: varchar("sponsorDisclosure", { length: 280 }),
  commercialRequestId: int("commercialRequestId"),
  partnerId: int("partnerId"),
  photoLimit: int("photoLimit"),
  videoLimit: int("videoLimit"),
  externalAlbumUrl: text("externalAlbumUrl"),
  externalVideoUrl: text("externalVideoUrl"),
  homePlacement: mysqlEnum("homePlacement", ["Nenhum", "Destaque principal", "Destaque secundário", "Recomendado"]).default("Nenhum").notNull(),
  homeOrder: int("homeOrder").default(0).notNull(),
  scheduledAt: timestamp("scheduledAt"),
  highlightExpiresAt: timestamp("highlightExpiresAt"),
  version: int("version").default(1).notNull(),
}, table => [
  index("publication_status_idx").on(table.status),
  index("publication_team_idx").on(table.teamId),
  index("publication_feature_idx").on(table.manualFeatured, table.relevance),
  index("publication_deleted_idx").on(table.deletedAt),
  index("publication_partner_idx").on(table.partnerId, table.status),
  index("publication_home_idx").on(table.status, table.isPublic, table.homePlacement, table.deletedAt),
  index("publication_scheduled_idx").on(table.status, table.scheduledAt),
]);

export const publicationTaxonomies = mysqlTable("publicationTaxonomies", {
  id: int("id").autoincrement().primaryKey(),
  publicationId: int("publicationId").notNull(),
  taxonomyId: int("taxonomyId").notNull(),
}, table => [
  index("publication_taxonomy_publication_idx").on(table.publicationId),
  index("publication_taxonomy_taxonomy_idx").on(table.taxonomyId),
]);

export const taxonomyMedia = mysqlTable("taxonomyMedia", {
  id: int("id").autoincrement().primaryKey(),
  taxonomyId: int("taxonomyId").notNull(),
  mediaId: int("mediaId").notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
}, table => [
  index("taxonomy_media_taxonomy_idx").on(table.taxonomyId),
  index("taxonomy_media_media_idx").on(table.mediaId),
]);

export const editorialActivities = mysqlTable("editorialActivities", {
  id: int("id").autoincrement().primaryKey(),
  publicationId: int("publicationId").notNull(),
  actorId: int("actorId").notNull(),
  fromStatus: mysqlEnum("fromStatus", editorialStatuses),
  toStatus: mysqlEnum("toStatus", editorialStatuses),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("activity_publication_idx").on(table.publicationId)]);

export const mediaAssets = mysqlTable("mediaAssets", {
  id: int("id").autoincrement().primaryKey(),
  mediaType: mysqlEnum("mediaType", ["foto", "vídeo"]).notNull(),
  assetUrl: text("assetUrl").notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  filename: varchar("filename", { length: 280 }),
  origin: varchar("origin", { length: 280 }).notNull(),
  credit: varchar("credit", { length: 280 }).notNull(),
  authorization: mysqlEnum("authorization", ["Cessão", "Licença", "Domínio público", "Autoral própria", "Pendente"]).notNull(),
  purpose: varchar("purpose", { length: 280 }).notNull(),
  publicationAllowed: boolean("publicationAllowed").default(false).notNull(),
  projectCoverage: varchar("projectCoverage", { length: 280 }),
  terms: text("terms"),
  usageExpiresAt: timestamp("usageExpiresAt"),
  state: mysqlEnum("state", ["Ativo", "Arquivado"]).default("Ativo").notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: int("deletedBy"),
  deletionNote: text("deletionNote"),
  fileSize: int("fileSize"),
  durationSeconds: int("durationSeconds"),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  photographerId: int("photographerId"),
  uploadStatus: mysqlEnum("uploadStatus", uploadStatuses).default("Pronto").notNull(),
  uploadId: varchar("uploadId", { length: 96 }).unique(),
  checksum: varchar("checksum", { length: 128 }),
  version: int("version").default(1).notNull(),
  backgroundEligible: boolean("backgroundEligible").default(false).notNull(),
  backgroundPriority: int("backgroundPriority").default(0).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("media_partner_status_idx").on(table.partnerId, table.uploadStatus, table.state),
  index("media_territory_status_idx").on(table.territoryId, table.uploadStatus, table.state),
  index("media_photographer_idx").on(table.photographerId, table.state),
]);

export const uploadSessions = mysqlTable("uploadSessions", {
  id: varchar("id", { length: 96 }).primaryKey(),
  userId: int("userId").notNull(),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  mediaType: mysqlEnum("mediaType", ["foto", "vídeo", "áudio", "documento"]).notNull(),
  status: mysqlEnum("status", uploadStatuses).default("Criado").notNull(),
  filename: varchar("filename", { length: 280 }).notNull(),
  contentType: varchar("contentType", { length: 180 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  assetUrl: text("assetUrl"),
  fileSize: int("fileSize"),
  checksum: varchar("checksum", { length: 128 }),
  durationSeconds: int("durationSeconds"),
  errorMessage: text("errorMessage"),
  attemptCount: int("attemptCount").default(0).notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: int("rejectedBy"),
  rejectedAt: timestamp("rejectedAt"),
  cancelledAt: timestamp("cancelledAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [
  index("upload_session_user_status_idx").on(table.userId, table.status, table.createdAt),
  index("upload_session_partner_territory_idx").on(table.partnerId, table.territoryId, table.status),
]);

export const publicationMedia = mysqlTable("publicationMedia", {
  id: int("id").autoincrement().primaryKey(),
  publicationId: int("publicationId").notNull(),
  mediaId: int("mediaId").notNull(),
  caption: text("caption"),
  biography: text("biography"),
  location: varchar("location", { length: 280 }),
  capturedAt: timestamp("capturedAt"),
  displayOrder: int("displayOrder").default(0).notNull(),
}, table => [index("publication_media_publication_idx").on(table.publicationId), uniqueIndex("publication_media_unique_idx").on(table.publicationId, table.mediaId)]);

export const publicationRelations = mysqlTable("publicationRelations", {
  id: int("id").autoincrement().primaryKey(),
  sourcePublicationId: int("sourcePublicationId").notNull(),
  relatedPublicationId: int("relatedPublicationId").notNull(),
  relationType: mysqlEnum("relationType", ["Relacionado", "Parte de", "Continua em", "Recomendado"]).default("Relacionado").notNull(),
}, table => [
  index("publication_relation_source_idx").on(table.sourcePublicationId),
  index("publication_relation_target_idx").on(table.relatedPublicationId),
]);

export const commercialRequests = mysqlTable("commercialRequests", {
  id: int("id").autoincrement().primaryKey(),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  contact: varchar("contact", { length: 280 }).notNull(),
  email: varchar("email", { length: 320 }),
  whatsapp: varchar("whatsapp", { length: 40 }),
  eventType: varchar("eventType", { length: 180 }).notNull(),
  eventDate: timestamp("eventDate"),
  eventTime: varchar("eventTime", { length: 80 }),
  location: varchar("location", { length: 280 }),
  state: varchar("state", { length: 120 }),
  duration: varchar("duration", { length: 120 }),
  needsPhotography: boolean("needsPhotography").default(false).notNull(),
  needsVideo: boolean("needsVideo").default(false).notNull(),
  needsMiniclip: boolean("needsMiniclip").default(false).notNull(),
  needsDocumentary: boolean("needsDocumentary").default(false).notNull(),
  needsFullCoverage: boolean("needsFullCoverage").default(false).notNull(),
  needsFormatGuidance: boolean("needsFormatGuidance").default(false).notNull(),
  objective: text("objective"),
  notes: text("notes"),
  proposalSummary: text("proposalSummary"),
  proposalAmount: decimal("proposalAmount", { precision: 12, scale: 2 }),
  proposalSentAt: timestamp("proposalSentAt"),
  acceptedAt: timestamp("acceptedAt"),
  productionStartedAt: timestamp("productionStartedAt"),
  deliveredAt: timestamp("deliveredAt"),
  deliveryDetails: text("deliveryDetails"),
  deliveryUrl: text("deliveryUrl"),
  editorialAuthorized: boolean("editorialAuthorized").default(false).notNull(),
  editorialAuthorizedAt: timestamp("editorialAuthorizedAt"),
  managedByUserId: int("managedByUserId"),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  status: mysqlEnum("status", ["Solicitação", "Em análise", "Conversa", "Orçamento", "Proposta", "Aceite", "Contratado", "Produção", "Entrega", "Concluído", "Arquivado"]).default("Solicitação").notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("commercial_request_manager_idx").on(table.managedByUserId), index("commercial_request_partner_idx").on(table.partnerId, table.status), index("commercial_request_territory_idx").on(table.territoryId, table.status)]);

export const commercialActivityTypes = [
  "Solicitação",
  "Carteira",
  "Status",
  "Proposta",
  "Contrato",
  "Entrega privada",
  "Autorização editorial",
] as const;

export const commercialEditorialAuthorizationStatuses = ["Não autorizada", "Pendente", "Autorização parcial", "Autorizada", "Revogada"] as const;

export const commercialEditorialAuthorizations = mysqlTable("commercialEditorialAuthorizations", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().unique(),
  status: mysqlEnum("status", commercialEditorialAuthorizationStatuses).default("Pendente").notNull(),
  allowPhotos: boolean("allowPhotos").default(false).notNull(),
  allowVideos: boolean("allowVideos").default(false).notNull(),
  allowOrganizationName: boolean("allowOrganizationName").default(false).notNull(),
  allowLocation: boolean("allowLocation").default(false).notNull(),
  allowStory: boolean("allowStory").default(false).notNull(),
  allowPeopleIdentification: boolean("allowPeopleIdentification").default(false).notNull(),
  allowPortal: boolean("allowPortal").default(false).notNull(),
  allowInstitutional: boolean("allowInstitutional").default(false).notNull(),
  allowSocial: boolean("allowSocial").default(false).notNull(),
  authorizedByName: varchar("authorizedByName", { length: 240 }),
  authorizedByRole: varchar("authorizedByRole", { length: 240 }),
  authorizedAt: timestamp("authorizedAt"),
  expiresAt: timestamp("expiresAt"),
  culturalRestrictions: text("culturalRestrictions"),
  notes: text("notes"),
  recordedByUserId: int("recordedByUserId").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("commercial_editorial_authorization_status_idx").on(table.status, table.expiresAt),
]);

export const authorizationTermStatuses = ["Gerado", "Aguardando assinatura gov.br", "Assinado via gov.br", "Arquivado"] as const;

export const authorizationTerms = mysqlTable("authorizationTerms", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  authorizationId: int("authorizationId"),
  status: mysqlEnum("status", authorizationTermStatuses).default("Gerado").notNull(),
  signatureProvider: mysqlEnum("signatureProvider", ["gov.br"]).default("gov.br").notNull(),
  templateVersion: varchar("templateVersion", { length: 80 }).default("OJU-AE-1.0").notNull(),
  exportedAt: timestamp("exportedAt").defaultNow().notNull(),
  signedDocumentUrl: text("signedDocumentUrl"),
  signedStorageKey: varchar("signedStorageKey", { length: 512 }),
  signedFilename: varchar("signedFilename", { length: 280 }),
  signedAt: timestamp("signedAt"),
  uploadedByUserId: int("uploadedByUserId"),
  notes: text("notes"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("authorization_term_request_idx").on(table.requestId, table.status),
]);

export const commercialActivities = mysqlTable("commercialActivities", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  actorId: int("actorId"),
  activityType: mysqlEnum("activityType", commercialActivityTypes).notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("commercial_activity_request_idx").on(table.requestId, table.createdAt),
  index("commercial_activity_actor_idx").on(table.actorId),
]);

export const networkExecutors = mysqlTable("networkExecutors", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  displayName: varchar("displayName", { length: 240 }).notNull(),
  email: varchar("email", { length: 320 }),
  whatsapp: varchar("whatsapp", { length: 40 }),
  specialty: mysqlEnum("specialty", executorSpecialties).notNull(),
  profileNote: text("profileNote"),
  publicSlug: varchar("publicSlug", { length: 200 }).unique(),
  publicVisible: boolean("publicVisible").default(false).notNull(),
  instagramHandle: varchar("instagramHandle", { length: 30 }),
  linkedUserId: int("linkedUserId"),
  status: mysqlEnum("status", executorStatuses).default("Ativo").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("network_executor_status_idx").on(table.status, table.specialty), index("network_executor_linked_user_idx").on(table.linkedUserId), index("network_executor_partner_scope_idx").on(table.partnerId, table.territoryId, table.status)]);

export const commercialClosings = mysqlTable("commercialClosings", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().unique(),
  executorId: int("executorId"),
  responsibleAdministratorId: int("responsibleAdministratorId"),
  grossAmount: decimal("grossAmount", { precision: 12, scale: 2 }),
  commercialPolicyId: int("commercialPolicyId"),
  commercialPolicyVersion: int("commercialPolicyVersion"),
  executorPercent: decimal("executorPercent", { precision: 5, scale: 2 }),
  ojuPercent: decimal("ojuPercent", { precision: 5, scale: 2 }),
  developmentPercent: decimal("developmentPercent", { precision: 5, scale: 2 }),
  captorPercent: decimal("captorPercent", { precision: 5, scale: 2 }),
  financialStatus: mysqlEnum("financialStatus", commercialClosingStatuses).default("Aguardando definição").notNull(),
  notes: text("notes"),
  preparedByUserId: int("preparedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("commercial_closing_executor_idx").on(table.executorId), index("commercial_closing_responsible_idx").on(table.responsibleAdministratorId)]);

export const commercialMiniclips = mysqlTable("commercialMiniclips", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  contractorNameSnapshot: varchar("contractorNameSnapshot", { length: 240 }),
  activeRequestKey: varchar("activeRequestKey", { length: 64 }).unique(),
  mediaId: int("mediaId").notNull(),
  status: mysqlEnum("status", commercialMiniclipStatuses).default("Ativo").notNull(),
  authorizedForHome: boolean("authorizedForHome").default(false).notNull(),
  homeFeatured: boolean("homeFeatured").default(false).notNull(),
  replacedByMiniclipId: int("replacedByMiniclipId"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("commercial_miniclip_request_idx").on(table.requestId, table.status), index("commercial_miniclip_home_idx").on(table.homeFeatured, table.status, table.authorizedForHome)]);

export const highlightSuggestionStatuses = ["Sugerida", "Aprovada", "Recusada", "Retirada"] as const;

export const highlightSuggestions = mysqlTable("highlightSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  publicationId: int("publicationId").notNull(),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  note: text("note"),
  status: mysqlEnum("status", highlightSuggestionStatuses).default("Sugerida").notNull(),
  suggestedBy: int("suggestedBy").notNull(),
  decidedBy: int("decidedBy"),
  decidedAt: timestamp("decidedAt"),
  decisionNote: text("decisionNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("highlight_suggestion_publication_idx").on(table.publicationId, table.status),
  index("highlight_suggestion_partner_idx").on(table.partnerId, table.status),
]);

export const refundPolicyStatuses = ["Rascunho", "Ativa", "Substituída", "Arquivada"] as const;
export const refundRequestStatuses = ["Solicitado", "Em análise", "Aprovado", "Recusado", "Compensado", "Cancelado"] as const;
export const commercialTransactionTypes = ["Cobrança", "Reembolso", "Ajuste"] as const;
export const commercialTransactionStatuses = ["Registrada", "Compensada", "Cancelada"] as const;

export const commercialRefundPolicies = mysqlTable("commercialRefundPolicies", {
  id: int("id").autoincrement().primaryKey(),
  version: int("version").notNull(),
  status: mysqlEnum("status", refundPolicyStatuses).default("Rascunho").notNull(),
  requestWindowDays: int("requestWindowDays").notNull(),
  maximumRefundPercent: decimal("maximumRefundPercent", { precision: 5, scale: 2 }).notNull(),
  retentionExplanation: text("retentionExplanation").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  activatedByUserId: int("activatedByUserId"),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("refund_policy_status_version_idx").on(table.status, table.version)]);

export const commercialTransactions = mysqlTable("commercialTransactions", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  partnerId: int("partnerId"),
  territoryId: int("territoryId"),
  transactionType: mysqlEnum("transactionType", commercialTransactionTypes).notNull(),
  status: mysqlEnum("status", commercialTransactionStatuses).default("Registrada").notNull(),
  grossAmount: decimal("grossAmount", { precision: 12, scale: 2 }).notNull(),
  executorAmount: decimal("executorAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  partnerGrossAmount: decimal("partnerGrossAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  partnerNetAmount: decimal("partnerNetAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  ojuAmount: decimal("ojuAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  retainedCostsAmount: decimal("retainedCostsAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  commercialPolicyId: int("commercialPolicyId"),
  commercialPolicyVersion: int("commercialPolicyVersion"),
  refundPolicyId: int("refundPolicyId"),
  refundPolicyVersion: int("refundPolicyVersion"),
  originalTransactionId: int("originalTransactionId"),
  reason: text("reason"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("commercial_transaction_request_idx").on(table.requestId, table.createdAt),
  index("commercial_transaction_partner_idx").on(table.partnerId, table.territoryId, table.createdAt),
]);

export const commercialRefundRequests = mysqlTable("commercialRefundRequests", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  originalTransactionId: int("originalTransactionId").notNull(),
  refundPolicyId: int("refundPolicyId").notNull(),
  refundPolicyVersion: int("refundPolicyVersion").notNull(),
  requestedAmount: decimal("requestedAmount", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approvedAmount", { precision: 12, scale: 2 }),
  retainedCostsAmount: decimal("retainedCostsAmount", { precision: 12, scale: 2 }),
  reason: text("reason").notNull(),
  decisionNote: text("decisionNote"),
  status: mysqlEnum("status", refundRequestStatuses).default("Solicitado").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  decidedByUserId: int("decidedByUserId"),
  decidedAt: timestamp("decidedAt"),
  compensatedTransactionId: int("compensatedTransactionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("refund_request_request_idx").on(table.requestId, table.status, table.createdAt),
  index("refund_request_original_transaction_idx").on(table.originalTransactionId, table.status),
]);

export const advertisements = mysqlTable("advertisements", {
  id: int("id").autoincrement().primaryKey(),
  advertiserName: varchar("advertiserName", { length: 240 }).notNull(),
  title: varchar("title", { length: 280 }).notNull(),
  description: text("description"),
  contact: varchar("contact", { length: 280 }).notNull(),
  services: text("services"),
  format: mysqlEnum("format", ["Cartão de serviço", "Banner", "Destaque de parceiro"]).default("Cartão de serviço").notNull(),
  sourcePublicationId: int("sourcePublicationId"),
  mediaUrl: text("mediaUrl"),
  mediaType: mysqlEnum("mediaType", ["foto", "vídeo"]),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  renewalAt: timestamp("renewalAt"),
  status: mysqlEnum("status", ["Rascunho", "Ativo", "Pausado", "Encerrado"]).default("Rascunho").notNull(),
  capturedByUserId: int("capturedByUserId").notNull(),
  partnerId: int("partnerId"),
  contractedAmount: decimal("contractedAmount", { precision: 12, scale: 2 }).notNull(),
  ojuSharePercent: decimal("ojuSharePercent", { precision: 5, scale: 2 }).notNull(),
  captorSharePercent: decimal("captorSharePercent", { precision: 5, scale: 2 }).notNull(),
  payoutStatus: mysqlEnum("payoutStatus", payoutStatuses).default("Pendente").notNull(),
  commercialPolicyId: int("commercialPolicyId"),
  commercialPolicyVersion: int("commercialPolicyVersion"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("advertisement_status_period_idx").on(table.status, table.startsAt, table.endsAt), index("advertisement_partner_idx").on(table.partnerId, table.status)]);

export const commercialPolicies = mysqlTable("commercialPolicies", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 240 }).notNull(),
  scope: mysqlEnum("scope", commercialPolicyScopes).notNull(),
  version: int("version").notNull(),
  status: mysqlEnum("status", commercialPolicyStatuses).default("Rascunho").notNull(),
  effectiveAt: timestamp("effectiveAt").notNull(),
  ojuPercent: decimal("ojuPercent", { precision: 5, scale: 2 }).notNull(),
  developmentPercent: decimal("developmentPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  captorPercent: decimal("captorPercent", { precision: 5, scale: 2 }).notNull(),
  executorPercent: decimal("executorPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  notes: text("notes"),
  createdByUserId: int("createdByUserId").notNull(),
  activatedByUserId: int("activatedByUserId"),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("commercial_policy_scope_status_idx").on(table.scope, table.status, table.effectiveAt),
  index("commercial_policy_version_idx").on(table.scope, table.version),
]);

export const commercialPayoutNotifications = mysqlTable("commercialPayoutNotifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientUserId: int("recipientUserId").notNull(),
  sourceType: mysqlEnum("sourceType", ["Anúncio", "Visibilidade institucional"]).notNull(),
  sourceId: int("sourceId").notNull(),
  payoutStatus: mysqlEnum("payoutStatus", payoutStatuses).notNull(),
  title: varchar("title", { length: 280 }).notNull(),
  message: text("message").notNull(),
  readAt: timestamp("readAt"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("commercial_payout_notice_recipient_idx").on(table.recipientUserId, table.readAt, table.createdAt),
  index("commercial_payout_notice_source_idx").on(table.sourceType, table.sourceId),
]);

export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId"),
  publicationId: int("publicationId"),
  contractor: varchar("contractor", { length: 240 }).notNull(),
  documentUrl: text("documentUrl").notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  managedByUserId: int("managedByUserId"),
  partnerId: int("partnerId"),
  contractAmount: decimal("contractAmount", { precision: 12, scale: 2 }),
  ojuServicePercent: decimal("ojuServicePercent", { precision: 5, scale: 2 }).default("30.00").notNull(),
  administratorSharePercent: decimal("administratorSharePercent", { precision: 5, scale: 2 }).default("70.00").notNull(),
  payoutStatus: mysqlEnum("payoutStatus", ["Pendente", "Parcial", "Pago"]).default("Pendente").notNull(),
  status: mysqlEnum("status", ["Rascunho", "Enviado", "Assinado", "Arquivado"]).default("Rascunho").notNull(),
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("contract_manager_idx").on(table.managedByUserId), index("contract_partner_idx").on(table.partnerId, table.status)]);

export const revenueLeadTypes = ["Apoio institucional", "Licenciamento de mídia", "Oficina"] as const;
export const revenueLeadStatuses = ["Solicitação", "Em análise", "Conversa", "Proposta", "Acordo", "Concluído", "Arquivado"] as const;

export const revenueLeads = mysqlTable("revenueLeads", {
  id: int("id").autoincrement().primaryKey(),
  leadType: mysqlEnum("leadType", revenueLeadTypes).notNull(),
  contactName: varchar("contactName", { length: 200 }).notNull(),
  organization: varchar("organization", { length: 240 }),
  whatsapp: varchar("whatsapp", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  purpose: varchar("purpose", { length: 280 }).notNull(),
  details: text("details"),
  publicationId: int("publicationId"),
  taxonomyId: int("taxonomyId"),
  mediaId: int("mediaId"),
  licenseScope: text("licenseScope"),
  proposalSummary: text("proposalSummary"),
  proposalAmount: decimal("proposalAmount", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", revenueLeadStatuses).default("Solicitação").notNull(),
  managedByUserId: int("managedByUserId"),
  partnerId: int("partnerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("revenue_lead_manager_idx").on(table.managedByUserId, table.status),
  index("revenue_lead_type_idx").on(table.leadType, table.createdAt),
  index("revenue_lead_media_idx").on(table.mediaId),
  index("revenue_lead_partner_idx").on(table.partnerId, table.status),
]);

export const revenueLeadActivities = mysqlTable("revenueLeadActivities", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  actorId: int("actorId"),
  detail: text("detail").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("revenue_lead_activity_idx").on(table.leadId, table.createdAt)]);

export const consentStatuses = ["Pendente", "Autorizado", "Retirado"] as const;
export const communityRecordStatuses = ["Rascunho", "Em revisão", "Publicada", "Arquivada"] as const;
export const accessLevels = ["Público", "Comunitário", "Pesquisa mediante análise", "Preservação restrita"] as const;

export const institutions = mysqlTable("institutions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 240 }).notNull(),
  slug: varchar("slug", { length: 260 }).notNull().unique(),
  institutionType: mysqlEnum("institutionType", institutionTypes).notNull(),
  profileLabel: varchar("profileLabel", { length: 180 }),
  directoryScope: mysqlEnum("directoryScope", ["Institucional", "Serviço comunitário"]).default("Institucional").notNull(),
  serviceCategory: varchar("serviceCategory", { length: 180 }),
  serviceKeywords: text("serviceKeywords"),
  neighborhoodText: varchar("neighborhoodText", { length: 180 }),
  referenceName: varchar("referenceName", { length: 240 }),
  referenceRole: varchar("referenceRole", { length: 180 }),
  description: text("description"),
  territoryId: int("territoryId"),
  locationText: varchar("locationText", { length: 280 }),
  locationVisibility: mysqlEnum("locationVisibility", ["Não divulgar", "Aproximada", "Pública"]).default("Não divulgar").notNull(),
  contactText: varchar("contactText", { length: 320 }),
  contactVisibility: mysqlEnum("contactVisibility", ["Não divulgar", "Contato institucional"]).default("Não divulgar").notNull(),
  primaryMediaId: int("primaryMediaId"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  status: mysqlEnum("status", communityRecordStatuses).default("Rascunho").notNull(),
  consentStatus: mysqlEnum("consentStatus", consentStatuses).default("Pendente").notNull(),
  consentedAt: timestamp("consentedAt"),
  consentNote: text("consentNote"),
  managedByUserId: int("managedByUserId"),
  partnerId: int("partnerId"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: int("deletedBy"),
  deletionNote: text("deletionNote"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("institution_status_idx").on(table.status, table.consentStatus),
  index("institution_manager_idx").on(table.managedByUserId),
  index("institution_territory_idx").on(table.territoryId),
  index("institution_directory_scope_idx").on(table.directoryScope, table.serviceCategory),
  index("institution_deleted_idx").on(table.deletedAt),
  index("institution_partner_idx").on(table.partnerId, table.status),
]);

export const institutionVisibilitySubscriptions = mysqlTable("institutionVisibilitySubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").notNull(),
  plan: mysqlEnum("plan", institutionVisibilityPlans).notNull(),
  status: mysqlEnum("status", institutionVisibilityStatuses).default("Rascunho").notNull(),
  startsAt: timestamp("startsAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  paidAt: timestamp("paidAt"),
  paymentReference: varchar("paymentReference", { length: 280 }),
  grossAmount: decimal("grossAmount", { precision: 12, scale: 2 }).notNull(),
  netAmount: decimal("netAmount", { precision: 12, scale: 2 }).notNull(),
  ojuAmount: decimal("ojuAmount", { precision: 12, scale: 2 }).notNull(),
  developmentAmount: decimal("developmentAmount", { precision: 12, scale: 2 }).notNull(),
  captorAmount: decimal("captorAmount", { precision: 12, scale: 2 }).notNull(),
  reserveAmount: decimal("reserveAmount", { precision: 12, scale: 2 }).notNull(),
  capturedByUserId: int("capturedByUserId"),
  captorPayoutStatus: mysqlEnum("captorPayoutStatus", payoutStatuses).default("Pendente").notNull(),
  commercialPolicyId: int("commercialPolicyId"),
  commercialPolicyVersion: int("commercialPolicyVersion"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("institution_visibility_institution_idx").on(table.institutionId, table.expiresAt),
  index("institution_visibility_status_idx").on(table.status, table.expiresAt),
  index("institution_visibility_captor_idx").on(table.capturedByUserId),
]);

export const communityEvents = mysqlTable("communityEvents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 280 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  description: text("description"),
  institutionId: int("institutionId"),
  territoryId: int("territoryId"),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  locationText: varchar("locationText", { length: 280 }),
  locationVisibility: mysqlEnum("locationVisibility", ["Não divulgar", "Aproximada", "Pública"]).default("Não divulgar").notNull(),
  coverMediaId: int("coverMediaId"),
  publicationId: int("publicationId"),
  status: mysqlEnum("status", communityRecordStatuses).default("Rascunho").notNull(),
  consentStatus: mysqlEnum("consentStatus", consentStatuses).default("Pendente").notNull(),
  consentedAt: timestamp("consentedAt"),
  consentNote: text("consentNote"),
  managedByUserId: int("managedByUserId"),
  partnerId: int("partnerId"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: int("deletedBy"),
  deletionNote: text("deletionNote"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("community_event_schedule_idx").on(table.status, table.startsAt),
  index("community_event_manager_idx").on(table.managedByUserId),
  index("community_event_institution_idx").on(table.institutionId),
  index("community_event_deleted_idx").on(table.deletedAt),
  index("community_event_partner_idx").on(table.partnerId, table.status),
]);

export const oralMemories = mysqlTable("oralMemories", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 280 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  summary: text("summary"),
  narrative: text("narrative"),
  generatedTranscript: text("generatedTranscript"),
  generatedSummary: text("generatedSummary"),
  aiProcessedAt: timestamp("aiProcessedAt"),
  aiReviewedAt: timestamp("aiReviewedAt"),
  aiReviewedBy: int("aiReviewedBy"),
  theme: varchar("theme", { length: 180 }),
  speakerName: varchar("speakerName", { length: 240 }),
  speakerNameVisibility: mysqlEnum("speakerNameVisibility", ["Nome", "Pseudônimo", "Não divulgar"]).default("Não divulgar").notNull(),
  institutionId: int("institutionId"),
  territoryId: int("territoryId"),
  videoMediaId: int("videoMediaId"),
  audioUrl: text("audioUrl"),
  audioStorageKey: varchar("audioStorageKey", { length: 512 }),
  accessLevel: mysqlEnum("accessLevel", accessLevels).default("Preservação restrita").notNull(),
  status: mysqlEnum("status", communityRecordStatuses).default("Rascunho").notNull(),
  consentStatus: mysqlEnum("consentStatus", consentStatuses).default("Pendente").notNull(),
  consentedAt: timestamp("consentedAt"),
  consentNote: text("consentNote"),
  managedByUserId: int("managedByUserId"),
  partnerId: int("partnerId"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: int("deletedBy"),
  deletionNote: text("deletionNote"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("oral_memory_visibility_idx").on(table.status, table.consentStatus, table.accessLevel),
  index("oral_memory_manager_idx").on(table.managedByUserId),
  index("oral_memory_institution_idx").on(table.institutionId),
  index("oral_memory_deleted_idx").on(table.deletedAt),
  index("oral_memory_partner_idx").on(table.partnerId, table.status),
]);

export const careRequestStatuses = ["Recebida", "Em acolhimento", "Encaminhada", "Arquivada"] as const;
export const communityCareRequests = mysqlTable("communityCareRequests", {
  id: int("id").autoincrement().primaryKey(),
  trackingCode: varchar("trackingCode", { length: 48 }).notNull().unique(),
  requesterName: varchar("requesterName", { length: 200 }).notNull(),
  contact: varchar("contact", { length: 320 }).notNull(),
  territoryId: int("territoryId"),
  requestType: mysqlEnum("requestType", ["Intolerância religiosa", "Risco ao acervo", "Registro documental", "Outro"]).notNull(),
  details: text("details").notNull(),
  status: mysqlEnum("status", careRequestStatuses).default("Recebida").notNull(),
  internalNote: text("internalNote"),
  managedByUserId: int("managedByUserId"),
  partnerId: int("partnerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("care_request_manager_idx").on(table.managedByUserId, table.status),
  index("care_request_partner_idx").on(table.partnerId, table.status),
]);

export const adminDeskCategories = ["Dúvida", "Erro", "Estabilidade", "Outro"] as const;
export const adminDeskStatuses = ["Aberta", "Em atendimento", "Resolvida"] as const;

export const adminDeskMessages = mysqlTable("adminDeskMessages", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  category: mysqlEnum("category", adminDeskCategories).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  body: text("body").notNull(),
  pagePath: varchar("pagePath", { length: 320 }),
  status: mysqlEnum("status", adminDeskStatuses).default("Aberta").notNull(),
  reply: text("reply"),
  repliedBy: int("repliedBy"),
  repliedAt: timestamp("repliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("admin_desk_status_idx").on(table.status, table.createdAt),
  index("admin_desk_author_idx").on(table.createdBy, table.createdAt),
]);

export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 120 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const portalContentPages = ["Global", "Home", "Histórias", "Memórias Documentais", "Serviços", "Comunidade", "Sobre"] as const;
export const portalContentActions = ["Criado", "Atualizado", "Visibilidade", "Excluído", "Restaurado"] as const;

export const portalContentBlocks = mysqlTable("portalContentBlocks", {
  id: int("id").autoincrement().primaryKey(),
  page: mysqlEnum("page", portalContentPages).notNull(),
  sectionKey: varchar("sectionKey", { length: 120 }).notNull(),
  label: varchar("label", { length: 240 }).notNull(),
  contentJson: text("contentJson").notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdBy: int("createdBy"),
  updatedBy: int("updatedBy"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("portal_content_page_section_unique").on(table.page, table.sectionKey),
  index("portal_content_page_order_idx").on(table.page, table.displayOrder),
]);

export const portalContentActivities = mysqlTable("portalContentActivities", {
  id: int("id").autoincrement().primaryKey(),
  blockId: int("blockId"),
  action: mysqlEnum("action", portalContentActions).notNull(),
  snapshot: text("snapshot"),
  actorId: int("actorId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("portal_content_activity_block_idx").on(table.blockId, table.createdAt),
]);

export type Publication = typeof publications.$inferSelect;
export type Taxonomy = typeof taxonomies.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
