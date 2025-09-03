import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { FileOperations } from "@/lib/file-operations"
import { DatabaseOperations } from "@/lib/database-operations"
import { ObjectId } from "mongodb"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function downloadHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
    const fileId = params.id

    // Get file record
    const db = await DatabaseOperations["getDb"]()
    const file = await db.collection("files").findOne({ _id: new ObjectId(fileId) })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check permissions
    const isOwner = file.uploadedBy.toString() === user.id
    const isAdminOrManager = user.role === "admin" || user.role === "manager"

    if (!isAdminOrManager && !(isOwner && file.status === "active")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get file buffer
    const buffer = await FileOperations.getFileBuffer(file.fileName)

    // Update access count
    await db.collection("files").updateOne(
      { _id: new ObjectId(fileId) },
      {
        $inc: { "metadata.accessCount": 1 },
        $set: { "metadata.lastAccessedAt": new Date() },
      },
    )

    // Create audit log
    await DatabaseOperations.createAuditLog({
      userId: new ObjectId(user.id),
      action: "download",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: { 
        fileName: file.originalName,
        success: true 
      },
      status: "success"   // 👈 required field
    })
    
    // Return file
    const response = new NextResponse(buffer, {
      headers: {
        "Content-Type": file.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.originalName}"`,
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
