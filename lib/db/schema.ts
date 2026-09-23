import { sql } from "drizzle-orm";
import {
  bigint, boolean, check, foreignKey, index, integer, jsonb, pgEnum, pgTable,
  primaryKey, text, timestamp, unique, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import type { BannerConfig } from "@/lib/announcements";

const time = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const timestamps = () => ({
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});
const id = () => uuid("id").primaryKey().defaultRandom();

// Better Auth core model names/field keys. Authentication wiring is the next slice.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  ...timestamps(),
});
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: time("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps(),
}, (t) => [index("session_user_idx").on(t.userId)]);
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: time("access_token_expires_at"),
  refreshTokenExpiresAt: time("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...timestamps(),
}, (t) => [unique("account_provider_identity").on(t.providerId, t.accountId), index("account_user_idx").on(t.userId)]);
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: time("expires_at").notNull(),
  ...timestamps(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);
export const twoFactor = pgTable("two_factor", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  verified: boolean("verified").notNull().default(true),
  failedVerificationCount: integer("failed_verification_count").notNull().default(0),
  lockedUntil: time("locked_until"),
});
// Kept outside editable auth profile data. No public write endpoint may expose this table.
export const owners = pgTable("academy_owners", {
  userId: text("user_id").primaryKey().references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(),
});

// Overrides the imported articles and also stores new owner-written articles.
export const articleEdits = pgTable("article_edits", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  image: text("image").notNull(),
  dateLabel: text("date_label").notNull(),
  duration: text("duration").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"),
  ...timestamps(),
}, (t) => [check("article_edits_status_valid", sql`${t.status} IN ('draft', 'published')`)]);

