CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "study_likes" (
	"study_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_likes_study_id_user_id_pk" PRIMARY KEY("study_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "study_likes" ADD CONSTRAINT "study_likes_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_likes" ADD CONSTRAINT "study_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_likes_user" ON "study_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "studies_topics" ON "studies" USING gin ("topics");--> statement-breakpoint
CREATE INDEX "studies_name_trgm" ON "studies" USING gin ("name" gin_trgm_ops);