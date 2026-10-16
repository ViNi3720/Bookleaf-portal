"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = {
  AUTHOR: [
    { href: "/author/books", label: "My Books" },
    { href: "/author/tickets/new", label: "Submit Query" },
    { href: "/author/tickets", label: "My Tickets" },
  ],
  ADMIN: [{ href: "/admin/tickets", label: "Ticket Queue" }],
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (pathname === "/login") {
      setUser(null);
      return;
    }

    let active = true;

    async function loadUser() {
      try {
        const res = await fetch("/api/me");

        if (!res.ok) {
          if (active) setUser(null);
          return;
        }

        const data = await res.json();
        if (active) setUser(data.user);
      } catch {
        if (active) setUser(null);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    <nav className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">BookLeaf</span>
          {(LINKS[user.role] || []).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${
                pathname === link.href
                  ? "text-blue-600 font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user.name}
            <span className="ml-2 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
              {user.role === "ADMIN" ? "Admin" : "Author"}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
