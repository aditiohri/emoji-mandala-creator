import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultSections, parseSections, toggleSection, setAll, allOpen, openState } from "../js/sections.js";

test("defaults: phone opens only Shape, desktop opens all", () => {
  assert.deepEqual(defaultSections(true), { palette: false, shape: true, background: false });
  assert.deepEqual(defaultSections(false), { palette: true, shape: true, background: true });
});

test("parse: stored values win, missing or bad ones use the defaults", () => {
  const d = defaultSections(true);
  assert.deepEqual(parseSections('{"palette":true,"shape":false}', d), { palette: true, shape: false, background: false });
  assert.deepEqual(parseSections(null, d), d);
  assert.deepEqual(parseSections("not json", d), d);
  assert.deepEqual(parseSections("[1,2]", d), d);
  assert.deepEqual(parseSections('{"palette":"yes"}', d), d);
});

test("toggle flips one section and leaves the input alone", () => {
  const m = defaultSections(true);
  assert.deepEqual(toggleSection(m, "palette"), { palette: true, shape: true, background: false });
  assert.equal(m.palette, false);
});

test("setAll and allOpen", () => {
  assert.equal(allOpen(setAll(true)), true);
  assert.equal(allOpen(setAll(false)), false);
  assert.equal(allOpen(defaultSections(true)), false);
});

test("openState: all, none or some", () => {
  assert.equal(openState(setAll(true)), "all");
  assert.equal(openState(setAll(false)), "none");
  assert.equal(openState({ palette: true, shape: false, background: false }), "some");
  assert.equal(openState({ palette: true, shape: true, background: false }), "some");
});