// Owner-uploaded cover images (base64), served by /api/article-images/[id].
export const articleAssets = pgTable("article_assets", {
  id: id(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});

export const bannerSettings = pgTable("banner_settings", {
  id: integer("id").primaryKey().default(1),
  draft: jsonb("draft").$type<BannerConfig>().notNull(),
  published: jsonb("published").$type<BannerConfig>(),
  isPublished: boolean("is_published").notNull().default(true),
  ...timestamps(),
}, (t) => [check("banner_settings_singleton", sql`${t.id} = 1`)]);

export const courseStatus = pgEnum("course_status", ["draft", "published", "archived"]);
export const publicationStatus = pgEnum("publication_status", ["draft", "published"]);
export const lessonKind = pgEnum("lesson_kind", ["video", "live"]);
export const liveStatus = pgEnum("live_status", ["scheduled", "rescheduled", "cancelled", "completed"]);
export const videoStatus = pgEnum("video_status", ["waiting", "processing", "ready", "failed"]);
export const eventStatus = pgEnum("event_status", ["pending", "processed", "failed"]);

// Links a Shopier product to the site. Title, price and images are read live from the Shopier API.
export const courses = pgTable("courses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  shopierProductId: text("shopier_product_id").notNull().unique(),
  accessDurationDays: integer("access_duration_days").notNull().default(365),
  status: courseStatus("status").notNull().default("published"),
  ...timestamps(),
}, (t) => [check("courses_duration_valid", sql`${t.accessDurationDays} > 0`)]);
export const modules = pgTable("modules", {
  id: id(),
  courseId: uuid("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  status: publicationStatus("status").notNull().default("draft"),
  ...timestamps(),
}, (t) => [unique("modules_id_course").on(t.id, t.courseId), index("modules_course_position_idx").on(t.courseId, t.position), check("modules_position_valid", sql`${t.position} >= 0`)]);
export const videoAssets = pgTable("video_assets", {
  id: id(),
  muxUploadId: text("mux_upload_id").unique(),
  muxAssetId: text("mux_asset_id").unique(),
  signedPlaybackId: text("signed_playback_id").unique(),
  status: videoStatus("status").notNull().default("waiting"),
  durationSeconds: integer("duration_seconds"),
  aspectRatio: text("aspect_ratio"),
  failureDetails: text("failure_details"),
  ...timestamps(),
}, (t) => [
  check("video_duration_valid", sql`${t.durationSeconds} IS NULL OR ${t.durationSeconds} >= 0`),
  check("video_ready_identifiers", sql`${t.status} <> 'ready' OR (${t.muxAssetId} IS NOT NULL AND ${t.signedPlaybackId} IS NOT NULL)`),
]);
export const lessons = pgTable("lessons", {
  id: id(),
  courseId: uuid("course_id").notNull().references(() => courses.id),
  moduleId: uuid("module_id").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  position: integer("position").notNull().default(0),
  kind: lessonKind("kind").notNull(),
  isPreview: boolean("is_preview").notNull().default(false),
  status: publicationStatus("status").notNull().default("draft"),
  videoAssetId: uuid("video_asset_id").references(() => videoAssets.id),
  ...timestamps(),
}, (t) => [
  unique("lessons_course_slug").on(t.courseId, t.slug),
  unique("lessons_id_kind").on(t.id, t.kind),
  foreignKey({ columns: [t.moduleId, t.courseId], foreignColumns: [modules.id, modules.courseId] }),
  index("lessons_module_position_idx").on(t.moduleId, t.position),
  check("lessons_position_valid", sql`${t.position} >= 0`),
  check("published_video_has_asset", sql`${t.status} <> 'published' OR ${t.kind} <> 'video' OR ${t.videoAssetId} IS NOT NULL`),
]);
export const liveSessions = pgTable("live_sessions", {
  id: id(),
  lessonId: uuid("lesson_id").notNull().unique(),
  lessonKind: lessonKind("lesson_kind").notNull().default("live"),
  startsAt: time("starts_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  zoomJoinUrl: text("zoom_join_url").notNull(),
  zoomPasscode: text("zoom_passcode").notNull(),
  status: liveStatus("status").notNull().default("scheduled"),
  calendarSequence: integer("calendar_sequence").notNull().default(0),
  reminderSentAt: time("reminder_sent_at"),
  recordingPublishedAt: time("recording_published_at"),
  ...timestamps(),
}, (t) => [
  foreignKey({ columns: [t.lessonId, t.lessonKind], foreignColumns: [lessons.id, lessons.kind] }),
  check("live_session_kind", sql`${t.lessonKind} = 'live'`),
  check("live_duration_valid", sql`${t.durationMinutes} > 0`),
  check("calendar_sequence_valid", sql`${t.calendarSequence} >= 0`),
  index("live_sessions_schedule_idx").on(t.status, t.startsAt),
]);
// One row per paid Shopier order line for a course, matched to a student by email.
export const shopierPurchases = pgTable("shopier_purchases", {
  id: id(),
  shopierOrderId: text("shopier_order_id").notNull(),
  courseId: uuid("course_id").notNull().references(() => courses.id),
  buyerEmail: text("buyer_email").notNull(),
  amountKurus: integer("amount_kurus").notNull(),
  currency: text("currency").notNull(),
  accessDurationDays: integer("access_duration_days").notNull(),
  purchasedAt: time("purchased_at").notNull(),
  userId: text("user_id").references(() => user.id),
  claimedAt: time("claimed_at"),
  ...timestamps(),
}, (t) => [
  unique("shopier_purchases_order_course").on(t.shopierOrderId, t.courseId),
  unique("shopier_purchases_id_user").on(t.id, t.userId),
  unique("shopier_purchases_id_course").on(t.id, t.courseId),
  index("shopier_purchases_unclaimed_email_idx").on(t.buyerEmail).where(sql`${t.userId} IS NULL`),
  check("shopier_purchases_email_normalized", sql`${t.buyerEmail} = lower(trim(${t.buyerEmail})) AND length(${t.buyerEmail}) > 0`),
  check("shopier_purchases_amount_valid", sql`${t.amountKurus} >= 0`),
  check("shopier_purchases_duration_valid", sql`${t.accessDurationDays} > 0`),
  check("shopier_purchases_claim_consistent", sql`(${t.userId} IS NULL) = (${t.claimedAt} IS NULL)`),
]);
export const courseAccess = pgTable("course_access", {
  id: id(),
  userId: text("user_id").notNull().references(() => user.id),
  courseId: uuid("course_id").notNull().references(() => courses.id),
  sourcePurchaseId: uuid("source_purchase_id").unique(),
  grantedBy: text("granted_by").references(() => owners.userId),
  grantReason: text("grant_reason"),
  startsAt: time("starts_at").notNull(),
  expiresAt: time("expires_at").notNull(),
  revokedAt: time("revoked_at"),
  revocationReason: text("revocation_reason"),
  ...timestamps(),
}, (t) => [
  uniqueIndex("course_access_unrevoked_unique").on(t.userId, t.courseId).where(sql`${t.revokedAt} IS NULL`),
  foreignKey({ name: "course_access_purchase_user_fk", columns: [t.sourcePurchaseId, t.userId], foreignColumns: [shopierPurchases.id, shopierPurchases.userId] }),
  foreignKey({ name: "course_access_purchase_course_fk", columns: [t.sourcePurchaseId, t.courseId], foreignColumns: [shopierPurchases.id, shopierPurchases.courseId] }),
  check("course_access_dates_valid", sql`${t.expiresAt} > ${t.startsAt}`),
  check("course_access_source_valid", sql`(${t.sourcePurchaseId} IS NOT NULL AND ${t.grantedBy} IS NULL) OR (${t.sourcePurchaseId} IS NULL AND ${t.grantedBy} IS NOT NULL AND ${t.grantReason} IS NOT NULL AND length(trim(${t.grantReason})) > 0)`),
  check("course_access_revocation_reason", sql`${t.revokedAt} IS NULL OR (${t.revocationReason} IS NOT NULL AND length(trim(${t.revocationReason})) > 0)`),
  index("course_access_course_idx").on(t.courseId, t.expiresAt),
]);
export const lessonProgress = pgTable("lesson_progress", {
  userId: text("user_id").notNull().references(() => user.id),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id),
  lastPositionSeconds: integer("last_position_seconds").notNull().default(0),
  completedAt: time("completed_at"),
  lastActivityAt: time("last_activity_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] }), check("progress_position_valid", sql`${t.lastPositionSeconds} >= 0`)]);
export const providerEvents = pgTable("provider_events", {
  id: id(),
  provider: text("provider").notNull(),
  eventIdentity: text("event_identity").notNull(),
  verifiedPayloadHash: text("verified_payload_hash").notNull(),
  status: eventStatus("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  errorDetails: text("error_details"),
  processedAt: time("processed_at"),
  ...timestamps(),
}, (t) => [unique("provider_event_identity").on(t.provider, t.eventIdentity), check("provider_attempts_valid", sql`${t.attemptCount} >= 0`)]);
export const adminAuditLog = pgTable("admin_audit_log", {
  id: id(),
  actorId: text("actor_id").notNull().references(() => user.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [check("audit_reason_required", sql`length(trim(${t.reason})) > 0`), index("audit_resource_idx").on(t.resourceType, t.resourceId)]);

// Database-backed rate limits survive serverless instance recycling.
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
// A server-only proof for this session, not merely the user's MFA-enabled flag.
export const emailDeliveries = pgTable("email_deliveries", {
  id: id(),
  deduplicationKey: text("deduplication_key").notNull().unique(),
  encryptedMessage: text("encrypted_message"),
  status: text("status", { enum: ["pending", "sending", "sent", "failed", "expired"] }).notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  availableAt: time("available_at").notNull().defaultNow(),
  expiresAt: time("expires_at").notNull(),
  leaseId: uuid("lease_id"),
  leaseExpiresAt: time("lease_expires_at"),
  providerMessageId: text("provider_message_id"),
  lastError: text("last_error"),
  ...timestamps(),
}, (t) => [
  check("email_delivery_status", sql`${t.status} IN ('pending', 'sending', 'sent', 'failed', 'expired')`),
  index("email_delivery_queue_idx").on(t.status, t.availableAt),
]);
