CREATE TYPE "public"."device_mode" AS ENUM('online', 'offline');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('draft', 'registered', 'active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('pending', 'submitted', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."fiscal_day_status" AS ENUM('open', 'closing', 'closed');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('draft', 'submitted', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_id" varchar(191),
	"action" varchar(128) NOT NULL,
	"entity_type" varchar(64),
	"entity_id" varchar(128),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"device_id" integer,
	"serial_number" varchar(64),
	"activation_key" varchar(32),
	"private_key" text,
	"mode" "device_mode" DEFAULT 'online' NOT NULL,
	"branch_name" varchar(256),
	"branch_address" jsonb,
	"branch_contacts" jsonb,
	"status" "device_status" DEFAULT 'draft' NOT NULL,
	"certificate_pem" text,
	"certificate_issued_at" timestamp with time zone,
	"certificate_expires_at" timestamp with time zone,
	"fdms_operation_id" varchar(64),
	"last_receipt_hash" varchar(64),
	"tax_rates" jsonb,
	"tax_payer_details" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"status" "file_status" DEFAULT 'pending' NOT NULL,
	"file_name" varchar(255),
	"payload" jsonb,
	"fdms_operation_id" varchar(64),
	"uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"fdms_day_no" integer,
	"status" "fiscal_day_status" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"summary" jsonb,
	"fdms_operation_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clerk_user_id" varchar(191) NOT NULL,
	"role" varchar(64) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" varchar(191) NOT NULL,
	"name" varchar(256) NOT NULL,
	"primary_tin" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"fiscal_day_id" uuid,
	"receipt_no" varchar(64),
	"currency" varchar(16) DEFAULT 'ZWL',
	"total" integer,
	"status" "receipt_status" DEFAULT 'draft' NOT NULL,
	"payload" jsonb NOT NULL,
	"previous_receipt_hash" varchar(64),
	"fdms_operation_id" varchar(64),
	"fdms_receipt_url" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_days" ADD CONSTRAINT "fiscal_days_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_fiscal_day_id_fiscal_days_id_fk" FOREIGN KEY ("fiscal_day_id") REFERENCES "public"."fiscal_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "devices_org_idx" ON "devices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "devices_device_id_idx" ON "devices" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "files_device_idx" ON "files" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "fiscal_days_device_idx" ON "fiscal_days" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_idx" ON "memberships" USING btree ("organization_id","clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_clerk_org_id_idx" ON "organizations" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE INDEX "receipts_device_idx" ON "receipts" USING btree ("device_id");