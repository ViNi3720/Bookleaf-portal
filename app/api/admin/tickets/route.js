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
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const filterSchema = z.object({
  status: z.enum(STATUSES, { message: "Invalid status filter" }).optional(),
  category: z
    .enum(CATEGORIES, { message: "Invalid category filter" })
    .optional(),
  priority: z
    .enum(PRIORITIES, { message: "Invalid priority filter" })
    .optional(),
  from: z
    .string()
    .regex(DATE_PATTERN, "From date must be YYYY-MM-DD")
    .optional(),
  to: z.string().regex(DATE_PATTERN, "To date must be YYYY-MM-DD").optional(),
});

export async function GET(request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = filterSchema.safeParse({
      status: searchParams.get("status") || undefined,
      category: searchParams.get("category") || undefined,
      priority: searchParams.get("priority") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { status, category, priority, from, to } = parsed.data;

    if (from && to && from > to) {
      return NextResponse.json(
        { error: "From date must be before To date" },
        { status: 400 },
      );
    }

    const conditions = [];
    const values = [];

    if (status) {
      values.push(status);
      conditions.push(`t.status = $${values.length}`);
    }
    if (category) {
      values.push(category);
      conditions.push(`t.category = $${values.length}`);
    }
    if (priority) {
      values.push(priority);
      conditions.push(`t.priority = $${values.length}`);
    }
    if (from) {
      values.push(from);
      conditions.push(`t.created_at >= $${values.length}::date`);
    }
    if (to) {
      values.push(to);
      conditions.push(
        `t.created_at < ($${values.length}::date + INTERVAL '1 day')`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT t.id, t.subject, t.status, t.category, t.priority, t.ai_status,
              t.created_at, t.assigned_admin_id,
              a.name AS author_name,
              b.title AS book_title,
              u.name AS assigned_admin_name
       FROM tickets t
       JOIN authors a ON a.author_id = t.author_id
       LEFT JOIN books b ON b.book_id = t.book_id
       LEFT JOIN users u ON u.id = t.assigned_admin_id
       ${where}
       ORDER BY
         CASE WHEN t.status IN ('Open', 'In Progress') THEN 0 ELSE 1 END,
         CASE t.priority
           WHEN 'Critical' THEN 1
           WHEN 'High' THEN 2
           WHEN 'Medium' THEN 3
           ELSE 4
         END,
         t.created_at ASC
       LIMIT 200`,
      values,
    );

    return NextResponse.json({ tickets: result.rows }, { status: 200 });
  } catch (err) {
    if (err.code && err.code.startsWith("22")) {
      return NextResponse.json(
        { error: "Invalid date filter" },
        { status: 400 },
      );
    }
    console.error("Admin tickets error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
