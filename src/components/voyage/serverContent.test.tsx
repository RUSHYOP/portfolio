import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import Launch from "./Launch";
import Process from "./Process";

it("includes visible real hero and every process step in server HTML", () => {
  const hero = renderToString(<Launch headline="Actual CMS headline" subheadline="Actual CMS promise" ready />);
  expect(hero).toContain("Actual CMS headline");
  expect(hero).toContain("Actual CMS promise");
  expect(hero).not.toMatch(/style="[^"]*opacity:0(?:;|")/);

  const process = renderToString(<Process animated={false} steps={[
    { id: "a", order: 0, createdAt: "", title: "Discover", what: "Understand constraints" },
    { id: "b", order: 1, createdAt: "", title: "Ship", what: "Operate reliably" },
  ]} />);
  expect(process).toContain("Understand constraints");
  expect(process).toContain("Operate reliably");
  expect(process.match(/id="orbit"/g)).toHaveLength(1);
  expect(process).not.toContain("chapter__pin");
});
