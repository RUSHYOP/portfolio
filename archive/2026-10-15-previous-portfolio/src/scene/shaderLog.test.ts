import { describe, it, expect } from "vitest";
import { shaderErrorMessage, SHADER_LOG_MAX, SHADER_ERROR_FALLBACK } from "./shaderLog";

/** A minimal stand-in for the bits of WebGLRenderingContext the helper reads. */
const fakeGl = (program: string | null, vertex: string | null, fragment: string | null) =>
  ({
    getProgramInfoLog: () => program,
    getShaderInfoLog: (shader: unknown) => (shader === "VS" ? vertex : fragment),
  }) as unknown as WebGLRenderingContext;
const call = (gl: WebGLRenderingContext) =>
  shaderErrorMessage(gl, {} as WebGLProgram, "VS" as unknown as WebGLShader, "FS" as unknown as WebGLShader);

describe("shaderErrorMessage", () => {
  it("joins the program, vertex and fragment info logs, labelled, on one line", () => {
    const msg = call(fakeGl("link failed\n", "0:12 error: foo", "0:30 error: bar\n0:31 error: baz"));
    expect(msg).toBe("program: link failed | vertex: 0:12 error: foo | fragment: 0:30 error: bar 0:31 error: baz");
  });

  it("skips empty and missing logs", () => {
    expect(call(fakeGl("", null, "only the fragment"))).toBe("fragment: only the fragment");
  });

  it("falls back to a fixed sentence when every log is empty", () => {
    expect(call(fakeGl("", "", ""))).toBe(SHADER_ERROR_FALLBACK);
    expect(call(fakeGl(null, null, null))).toBe(SHADER_ERROR_FALLBACK);
  });

  it("truncates a long log to SHADER_LOG_MAX characters plus an ellipsis", () => {
    const msg = call(fakeGl("x".repeat(5000), "", ""));
    expect(msg.length).toBe(SHADER_LOG_MAX + 1);
    expect(msg.endsWith("…")).toBe(true);
    expect(msg.startsWith("program: xxx")).toBe(true);
  });

  it("never throws, even if the context is lost mid-call", () => {
    const broken = {
      getProgramInfoLog: () => {
        throw new Error("context lost");
      },
      getShaderInfoLog: () => "ok",
    } as unknown as WebGLRenderingContext;
    expect(() => call(broken)).not.toThrow();
    expect(call(broken)).toBe(SHADER_ERROR_FALLBACK);
    expect(call(null as unknown as WebGLRenderingContext)).toBe(SHADER_ERROR_FALLBACK);
  });
});
