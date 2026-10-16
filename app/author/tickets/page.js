"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES = {
  Open: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-200 text-gray-700",
};

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AuthorTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTickets(isFirstLoad) {
      try {
        const res = await fetch("/api/tickets", { cache: "no-store" });

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        if (!active) return;

        if (!res.ok) {
          if (isFirstLoad) setError(data.error || "Could not load tickets");
          return;
        }

        setTickets(data.tickets);
        setError("");
      } catch {
        if (active && isFirstLoad) {
          setError("Network error. Please try again.");
        }
      } finally {
        if (active && isFirstLoad) setLoading(false);
      }
    }

    loadTickets(true);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadTickets(false);
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
            <p className="text-xs text-gray-400 mt-1">
              Updates automatically every few seconds
            </p>
          </div>
          <Link
            href="/author/tickets/new"
            className="bg-blue-600 text-white text-sm rounded-md px-4 py-2 font-medium hover:bg-blue-700"
          >
            New query
          </Link>
        </div>

        {loading && <p className="text-gray-500">Loading your tickets...</p>}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            You haven't raised any queries yet.
          </div>
        )}

        <div className="space-y-5">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white rounded-xl shadow p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {ticket.subject}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    #{ticket.id} ·{" "}
                    {ticket.book_title || "General / Account Level"} ·{" "}
                    {formatDateTime(ticket.created_at)}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                    STATUS_STYLES[ticket.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Your query
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {ticket.description}
                </p>
                {ticket.attachment_name && (
                  <p className="text-xs text-gray-400 mt-2">
                    Attachment: {ticket.attachment_name}
                  </p>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-medium text-gray-500">Responses</p>

                {ticket.messages.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No response yet. Our team will get back to you soon.
                  </p>
                )}

                {ticket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg px-4 py-3 ${
                      message.sender_role === "ADMIN"
                        ? "bg-blue-50"
                        : "bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      {message.sender_role === "ADMIN"
                        ? "BookLeaf Team"
                        : "You"}{" "}
                      · {formatDateTime(message.created_at)}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {message.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
