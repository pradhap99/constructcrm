DO $$ BEGIN
 CREATE TYPE "public"."bill_status" AS ENUM('DRAFT', 'SUBMITTED', 'CERTIFIED', 'PAID', 'DISPUTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."client_type" AS ENUM('Government', 'Private', 'PSU', 'PPP');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."plan_tier" AS ENUM('TRIAL', 'STARTER', 'PRO');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."project_status" AS ENUM('AWARDED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."tender_status" AS ENUM('EOI', 'BIDDING', 'SUBMITTED', 'EVALUATION', 'WON', 'LOST');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'MANAGER', 'VIEWER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"bill_number" text NOT NULL,
	"bill_date" date NOT NULL,
	"status" "bill_status" DEFAULT 'DRAFT' NOT NULL,
	"gross_amount" numeric(18, 2) NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL,
	"gst_amount" numeric(18, 2) NOT NULL,
	"tds_rate" numeric(5, 2) NOT NULL,
	"tds_amount" numeric(18, 2) NOT NULL,
	"retention_rate" numeric(5, 2) NOT NULL,
	"retention_amount" numeric(18, 2) NOT NULL,
	"mob_advance_recovery" numeric(18, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(18, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(18, 2) NOT NULL,
	"certified_amount" numeric(18, 2),
	"paid_amount" numeric(18, 2),
	"submitted_date" date,
	"certified_date" date,
	"paid_date" date,
	"attachment_url" text,
	"notes" text,
	"embedding_pending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "client_type" NOT NULL,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gst_number" text,
	"pan_number" text,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"contract_value" numeric(18, 2) NOT NULL,
	"status" "project_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"site_address" text,
	"description" text,
	"variations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(64) NOT NULL,
	"default_gst_rate" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"default_tds_rate" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"default_retention_rate" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"gst_number" text,
	"pan_number" text,
	"plan_tier" "plan_tier" DEFAULT 'TRIAL' NOT NULL,
	"trial_ends_at" timestamp DEFAULT now() + interval '14 days' NOT NULL,
	"razorpay_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"type" "client_type" NOT NULL,
	"estimated_value" numeric(18, 2),
	"bid_value" numeric(18, 2),
	"status" "tender_status" DEFAULT 'EOI' NOT NULL,
	"submission_date" date,
	"reference_number" text,
	"notes" text,
	"converted_project_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'MANAGER' NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voice_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid,
	"audio_url" text NOT NULL,
	"transcript" text,
	"extracted_json" jsonb,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenders" ADD CONSTRAINT "tenders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenders" ADD CONSTRAINT "tenders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenders" ADD CONSTRAINT "tenders_converted_project_id_projects_id_fk" FOREIGN KEY ("converted_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_tenant_idx" ON "bills" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_project_idx" ON "bills" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_tenant_status_idx" ON "bills" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bills_tenant_number_uq" ON "bills" USING btree ("tenant_id","bill_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_tenant_idx" ON "clients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_tenant_idx" ON "projects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_client_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_tenant_code_uq" ON "projects" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenders_tenant_idx" ON "tenders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenders_tenant_status_idx" ON "tenders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_email_uq" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voice_notes_tenant_idx" ON "voice_notes" USING btree ("tenant_id");