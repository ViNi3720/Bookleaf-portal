import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);

    return NextResponse.json(
      { user: { id: user.id, name: user.name, role: user.role } },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 },
    );
  }
}
