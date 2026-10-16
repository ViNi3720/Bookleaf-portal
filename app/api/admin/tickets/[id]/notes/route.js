import { NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/db/pool";
import { getAuthUser } from "@/lib/auth";

const idSchema = z.coerce.number().int().positive().max(2147483647);

const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Note cannot be empty")
    .max(2000, "Note must be 2000 characters or less"),
});

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access only" }, { status: 403 });
    }

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);

    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsedBody = noteSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0].message },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO internal_notes (ticket_id, admin_id, body)
       SELECT id, $2, $3 FROM tickets WHERE id = $1
       RETURNING id, body, created_at`,
      [parsedId.data, user.id, parsedBody.data.body],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ note: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Add note error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
