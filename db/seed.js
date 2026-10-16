const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./pool");

const AUTHOR_PASSWORD = process.env.SEED_AUTHOR_PASSWORD || "Author@123";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

const ADMINS = [
  { name: "BookLeaf Admin", email: "admin@bookleaf.com" },
  { name: "BookLeaf Support", email: "support@bookleaf.com" },
];

async function seed() {
  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const dataPath = path.join(
    __dirname,
    "..",
    "data",
    "bookleaf_sample_data.json",
  );
  const { authors } = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  const authorHash = await bcrypt.hash(AUTHOR_PASSWORD, 10);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(schemaSql);
    await client.query(
      "TRUNCATE ticket_messages, internal_notes, tickets, users, books, authors RESTART IDENTITY CASCADE",
    );

    for (const author of authors) {
      await client.query(
        `INSERT INTO authors (author_id, name, email, phone, city, joined_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          author.author_id,
          author.name,
          author.email,
          author.phone,
          author.city,
          author.joined_date,
        ],
      );

      await client.query(
        `INSERT INTO users (name, email, password_hash, role, author_id)
         VALUES ($1, $2, $3, 'AUTHOR', $4)`,
        [author.name, author.email, authorHash, author.author_id],
      );

      for (const book of author.books) {
        await client.query(
          `INSERT INTO books (
             book_id, author_id, title, isbn, genre, publication_date, status,
             mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned,
             royalty_paid, royalty_pending, last_royalty_payout_date,
             print_partner, available_on
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            book.book_id,
            author.author_id,
            book.title,
            book.isbn,
            book.genre,
            book.publication_date,
            book.status,
            book.mrp,
            book.author_royalty_per_copy,
            book.total_copies_sold,
            book.total_royalty_earned,
            book.royalty_paid,
            book.royalty_pending,
            book.last_royalty_payout_date,
            book.print_partner,
            book.available_on,
          ],
        );
      }
    }

    for (const admin of ADMINS) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, author_id)
         VALUES ($1, $2, $3, 'ADMIN', NULL)`,
        [admin.name, admin.email, adminHash],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM authors)::int AS authors,
       (SELECT COUNT(*) FROM books)::int AS books,
       (SELECT COUNT(*) FROM users)::int AS users`,
  );
  const { authors: a, books: b, users: u } = counts.rows[0];
  console.log(`Seed complete: ${a} authors, ${b} books, ${u} users`);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
