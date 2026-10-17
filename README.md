# BookLeaf Author Support & Communication Portal

A web app where BookLeaf authors raise support tickets and the operations team handles them faster, with AI-assisted classification, prioritisation and reply drafting.

- **Live demo:** bookleaf-portal-qaeki5tv6-challenger9.vercel.app
- **Stack:** Next.js (App Router), PostgreSQL (Neon), Tailwind CSS, Google Gemini API

---

## Test credentials

The live demo is pre-seeded with the provided dataset (10 authors, 18 books).

| Role   | Email                      | Password     |
| ------ | -------------------------- | ------------ |
| Admin  | `admin@bookleaf.com`       | `Admin@123`  |
| Admin  | `support@bookleaf.com`     | `Admin@123`  |
| Author | `priya.sharma@email.com`   | `Author@123` |
| Author | `sneha.kulkarni@email.com` | `Author@123` |

Every author in the dataset can log in with their email from the JSON file and the password `Author@123`.

Good accounts for edge cases:

- `sneha.kulkarni@email.com`: has a book still in production (_Midnight in Mysore_, cover design).
- `kavita.deshmukh@email.com`: has a book in typesetting, and a published book with royalty pending below the Rs. 1,000 payout threshold.
- `ananya.reddy@email.com`: published book with royalty pending and no payout made yet.

---

## What is built

**Author portal**

- Email and password login. Each author only sees their own data.
- **My Books:** title, ISBN, genre, publication date, status, MRP, copies sold, royalty earned, paid and pending. Books in production are shown with a status badge and a note instead of empty numbers.
- **Submit a Support Query:** book dropdown (or "General / Account Level"), subject, description, optional attachment (UI only, the file name is saved).
- **My Tickets:** status, original query and admin replies. Updates automatically every 5 seconds without a page refresh.

**Admin portal**

- **Ticket queue:** filters for status, category, priority and date range. Unresolved tickets come first, then by priority, then oldest first. Unresolved tickets older than 48 hours are highlighted as overdue.
- **AI auto-classification** into the six BookLeaf categories, and an **AI priority score** (Critical, High, Medium, Low). Both can be overridden, and the page shows when an admin changed what the AI suggested.
- **AI-drafted reply**, generated when the admin opens a ticket. The admin can edit it before sending, and the sent reply appears on the author's ticket.
- **Ticket management:** change status, assign to self, add internal notes (never visible to authors).

---

## Run locally

**Requirements:** Node.js 20.6 or newer, a PostgreSQL database (a free Neon project works), and a Gemini API key from Google AI Studio.

```bash
git clone https://github.com/ViNi3720/Bookleaf-portal.git
cd bookleaf-portal
npm install
```

Create a `.env` file in the project root (see `.env.example`):

| Variable         | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string                                  |
| `JWT_SECRET`     | Long random string (32+ characters) used to sign login tokens |
| `GEMINI_API_KEY` | Google AI Studio API key                                      |
| `GEMINI_MODEL`   | Model name, for example `gemini-3.5-flash-lite`               |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create the tables and load the sample data:

```bash
node --env-file=.env db/seed.js
```

Expected output: `Seed complete: 10 authors, 18 books, 12 users`.

> The seed script **wipes all tables** before inserting. Run it once on a new database. Do not run it on the deployed database after real tickets exist.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

---

## Architecture

```
app/
  page.js                      Home page
  login/page.js                Login form
  components/Navbar.js         Role-based navigation
  author/
    books/page.js              My Books
    tickets/page.js            My Tickets (polling)
    tickets/new/page.js        Submit a query
  admin/tickets/
    page.js                    Ticket queue with filters
    [id]/page.js               Ticket detail, AI draft, notes
  api/
    login, logout, me          Authentication
    books, tickets             Author endpoints
    admin/tickets/...          Admin endpoints
db/
  schema.sql                   Table definitions
  seed.js                      Loads the sample data and demo users
  pool.js                      Shared PostgreSQL connection pool
lib/
  ai.js                        Gemini client, prompts, classification, drafting
  knowledge.js                 BookLeaf knowledge base, split by category
  ticketAi.js                  Classifies a ticket and saves the result
data/
  bookleaf_sample_data.json    Provided dataset
```

### Decisions and why

- **Next.js full stack in one repo.** The API routes and the UI deploy together on Vercel, so there is one deployment and one set of environment variables.
- **Plain SQL with `pg` instead of an ORM.** The schema is small, queries stay explicit, and every query is parameterised (`$1`, `$2`) so SQL injection is not possible.
- **Zod for validation.** Every write endpoint validates its input and returns a specific message instead of a generic 500.
- **Final value and AI value are stored separately.** `category` and `priority` hold the current value (what admins can override). `ai_category` and `ai_priority` keep what the AI originally said, so overrides are visible and the AI's accuracy can be measured later.
- **Users and authors are separate tables.** Login data (`users`) is kept apart from business data (`authors`). A database constraint guarantees an AUTHOR user always has an `author_id` and an ADMIN user never does.
- **Internal notes live in their own table.** The author-facing API never queries it, so notes cannot leak to authors by accident.
- **Money is stored as integers.** All amounts in the dataset are whole rupees, and this avoids `NUMERIC` values coming back as strings.
- **Dates are returned as plain strings.** The `pg` date parser is overridden, so a date like `2023-06-20` never shifts by a day because of time zones.

