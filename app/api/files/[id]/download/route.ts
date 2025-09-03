import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { FileOperations } from "@/lib/file-operations"
import { getFileById, createAuditLog, updateFileAccess } from "@/lib/database-operations"
import { ObjectId } from "mongodb"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function downloadHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
    const fileId = params.id

    // Get file record
    const file = await getFileById(new ObjectId(fileId))

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check permissions
    const isOwner = file.ownerId.toString() === user.id
    const isAdminOrManager = user.role === "admin" || user.role === "manager"

    if (!isAdminOrManager && !(isOwner && !file.isDeleted)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get file buffer
    const buffer = await FileOperations.getFileBuffer(file.fileName)

    // Update access count
    await updateFileAccess(new ObjectId(fileId))

    // Create audit log
    await createAuditLog({
      userId: new ObjectId(user.id),
      action: "download",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: { 
        fileName: file.fileName,
        size: file.size,
        mimeType: file.mimeType
      },
      userAgent: request.headers.get('user-agent')
    })
    
    // Return file
    const response = new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    })
    return response
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}

export const GET = rateLimit("GENERAL")(withAuth(downloadHandler))
