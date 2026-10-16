CREATE TABLE IF NOT EXISTS authors (
  author_id   TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  city        TEXT,
  joined_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('AUTHOR', 'ADMIN')),
  author_id     TEXT REFERENCES authors(author_id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (role = 'AUTHOR' AND author_id IS NOT NULL) OR
    (role = 'ADMIN' AND author_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS books (
  book_id                  TEXT PRIMARY KEY,
  author_id                TEXT NOT NULL REFERENCES authors(author_id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  isbn                     TEXT NOT NULL UNIQUE,
  genre                    TEXT,
  publication_date         DATE,
  status                   TEXT NOT NULL,
  mrp                      INTEGER,
  author_royalty_per_copy  INTEGER,
  total_copies_sold        INTEGER NOT NULL DEFAULT 0,
  total_royalty_earned     INTEGER NOT NULL DEFAULT 0,
  royalty_paid             INTEGER NOT NULL DEFAULT 0,
  royalty_pending          INTEGER NOT NULL DEFAULT 0,
  last_royalty_payout_date DATE,
  print_partner            TEXT,
  available_on             TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tickets (
  id                SERIAL PRIMARY KEY,
  author_id         TEXT NOT NULL REFERENCES authors(author_id) ON DELETE CASCADE,
  book_id           TEXT REFERENCES books(book_id) ON DELETE SET NULL,
  subject           TEXT NOT NULL,
  description       TEXT NOT NULL,
  attachment_name   TEXT,
  status            TEXT NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  category          TEXT NOT NULL DEFAULT 'General Inquiry'
                    CHECK (category IN (
                      'Royalty & Payments',
                      'ISBN & Metadata Issues',
                      'Printing & Quality',
                      'Distribution & Availability',
                      'Book Status & Production Updates',
                      'General Inquiry'
                    )),
  ai_category       TEXT
                    CHECK (ai_category IN (
                      'Royalty & Payments',
                      'ISBN & Metadata Issues',
                      'Printing & Quality',
                      'Distribution & Availability',
                      'Book Status & Production Updates',
                      'General Inquiry'
                    )),
  priority          TEXT NOT NULL DEFAULT 'Medium'
                    CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  ai_priority       TEXT CHECK (ai_priority IN ('Critical', 'High', 'Medium', 'Low')),
  ai_status         TEXT NOT NULL DEFAULT 'pending'
                    CHECK (ai_status IN ('pending', 'done', 'failed')),
  ai_draft          TEXT,
  assigned_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('AUTHOR', 'ADMIN')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_notes (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  admin_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_author ON books(author_id);
CREATE INDEX IF NOT EXISTS idx_tickets_author ON tickets(author_id);
CREATE INDEX IF NOT EXISTS idx_tickets_queue ON tickets(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notes_ticket ON internal_notes(ticket_id, created_at);