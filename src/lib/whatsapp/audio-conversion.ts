import "server-only";
import { spawn } from "node:child_process";

/**
 * Los navegadores graban con MediaRecorder en WebM/Opus o MP4/AAC, pero
 * WasenderAPI rechaza esos contenedores. Convierte cualquiera de ellos a
 * OGG/Opus con ffmpeg en memoria.
 */
export function convertAudioToOgg(bytes: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-c:a", "libopus", "-f", "ogg", "pipe:1"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    const chunks: Buffer[] = [];
    let size = 0;
    let stderr = "";
    const limit = 32 * 1024 * 1024;

    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        child.kill();
        reject(new Error("El audio convertido excede el límite"));
        return;
      }
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.stdin.on("error", () => null);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim().slice(-300) || `ffmpeg terminó con código ${code}`));
        return;
      }
      const output = Buffer.concat(chunks);
      if (output.length === 0) reject(new Error("No se pudo convertir el audio grabado"));
      else resolve(output);
    });

    child.stdin.end(bytes);
  });
}
