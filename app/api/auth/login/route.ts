import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const content = fs.readFileSync(USERS_FILE, "utf-8");
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username aur password dono zaroori hain." },
        { status: 400 }
      );
    }

    const users = getUsers();
    const user = users.find(
      (u: any) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username ya password. Kripya check karein." },
        { status: 401 }
      );
    }

    // Return safe user object (without password)
    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Login error" },
      { status: 500 }
    );
  }
}
