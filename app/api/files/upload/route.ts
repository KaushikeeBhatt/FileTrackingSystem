import { type NextRequest, NextResponse } from "next/server"
import { withAuthAndRateLimit } from "@/lib/middleware/rate-limit"
import { FileOperations } from "@/lib/file-operations"
// import { withAuth } from "@/lib/middleware/auth"

async function uploadHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const formData = await request.formData()

    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const category = formData.get("category") as string
    const department = (formData.get("department") as string) || user.department
    const description = formData.get("description") as string
    const tagsString = formData.get("tags") as string

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 })
    }

    const tags = tagsString
      ? tagsString
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    const buffer = Buffer.from(await file.arrayBuffer())

    console.log("Received file MIME type:", file.type);

    const uploadedFile = {
      fileName: file.name,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      filePath: "",
      buffer,
    }

    const fileId = await FileOperations.uploadFile(uploadedFile, user, {
      department,
      category,
      tags,
      description,
    })

    return NextResponse.json({
      success: true,
      fileId: fileId.toString(),
      message: "File uploaded successfully",
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
// export const POST = withAuth(uploadHandler)
export const POST = withAuthAndRateLimit(uploadHandler, undefined, "UPLOAD")
