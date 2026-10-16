import { NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/db/pool";
import { getAuthUser } from "@/lib/auth";
import { generateDraft } from "@/lib/ai";

export const maxDuration = 60;

const idSchema = z.coerce.number().int().positive().max(2147483647);

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
    const id = parsedId.data;

    const ticketResult = await pool.query(
      `SELECT t.id, t.subject, t.description, t.category, t.book_id, t.author_id,
              a.name AS author_name
       FROM tickets t
       JOIN authors a ON a.author_id = t.author_id
       WHERE t.id = $1`,
      [id],
    );
    const ticket = ticketResult.rows[0];

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    let book = null;
    let allBooks = [];

    if (ticket.book_id) {
      const bookResult = await pool.query(
        "SELECT * FROM books WHERE book_id = $1",
        [ticket.book_id],
      );
      book = bookResult.rows[0] || null;
    } else {
      const booksResult = await pool.query(
        `SELECT title, status, publication_date, royalty_pending
         FROM books WHERE author_id = $1
         ORDER BY publication_date DESC NULLS LAST`,
        [ticket.author_id],
      );
      allBooks = booksResult.rows;
    }

    const messagesResult = await pool.query(
      `SELECT sender_role, body FROM ticket_messages
       WHERE ticket_id = $1
       ORDER BY created_at DESC
       LIMIT 4`,
      [id],
    );
    const messages = messagesResult.rows.reverse();

    let draft;
    try {
      draft = await generateDraft({
        authorName: ticket.author_name,
        book,
        allBooks,
        ticket,
        messages,
      });
    } catch (err) {
      console.error(`AI draft failed for ticket ${id}:`, err.message);

      const message =
        err.status === 429
          ? "AI is busy right now (rate limit). Try again in a minute, or write the reply manually."
          : "AI is unavailable right now. You can write the reply manually.";

      return NextResponse.json({ error: message }, { status: 503 });
    }

    await pool.query(
      "UPDATE tickets SET ai_draft = $1, updated_at = NOW() WHERE id = $2",
      [draft, id],
    );

    return NextResponse.json({ draft }, { status: 200 });
  } catch (err) {
    console.error("Draft route error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
