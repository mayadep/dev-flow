CREATE SEQUENCE "public"."sync_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "attempts" (
	"learner_id" uuid NOT NULL,
	"id" text NOT NULL,
	"session_id" text NOT NULL,
	"question_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"difficulty" smallint NOT NULL,
	"correct" boolean NOT NULL,
	"hints_used" smallint NOT NULL,
	"response_ms" integer NOT NULL,
	"pace" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "attempts_learner_id_id_pk" PRIMARY KEY("learner_id","id")
);
--> statement-breakpoint
CREATE TABLE "learners" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memos" (
	"learner_id" uuid NOT NULL,
	"id" text NOT NULL,
	"text" text NOT NULL,
	"session_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "memos_learner_id_id_pk" PRIMARY KEY("learner_id","id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"learner_id" uuid NOT NULL,
	"id" text NOT NULL,
	"topic_ids" text[] NOT NULL,
	"goal" jsonb NOT NULL,
	"answered" integer NOT NULL,
	"correct" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "sessions_learner_id_id_pk" PRIMARY KEY("learner_id","id")
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_learner_seq" ON "attempts" USING btree ("learner_id","seq");--> statement-breakpoint
CREATE INDEX "memos_learner_seq" ON "memos" USING btree ("learner_id","seq");--> statement-breakpoint
CREATE INDEX "sessions_learner_seq" ON "sessions" USING btree ("learner_id","seq");