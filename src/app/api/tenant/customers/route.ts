import { NextRequest } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and, desc, count, ilike } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiCreated, apiError, getSearchParams } from "@/lib/api-response";

// GET /tenant/customers
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const { page, limit, offset, search } = getSearchParams(req);

    const conditions = [
      eq(customers.clientId, ctx.clientId!),
      eq(customers.deleted, false),
    ];
    if (search) {
      conditions.push(ilike(customers.name, `%${search}%`));
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(customers)
      .where(whereClause);

    const data = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    return apiSuccess({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return apiError(error);
  }
}

// POST /tenant/customers
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const body = await req.json();

    const { name, tradeName, tin, vatNumber, phone, email, province, city, street, houseNo, district, notes } = body;

    if (!name) {
      return apiError({ statusCode: 400, message: "Customer name is required" });
    }

    const [customer] = await db
      .insert(customers)
      .values({
        clientId: ctx.clientId!,
        name,
        tradeName,
        tin,
        vatNumber,
        phone,
        email,
        province,
        city,
        street,
        houseNo,
        district,
        notes,
        createdBy: ctx.userId,
      })
      .returning();

    return apiCreated(customer);
  } catch (error) {
    return apiError(error);
  }
}
