import { NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/db/pool";
import { getAuthUser } from "@/lib/auth";

const idSchema = z.coerce.number().int().positive().max(2147483647);

const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Reply cannot be empty")
    .max(5000, "Reply must be 5000 characters or less"),
});

export async function POST(request, { params }) {
  let client;

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
    const id = parsedId.data;

    const body = await request.json().catch(() => null);
    const parsedBody = messageSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0].message },
        { status: 400 },
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const ticket = await client.query(
      "SELECT id FROM tickets WHERE id = $1 FOR UPDATE",
      [id],
    );

    if (ticket.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const message = await client.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, body)
       VALUES ($1, $2, 'ADMIN', $3)
       RETURNING id, sender_role, body, created_at`,
      [id, user.id, parsedBody.data.body],
    );

    await client.query(
      `UPDATE tickets
       SET status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END,
           updated_at = NOW()
       WHERE id = $1`,
      [id],
    );

    await client.query("COMMIT");

    return NextResponse.json({ message: message.rows[0] }, { status: 201 });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Send reply error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  } finally {
    if (client) client.release();
  }
}