---

## Database schema

| Table             | Purpose                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `authors`         | Author profile from the dataset                                                                                                                 |
| `users`           | Login accounts (`AUTHOR` or `ADMIN`), bcrypt password hash                                                                                      |
| `books`           | Book details and royalty figures. `mrp`, `publication_date`, `author_royalty_per_copy` and `print_partner` are nullable for books in production |
| `tickets`         | Support tickets with status, category, priority, AI values, AI status, saved AI draft and assigned admin                                        |
| `ticket_messages` | Conversation between admin and author                                                                                                           |
| `internal_notes`  | Admin-only notes                                                                                                                                |

`tickets.book_id` is nullable, which represents "General / Account Level". Indexes cover the admin queue (`status, priority, created_at`) and per-author lookups.

---

## Authentication and access control

- Passwords are hashed with **bcrypt**. Login returns the same message for an unknown email and a wrong password.
- A signed **JWT** (7 days) is stored in an **httpOnly, sameSite=strict cookie**, so browser JavaScript cannot read it. The cookie is `secure` in production. Requests may also send `Authorization: Bearer <token>`.
- Every API route verifies the token first (`401` if missing or invalid), then checks the role (`403` if wrong).
- **Authors can only read their own data.** The author id always comes from the verified token, never from the request. When creating a ticket for a book, the API also checks that the book belongs to that author.
- Admins can access everything under `/api/admin/*`.

---

## AI integration

### Model choice

**Google Gemini (`gemini-3.5-flash-lite`)**, called through the REST API with `fetch`. It has a free tier with no card required, it is fast, and it supports structured JSON output, which makes classification reliable. The model name is an environment variable, so switching models needs no code change. This was a real example: the previous default model was retired for new users and only `.env` had to change. For production I would use a paid small model (Claude Haiku or gpt-4o-mini class) for higher rate limits and data-privacy terms.

### Classification and priority

- One call per new ticket returns both category and priority.
- Gemini is given a **JSON schema with enums**, so it can only answer with the six categories and four priorities. The server validates the result again before saving.
- The prompt contains a clear rubric (for example, "payment overdue for many months" is Critical, "update my author bio" is Low).
- **Rule on top of the AI:** an ISBN & Metadata issue is never below High, because the BookLeaf policy says ISBN errors are high priority.
- Classification runs **after the response is sent** (`after()` in Next.js), so the author never waits for the AI.

### Reply drafting

The draft is built from four things:

1. **Tone guidelines** from the knowledge base (empathetic, specific, own mistakes, clear timeline, clear next step).
2. **Only the policy section for the ticket's category**, plus a "how to respond" guide based on the sample queries.
3. **The author's real data** for the book in question: name, copies sold, royalty earned, paid and pending, last payout date, print partner and platforms.
4. **Facts calculated in code, not by the model:** the next payout deadline (quarter end plus 45 days), whether pending royalty is below the Rs. 1,000 threshold (it rolls over), and whether no payout has ever been made despite royalty above the threshold (flagged as possibly overdue, so the draft owns it and escalates with a 48-hour timeline). Books in production only receive status information, with no figures.

For tickets without a selected book, the model receives a short summary of all the author's books.

The draft is saved in `tickets.ai_draft`, shown automatically when an admin opens the ticket, and can be regenerated. Admins always edit before sending.

### Error handling and graceful degradation

- Tickets are **always created**, even if the AI is down. The ticket keeps the defaults (General Inquiry, Medium) and `ai_status = failed`.
- The queue shows "AI classifying..." while pending and "AI unavailable" on failure. The detail page explains that category and priority are defaults and must be checked.
- If drafting fails, the API returns `503` with a clear message (a separate one for rate limits), and the admin can write the reply manually.
- Requests time out after 20 seconds, and the API key is never logged.

### Cost awareness

- Classification sends only the subject and description (each cut to 1,500 characters), with no knowledge base and no history.
- Drafting sends only the **relevant category's** policy, **one book's** data and the **last 4 messages**, not the whole knowledge base or full ticket history.
- Drafts are cached in the database, so reopening a ticket does not call the AI again.
- Classification runs once per ticket.

### Security

- `GEMINI_API_KEY` is only read on the server from environment variables. It is never sent to the browser and not prefixed with `NEXT_PUBLIC_`.
- Ticket text is wrapped in tags and the prompts instruct the model to treat it as data, never as instructions (basic prompt-injection protection).

---

## Real-time updates

Polling, chosen because Vercel's serverless functions do not support long-lived WebSocket connections.

