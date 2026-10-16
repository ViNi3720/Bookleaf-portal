"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTicketPage() {
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [bookId, setBookId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch("/api/books");

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const data = await res.json();

        if (res.ok) {
          setBooks(data.books);
        }
      } catch {
        setError(
          "Could not load your books. You can still raise a general query.",
        );
      }
    }

    loadBooks();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: bookId || null,
          subject: subject.trim(),
          description: description.trim(),
          attachmentName: attachment ? attachment.name : null,
        }),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Could not submit your query");
        return;
      }

      router.push("/author/tickets");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Submit a Support Query
          </h1>
          <Link
            href="/author/tickets"
            className="text-sm text-blue-600 hover:underline"
          >
            My Tickets
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-8 space-y-5"
        >
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="book" className="text-sm font-medium text-gray-700">
              Which book is this about?
            </label>
            <select
              id="book"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">General / Account Level</option>
              {books.map((book) => (
                <option key={book.book_id} value={book.book_id}>
                  {book.title} ({book.status})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="subject"
              className="text-sm font-medium text-gray-700"
            >
              Subject
            </label>
            <input
              id="subject"
              type="text"
              required
              maxLength={150}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Royalty not received for last quarter"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="description"
              className="text-sm font-medium text-gray-700"
            >
              Describe your issue
            </label>
            <textarea
              id="description"
              required
              rows={6}
              minLength={10}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share as many details as you can so our team can help faster."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 text-right">
              {description.length} / 5000
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="attachment"
              className="text-sm font-medium text-gray-700"
            >
              Attachment (optional)
            </label>
            <input
              id="attachment"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={(e) => setAttachment(e.target.files[0] || null)}
              className="block w-full text-sm text-gray-700"
            />
            <p className="text-xs text-gray-400">
              Upload is a preview for now. Only the file name is saved with your
              ticket.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white rounded-md py-2 font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit query"}
          </button>
        </form>
      </div>
    </main>
  );
}
