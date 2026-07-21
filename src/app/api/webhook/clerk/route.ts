import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { db } from "@/db";
import { userAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/webhook/clerk - Clerk webhook for user lifecycle events
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Verify webhook signature
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = evt;

  switch (type) {
    case "user.created":
    case "user.updated": {
      const clerkUserId = data.id;
      const email =
        data.email_addresses?.[0]?.email_address || null;
      const username = data.username || email?.split("@")[0] || "unknown";
      const fullName = [data.first_name, data.last_name]
        .filter(Boolean)
        .join(" ") || username;

      // Check if user exists
      const existing = await db.query.userAccounts.findFirst({
        where: eq(userAccounts.clerkUserId, clerkUserId),
      });

      if (existing) {
        await db
          .update(userAccounts)
          .set({
            email,
            fullName,
            username,
          })
          .where(eq(userAccounts.clerkUserId, clerkUserId));
      }
      // Note: User provisioning on first login is handled by provisionUser()
      break;
    }

    case "user.deleted": {
      const clerkUserId = data.id;
      await db
        .update(userAccounts)
        .set({ isDeleted: true, status: "DELETED" })
        .where(eq(userAccounts.clerkUserId, clerkUserId));
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
