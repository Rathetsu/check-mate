CREATE TABLE "study_members" (
	"study_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_members_study_id_user_id_pk" PRIMARY KEY("study_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "study_members" ADD CONSTRAINT "study_members_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_members" ADD CONSTRAINT "study_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_members_user" ON "study_members" USING btree ("user_id");