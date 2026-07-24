import { NextRequest } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, ilike, desc, count, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiCreated, apiError, getSearchParams } from "@/lib/api-response";

// GET /admin/clients - List all clients (paginated, searchable)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { page, limit, offset, search, status } = getSearchParams(req);

    const conditions = [];
    if (search) {
      conditions.push(
        sql`${ilike(clients.name, `%${search}%`)} OR ${ilike(clients.taxId, `%${search}%`)} OR ${ilike(clients.tenantCode, `%${search}%`)}`
      );
    }
    if (status) {
      conditions.push(eq(clients.status, status as any));
    }

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(clients)
      .where(whereClause);

    const data = await db
      .select()
      .from(clients)
      .where(whereClause)
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset);

    return apiSuccess({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

// POST /admin/clients - Create a new client
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    const {
      name,
      taxId,
      registrationNumber,
      lineOfBusiness,
      industryCode,
      licenseNumber,
      internalReferenceCode,
      currency,
      timeZone,
      notes,
      zimraDeviceId,
      clerkOrgId,
    } = body;

    if (!name) {
      return apiError({ statusCode: 400, message: "Name is required" });
    }

    // Generate tenant code
    const tenantCode = generateTenantCode(name);

    const [client] = await db
      .insert(clients)
      .values({
        name,
        taxId,
        registrationNumber,
        lineOfBusiness,
        industryCode,
        licenseNumber,
        internalReferenceCode,
        currency: currency || "USD",
        timeZone: timeZone || "Africa/Harare",
        notes,
        zimraDeviceId,
        tenantCode,
        clerkOrgId: clerkOrgId || null,
        status: "ACTIVE",
      })
      .returning();

    return apiCreated(client);
  } catch (error) {
    return apiError(error);
  }
}

function generateTenantCode(name: string): string {
  const prefix = "FGEM";
  const namePart = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 6)
    .toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${namePart}${randomPart}`;
}
