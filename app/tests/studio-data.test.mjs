import assert from "node:assert/strict";
import test from "node:test";
import { initialData, migrateData, inspirations, createProject, createMoment, localDate, nailsFromInspiration, photoSrc, readImageFile } from "../src/studio-data.ts";

// Node's built-in type stripping exercises the actual module without a second runtime dependency.

test("fresh data and projects never share mutable nested arrays", () => {
  const first = initialData();
  first.folders[0].name = "Changed";
  first.savedLooks[0].tags.push("changed");
  first.moments[0].note = "Changed memory";
  const second = initialData();
  assert.equal(second.folders[0].name, "Next appt");
  assert.ok(!second.savedLooks[0].tags.includes("changed"));
  assert.notEqual(second.moments[0].note, "Changed memory");
  const project = createProject(inspirations[0]);
  project.nails[1].elements[0].color = "#000000";
  assert.notEqual(createProject(inspirations[0]).nails[1].elements[0].color, "#000000");
  assert.notEqual(project.id, createProject().id);
});

test("v2 migration keeps personal uploads, folders, empty saved looks and saved order", () => {
  const raw = {
    version: 2, folders: [{ id: "birthday", name: "Birthday ideas" }],
    uploads: [{ id: "upload-1", title: "Photo idea", image: "data:image/png;base64,photo", artist: "", tags: [], source: "upload" }],
    savedIds: ["upload-1", "french"], savedLooks: [],
    membership: { "upload-1": "birthday", french: "deleted-folder", silver: "birthday" },
  };
  const migrated = migrateData(raw);
  assert.equal(migrated.version, 7);
  assert.deepEqual(migrated.savedIds, ["upload-1", "french"]);
  assert.deepEqual(migrated.folders, raw.folders);
  assert.equal(migrated.uploads[0].image, raw.uploads[0].image);
  assert.equal(migrated.membership["upload-1"], "birthday");
  assert.equal(migrated.membership.french, "all");
  assert.deepEqual(migrated.savedLooks, []);
  assert.equal(migrated.projects.length, 1);
  assert.equal(migrated.projects[0].sourceId, "upload-1");
  assert.equal(migrated.hand, null);
  assert.equal(migrated.onboardingCompleted, false);
  assert.ok(migrated.moments.every(moment => moment.isDemo === true));
});

test("an intentionally empty v2 collection stays empty", () => {
  const migrated = migrateData({ version: 2, folders: [], uploads: [], savedIds: [], savedLooks: [], membership: {} });
  assert.deepEqual(migrated.folders, []);
  assert.deepEqual(migrated.savedIds, []);
  assert.deepEqual(migrated.savedLooks, []);
});

test("v3 migration retains editable patterns, hand profile and draft without sharing references", () => {
  const raw = initialData();
  raw.version = 3;
  const draft = createProject(inspirations[1]);
  draft.preview = "data:image/jpeg;base64,preview";
  raw.projects = [draft]; raw.draft = draft;
  raw.hand = { photo: "data:image/jpeg;base64,hand", side: "left", skinTone: "#845037" };
  const migrated = migrateData(raw);
  assert.equal(migrated.projects[0].nails[0].pattern, "french");
  assert.equal(migrated.projects[0].nails[0].accentColor, "#FFFCF4");
  assert.deepEqual(migrated.hand, raw.hand);
  assert.deepEqual(migrated.draft, draft);
  migrated.draft.nails[0].color = "#000000";
  assert.notEqual(migrated.projects[0].nails[0].color, "#000000");
  assert.notEqual(raw.draft.nails[0].color, "#000000");
});

test("migration drops corrupt records, unknown saved references and malformed five-nail projects", () => {
  const good = createProject();
  const bad = { ...good, id: "broken", nails: good.nails.slice(1) };
  const migrated = migrateData({ version: 3, folders: [null, { id: "ok", name: "Good" }], uploads: [{ id: "x", title: "Oops", image: "javascript:bad" }], savedIds: ["missing", "silver", "silver"], projects: [bad, good], hand: { photo: "x", side: "neither", skinTone: "bad" }, draft: null });
  assert.deepEqual(migrated.savedIds, ["silver"]);
  assert.equal(migrated.uploads.length, 0);
  assert.equal(migrated.projects.length, 1);
  assert.equal(migrated.projects[0].id, good.id);
  assert.equal(migrated.hand, null);
  assert.equal(migrateData({ version: 99 }).version, 7);
});

