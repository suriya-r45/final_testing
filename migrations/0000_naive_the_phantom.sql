CREATE TABLE "bills" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_address" text NOT NULL,
	"currency" text NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"making_charges" numeric(12, 2) NOT NULL,
	"gst" numeric(12, 2) NOT NULL,
	"vat" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) NOT NULL,
	"payment_method" text DEFAULT 'CASH' NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bills_bill_number_unique" UNIQUE("bill_number")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"price_inr" numeric(10, 2) NOT NULL,
	"price_bhd" numeric(10, 3) NOT NULL,
	"gross_weight" numeric(8, 2) NOT NULL,
	"net_weight" numeric(8, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"images" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'guest' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
