CREATE TYPE "public"."run_status" AS ENUM('running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'queued', 'running', 'review', 'done', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '🙂' NOT NULL,
	"color" text DEFAULT '#f28cb4' NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"model" text DEFAULT 'claude-opus-5-5' NOT NULL,
	"system_prompt" text,
	"building_id" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"task_id" text,
	"agent_id" text,
	"run_id" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"agent_id" text,
	"status" "run_status" DEFAULT 'running' NOT NULL,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"stop_reason" text,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"assignee_id" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"xp" integer DEFAULT 20 NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"result" text,
	"error" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"task_id" text,
	"amount" integer NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_agents_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_created_idx" ON "events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "tasks" USING btree ("assignee_id");