- Author's **My Tickets** refreshes every **5 seconds**.
- Admin **ticket queue** refreshes every **10 seconds**.
- Polling pauses when the browser tab is hidden. The first load shows a loading state and later refreshes update quietly, and a failed poll keeps the old data on screen.

---

## API documentation

All endpoints return JSON. Errors always have the shape `{ "error": "message" }`.

**Status codes:** `200` OK, `201` created, `400` invalid input, `401` not logged in or session expired, `403` wrong role, `404` not found, `503` AI unavailable, `500` unexpected error.

### Authentication

| Method | Endpoint      | Access    | Description                                                                                                                                                                    |
| ------ | ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/login`  | Public    | Body: `{ "email", "password" }`. Sets the `token` cookie. Returns `{ message, user: { id, name, email, role } }`. `400` if a field is missing, `401` if credentials are wrong. |
| POST   | `/api/logout` | Any       | Clears the cookie.                                                                                                                                                             |
| GET    | `/api/me`     | Logged in | Returns `{ user: { id, name, role } }`.                                                                                                                                        |

### Author endpoints (role: AUTHOR)

| Method | Endpoint       | Description                                                                                                                                                                                                                                                                      |
| ------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/books`   | The logged-in author's books, newest first, books in production last.                                                                                                                                                                                                            |
| POST   | `/api/tickets` | Create a ticket. Body: `{ "bookId": string or null, "subject": 1-150 chars, "description": 10-5000 chars, "attachmentName": optional string }`. Returns `201 { ticket }`. `400` if validation fails or the book is not the author's. Starts AI classification in the background. |
| GET    | `/api/tickets` | The author's tickets, newest first, each with its `messages` array (admin replies). Internal notes and AI fields are never included.                                                                                                                                             |

### Admin endpoints (role: ADMIN)

| Method | Endpoint                          | Description                                                                                                                                                                                             |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/admin/tickets`              | All tickets. Optional query params: `status`, `category`, `priority`, `from`, `to` (`YYYY-MM-DD`). Sorted by unresolved first, priority, then oldest. `400` for an invalid filter. Limited to 200 rows. |
| GET    | `/api/admin/tickets/:id`          | Ticket detail with author, book, AI values and draft, conversation, internal notes and `currentAdminId`.                                                                                                |
| PATCH  | `/api/admin/tickets/:id`          | Body: any of `{ "status", "category", "priority", "assignToMe": true }`. Overriding category or priority does not change the stored AI values.                                                          |
| POST   | `/api/admin/tickets/:id/messages` | Body: `{ "body": 1-5000 chars }`. Sends a reply to the author. An `Open` ticket moves to `In Progress`. Done in a transaction.                                                                          |
| POST   | `/api/admin/tickets/:id/notes`    | Body: `{ "body": 1-2000 chars }`. Adds an internal note.                                                                                                                                                |
| POST   | `/api/admin/tickets/:id/draft`    | Generates and saves an AI draft. Returns `{ draft }`, or `503` if the AI is unavailable.                                                                                                                |

Valid values: **status** `Open`, `In Progress`, `Resolved`, `Closed`. **priority** `Critical`, `High`, `Medium`, `Low`. **category** `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry`.

---

## Edge cases handled

- **Books in production** (_Midnight in Mysore_, _Raising Roots_): nullable price, date and print partner in the schema, a status badge and explanatory note in the UI, and production-only context for AI drafts.
- **Zero payouts** (four books): shown as Rs. 0 paid, and the draft explains the situation using the payout rules.
- **Pending royalty under Rs. 1,000** (for example Rs. 850): the draft explains the roll-over to the next quarter.
- **Empty states:** no books, no tickets, no matching filters, no reply yet.
- **Invalid ids and filters** return `400` or `404` instead of a server error.

---

## Known limitations and what I would improve

- **File attachments are UI only.** Only the file name is stored. A real version would upload to object storage with size and type checks.
- **Polling instead of WebSockets or SSE.** Fine at this scale. At larger volume I would use server-sent events or a managed realtime service.
- **No automatic retry for failed AI classification.** Admins set category and priority manually in that case. I would add a retry button and a background retry queue.
- **The auth helper is duplicated across API routes.** It should be moved into one shared module, or into middleware that supports the Node runtime.
- **No pagination on the queue** (limited to 200 rows), and no search by author or subject.
- **No rate limiting or lockout on login**, and no password reset or author sign-up. Accounts come from the seed data.
- **No automated tests.** I would add API tests for role-based access and unit tests for the payout-date logic.
- **No email notifications.** Authors only see replies inside the portal.
- **Gemini free tier:** low rate limits, and Google may use free-tier data to improve its products. Author data should not go to a free tier in production.
- **AI quality is not measured.** Because the AI value and final value are stored separately, I would track how often admins override the AI and use that to improve prompts.
- **Demo credentials are shown on the home page** for reviewers. These would be removed in production.
