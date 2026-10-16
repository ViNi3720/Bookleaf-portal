import { NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/db/pool";
import { getAuthUser } from "@/lib/auth";

const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

const idSchema = z.coerce.number().int().positive().max(2147483647);

const updateSchema = z
  .object({
    status: z.enum(STATUSES, { message: "Invalid status" }).optional(),
    category: z.enum(CATEGORIES, { message: "Invalid category" }).optional(),
    priority: z.enum(PRIORITIES, { message: "Invalid priority" }).optional(),
    assignToMe: z
      .literal(true, { message: "assignToMe must be true" })
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nothing to update",
  });

async function authorizeAdmin(params) {
  const user = await getAuthUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Not logged in" }, { status: 401 }),
    };
  }
  if (user.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Admin access only" }, { status: 403 }),
    };
  }

  const { id: rawId } = await params;
  const parsedId = idSchema.safeParse(rawId);

  if (!parsedId.success) {
    return {
      error: NextResponse.json({ error: "Invalid ticket id" }, { status: 400 }),
    };
  }

  return { user, id: parsedId.data };
}

export async function GET(request, { params }) {
  try {
    const auth = await authorizeAdmin(params);
    if (auth.error) return auth.error;
    const { user, id } = auth;

    const ticketResult = await pool.query(
      `SELECT t.id, t.subject, t.description, t.status, t.category, t.priority,
              t.ai_category, t.ai_priority, t.ai_status, t.ai_draft,
              t.attachment_name, t.created_at, t.assigned_admin_id,
              a.name AS author_name, a.email AS author_email,
              b.title AS book_title, b.status AS book_status,
              u.name AS assigned_admin_name
       FROM tickets t
       JOIN authors a ON a.author_id = t.author_id
       LEFT JOIN books b ON b.book_id = t.book_id
       LEFT JOIN users u ON u.id = t.assigned_admin_id
       WHERE t.id = $1`,
      [id],
    );

    if (ticketResult.rowCount === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const [messagesResult, notesResult] = await Promise.all([
      pool.query(
        `SELECT m.id, m.sender_role, m.body, m.created_at, u.name AS sender_name
         FROM ticket_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.ticket_id = $1
         ORDER BY m.created_at ASC`,
        [id],
      ),
      pool.query(
        `SELECT n.id, n.body, n.created_at, u.name AS admin_name
         FROM internal_notes n
         JOIN users u ON u.id = n.admin_id
         WHERE n.ticket_id = $1
         ORDER BY n.created_at ASC`,
        [id],
      ),
    ]);

    return NextResponse.json(
      {
        ticket: ticketResult.rows[0],
        messages: messagesResult.rows,
        notes: notesResult.rows,
        currentAdminId: user.id,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Admin ticket detail error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await authorizeAdmin(params);
    if (auth.error) return auth.error;
    const { user, id } = auth;

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const sets = [];
    const values = [];

    for (const field of ["status", "category", "priority"]) {
      if (data[field]) {
        values.push(data[field]);
        sets.push(`${field} = $${values.length}`);
      }
    }

    if (data.assignToMe) {
      values.push(user.id);
      sets.push(`assigned_admin_id = $${values.length}`);
    }

    sets.push("updated_at = NOW()");
    values.push(id);

    const result = await pool.query(
      `UPDATE tickets
       SET ${sets.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, status, category, priority, assigned_admin_id`,
      values,
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket: result.rows[0] }, { status: 200 });
  } catch (err) {
    console.error("Admin ticket update error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
