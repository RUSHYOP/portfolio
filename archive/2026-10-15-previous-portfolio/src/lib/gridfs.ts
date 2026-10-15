import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import dbConnect from "./mongodb";

let bucket: GridFSBucket | null = null;

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (bucket) return bucket;
  
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");
  
  bucket = new GridFSBucket(db, { bucketName: "media" });
  return bucket;
}

export async function uploadToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const bucket = await getGridFSBucket();
  
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { ...metadata, contentType },
    });
    
    uploadStream.on("finish", () => {
      resolve(uploadStream.id.toString());
    });
    
    uploadStream.on("error", reject);
    uploadStream.end(buffer);
  });
}

export async function downloadFromGridFS(fileId: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}> {
  const bucket = await getGridFSBucket();
  const _id = new ObjectId(fileId);
  
  // Get file info
  const files = await bucket.find({ _id }).toArray();
  if (files.length === 0) {
    throw new Error("File not found");
  }
  
  const file = files[0];
  const contentType = (file.metadata as Record<string, unknown>)?.contentType as string || "application/octet-stream";
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const downloadStream = bucket.openDownloadStream(_id);
    
    downloadStream.on("data", (chunk) => chunks.push(chunk));
    downloadStream.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks),
        contentType,
        filename: file.filename,
      });
    });
    downloadStream.on("error", reject);
  });
}

export async function deleteFromGridFS(fileId: string): Promise<void> {
  const bucket = await getGridFSBucket();
  const _id = new ObjectId(fileId);
  await bucket.delete(_id);
}

export async function listGridFSFiles(metadata?: Record<string, unknown>) {
  const bucket = await getGridFSBucket();
  const query = metadata ? { metadata } : {};
  return bucket.find(query).toArray();
}
