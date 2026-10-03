import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TEMPLATES_FILE = path.join(process.cwd(), "data", "templates.json");

function getTemplates() {
  if (!fs.existsSync(TEMPLATES_FILE)) return [];
  try {
    const content = fs.readFileSync(TEMPLATES_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function saveTemplates(templates: any[]) {
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
}

// GET /api/templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");

    const templates = getTemplates();
    if (user && user !== "admin") {
      const filtered = templates.filter(
        (t: any) => !t.createdBy || t.createdBy === "admin" || t.createdBy === user
      );
      return NextResponse.json({ success: true, templates: filtered });
    }

    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/templates (Create & Save new template)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, message, columns, createdBy } = body;

    if (!name || !message) {
      return NextResponse.json(
        { success: false, error: "Template Name and Message are required." },
        { status: 400 }
      );
    }

    // Auto extract dynamic tags {column} from message
    const matches = message.match(/{([^}]+)}/g) || [];
    const extractedCols: string[] = Array.from(
      new Set(matches.map((m: string) => m.replace(/[{}]/g, "").trim().toLowerCase()))
    );

    const mergedColumns = Array.from(
      new Set([...(columns || []).map((c: string) => c.trim().toLowerCase()), ...extractedCols])
    );

    const templates = getTemplates();
    const newTemplate = {
      id: `tpl_${Date.now()}`,
      name: name.trim(),
      message: message.trim(),
      columns: mergedColumns,
      createdBy: createdBy || "admin",
      createdAt: new Date().toISOString().split("T")[0],
    };

    templates.unshift(newTemplate);
    saveTemplates(templates);

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/templates?id=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Template ID is required." }, { status: 400 });
    }

    let templates = getTemplates();
    templates = templates.filter((t: any) => t.id !== id);
    saveTemplates(templates);

    return NextResponse.json({ success: true, message: "Template deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
