CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"machine_id" text,
	"api_key_hash" text,
	"status" text,
	"online" boolean,
	"last_seen" timestamp,
	"last_ip_address" text,
	"agent_version" text,
	"os" text,
	"os_version" text,
	"device_name" text,
	"type" text,
	"installed_at" timestamp,
	"deleted" boolean DEFAULT false NOT NULL,
	"agent_number" text NOT NULL,
	"public_key" text,
	"device_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"last_modified_by" text,
	CONSTRAINT "agents_agent_number_unique" UNIQUE("agent_number")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tax_id" text,
	"registration_number" text,
	"line_of_business" text,
	"industry_code" text,
	"license_number" text,
	"internal_reference_code" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"currency" text,
	"time_zone" text,
	"notes" text,
	"zimra_device_id" integer,
	"tenant_code" text,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"last_modified_by" text,
	"clerk_org_id" text,
	CONSTRAINT "clients_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"trade_name" text,
	"tin" text,
	"vat_number" text,
	"phone" text,
	"email" text,
	"province" text,
	"city" text,
	"street" text,
	"house_no" text,
	"district" text,
	"notes" text,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"last_modified_by" text
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" integer,
	"serial_number" text,
	"device_model_name" text,
	"device_model_version" text,
	"activation_key" text,
	"csr" text,
	"certificate" text,
	"registration_response_json" text,
	"key_material_urls" text,
	"common_name" text,
	"activated" boolean DEFAULT false,
	"client_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"last_modified_by" text
);
--> statement-breakpoint
CREATE TABLE "fiscal_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"fiscal_day_no" integer NOT NULL,
	"fiscal_day_opened" timestamp NOT NULL,
	"fiscal_day_closed" timestamp,
	"status" text DEFAULT 'OPENED' NOT NULL,
	"open_operation_id" text,
	"close_operation_id" text,
	"reconciliation_mode" text,
	"closing_error_code" text,
	"receipt_counter" integer DEFAULT 0,
	"last_receipt_global_no" integer DEFAULT 0,
	"fiscal_day_counters_json" text,
	"fiscal_day_document_quantities_json" text,
	"fiscal_day_device_signature_hash" text,
	"fiscal_day_device_signature" text,
	"fiscal_day_server_signature_hash" text,
	"fiscal_day_server_signature" text,
	"fiscal_day_server_signature_thumbprint" text,
	"fiscal_day_server_signature_verified" boolean,
	"fiscal_day_server_signature_verification_error" text,
	"fdms_open_response_json" text,
	"fdms_close_response_json" text,
	"fdms_status_response_json" text,
	"submit_file_operation_id" text,
	"submit_file_sequence" integer,
	"fdms_submit_file_response_json" text,
	"submit_file_source" text,
	"submit_file_status" text,
	"submit_file_submitted_at" timestamp with time zone,
	"submit_file_base64_size" integer,
	"submit_file_decoded_json_size" integer,
	"submit_file_checksum_sha256" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"last_modified_by" text
);
--> statement-breakpoint
CREATE TABLE "fiscal_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"shop_id" uuid,
	"fiscal_day_id" uuid,
	"fiscal_day_no" integer,
	"receipt_global_no" integer,
	"receipt_counter" integer,
	"receipt_type" text,
	"invoice_no" text,
	"external_reference" text NOT NULL,
	"receipt_number" text,
	"original_payload_json" text NOT NULL,
	"fiscal_payload_json" text NOT NULL,
	"signed_payload_json" text,
	"fdms_response_json" text,
	"fdms_operation_id" text,
	"fdms_receipt_id" integer,
	"fdms_server_date" timestamp with time zone,
	"fdms_server_signature_hash" text,
	"fdms_server_signature" text,
	"fdms_server_signature_thumbprint" text,
	"fdms_server_signature_verified" boolean,
	"fdms_server_signature_verification_error" text,
	"fdms_validation_errors_json" text,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"received_at" timestamp NOT NULL,
	"processed_at" timestamp,
	"signed_at" timestamp,
	"sent_at" timestamp,
	"fiscalised_at" timestamp,
	"last_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"last_modified_by" text
);
--> statement-breakpoint
CREATE TABLE "shop_database_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"db_engine" text,
	"host" text,
	"port" integer,
	"database_name" text,
	"username" text,
	"password_encrypted" text,
	"ssl_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_database_configs_shop_id_unique" UNIQUE("shop_id")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"address" text,
	"contact_person" text,
	"contact_phone" text,
	"client_id" uuid NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"last_modified_by" text
);
--> statement-breakpoint
CREATE TABLE "user_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"full_name" text NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"last_modified_by" text,
	CONSTRAINT "user_accounts_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "user_accounts_username_unique" UNIQUE("username"),
	CONSTRAINT "user_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_days" ADD CONSTRAINT "fiscal_days_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_days" ADD CONSTRAINT "fiscal_days_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_receipts" ADD CONSTRAINT "fiscal_receipts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_receipts" ADD CONSTRAINT "fiscal_receipts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_receipts" ADD CONSTRAINT "fiscal_receipts_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_receipts" ADD CONSTRAINT "fiscal_receipts_fiscal_day_id_fiscal_days_id_fk" FOREIGN KEY ("fiscal_day_id") REFERENCES "public"."fiscal_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_database_configs" ADD CONSTRAINT "shop_database_configs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_shop_id" ON "agents" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_agent_device_id" ON "agents" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_client_tenant_code" ON "clients" USING btree ("tenant_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_client_clerk_org" ON "clients" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE INDEX "idx_client_status" ON "clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_customer_client_id" ON "customers" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_device_client_device_code" ON "devices" USING btree ("client_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_device_client_id" ON "devices" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_fiscal_day_client_device_no" ON "fiscal_days" USING btree ("client_id","device_id","fiscal_day_no");--> statement-breakpoint
CREATE INDEX "idx_fiscal_day_client_device_status" ON "fiscal_days" USING btree ("client_id","device_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_receipt_client_external_reference" ON "fiscal_receipts" USING btree ("client_id","external_reference");--> statement-breakpoint
CREATE INDEX "idx_receipt_client_id" ON "fiscal_receipts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_receipt_client_status" ON "fiscal_receipts" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "idx_receipt_client_device_fiscal_day" ON "fiscal_receipts" USING btree ("client_id","device_id","fiscal_day_no");--> statement-breakpoint
CREATE INDEX "idx_receipt_status_received_at" ON "fiscal_receipts" USING btree ("status","received_at");--> statement-breakpoint
CREATE INDEX "idx_shop_client_id" ON "shops" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_user_account_client_id" ON "user_accounts" USING btree ("client_id");