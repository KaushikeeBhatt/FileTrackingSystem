import { type NextRequest, NextResponse } from "next/server"
import { withAuthAndRateLimit } from "@/lib/middleware/rate-limit"
import { FileOperations } from "@/lib/file-operations"

async function uploadVersionHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = (request as any).user
    const { id: fileId } = await params

    const formData = await request.formData()
    const file = formData.get("file") as File
    const changes = (formData.get("changes") as string) || undefined

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const newFile = {
      buffer,
      originalName: file.name,
      mimeType: file.type,
    }

    const result = await FileOperations.uploadNewVersion(fileId, newFile, user, changes)

    return NextResponse.json({ success: true, version: result.version, message: "New version uploaded successfully" })
  } catch (error) {
    console.error("Upload new version error:", error)
    const message = error instanceof Error ? error.message : "Upload new version failed"
    const status = message.includes("exceeds the limit") ? 400 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export const POST = withAuthAndRateLimit(uploadVersionHandler, undefined, "UPLOAD")
