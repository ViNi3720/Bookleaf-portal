import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Suspense } from "react";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function AuthRedirect() {
  const user = await getUser();

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin/tickets" : "/author/books");
  }

  return null;
}

const AUTHOR_FEATURES = [
  "See all your books with sales and royalty details",
  "Raise a support query in under a minute",
  "Track replies from our team live, no refresh needed",
];

const TEAM_FEATURES = [
  "One queue for every author query, sorted by urgency",
  "AI sorts each ticket by category and priority",
  "AI drafts a reply using the author's own book data",
];

const DEMO_ACCOUNTS = [
  { role: "Author", email: "priya.sharma@email.com", password: "Author@123" },
  { role: "Admin", email: "admin@bookleaf.com", password: "Admin@123" },
];

function FeatureCard({ title, description, features, buttonLabel, dark }) {
  return (
    <div className="bg-white rounded-2xl shadow p-8 flex flex-col">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-1">{description}</p>

      <ul className="mt-5 space-y-3 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm text-gray-700">
            <span className="text-green-600 font-bold">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href="/login"
        className={`mt-6 text-center rounded-lg py-2.5 font-medium text-white ${
          dark
            ? "bg-gray-900 hover:bg-gray-700"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-12 text-center">
        <p className="text-sm font-semibold text-blue-600 tracking-wide uppercase">
          BookLeaf Publishing
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mt-3">
          Author Support Portal
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          Questions about royalties, book status, ISBNs or printing? Get clear,
          specific answers from the BookLeaf team, faster.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 grid gap-6 md:grid-cols-2">
        <FeatureCard
          title="For Authors"
          description="Your books, your royalties, your queries in one place."
          features={AUTHOR_FEATURES}
          buttonLabel="Author login"
        />
        <FeatureCard
          title="For the BookLeaf Team"
          description="Handle author queries faster and more consistently."
          features={TEAM_FEATURES}
          buttonLabel="Team login"
          dark
        />
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <p className="text-sm font-semibold text-gray-900">Demo accounts</p>
          <p className="text-xs text-gray-500 mt-1">
            Use these to explore both portals. Every author uses the same
            password.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.role}
                className="bg-white rounded-lg px-4 py-3 text-sm"
              >
                <p className="font-medium text-gray-900">{account.role}</p>
                <p className="text-gray-600">{account.email}</p>
                <p className="text-gray-600">{account.password}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
