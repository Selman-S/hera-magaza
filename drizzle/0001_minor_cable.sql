CREATE TYPE "public"."email_status" AS ENUM('sent', 'mocked', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('none', 'pending', 'issued', 'failed');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"template" text NOT NULL,
	"html" text NOT NULL,
	"status" "email_status" NOT NULL,
	"provider_id" text,
	"error" text,
	"order_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"level" "log_level" NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trendyol_packages" (
	"shipment_package_id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"status" text NOT NULL,
	"lines" jsonb NOT NULL,
	"stock_applied" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trendyol_stock_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"status" "sync_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"batch_request_id" text,
	"sent_quantity" integer,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_status" "invoice_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_no" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_error" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "purchase_tracked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "review_invite_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "provider_ref" text;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trendyol_stock_queue" ADD CONSTRAINT "trendyol_stock_queue_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_logs_created_idx" ON "email_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sync_logs_created_idx" ON "sync_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trendyol_queue_status_idx" ON "trendyol_stock_queue" USING btree ("status","next_attempt_at");