import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_articles_read_first_kind" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_articles_sources_type" AS ENUM('primary-text', 'commentary', 'academic', 'living-tradition', 'general');
  CREATE TYPE "payload"."enum_articles_shape" AS ENUM('vani-note', 'inquiry-essay', 'text-story-study', 'practice-journal');
  CREATE TYPE "payload"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__articles_v_version_read_first_kind" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__articles_v_version_sources_type" AS ENUM('primary-text', 'commentary', 'academic', 'living-tradition', 'general');
  CREATE TYPE "payload"."enum__articles_v_version_shape" AS ENUM('vani-note', 'inquiry-essay', 'text-story-study', 'practice-journal');
  CREATE TYPE "payload"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload"."articles_read_first" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "payload"."enum_articles_read_first_kind" DEFAULT 'external',
  	"article_id" integer,
  	"title" varchar,
  	"author" varchar,
  	"url" varchar,
  	"reason" varchar
  );
  
  CREATE TABLE "payload"."articles_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "payload"."enum_articles_sources_type",
  	"work" varchar,
  	"author" varchar,
  	"edition" varchar,
  	"location" varchar,
  	"url" varchar,
  	"accessed_on" timestamp(3) with time zone,
  	"claim" varchar
  );
  
  CREATE TABLE "payload"."articles_corrections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"change" varchar,
  	"show_public_note" boolean DEFAULT true
  );
  
  CREATE TABLE "payload"."articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"summary" varchar,
  	"shape" "payload"."enum_articles_shape",
  	"difficulty_id" integer,
  	"background" varchar,
  	"body" jsonb,
  	"cover_term" varchar,
  	"cover_image_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"editorial_checklist_integrity_quotes_located" boolean,
  	"editorial_checklist_integrity_claims_evidenced" boolean,
  	"editorial_checklist_integrity_context_checked" boolean,
  	"editorial_checklist_integrity_school_distinguished" boolean,
  	"editorial_checklist_integrity_symbolism_labelled" boolean,
  	"editorial_checklist_integrity_sanskrit_checked" boolean,
  	"editorial_checklist_integrity_layers_distinct" boolean,
  	"editorial_checklist_integrity_suffering_respected" boolean,
  	"editorial_checklist_integrity_no_open_problem" boolean,
  	"editorial_checklist_voice_question_alive" boolean,
  	"editorial_checklist_voice_read_aloud" boolean,
  	"editorial_checklist_voice_quiet_test" boolean,
  	"editorial_checklist_voice_author_stands" boolean,
  	"editorial_checklist_voice_difficulty_included" boolean,
  	"editorial_checklist_voice_prior_reading_included" boolean,
  	"editorial_checklist_voice_byline_sagevani" boolean,
  	"editorial_checklist_voice_drafts_excluded" boolean,
  	"editorial_checklist_unresolved_issues" varchar,
  	"editorial_checklist_required_changes" varchar,
  	"editorial_checklist_source_records" varchar,
  	"slug" varchar,
  	"send_email" boolean DEFAULT true,
  	"published_at" timestamp(3) with time zone,
  	"reading_time" numeric,
  	"search_text" varchar,
  	"approval_approved_by_id" integer,
  	"approval_approved_at" timestamp(3) with time zone,
  	"approval_version_id" varchar,
  	"email_sent_at" timestamp(3) with time zone,
  	"email_recipients" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "payload"."_articles_v_version_read_first" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "payload"."enum__articles_v_version_read_first_kind" DEFAULT 'external',
  	"article_id" integer,
  	"title" varchar,
  	"author" varchar,
  	"url" varchar,
  	"reason" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_articles_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "payload"."enum__articles_v_version_sources_type",
  	"work" varchar,
  	"author" varchar,
  	"edition" varchar,
  	"location" varchar,
  	"url" varchar,
  	"accessed_on" timestamp(3) with time zone,
  	"claim" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_articles_v_version_corrections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"change" varchar,
  	"show_public_note" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_shape" "payload"."enum__articles_v_version_shape",
  	"version_difficulty_id" integer,
  	"version_background" varchar,
  	"version_body" jsonb,
  	"version_cover_term" varchar,
  	"version_cover_image_id" integer,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_editorial_checklist_integrity_quotes_located" boolean,
  	"version_editorial_checklist_integrity_claims_evidenced" boolean,
  	"version_editorial_checklist_integrity_context_checked" boolean,
  	"version_editorial_checklist_integrity_school_distinguished" boolean,
  	"version_editorial_checklist_integrity_symbolism_labelled" boolean,
  	"version_editorial_checklist_integrity_sanskrit_checked" boolean,
  	"version_editorial_checklist_integrity_layers_distinct" boolean,
  	"version_editorial_checklist_integrity_suffering_respected" boolean,
  	"version_editorial_checklist_integrity_no_open_problem" boolean,
  	"version_editorial_checklist_voice_question_alive" boolean,
  	"version_editorial_checklist_voice_read_aloud" boolean,
  	"version_editorial_checklist_voice_quiet_test" boolean,
  	"version_editorial_checklist_voice_author_stands" boolean,
  	"version_editorial_checklist_voice_difficulty_included" boolean,
  	"version_editorial_checklist_voice_prior_reading_included" boolean,
  	"version_editorial_checklist_voice_byline_sagevani" boolean,
  	"version_editorial_checklist_voice_drafts_excluded" boolean,
  	"version_editorial_checklist_unresolved_issues" varchar,
  	"version_editorial_checklist_required_changes" varchar,
  	"version_editorial_checklist_source_records" varchar,
  	"version_slug" varchar,
  	"version_send_email" boolean DEFAULT true,
  	"version_published_at" timestamp(3) with time zone,
  	"version_reading_time" numeric,
  	"version_search_text" varchar,
  	"version_approval_approved_by_id" integer,
  	"version_approval_approved_at" timestamp(3) with time zone,
  	"version_approval_version_id" varchar,
  	"version_email_sent_at" timestamp(3) with time zone,
  	"version_email_recipients" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "payload"."_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "payload"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" jsonb,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_body" jsonb,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "payload"."topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"question" varchar NOT NULL,
  	"intro" varchar,
  	"order" numeric NOT NULL,
  	"cover_tint_background" varchar NOT NULL,
  	"cover_tint_text" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."difficulty_levels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"order" numeric NOT NULL,
  	"needs_prior_reading" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"creator" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"licence" varchar NOT NULL,
  	"notes" varchar,
  	"prefix" varchar DEFAULT '',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload"."site_settings_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tagline" varchar DEFAULT 'Where silence learns to speak.' NOT NULL,
  	"featured_article_id" integer,
  	"footer_motto" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."site_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "articles_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "topics_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "difficulty_levels_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "payload"."articles_read_first" ADD CONSTRAINT "articles_read_first_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "payload"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."articles_read_first" ADD CONSTRAINT "articles_read_first_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."articles_sources" ADD CONSTRAINT "articles_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."articles_corrections" ADD CONSTRAINT "articles_corrections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_difficulty_id_difficulty_levels_id_fk" FOREIGN KEY ("difficulty_id") REFERENCES "payload"."difficulty_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."articles" ADD CONSTRAINT "articles_approval_approved_by_id_users_id_fk" FOREIGN KEY ("approval_approved_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."articles_rels" ADD CONSTRAINT "articles_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "payload"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v_version_read_first" ADD CONSTRAINT "_articles_v_version_read_first_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "payload"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v_version_read_first" ADD CONSTRAINT "_articles_v_version_read_first_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v_version_sources" ADD CONSTRAINT "_articles_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v_version_corrections" ADD CONSTRAINT "_articles_v_version_corrections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v" ADD CONSTRAINT "_articles_v_version_difficulty_id_difficulty_levels_id_fk" FOREIGN KEY ("version_difficulty_id") REFERENCES "payload"."difficulty_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v" ADD CONSTRAINT "_articles_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v" ADD CONSTRAINT "_articles_v_version_approval_approved_by_id_users_id_fk" FOREIGN KEY ("version_approval_approved_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "payload"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_navigation" ADD CONSTRAINT "site_settings_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings" ADD CONSTRAINT "site_settings_featured_article_id_articles_id_fk" FOREIGN KEY ("featured_article_id") REFERENCES "payload"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_rels" ADD CONSTRAINT "site_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_rels" ADD CONSTRAINT "site_settings_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_read_first_order_idx" ON "payload"."articles_read_first" USING btree ("_order");
  CREATE INDEX "articles_read_first_parent_id_idx" ON "payload"."articles_read_first" USING btree ("_parent_id");
  CREATE INDEX "articles_read_first_article_idx" ON "payload"."articles_read_first" USING btree ("article_id");
  CREATE INDEX "articles_sources_order_idx" ON "payload"."articles_sources" USING btree ("_order");
  CREATE INDEX "articles_sources_parent_id_idx" ON "payload"."articles_sources" USING btree ("_parent_id");
  CREATE INDEX "articles_corrections_order_idx" ON "payload"."articles_corrections" USING btree ("_order");
  CREATE INDEX "articles_corrections_parent_id_idx" ON "payload"."articles_corrections" USING btree ("_parent_id");
  CREATE INDEX "articles_difficulty_idx" ON "payload"."articles" USING btree ("difficulty_id");
  CREATE INDEX "articles_cover_image_idx" ON "payload"."articles" USING btree ("cover_image_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "payload"."articles" USING btree ("slug");
  CREATE INDEX "articles_approval_approval_approved_by_idx" ON "payload"."articles" USING btree ("approval_approved_by_id");
  CREATE INDEX "articles_updated_at_idx" ON "payload"."articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "payload"."articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "payload"."articles" USING btree ("_status");
  CREATE INDEX "articles_rels_order_idx" ON "payload"."articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "payload"."articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "payload"."articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_topics_id_idx" ON "payload"."articles_rels" USING btree ("topics_id");
  CREATE INDEX "_articles_v_version_read_first_order_idx" ON "payload"."_articles_v_version_read_first" USING btree ("_order");
  CREATE INDEX "_articles_v_version_read_first_parent_id_idx" ON "payload"."_articles_v_version_read_first" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_read_first_article_idx" ON "payload"."_articles_v_version_read_first" USING btree ("article_id");
  CREATE INDEX "_articles_v_version_sources_order_idx" ON "payload"."_articles_v_version_sources" USING btree ("_order");
  CREATE INDEX "_articles_v_version_sources_parent_id_idx" ON "payload"."_articles_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_corrections_order_idx" ON "payload"."_articles_v_version_corrections" USING btree ("_order");
  CREATE INDEX "_articles_v_version_corrections_parent_id_idx" ON "payload"."_articles_v_version_corrections" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "payload"."_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_difficulty_idx" ON "payload"."_articles_v" USING btree ("version_difficulty_id");
  CREATE INDEX "_articles_v_version_version_cover_image_idx" ON "payload"."_articles_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "payload"."_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_approval_version_approval_approved_b_idx" ON "payload"."_articles_v" USING btree ("version_approval_approved_by_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "payload"."_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "payload"."_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "payload"."_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "payload"."_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "payload"."_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_latest_idx" ON "payload"."_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_autosave_idx" ON "payload"."_articles_v" USING btree ("autosave");
  CREATE INDEX "_articles_v_rels_order_idx" ON "payload"."_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "payload"."_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "payload"."_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_topics_id_idx" ON "payload"."_articles_v_rels" USING btree ("topics_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "payload"."pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "payload"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload"."pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "payload"."pages" USING btree ("_status");
  CREATE INDEX "_pages_v_parent_idx" ON "payload"."_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "payload"."_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "payload"."_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "payload"."_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "payload"."_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "payload"."_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "payload"."_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "payload"."_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "payload"."_pages_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "topics_slug_idx" ON "payload"."topics" USING btree ("slug");
  CREATE INDEX "topics_updated_at_idx" ON "payload"."topics" USING btree ("updated_at");
  CREATE INDEX "topics_created_at_idx" ON "payload"."topics" USING btree ("created_at");
  CREATE UNIQUE INDEX "difficulty_levels_name_idx" ON "payload"."difficulty_levels" USING btree ("name");
  CREATE INDEX "difficulty_levels_updated_at_idx" ON "payload"."difficulty_levels" USING btree ("updated_at");
  CREATE INDEX "difficulty_levels_created_at_idx" ON "payload"."difficulty_levels" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "site_settings_navigation_order_idx" ON "payload"."site_settings_navigation" USING btree ("_order");
  CREATE INDEX "site_settings_navigation_parent_id_idx" ON "payload"."site_settings_navigation" USING btree ("_parent_id");
  CREATE INDEX "site_settings_featured_article_idx" ON "payload"."site_settings" USING btree ("featured_article_id");
  CREATE INDEX "site_settings_rels_order_idx" ON "payload"."site_settings_rels" USING btree ("order");
  CREATE INDEX "site_settings_rels_parent_idx" ON "payload"."site_settings_rels" USING btree ("parent_id");
  CREATE INDEX "site_settings_rels_path_idx" ON "payload"."site_settings_rels" USING btree ("path");
  CREATE INDEX "site_settings_rels_articles_id_idx" ON "payload"."site_settings_rels" USING btree ("articles_id");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "payload"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "payload"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_difficulty_levels_fk" FOREIGN KEY ("difficulty_levels_id") REFERENCES "payload"."difficulty_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_topics_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("topics_id");
  CREATE INDEX "payload_locked_documents_rels_difficulty_levels_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("difficulty_levels_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."articles_read_first" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."articles_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."articles_corrections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."articles_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_articles_v_version_read_first" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_articles_v_version_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_articles_v_version_corrections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_articles_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."topics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."difficulty_levels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."site_settings_navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."site_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."site_settings_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."articles_read_first" CASCADE;
  DROP TABLE "payload"."articles_sources" CASCADE;
  DROP TABLE "payload"."articles_corrections" CASCADE;
  DROP TABLE "payload"."articles" CASCADE;
  DROP TABLE "payload"."articles_rels" CASCADE;
  DROP TABLE "payload"."_articles_v_version_read_first" CASCADE;
  DROP TABLE "payload"."_articles_v_version_sources" CASCADE;
  DROP TABLE "payload"."_articles_v_version_corrections" CASCADE;
  DROP TABLE "payload"."_articles_v" CASCADE;
  DROP TABLE "payload"."_articles_v_rels" CASCADE;
  DROP TABLE "payload"."pages" CASCADE;
  DROP TABLE "payload"."_pages_v" CASCADE;
  DROP TABLE "payload"."topics" CASCADE;
  DROP TABLE "payload"."difficulty_levels" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."site_settings_navigation" CASCADE;
  DROP TABLE "payload"."site_settings" CASCADE;
  DROP TABLE "payload"."site_settings_rels" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_articles_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_topics_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_difficulty_levels_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_media_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_articles_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_topics_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_difficulty_levels_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_media_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "articles_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "topics_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "difficulty_levels_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "media_id";
  DROP TYPE "payload"."enum_articles_read_first_kind";
  DROP TYPE "payload"."enum_articles_sources_type";
  DROP TYPE "payload"."enum_articles_shape";
  DROP TYPE "payload"."enum_articles_status";
  DROP TYPE "payload"."enum__articles_v_version_read_first_kind";
  DROP TYPE "payload"."enum__articles_v_version_sources_type";
  DROP TYPE "payload"."enum__articles_v_version_shape";
  DROP TYPE "payload"."enum__articles_v_version_status";
  DROP TYPE "payload"."enum_pages_status";
  DROP TYPE "payload"."enum__pages_v_version_status";`)
}
