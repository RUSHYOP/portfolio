// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ContactForm from "./ContactForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function fill() {
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Alex" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "alex@example.com" },
  });
  fireEvent.change(screen.getByLabelText("What’s on your mind?"), {
    target: { value: "A new product" },
  });
}
describe("ContactForm", () => {
  it("sends the existing API contract and announces success only after a successful response", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    render(<ContactForm />);
    fill();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Your message has been received",
      ),
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      name: "Alex",
      email: "alex@example.com",
      building: "A new product",
      budget: "undecided",
      timeline: "exploring",
      website: "",
    });
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe(
      "",
    );
  });
  it("keeps the message on failure and makes retry possible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
    );
    render(<ContactForm />);
    fill();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Too many messages",
      ),
    );
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe(
      "Alex",
    );
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
});