test("v4 keeps onboarding completion, real photo memories and deliberately empty memory collections", () => {
  const real = createMoment({ title: "Dinner nails", photo: "data:image/jpeg;base64,manicure", date: "2026-10-18", note: "Loved wearing these.", mood: "Happy", occasion: "Dinner" });
  const raw = { ...initialData(), onboardingCompleted: true, moments: [real] };
  const migrated = migrateData(raw);
  assert.equal(migrated.onboardingCompleted, true);
  assert.deepEqual(migrated.moments, [real]);
  assert.equal(migrated.moments[0].isDemo, false);
  migrated.moments[0].note = "Edited later";
  assert.equal(raw.moments[0].note, "Loved wearing these.");
  assert.deepEqual(migrateData({ ...raw, moments: [] }).moments, []);
  assert.equal(migrateData({ ...raw, onboardingCompleted: "true" }).onboardingCompleted, false);
  assert.equal(migrateData({ ...raw, version: 3 }).onboardingCompleted, false);
});

test("upgrading old Saved data adds only marked sample memories, without treating saved ideas as worn manicures", () => {
  const project = createProject(inspirations[0]);
  const migrated = migrateData({ ...initialData(), version: 3, projects: [project], draft: project });
  assert.ok(migrated.moments.length >= 2);
  assert.ok(migrated.moments.every(moment => moment.isDemo === true));
  assert.ok(migrated.moments.every(moment => !migrated.savedIds.includes(moment.id) && moment.id !== project.id));
  assert.equal(migrated.projects[0].id, project.id);
  assert.equal(migrated.draft.id, project.id);
});

test("memory migration validates calendar dates and photos while preserving valid leap-day records", () => {
  const good = { id: "worn-1", title: "Leap day manicure", photo: "my-french-look.png", date: "2024-02-29", note: "An actual photo", mood: "Happy", isDemo: false };
  const migrated = migrateData({
    ...initialData(), moments: [
      good,
      { ...good, id: "bad-date", date: "2026-02-29" },
      { ...good, id: "overflow", date: "2026-04-31" },
      { ...good, id: "not-local", date: "2026-10-19T00:00:00Z" },
      { ...good, id: "no-photo", photo: "" },
      { ...good, id: "unsafe-photo", photo: "javascript:bad" },
      null,
    ],
  });
  assert.deepEqual(migrated.moments, [good]);
  assert.deepEqual(migrateData({ ...initialData(), moments: [{ ...good, date: "bad" }] }).moments, []);
});

test("new memories are independent real-photo records with local dates and never auto-saved Studio output", () => {
  const photo = "data:image/jpeg;base64,real-photo";
  const moment = createMoment({ title: "  Weekend set  ", photo, date: "2026-10-18", note: "  Finally wore these.  ", occasion: "  Weekend  " });
  assert.equal(moment.title, "Weekend set");
  assert.equal(moment.note, "Finally wore these.");
  assert.equal(moment.occasion, "Weekend");
  assert.equal(moment.date, "2026-10-18");
  assert.equal(moment.photo, photo);
  assert.equal(moment.isDemo, false);
  assert.notEqual(moment.id, createMoment({ title: "", photo }).id);
  assert.equal(createMoment({ title: " ", photo, date: "2026-02-30" }).date, localDate());
  assert.throws(() => createMoment({ title: "Missing image", photo: "" }), /photo/);
  assert.equal(localDate(new Date(2026, 9, 19, 23, 59)), "2026-10-19");
  assert.throws(() => localDate(new Date("invalid")), /valid date/);
});

