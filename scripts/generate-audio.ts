/**
 * Audio Generation Script for Námsbókasafn
 *
 * Generates MP3 audio files for all content sections using Tiro TTS.
 *
 * Usage:
 *   1. Start Tiro TTS server: docker run -p 8080:8080 tiro-tts
 *   2. Run: npx tsx scripts/generate-audio.ts
 *
 * Options:
 *   --dry-run     Show what would be generated without making requests
 *   --voice       Voice ID (default: Dilja)
 *   --force       Regenerate even if audio file exists
 *   --section     Generate only specific section (e.g., "1-1-efnafraedi")
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Tiro TTS server URL (local Docker instance)
  ttsServerUrl: process.env.TIRO_TTS_URL || "http://localhost:8080",

  // Content directory
  contentDir: "public/content",

  // Available voices (from Tiro TTS)
  voices: {
    Dilja: { id: "Dilja", gender: "female", description: "Kvenrödd - Diljá" },
    Alfur: { id: "Alfur", gender: "male", description: "Karlrödd - Álfur" },
  },

  // Default voice
  defaultVoice: "Dilja",

  // Audio format
  outputFormat: "mp3",

  // Request timeout (ms)
  timeout: 120000,
};

// =============================================================================
// TEXT CLEANING
// =============================================================================

/**
 * Clean markdown text for speech synthesis
 */
