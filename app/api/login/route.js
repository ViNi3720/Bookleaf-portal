import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/db/pool";

export async function POST(request) {
  try {
    const { email, password } = await request.json().catch(() => ({}));

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, author_id
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()],
    );
    const user = result.rows[0];

    const isMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        authorId: user.author_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 },
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
