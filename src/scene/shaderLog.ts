// Turns a failed shader / program into a short, loggable line (slice 5). three@0.169 reports a
// GLSL compile or link error through `renderer.debug.onShaderError` and console.error — NOT as an
// exception from `renderer.compile()` — so a try/catch around compile() alone almost never fires
// for the real failure (a planet silently invisible on one GPU). SceneRoot hooks this up to the
// `scene.compile_failed` client event. Pure and defensive: it only reads info logs (GLSL error
// text), never anything else, and it never throws.

/** Longest info-log text kept in a log line (the allow-listed /api/logs body is capped at ~2 KB). */
export const SHADER_LOG_MAX = 300;

/** What is logged when the driver gives no info log at all. */
export const SHADER_ERROR_FALLBACK = "shader link or compile error";

/** `onShaderError`'s arguments, in order: the context, the failed program and its two shaders. */
export function shaderErrorMessage(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): string {
  try {
    const parts: string[] = [];
    const add = (label: string, log: string | null | undefined) => {
      const text = (log ?? "").replace(/\s+/g, " ").trim();
      if (text) parts.push(`${label}: ${text}`);
    };
    add("program", gl.getProgramInfoLog(program));
    add("vertex", gl.getShaderInfoLog(vertexShader));
    add("fragment", gl.getShaderInfoLog(fragmentShader));
    const joined = parts.join(" | ");
    if (!joined) return SHADER_ERROR_FALLBACK;
    return joined.length > SHADER_LOG_MAX ? `${joined.slice(0, SHADER_LOG_MAX)}…` : joined;
  } catch {
    return SHADER_ERROR_FALLBACK;
  }
}