test("reference presets stay recognizable, and uploaded photos only contribute colors", () => {
  for (const source of inspirations) assert.equal(nailsFromInspiration(source).length, 5);
  assert.equal(nailsFromInspiration(inspirations[0])[1].elements[0].kind, "star");
  assert.equal(nailsFromInspiration(inspirations[1])[0].pattern, "french");
  assert.equal(nailsFromInspiration(inspirations[2])[0].pattern, "swirl");
  assert.equal(nailsFromInspiration(inspirations[4])[3].elements[0].kind, "flower");
  const uploaded = nailsFromInspiration({ ...inspirations[0], source: "upload", palette: ["#123456", "#ABCDEF"] });
  assert.deepEqual(uploaded.map(nail => nail.color), ["#123456", "#ABCDEF", "#123456", "#ABCDEF", "#123456"]);
  assert.ok(uploaded.every(nail => nail.finish === "gloss" && !nail.pattern && !nail.elements.length));
});

test("photo paths preserve browser-local images and resolve bundled assets", () => {
  assert.equal(photoSrc("data:image/png;base64,abc"), "data:image/png;base64,abc");
  assert.equal(photoSrc("blob:https://example.com/id"), "blob:https://example.com/id");
  assert.equal(photoSrc("/assets/milk-french.png"), "/assets/milk-french.png");
  assert.equal(photoSrc("milk-french.png"), "/assets/milk-french.png");
});

test("image validation rejects wrong, empty and oversized files before decoding", async () => {
  await assert.rejects(readImageFile({ type: "text/plain", size: 20 }), /photo or screenshot/);
  await assert.rejects(readImageFile({ type: "image/png", size: 0 }), /empty/);
  await assert.rejects(readImageFile({ type: "image/png", size: 16 * 1024 * 1024 }), /15 MB/);
});

test("image import preserves aspect ratio, caps image size and extracts actual distinct color values", async t => {
  const original = { FileReader: globalThis.FileReader, Image: globalThis.Image, document: globalThis.document };
  t.after(() => Object.assign(globalThis, original));
  globalThis.FileReader = class {
    readAsDataURL() { this.result = "data:image/png;base64,input"; queueMicrotask(() => this.onload()); }
  };
  globalThis.Image = class {
    naturalWidth = 3200; naturalHeight = 1600;
    set src(value) { queueMicrotask(() => this.onload()); }
  };
  const canvases = [];
  globalThis.document = { createElement() {
    const canvas = {
      width: 0, height: 0,
      getContext() { return {
        fillRect() {}, drawImage() {},
        getImageData() { return { data: Uint8ClampedArray.from([
          200, 20, 30, 255, 200, 20, 30, 255, 20, 170, 40, 255, 20, 170, 40, 255, 20, 50, 220, 255,
        ]) }; },
      }; },
      toDataURL(type) { assert.equal(type, "image/jpeg"); return "data:image/jpeg;base64,resized"; },
    };
    canvases.push(canvas); return canvas;
  } };
  const result = await readImageFile({ type: "image/png", size: 20, name: "My_nail-idea.png" });
  assert.equal(canvases[0].width, 1600);
  assert.equal(canvases[0].height, 800);
  assert.equal(result.data, "data:image/jpeg;base64,resized");
  assert.equal(result.name, "My nail idea");
  assert.deepEqual(result.palette, ["#C8141E", "#14AA28", "#1432DC"]);
});


test("v4 three-step lengths migrate without changing their physical lengths and new fields survive reload", () => {
  const raw=initialData(); raw.version=4; raw.onboardingCompleted=true;
  const project=createProject(); project.nails[0].length='short';project.nails[1].length='medium';project.nails[2].length='long';
  raw.projects=[project];raw.draft=project;
  raw.moments=[{id:'personal',title:'A real set',photo:'photo.jpg',date:'2023-05-12',note:'Keep',colors:['Red'],shape:'Almond',type:'Gel',artist:'Artist',amount:42,currency:'USD',sticker:'🎀',occasion:'Wedding',isDemo:false}];
  const next=migrateData(raw);
  assert.equal(next.version,7);assert.equal(next.onboardingCompleted,true);
  assert.ok(Math.abs(next.projects[0].nails[0].length-1/6)<1e-10);
  assert.ok(Math.abs(next.projects[0].nails[1].length-17/42)<1e-10);
  assert.ok(Math.abs(next.projects[0].nails[2].length-5/7)<1e-10);
  assert.deepEqual(next.moments,raw.moments);
  next.draft.nails[0].length=.635;
  assert.equal(migrateData(next).draft.nails[0].length,.635);
  assert.deepEqual(migrateData({...next,moments:[]}).moments,[]);
});
