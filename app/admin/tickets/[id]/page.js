"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AiHint({ aiValue, value }) {
  if (!aiValue) {
    return <p className="text-xs text-gray-400 mt-1">Not set by AI</p>;
  }
  if (aiValue === value) {
    return <p className="text-xs text-gray-400 mt-1">AI suggested this</p>;
  }
  return (
    <p className="text-xs text-orange-600 mt-1">
      Changed by admin (AI suggested: {aiValue})
    </p>
  );
}

function AdminTicketDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [draftError, setDraftError] = useState("");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const autoDraftTried = useRef(false);

  const loadTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        router.push("/author/books");
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Could not load ticket");
        return;
      }

      setData(json);
      setError("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const generateDraft = useCallback(async () => {
    setBusy("draft");
    setDraftError("");

    try {
      const res = await fetch(`/api/admin/tickets/${id}/draft`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setDraftError(json.error || "Could not generate a draft");
        return;
      }

      await loadTicket();
    } catch {
      setDraftError("Network error. Please try again.");
    } finally {
      setBusy("");
    }
  }, [id, router, loadTicket]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (data?.ticket.ai_status !== "pending") return;
    const timer = setTimeout(loadTicket, 4000);
    return () => clearTimeout(timer);
  }, [data, loadTicket]);

  useEffect(() => {
    if (!data || autoDraftTried.current) return;
    if (data.ticket.ai_draft || data.ticket.ai_status === "pending") return;

    autoDraftTried.current = true;
    generateDraft();
  }, [data, generateDraft]);

  async function runAction(name, url, method, body, onSuccess) {
    setBusy(name);
    setActionError("");

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setActionError(json.error || "Action failed");
        return;
      }

      if (onSuccess) onSuccess();
      await loadTicket();
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setBusy("");
    }
  }

  function updateField(field, value) {
    runAction(field, `/api/admin/tickets/${id}`, "PATCH", { [field]: value });
  }

  function assignToMe() {
    runAction("assign", `/api/admin/tickets/${id}`, "PATCH", {
      assignToMe: true,
    });
  }

  function sendReply(e) {
    e.preventDefault();
    runAction(
      "reply",
      `/api/admin/tickets/${id}/messages`,
      "POST",
      { body: reply.trim() },
      () => setReply(""),
    );
  }

  function addNote(e) {
    e.preventDefault();
    runAction(
      "note",
      `/api/admin/tickets/${id}/notes`,
      "POST",
      { body: note.trim() },
      () => setNote(""),
    );
  }

  if (loading) {
    return <p className="p-8 text-gray-500">Loading ticket...</p>;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <Link
            href="/admin/tickets"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to queue
          </Link>
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        </div>
      </main>
    );
  }

  const { ticket, messages, notes, currentAdminId } = data;
  const isMine = ticket.assigned_admin_id === currentAdminId;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          href="/admin/tickets"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to queue
        </Link>

        {actionError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {actionError}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {ticket.subject}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  #{ticket.id} · {ticket.author_name} ({ticket.author_email}) ·{" "}
                  {formatDateTime(ticket.created_at)}
                </p>
                <p className="text-xs text-gray-500">
                  Book:{" "}
                  {ticket.book_title
                    ? `${ticket.book_title} (${ticket.book_status})`
                    : "General / Account Level"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Author's query
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
            </div>

            <div className="bg-white rounded-xl shadow p-6 space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                Conversation
              </p>

              {messages.length === 0 && (
                <p className="text-sm text-gray-400">No reply sent yet.</p>
              )}

              {messages.map((message) => (
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
                      ? message.sender_name
                      : "Author"}{" "}
                    · {formatDateTime(message.created_at)}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {message.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">AI draft</p>
                <button
                  type="button"
                  onClick={generateDraft}
                  disabled={busy === "draft" || ticket.ai_status === "pending"}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {busy === "draft"
                    ? "Generating..."
                    : ticket.ai_draft
                      ? "Regenerate draft"
                      : "Generate draft"}
                </button>
              </div>

              {ticket.ai_status === "pending" && (
                <p className="text-sm text-gray-500">
                  AI is still classifying this ticket...
                </p>
              )}

              {ticket.ai_status === "failed" && (
                <p className="text-sm text-orange-700 bg-orange-50 rounded-md px-3 py-2">
                  AI could not classify this ticket, so category and priority
                  are defaults. Please check them on the right.
                </p>
              )}

              {draftError && (
                <p className="text-sm text-orange-700 bg-orange-50 rounded-md px-3 py-2">
                  {draftError}
                </p>
              )}

              {busy === "draft" && !ticket.ai_draft && (
                <p className="text-sm text-gray-500">
                  Writing a draft using the author's book data...
                </p>
              )}

              {ticket.ai_draft && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md px-3 py-2">
                    {ticket.ai_draft}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReply(ticket.ai_draft)}
                    className="text-sm bg-gray-900 text-white rounded-md px-3 py-1.5 hover:bg-gray-700 cursor-pointer"
                  >
                    Use this draft
                  </button>
                </div>
              )}
            </div>

            <form
              onSubmit={sendReply}
              className="bg-white rounded-xl shadow p-6 space-y-3"
            >
              <label
                htmlFor="reply"
                className="text-sm font-semibold text-gray-900"
              >
                Reply to author
              </label>
              <textarea
                id="reply"
                rows={8}
                maxLength={5000}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write your reply, or use the AI draft and edit it."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={busy === "reply" || reply.trim().length === 0}
                className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {busy === "reply" ? "Sending..." : "Send reply"}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6 space-y-5">
              <p className="text-sm font-semibold text-gray-900">
                Manage ticket
              </p>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Status
                </label>
                <select
                  value={ticket.status}
                  disabled={busy === "status"}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white"
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Priority
                </label>
                <select
                  value={ticket.priority}
                  disabled={busy === "priority"}
                  onChange={(e) => updateField("priority", e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white"
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <AiHint aiValue={ticket.ai_priority} value={ticket.priority} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Category
                </label>
                <select
                  value={ticket.category}
                  disabled={busy === "category"}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white"
                >
                  {CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <AiHint aiValue={ticket.ai_category} value={ticket.category} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Assigned to
                </label>
                <p className="text-sm text-gray-900">
                  {ticket.assigned_admin_name || "Unassigned"}
                </p>
                {!isMine && (
                  <button
                    type="button"
                    onClick={assignToMe}
                    disabled={busy === "assign"}
                    className="mt-2 text-sm bg-gray-900 text-white rounded-md px-3 py-1.5 hover:bg-gray-700 disabled:opacity-60 cursor-pointer"
                  >
                    {busy === "assign" ? "Assigning..." : "Assign to me"}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Internal notes
                </p>
                <p className="text-xs text-gray-400">
                  Only the BookLeaf team can see these.
                </p>
              </div>

              {notes.length === 0 && (
                <p className="text-sm text-gray-400">No notes yet.</p>
              )}

              {notes.map((item) => (
                <div
                  key={item.id}
                  className="bg-yellow-50 rounded-lg px-3 py-2"
                >
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    {item.admin_name} · {formatDateTime(item.created_at)}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {item.body}
                  </p>
                </div>
              ))}

              <form onSubmit={addNote} className="space-y-2">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an internal note"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={busy === "note" || note.trim().length === 0}
                  className="text-sm bg-gray-900 text-white rounded-md px-3 py-1.5 hover:bg-gray-700 disabled:opacity-60 cursor-pointer"
                >
                  {busy === "note" ? "Saving..." : "Add note"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminTicketDetailPage() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-500">Loading ticket...</p>}>
      <AdminTicketDetail />
    </Suspense>
  );
}
