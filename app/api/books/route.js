import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import pool from "@/db/pool";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 },
      );
    }

    if (user.role !== "AUTHOR") {
      return NextResponse.json(
        { error: "Only authors have a books list" },
        { status: 403 },
      );
    }

    const result = await pool.query(
      `SELECT book_id, title, isbn, genre, publication_date, status, mrp,
              total_copies_sold, total_royalty_earned, royalty_paid, royalty_pending
       FROM books
       WHERE author_id = $1
       ORDER BY publication_date DESC NULLS LAST, title ASC`,
      [user.authorId],
    );

    return NextResponse.json({ books: result.rows }, { status: 200 });
  } catch (err) {
    console.error("Books error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
