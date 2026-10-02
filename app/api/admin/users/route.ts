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

// GET all users
export async function GET() {
  try {
    const users = getUsers();
    const safeUsers = users.map(({ password, ...u }: any) => u);
    return NextResponse.json({ success: true, users: safeUsers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST create new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, password, credits } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { success: false, error: "Name, Username aur Password zaroori hain." },
        { status: 400 }
      );
    }

    const users = getUsers();
    const exists = users.find(
      (u: any) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (exists) {
      return NextResponse.json(
        { success: false, error: "Yeh username pehle se exist karta hai. Dusra username choose karein." },
        { status: 400 }
      );
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      role: "user",
      credits: Number(credits) || 0,
      sentCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    users.push(newUser);
    saveUsers(users);

    const { password: _, ...safeUser } = newUser;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT recharge / update user credits
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, creditsToAdd, newCreditTotal } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID zaroori hai." }, { status: 400 });
    }

    const users = getUsers();
    const userIndex = users.findIndex((u: any) => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: "User nahi mila." }, { status: 404 });
    }

    if (typeof creditsToAdd === "number") {
      users[userIndex].credits = Math.max(0, (users[userIndex].credits || 0) + creditsToAdd);
    } else if (typeof newCreditTotal === "number") {
      users[userIndex].credits = Math.max(0, newCreditTotal);
    }

    saveUsers(users);

    const { password: _, ...safeUser } = users[userIndex];
    return NextResponse.json({ success: true, user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID zaroori hai." }, { status: 400 });
    }

    let users = getUsers();
    const target = users.find((u: any) => u.id === id);

    if (target?.role === "admin") {
      return NextResponse.json(
        { success: false, error: "Admin account ko delete nahi kiya ja sakta." },
        { status: 403 }
      );
    }

    users = users.filter((u: any) => u.id !== id);
    saveUsers(users);

    return NextResponse.json({ success: true, message: "User deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
