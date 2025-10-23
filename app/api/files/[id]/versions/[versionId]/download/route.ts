import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { rateLimit } from "@/lib/middleware/rate-limit"
import { FileOperations } from "@/lib/file-operations"
import { AuditOperations } from "@/lib/audit-operations"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import path from "path"

async function downloadVersionHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const user = (request as any).user
    const { id: fileId, versionId } = await params

    // Get file record to check permissions
    const file = await FileOperations.getFileById(fileId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check permissions - user must own the file or be admin/manager
    const isOwner = file.uploadedBy.toString() === user.id
    const isAdminOrManager = user.role === 'admin' || user.role === 'manager'
    
    if (!isOwner && !isAdminOrManager) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get specific version
    const db = await getDatabase()
    const version = await db.collection("file_versions").findOne({
      _id: new ObjectId(versionId),
      fileId: new ObjectId(fileId)
    })

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    // Get file buffer for this version
    const fileName = path.basename(version.filePath)
    const buffer = await FileOperations.getFileBuffer(fileName)

    // Create audit log for version download
    await AuditOperations.createLog({
      userId: new ObjectId(user.id),
      action: "version_download",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: {
        fileName: file.originalName,
        version: version.version,
        versionId: versionId,
        size: version.fileSize
      },
      status: "success"
    })

    // Return file with version in filename
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": file.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.originalName}_v${version.version}"`,
        "Content-Length": version.fileSize.toString(),
      },
    })
  } catch (error) {
    console.error("Version download error:", error)
    return NextResponse.json({ error: "Version download failed" }, { status: 500 })
  }
}

export const GET = rateLimit("GENERAL")(withAuth(downloadVersionHandler))