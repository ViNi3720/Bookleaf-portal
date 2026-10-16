import { NextResponse, after } from "next/server";
import { z } from "zod";
import pool from "@/db/pool";
import { getAuthUser } from "@/lib/auth";
import { classifyAndSaveTicket } from "@/lib/ticketAi";

export const maxDuration = 30;

const createTicketSchema = z.object({
  bookId: z.string().trim().min(1).nullable().optional(),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(150, "Subject must be 150 characters or less"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be 5000 characters or less"),
  attachmentName: z.string().max(255).nullable().optional(),
});

export async function POST(request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    if (user.role !== "AUTHOR") {
      return NextResponse.json(
        { error: "Only authors can submit support queries" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { bookId, subject, description, attachmentName } = parsed.data;

    if (bookId) {
      const book = await pool.query(
        "SELECT 1 FROM books WHERE book_id = $1 AND author_id = $2",
        [bookId, user.authorId],
      );
      if (book.rowCount === 0) {
        return NextResponse.json(
          { error: "Selected book was not found in your account" },
          { status: 400 },
        );
      }
    }

    const result = await pool.query(
      `INSERT INTO tickets (author_id, book_id, subject, description, attachment_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, subject, description, status, book_id, attachment_name, created_at`,
      [
        user.authorId,
        bookId ?? null,
        subject,
        description,
        attachmentName ?? null,
      ],
    );
    after(() => classifyAndSaveTicket(result.rows[0].id));

    return NextResponse.json({ ticket: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Create ticket error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    if (user.role !== "AUTHOR") {
      return NextResponse.json(
        { error: "Only authors have a tickets list" },
        { status: 403 },
      );
    }

    const ticketsResult = await pool.query(
      `SELECT t.id, t.subject, t.description, t.status, t.book_id,
              b.title AS book_title, t.attachment_name, t.created_at, t.updated_at
       FROM tickets t
       LEFT JOIN books b ON b.book_id = t.book_id
       WHERE t.author_id = $1
       ORDER BY t.created_at DESC`,
      [user.authorId],
    );
    const tickets = ticketsResult.rows;

    let messages = [];
    if (tickets.length > 0) {
      const messagesResult = await pool.query(
        `SELECT id, ticket_id, sender_role, body, created_at
         FROM ticket_messages
         WHERE ticket_id = ANY($1::int[])
         ORDER BY created_at ASC`,
        [tickets.map((t) => t.id)],
      );
      messages = messagesResult.rows;
    }

    const withMessages = tickets.map((ticket) => ({
      ...ticket,
      messages: messages.filter((m) => m.ticket_id === ticket.id),
    }));

    return NextResponse.json({ tickets: withMessages }, { status: 200 });
  } catch (err) {
    console.error("List tickets error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
