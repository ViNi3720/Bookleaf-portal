import pool from "@/db/pool";
import { classifyTicket } from "./ai";

export async function classifyAndSaveTicket(ticketId) {
  try {
    const ticketResult = await pool.query(
      `SELECT t.subject, t.description, b.status AS book_status
       FROM tickets t
       LEFT JOIN books b ON b.book_id = t.book_id
       WHERE t.id = $1`,
      [ticketId],
    );
    const ticket = ticketResult.rows[0];

    if (!ticket) return false;

    const { category, priority } = await classifyTicket({
      subject: ticket.subject,
      description: ticket.description,
      bookStatus: ticket.book_status,
    });

    await pool.query(
      `UPDATE tickets
       SET ai_category = $1, ai_priority = $2,
           category = $1, priority = $2,
           ai_status = 'done', updated_at = NOW()
       WHERE id = $3 AND ai_status <> 'done'`,
      [category, priority, ticketId],
    );

    return true;
  } catch (err) {
    console.error(
      `AI classification failed for ticket ${ticketId}:`,
      err.message,
    );

    await pool
      .query(
        `UPDATE tickets SET ai_status = 'failed', updated_at = NOW()
         WHERE id = $1 AND ai_status <> 'done'`,
        [ticketId],
      )
      .catch(() => {});

    return false;
  }
}
