import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import FileOperations from "@/lib/file-operations";

async function deleteHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user;
    const fileId = params.id;

    const success = await FileOperations.deleteFile(fileId, user.id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete file" }, { status: 400 });
    }

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteHandler, ["admin", "manager"]);