function cleanTextForSpeech(text: string): string {
  return (
    text
      // Remove YAML frontmatter
      .replace(/^---[\s\S]*?---\n*/m, "")
      // Remove LaTeX/KaTeX equations
      .replace(/\$\$[\s\S]*?\$\$/g, " jafna ")
      .replace(/\$[^$]+\$/g, " jafna ")
      // Remove markdown headings markers but keep text
      .replace(/^#{1,6}\s+/gm, "")
      // Remove markdown bold/italic
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove markdown links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove markdown images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "mynd: $1")
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, " kóði ")
      .replace(/`[^`]+`/g, " kóði ")
      // Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // Remove directive markers (:::note, :::warning, etc.)
      .replace(/:::[a-z-]+/g, "")
      .replace(/:::/g, "")
      // Remove reference markers like {#section-id}
      .replace(/\{#[^}]+\}/g, "")
      // Remove table formatting
      .replace(/\|/g, " ")
      .replace(/[-:]+\s*\|/g, " ")
      // Clean up list markers
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Collapse multiple whitespace
      .replace(/\s+/g, " ")
      // Clean up multiple periods/punctuation
      .replace(/\.{2,}/g, ".")
      .replace(/\s+\./g, ".")
      .trim()
  );
}

// =============================================================================
// TIRO TTS CLIENT
// =============================================================================

interface TiroTTSOptions {
  voice?: string;
  outputFormat?: string;
}

/**
 * Generate speech using Tiro TTS API
 */
async function synthesizeSpeech(
  text: string,
  options: TiroTTSOptions = {}
): Promise<Buffer> {
  const voice = options.voice || CONFIG.defaultVoice;
  const format = options.outputFormat || CONFIG.outputFormat;

  const url = `${CONFIG.ttsServerUrl}/v0/speech`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": `audio/${format}`,
    },
    body: JSON.stringify({
      text: text,
      voice: voice,
      output_format: format,
    }),
    signal: AbortSignal.timeout(CONFIG.timeout),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`TTS request failed: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Check if Tiro TTS server is available
 */
async function checkTTSServer(): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG.ttsServerUrl}/v0/voices`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// FILE PROCESSING
// =============================================================================

interface ContentFile {
  mdPath: string;
  audioPath: string;
  relativePath: string;
  sectionName: string;
}

/**
 * Find all content markdown files
 */
async function findContentFiles(): Promise<ContentFile[]> {
  const pattern = `${CONFIG.contentDir}/**/chapters/**/*.md`;
  const files = await glob(pattern, {
    ignore: ["**/source/**"],
    posix: true,
  });

  return files.map((mdPath) => {
    const audioPath = mdPath.replace(/\.md$/, ".mp3");
    const relativePath = path.relative(CONFIG.contentDir, mdPath);
    const sectionName = path.basename(mdPath, ".md");

    return {
      mdPath,
      audioPath,
      relativePath,
      sectionName,
    };
  });
}

/**
 * Generate audio for a single file
 */
async function generateAudioForFile(
  file: ContentFile,
  options: { voice?: string; force?: boolean; dryRun?: boolean }
): Promise<{ success: boolean; message: string; duration?: number }> {
  const { voice = CONFIG.defaultVoice, force = false, dryRun = false } = options;

  // Check if audio already exists
  if (!force && fs.existsSync(file.audioPath)) {
    return { success: true, message: "Audio already exists (skipped)" };
  }

  // Read markdown content
  const markdown = fs.readFileSync(file.mdPath, "utf-8");
  const cleanedText = cleanTextForSpeech(markdown);

  if (!cleanedText.trim()) {
    return { success: false, message: "No text content after cleaning" };
  }

  const charCount = cleanedText.length;
  const estimatedMinutes = Math.round(charCount / 5 / 150);

  if (dryRun) {
    return {
      success: true,
      message: `Would generate: ~${charCount} chars, ~${estimatedMinutes} min`,
    };
  }

  // Generate audio
  const startTime = Date.now();

  try {
    const audioBuffer = await synthesizeSpeech(cleanedText, { voice });

    // Ensure directory exists
    fs.mkdirSync(path.dirname(file.audioPath), { recursive: true });

    // Write audio file
    fs.writeFileSync(file.audioPath, audioBuffer);

    const duration = (Date.now() - startTime) / 1000;
    const fileSizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);

    return {
      success: true,
      message: `Generated: ${fileSizeMB} MB in ${duration.toFixed(1)}s`,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const voiceArg = args.find((a) => a.startsWith("--voice="));
  const voice = voiceArg?.split("=")[1] || CONFIG.defaultVoice;
  const sectionArg = args.find((a) => a.startsWith("--section="));
  const sectionFilter = sectionArg?.split("=")[1];

  console.log("=".repeat(60));
  console.log("Námsbókasafn Audio Generator");
  console.log("=".repeat(60));
  console.log(`TTS Server: ${CONFIG.ttsServerUrl}`);
  console.log(`Voice: ${voice}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "GENERATE"}`);
  if (force) console.log("Force: Regenerating all files");
  if (sectionFilter) console.log(`Filter: ${sectionFilter}`);
  console.log("");

  // Check TTS server
  if (!dryRun) {
    console.log("Checking TTS server...");
    const serverAvailable = await checkTTSServer();
    if (!serverAvailable) {
      console.error("ERROR: Tiro TTS server not available at", CONFIG.ttsServerUrl);
      console.error("");
      console.error("Start the server with Docker:");
      console.error("  docker run -p 8080:8080 tiro-tts");
      console.error("");
      console.error("Or use --dry-run to see what would be generated.");
      process.exit(1);
    }
    console.log("TTS server is available.\n");
  }

  // Find content files
  let files = await findContentFiles();

  if (sectionFilter) {
    files = files.filter((f) => f.sectionName.includes(sectionFilter));
  }

  console.log(`Found ${files.length} content files.\n`);

  // Process files
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  let totalDuration = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = `[${i + 1}/${files.length}]`;

    process.stdout.write(`${progress} ${file.relativePath}... `);

    const result = await generateAudioForFile(file, { voice, force, dryRun });

    console.log(result.message);

    if (result.success) {
      if (result.message.includes("skipped")) {
        skipCount++;
      } else {
        successCount++;
        if (result.duration) totalDuration += result.duration;
      }
    } else {
      errorCount++;
    }
  }

  // Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`Generated: ${successCount}`);
  console.log(`Skipped:   ${skipCount}`);
  console.log(`Errors:    ${errorCount}`);
  if (totalDuration > 0) {
    console.log(`Total time: ${totalDuration.toFixed(1)}s`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
