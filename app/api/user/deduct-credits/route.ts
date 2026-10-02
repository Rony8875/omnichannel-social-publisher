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

function saveUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export async function POST(request: Request) {
  try {
    const { userId, amount } = await request.json();

    if (!userId || typeof amount !== "number") {
      return NextResponse.json(
        { success: false, error: "userId aur amount zaroori hain." },
        { status: 400 }
      );
    }

    const users = getUsers();
    const idx = users.findIndex((u: any) => u.id === userId);

    if (idx === -1) {
      return NextResponse.json({ success: false, error: "User nahi mila." }, { status: 404 });
    }

    // Deduct credits and increase sentCount
    users[idx].credits = Math.max(0, (users[idx].credits || 0) - amount);
    users[idx].sentCount = (users[idx].sentCount || 0) + amount;

    saveUsers(users);

    const { password: _, ...safeUser } = users[idx];
    return NextResponse.json({
      success: true,
      remainingCredits: safeUser.credits,
      user: safeUser,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
