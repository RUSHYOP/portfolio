import { describe, it, expect } from "vitest";
import { canSeedPlaceholders, PLACEHOLDERS_FLAG } from "./seedGuard";

const NO_FLAGS: string[] = ["node", "scripts/seed.ts"];

describe("canSeedPlaceholders — local databases", () => {
  it("allows localhost, 127.0.0.1 and [::1], with and without a port, a database and options", () => {
    for (const uri of [
      "mongodb://localhost",
      "mongodb://localhost:27018/portfolio",
      "mongodb://127.0.0.1:27017/portfolio?retryWrites=true",
      "mongodb://[::1]/portfolio",
      "mongodb://[::1]:27018/portfolio",
      "MONGODB://LOCALHOST:27018/portfolio",
      "  mongodb://localhost:27018/portfolio  ",
    ]) {
      expect(canSeedPlaceholders(uri, NO_FLAGS), uri).toBe(true);
    }
  });

  it("allows credentials in front of a local host and a replica set made only of local hosts", () => {
    expect(canSeedPlaceholders("mongodb://user:p%40ss@localhost:27018/db", NO_FLAGS)).toBe(true);
    expect(canSeedPlaceholders("mongodb://localhost:27017,127.0.0.1:27018/db", NO_FLAGS)).toBe(true);
  });
});

describe("canSeedPlaceholders — fails closed", () => {
  it("refuses remote hosts and look-alikes", () => {
    for (const uri of [
      "mongodb://cluster0.abcde.mongodb.net/portfolio",
      "mongodb://containers-us-west-1.railway.app:7000/portfolio",
      "mongodb://localhost.evil.com/portfolio",
      "mongodb://127.0.0.1.nip.io/portfolio",
      "mongodb://evil.com/localhost",
      "mongodb://evil.com/?host=localhost",
      "mongodb://localhost@evil.com/portfolio",
      "mongodb://user:pa@ss@evil.com/portfolio",
      "mongodb://localhost./portfolio",
      "mongodb://0.0.0.0:27017/portfolio",
      "mongodb://10.0.0.5:27017/portfolio",
    ]) {
      expect(canSeedPlaceholders(uri, NO_FLAGS), uri).toBe(false);
    }
  });

  it("refuses a host list that mixes local and remote hosts", () => {
    expect(canSeedPlaceholders("mongodb://localhost:27017,evil.com:27017/db", NO_FLAGS)).toBe(false);
    expect(canSeedPlaceholders("mongodb://evil.com,localhost/db", NO_FLAGS)).toBe(false);
  });

  it("refuses mongodb+srv (SRV hosts are never local) and every unparsable or absent URI", () => {
    for (const uri of [
      "mongodb+srv://localhost/portfolio",
      "mongodb+srv://cluster0.abcde.mongodb.net/portfolio",
      "localhost:27018/portfolio",
      "http://localhost/portfolio",
      "mongodb://",
      "mongodb:///portfolio",
      "mongodb://::1/portfolio",
      "not a uri",
      "",
      undefined,
    ]) {
      expect(canSeedPlaceholders(uri, NO_FLAGS), String(uri)).toBe(false);
    }
  });
});

describe("canSeedPlaceholders — the explicit flag", () => {
  it("allows a remote database only with exactly --placeholders", () => {
    const remote = "mongodb+srv://cluster0.abcde.mongodb.net/portfolio";
    expect(PLACEHOLDERS_FLAG).toBe("--placeholders");
    expect(canSeedPlaceholders(remote, [...NO_FLAGS, "--placeholders"])).toBe(true);
    expect(canSeedPlaceholders(undefined, ["--placeholders"])).toBe(true);
    for (const near of ["--placeholder", "--placeholders=true", "placeholders", "-placeholders", "--Placeholders"]) {
      expect(canSeedPlaceholders(remote, [...NO_FLAGS, near]), near).toBe(false);
    }
  });
});
