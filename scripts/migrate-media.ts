import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { uploadToGridFS } from "../src/lib/gridfs";
import { Project, Skill, Settings } from "../src/lib/models";

async function migrateMedia() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI env variable is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const publicDir = path.join(process.cwd(), "public");
  const fileMap = new Map<string, string>(); // old path -> new fileId

  // Helper to upload file if it exists
  async function uploadFileIfExists(filePath: string, type: string): Promise<string | null> {
    const fullPath = path.join(publicDir, filePath.replace(/^\//, ""));
    
    if (!fs.existsSync(fullPath)) {
      console.log(`  ⚠️  File not found: ${filePath}`);
      return null;
    }

    try {
      const buffer = fs.readFileSync(fullPath);
      const filename = path.basename(filePath);
      const ext = path.extname(filename).toLowerCase();
      
      // Determine content type
      let contentType = "application/octet-stream";
      if ([".jpg", ".jpeg"].includes(ext)) contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".svg") contentType = "image/svg+xml";
      else if (ext === ".mp3") contentType = "audio/mpeg";
      else if (ext === ".ogg") contentType = "audio/ogg";
      else if (ext === ".wav") contentType = "audio/wav";

      const fileId = await uploadToGridFS(buffer, filename, contentType, {
        uploadType: type,
        originalPath: filePath,
        migratedAt: new Date().toISOString(),
      });

      const newPath = `/api/media/${fileId}`;
      fileMap.set(filePath, newPath);
      console.log(`  ✓ Uploaded: ${filePath} -> ${newPath}`);
      return newPath;
    } catch (error) {
      console.error(`  ✗ Failed to upload ${filePath}:`, error);
      return null;
    }
  }

  // Migrate project icons
  console.log("\n📦 Migrating project icons...");
  const projects = await Project.find();
  for (const project of projects) {
    if (project.icon && project.icon.startsWith("/")) {
      const newPath = await uploadFileIfExists(project.icon, "project_icon");
      if (newPath) {
        await Project.updateOne({ _id: project._id }, { $set: { icon: newPath } });
        console.log(`  Updated project: ${project.title}`);
      }
    }
  }

  // Migrate skill icons
  console.log("\n🎨 Migrating skill icons...");
  const skills = await Skill.find();
  for (const skill of skills) {
    if (skill.icon && skill.icon.startsWith("/")) {
      const newPath = await uploadFileIfExists(skill.icon, "skill_icon");
      if (newPath) {
        await Skill.updateOne({ _id: skill._id }, { $set: { icon: newPath } });
        console.log(`  Updated skill: ${skill.name}`);
      }
    }
  }

  // Migrate settings (profile image and audio)
  console.log("\n⚙️  Migrating settings media...");
  const settings = await Settings.findOne({ key: "main" });
  if (settings) {
    let updated = false;
    const updates: Record<string, string> = {};

    if (settings.profileImage && settings.profileImage.startsWith("/")) {
      const newPath = await uploadFileIfExists(settings.profileImage, "profile");
      if (newPath) {
        updates.profileImage = newPath;
        updated = true;
      }
    }

    if (settings.audioFile && settings.audioFile.startsWith("/")) {
      const newPath = await uploadFileIfExists(settings.audioFile, "audio");
      if (newPath) {
        updates.audioFile = newPath;
        updated = true;
      }
    }

    if (updated) {
      await Settings.updateOne({ key: "main" }, { $set: updates });
      console.log("  Updated settings");
    }
  }

  console.log("\n✅ Migration complete!");
  console.log(`📊 Total files migrated: ${fileMap.size}`);
  
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}

migrateMedia().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
