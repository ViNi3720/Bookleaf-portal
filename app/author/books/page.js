"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatMoney(value) {
  if (value === null || value === undefined) return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export default function AuthorBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch("/api/books");

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Could not load books");
          return;
        }

        setBooks(data.books);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadBooks();
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Books</h1>

        {loading && <p className="text-gray-500">Loading your books...</p>}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && books.length === 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            You don't have any books yet.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {books.map((book) => {
            const isLive = book.status === "Published & Live";

            return (
              <div
                key={book.book_id}
                className="bg-white rounded-xl shadow p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {book.title}
                    </h2>
                    <p className="text-sm text-gray-500">{book.genre || "—"}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                      isLive
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {book.status}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-4">
                  <Field label="ISBN" value={book.isbn} />
                  <Field
                    label="Publication date"
                    value={formatDate(book.publication_date)}
                  />
                  <Field label="MRP" value={formatMoney(book.mrp)} />
                  <Field label="Copies sold" value={book.total_copies_sold} />
                  <Field
                    label="Royalty earned"
                    value={formatMoney(book.total_royalty_earned)}
                  />
                  <Field
                    label="Royalty paid"
                    value={formatMoney(book.royalty_paid)}
                  />
                  <Field
                    label="Royalty pending"
                    value={formatMoney(book.royalty_pending)}
                  />
                </dl>

                {!isLive && (
                  <p className="text-sm text-yellow-800 bg-yellow-50 rounded-md px-3 py-2">
                    This book is still in production. Pricing and sales will
                    appear once it is published.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
