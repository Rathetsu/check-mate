CREATE TABLE "studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"settings" jsonb DEFAULT '{"computer":true,"cloneable":"everyone","shareable":"everyone","sticky":true}'::jsonb NOT NULL,
	"topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"position" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"ord" integer NOT NULL,
	"name" text NOT NULL,
	"orientation" text DEFAULT 'white' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"mode" text DEFAULT 'normal' NOT NULL,
	"pgn" text NOT NULL,
	"initial_fen" text NOT NULL,
	"preview_fen" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studies" ADD CONSTRAINT "studies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_chapters" ADD CONSTRAINT "study_chapters_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studies_user_updated" ON "studies" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "study_chapters_study_ord" ON "study_chapters" USING btree ("study_id","ord");