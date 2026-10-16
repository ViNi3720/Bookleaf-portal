"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const PRIORITY_STYLES = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-gray-100 text-gray-700",
};

const STATUS_STYLES = {
  Open: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-200 text-gray-700",
};

const OVERDUE_HOURS = 48;

function getAgeHours(value) {
  return (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60);
}

function formatAge(hours) {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

const EMPTY_FILTERS = {
  status: "",
  category: "",
  priority: "",
  from: "",
  to: "",
};

export default function AdminTicketsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value),
  ).toString();

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadTickets(isFirstLoad) {
      try {
        const res = await fetch(`/api/admin/tickets?${query}`, {
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

        const data = await res.json();
        if (!active) return;

        if (!res.ok) {
          if (isFirstLoad) setError(data.error || "Could not load tickets");
          return;
        }

        setTickets(data.tickets);
        setError("");
      } catch {
        if (active && isFirstLoad) setError("Network error. Please try again.");
      } finally {
        if (active && isFirstLoad) setLoading(false);
      }
    }

    loadTickets(true);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadTickets(false);
      }
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [query, router]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ticket Queue</h1>
          <p className="text-xs text-gray-400 mt-1">
            Most urgent and oldest unresolved tickets come first. Updates every
            10 seconds.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6 items-end">
          <SelectFilter
            label="Status"
            value={filters.status}
            options={STATUSES}
            onChange={(value) => updateFilter("status", value)}
          />
          <SelectFilter
            label="Category"
            value={filters.category}
            options={CATEGORIES}
            onChange={(value) => updateFilter("category", value)}
          />
          <SelectFilter
            label="Priority"
            value={filters.priority}
            options={PRIORITIES}
            onChange={(value) => updateFilter("priority", value)}
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter("from", e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter("to", e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
            />
          </div>
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-sm text-blue-600 hover:underline text-left pb-2 cursor-pointer"
          >
            Clear filters
          </button>
        </div>

        {loading && <p className="text-gray-500">Loading tickets...</p>}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            No tickets match these filters.
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned to</th>
                  <th className="px-4 py-3">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.map((ticket) => {
                  const ageHours = getAgeHours(ticket.created_at);
                  const unresolved =
                    ticket.status === "Open" || ticket.status === "In Progress";
                  const overdue = unresolved && ageHours >= OVERDUE_HOURS;

                  return (
                    <tr key={ticket.id} className={overdue ? "bg-red-50" : ""}>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            PRIORITY_STYLES[ticket.priority]
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {ticket.subject}
                        </Link>
                        <p className="text-xs text-gray-500">
                          #{ticket.id} · {ticket.author_name} ·{" "}
                          {ticket.book_title || "General / Account Level"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ticket.category}
                        {ticket.ai_status === "pending" && (
                          <p className="text-xs text-gray-400">
                            AI classifying...
                          </p>
                        )}
                        {ticket.ai_status === "failed" && (
                          <p className="text-xs text-orange-600">
                            AI unavailable
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                            STATUS_STYLES[ticket.status]
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ticket.assigned_admin_name || "Unassigned"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={
                            overdue
                              ? "text-red-700 font-semibold"
                              : "text-gray-700"
                          }
                        >
                          {formatAge(ageHours)}
                        </span>
                        {overdue && (
                          <p className="text-xs text-red-600">Overdue</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
