import { describe, expect, it } from "vitest";
import { dprFor, parseQuality } from "./graphics";

describe("graphics quality", () => {
  it("1080p on a 540px-tall screen renders at 2x", () => expect(dprFor(1080, 540)).toBe(2));
  it("720p on a 720px-tall screen renders at 1x", () => expect(dprFor(720, 720)).toBe(1));
  it("480p on a 960px-tall screen renders at half resolution", () => expect(dprFor(480, 960)).toBe(0.5));
  it("unknown saved values fall back to 720p", () => expect(parseQuality("abc")).toBe(720));
});
