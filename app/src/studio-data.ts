import { momentSamples } from "./moment-samples.ts";
import type { NailAppearance } from "./HandScene";

export type Inspiration = {
  id: string;
  title: string;
  artist: string;
  image: string;
  color: string;
  style: string;
  tags: string[];
  source?: "upload";
  palette?: string[];
  note?: string;
};
export type Folder = { id: string; name: string };
export type LegacyLook = { id: string; title: string; image: string; original: string; date: string; tags: string[] };
export type TryOnPhoto = { id: string; title: string; image: string; date: string; palette?: string[] };
export type HandProfile = { photo: string; side: "left" | "right"; skinTone: string };
/** A photo record of a manicure worn in real life, separate from ideas or editable Studio sets. */
export type MomentRecord = {
  id: string;
  title: string;
  photo: string;
  /** Local calendar date, without a timezone conversion. */
  date: string;
  note: string;
  mood?: string;
  occasion?: string;
  /** Bundled examples must stay visibly identified as samples in the UI. */
  isDemo?: boolean;
  colors?: string[];
  shape?: string;
  type?: string;
  artist?: string;
  amount?: number;
  currency?: string;
  sticker?: string;
  tags?: string[];
};
export type StudioProject = {
  id: string;
  name: string;
  nails: NailAppearance[];
  sourceId: string | null;
  sourceTitle: string | null;
  preview: string | null;
  updatedAt: string;
};
export type StudioData = {
  version: 7;
  sampleArchiveRevision: 1;
  folders: Folder[];
  membership: Record<string, string>;
  savedIds: string[];
  uploads: Inspiration[];
  savedLooks: LegacyLook[];
  tryOnPhotos: TryOnPhoto[];
  projects: StudioProject[];
  hand: HandProfile | null;
  draft: StudioProject | null;
  onboardingCompleted: boolean;
  moments: MomentRecord[];
};

export const inspirations: Inspiration[] = [
  { id: "silver", title: "Liquid silver", artist: "byjo", image: "liquid-silver.png", color: "Silver", style: "Chrome", tags: ["chrome", "silver", "almond"], palette: ["#B9C5CD", "#5180C9", "#F1F3F5"], note: "Mirror silver, with a little space for your own twist." },
  { id: "french", title: "Milky French", artist: "tess.tips", image: "milk-french.png", color: "White", style: "French", tags: ["french", "milky white", "almond"], palette: ["#E8B7AB", "#FFFCF4", "#EED6CC"], note: "A sheer pink base and soft white details." },
  { id: "swirl", title: "Halloween swirl", artist: "nailsbyrae", image: "halloween-swirl.png", color: "Orange", style: "Nail art", tags: ["swirl french", "black + orange", "halloween"], palette: ["#DE762D", "#272120", "#DDB0A0"], note: "Black and orange, ready for a playful remix." },
  { id: "pearl", title: "Pearl blush", artist: "lumi.studio", image: "pearl-blush.png", color: "Pink", style: "Chrome", tags: ["pearl chrome", "pink", "almond"], palette: ["#E4ACBE", "#F6E2E9", "#D5A9BD"], note: "A soft blush palette with a pearly glow." },
  { id: "butter", title: "Butter days", artist: "glossbar", image: "butter-yellow.png", color: "Yellow", style: "Nail art", tags: ["butter yellow", "daisy", "short oval"], palette: ["#EED98D", "#FFFAE9", "#D8AA35"], note: "Butter yellow and a tiny daisy for everyday sunshine." },
  { id: "cherry", title: "Cherry on top", artist: "mia.paints", image: "cherry-red.png", color: "Red", style: "Minimal", tags: ["cherry red", "solid", "short oval"], palette: ["#9F283F", "#C64554", "#691B2C"], note: "Glossy cherry red. Make the shape your own." },
];

export const skinTones = [
  { name: "Porcelain", color: "#F1CEB5" },
  { name: "Warm ivory", color: "#DEAF8F" },
  { name: "Honey", color: "#C78D66" },
  { name: "Caramel", color: "#AA6E49" },
  { name: "Chestnut", color: "#845037" },
  { name: "Espresso", color: "#563526" },
];

export const baseColors = [
  { name: "Sheer rose", color: "#E8B7AB" },
  { name: "Milk", color: "#FFFCF4" },
  { name: "Blush", color: "#E4ACBE" },
  { name: "Cherry", color: "#9F283F" },
  { name: "Butter", color: "#EED98D" },
  { name: "Cobalt", color: "#5180C9" },
  { name: "Silver", color: "#B9C5CD" },
  { name: "Espresso", color: "#342725" },
];

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

type NailElement = NailAppearance["elements"][number];
function element(kind: NailElement["kind"], color: string, x = 0, y = 0, scale = 1, rotation = 0): NailElement {
  return { id: uid("element"), kind, color, x, y, scale, rotation };
}

/** Curated editable starting points; uploaded photos provide colors, not inferred nail geometry. */
export function nailsFromInspiration(source: Inspiration): NailAppearance[] {
  const make = (color: string, overrides: Partial<NailAppearance> = {}): NailAppearance => ({
    color, finish: "gloss", shape: "almond", length: 17/42, elements: [], ...overrides,
  });
  if (source.source === "upload") {
    const palette = source.palette?.filter(isColor).slice(0, 3) ?? [];
    const colors = palette.length ? palette : [baseColors[0].color];
    return Array.from({ length: 5 }, (_, index) => make(colors[index % colors.length]));
  }
  switch (source.id) {
    case "silver": return Array.from({ length: 5 }, (_, index) => make("#B9C5CD", {
      finish: "chrome",
      elements: index === 1 || index === 3 ? [element("star", "#5180C9", index === 1 ? -.14 : .12, .08, .9, index === 1 ? -15 : 20)] : [],
    }));
    case "french": return Array.from({ length: 5 }, (_, index) => make("#E8B7AB", {
      pattern: "french", accentColor: "#FFFCF4",
      elements: index === 3 ? [element("pearl", "#FFFCF4", 0, -.22, .7)] : [],
    }));
    case "swirl": return Array.from({ length: 5 }, (_, index) => make(index === 2 || index === 3 ? "#DDB0A0" : "#DE762D", {
      pattern: "swirl", accentColor: index === 3 ? "#DE762D" : "#272120",
    }));
    case "pearl": return Array.from({ length: 5 }, (_, index) => make("#E4ACBE", {
      finish: "chrome", elements: index === 3 ? [element("pearl", "#FFFCF4", 0, -.2, .8)] : [],
    }));
    case "butter": return Array.from({ length: 5 }, (_, index) => make("#EED98D", {
      shape: "round", length: 1/6, elements: index === 3 ? [element("flower", "#FFFAE9", 0, .03, .9)] : [],
    }));
    case "cherry": return Array.from({ length: 5 }, () => make("#9F283F", { shape: "round", length: 1/6 }));
    default: {
      const palette = source.palette?.filter(isColor) ?? [];
      return Array.from({ length: 5 }, (_, index) => make(palette[index % Math.max(1, palette.length)] ?? baseColors[0].color));
    }
  }
}

export function createProject(source?: Inspiration): StudioProject {
  return {
    id: uid("look"),
    name: source ? `My ${source.title.toLowerCase()}` : "My new look",
    nails: source ? nailsFromInspiration(source) : Array.from({ length: 5 }, () => ({ color: baseColors[0].color, finish: "gloss" as const, shape: "almond" as const, length: 17/42, elements: [] })),
    sourceId: source?.id ?? null,
    sourceTitle: source?.title ?? null,
    preview: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Preserve inspiration privately and keep its editable study in Studio drafts. */
export function addPhotoDesign(data: StudioData, source: Inspiration): { data: StudioData; project: StudioProject } {
  const existing = data.projects.find(project => project.sourceId === source.id);
  const project = existing ?? { ...createProject(source), id: `photo-design-${source.id}`, name: source.title };
  return { project, data: {
    ...data,
    uploads: [structuredClone(source), ...data.uploads.filter(item => item.id !== source.id)],
    savedIds: data.savedIds.includes(source.id) ? data.savedIds : [source.id, ...data.savedIds],
    projects: existing ? data.projects : [project, ...data.projects],
  } };
}

export function localDate(date = new Date()): string {
  if (!Number.isFinite(date.getTime())) throw new RangeError("Choose a valid date.");
  return `${date.getFullYear().toString().padStart(4, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

/** Only call after a user chooses a real manicure photo; saving a Studio project is a different action. */
export function createMoment(input: { title: string; photo: string; date?: string; note?: string; mood?: string; occasion?: string }): MomentRecord {
  if (!imageValue(input.photo)) throw new Error("Choose a photo of your manicure.");
  return {
    id: uid("moment"), title: input.title.trim() || "My manicure", photo: input.photo,
    date: calendarDate(input.date) ? input.date : localDate(), note: input.note?.trim() ?? "",
    ...(input.mood?.trim() ? { mood: input.mood.trim() } : {}),
    ...(input.occasion?.trim() ? { occasion: input.occasion.trim() } : {}),
    isDemo: false,
  };
}

/** Always returns independent arrays and objects, including nested nail elements. */
export function initialData(): StudioData {
  return {
    version: 7, sampleArchiveRevision: 1,
    folders: [{ id: "next", name: "Next appt" }, { id: "everyday", name: "Everyday" }, { id: "special", name: "Special days" }],
    membership: { silver: "next", french: "everyday", swirl: "special", pearl: "next", butter: "everyday", cherry: "special" },
    savedIds: inspirations.map(item => item.id),
    uploads: [],
    savedLooks: [
      { id: "chrome-look", title: "Silver, with a twist", image: "my-chrome-look.png", original: "silver", date: "OCT 17", tags: ["silver chrome", "blue stars", "almond"] },
      { id: "french-look", title: "My soft French", image: "my-french-look.png", original: "french", date: "OCT 15", tags: ["pink french", "pearl accent", "almond"] },
    ],
    tryOnPhotos: [], projects: [], hand: null, draft: null, onboardingCompleted: false,
    moments: [...structuredClone(momentSamples),
      { id: "demo-birthday", title: "Birthday gloss", photo: "/assets/moments/kris-atomic-manicure.jpg", date: "2026-10-17", note: "A little shimmer for birthday dinner.", mood: "Celebrating", occasion: "Birthday", isDemo: true },
      { id: "demo-reset", title: "Salon afternoon", photo: "/assets/moments/iwaria-manicure.jpg", date: "2026-10-15", note: "Fresh nails, a coffee, and a little time for me.", mood: "Feeling fresh", occasion: "Everyday", isDemo: true },
    ],
  };
}

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";
const nonempty = (value: unknown): value is string => string(value) && !!value.trim();
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter(string) : [];
const isColor = (value: unknown): value is string => string(value) && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value);
const imageValue = (value: unknown): value is string => nonempty(value) && !/^(?:javascript|vbscript):/i.test(value);
const calendarDate = (value: unknown): value is string => {
  if (!string(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
};
const finite = (value: unknown, fallback: number, min: number, max: number): number => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const unique = <T extends { id: string }>(items: T[]): T[] => [...new Map(items.map(item => [item.id, item])).values()];

function readInspiration(raw: unknown): Inspiration | null {
  if (!record(raw) || !nonempty(raw.id) || !nonempty(raw.title) || !imageValue(raw.image)) return null;
  return {
    id: raw.id, title: raw.title, artist: string(raw.artist) ? raw.artist : "", image: raw.image,
    color: string(raw.color) ? raw.color : "", style: string(raw.style) ? raw.style : "", tags: strings(raw.tags),
    source: "upload", palette: Array.isArray(raw.palette) ? raw.palette.filter(isColor).slice(0, 3) : undefined,
    note: string(raw.note) ? raw.note : "An idea from your photo library. Use its colors to start a look.",
  };
}

function readNail(raw: unknown): NailAppearance | null {
  if (!record(raw) || !isColor(raw.color)) return null;
  const elements: NailElement[] = !Array.isArray(raw.elements) ? [] : raw.elements.flatMap(item => {
    if (!record(item) || !nonempty(item.id) || !["star", "pearl", "flower", "heart"].includes(String(item.kind)) || !isColor(item.color)) return [];
    return [{ id: item.id, kind: item.kind as NailElement["kind"], color: item.color, x: finite(item.x, 0, -.5, .5), y: finite(item.y, 0, -.5, .5), scale: finite(item.scale, 1, .25, 3), rotation: finite(item.rotation, 0, -3600, 3600) }];
  });
  return {
    color: raw.color,
    finish: raw.finish === "chrome" || raw.finish === "matte" ? raw.finish : "gloss",
    shape: raw.shape === "round" || raw.shape === "square" || raw.shape === "coffin" ? raw.shape : "almond",
    length: typeof raw.length === "number" ? finite(raw.length,17/42,0,1) : raw.length === "short" ? 1/6 : raw.length === "long" ? 5/7 : 17/42,
    ...(raw.pattern === "solid" || raw.pattern === "french" || raw.pattern === "swirl" ? { pattern: raw.pattern } : {}),
    ...(isColor(raw.accentColor) ? { accentColor: raw.accentColor } : {}),
    elements: unique(elements),
  };
}

function readProject(raw: unknown): StudioProject | null {
  if (!record(raw) || !nonempty(raw.id) || !nonempty(raw.name) || !Array.isArray(raw.nails) || raw.nails.length !== 5) return null;
  const nails = raw.nails.map(readNail);
  if (nails.some(nail => !nail)) return null;
  return {
    id: raw.id, name: raw.name, nails: nails as NailAppearance[],
    sourceId: nonempty(raw.sourceId) ? raw.sourceId : null,
    sourceTitle: nonempty(raw.sourceTitle) ? raw.sourceTitle : null,
    preview: imageValue(raw.preview) ? raw.preview : null,
    updatedAt: string(raw.updatedAt) && Number.isFinite(Date.parse(raw.updatedAt)) ? raw.updatedAt : new Date().toISOString(),
  };
}

function readMoment(raw: unknown): MomentRecord | null {
  if (!record(raw) || !nonempty(raw.id) || !nonempty(raw.title) || !imageValue(raw.photo) || !calendarDate(raw.date)) return null;
  return {
    id: raw.id, title: raw.title, photo: raw.photo, date: raw.date,
    note: string(raw.note) ? raw.note : "",
    ...(nonempty(raw.mood) ? { mood: raw.mood } : {}),
    ...(nonempty(raw.occasion) ? { occasion: raw.occasion } : {}),
    isDemo: raw.isDemo === true,
    ...(Array.isArray(raw.colors) ? {colors: strings(raw.colors)} : {}),
    ...Object.fromEntries(['shape','type','artist','currency','sticker'].filter(key=>string(raw[key])).map(key=>[key,raw[key]])),
    ...(typeof raw.amount==='number'&&Number.isFinite(raw.amount)&&raw.amount>=0?{amount:raw.amount}:{}),
    ...(Array.isArray(raw.tags)?{tags:strings(raw.tags)}:{}),
  };
}

/** Upgrades existing Saved data without resetting intentionally empty collections. */
export function migrateData(raw: unknown): StudioData {
  const defaults = initialData();
  if (!record(raw) || typeof raw.version !== "number" || ![2,3,4,5,6,7].includes(raw.version)) return defaults;
  const folders = Array.isArray(raw.folders) ? unique(raw.folders.flatMap(folder => record(folder) && nonempty(folder.id) && folder.id !== "all" && nonempty(folder.name) ? [{ id: folder.id, name: folder.name }] : [])) : defaults.folders;
  const uploads = Array.isArray(raw.uploads) ? unique(raw.uploads.map(readInspiration).filter((item): item is Inspiration => !!item && !inspirations.some(source => source.id === item.id))) : [];
  const validIds = new Set([...inspirations, ...uploads].map(item => item.id));
  let savedIds = Array.isArray(raw.savedIds) ? [...new Set(strings(raw.savedIds).filter(id => validIds.has(id)))] : defaults.savedIds;
  if (raw.version === 6 && savedIds.length) savedIds = [...new Set([...savedIds, ...uploads.map(item => item.id)])];
  const folderIds = new Set(folders.map(folder => folder.id));
  const previousMembership = record(raw.membership) ? raw.membership : defaults.membership;
  const membership: Record<string, string> = Object.fromEntries(Object.entries(previousMembership)
    .filter(([id, folderId]) => validIds.has(id) && string(folderId))
    .map(([id, folderId]) => [id, folderIds.has(folderId as string) ? folderId as string : "all"]));
  const savedLooks: LegacyLook[] = Array.isArray(raw.savedLooks) ? unique(raw.savedLooks.flatMap(look => {
    if (!record(look) || !nonempty(look.id) || !nonempty(look.title) || !imageValue(look.image) || !nonempty(look.original)) return [];
    return [{ id: look.id, title: look.title, image: look.image, original: look.original, date: string(look.date) ? look.date : "", tags: strings(look.tags) }];
  })) : defaults.savedLooks;
  let hand: HandProfile | null = null;
  if (Number(raw.version) >= 3 && record(raw.hand) && imageValue(raw.hand.photo) && (raw.hand.side === "left" || raw.hand.side === "right") && isColor(raw.hand.skinTone)) {
    hand = { photo: raw.hand.photo, side: raw.hand.side, skinTone: raw.hand.skinTone };
  }
  const projects = Number(raw.version) >= 3 && Array.isArray(raw.projects) ? unique(raw.projects.map(readProject).filter((project): project is StudioProject => !!project)) : [];
  for (const upload of Number(raw.version) <= 6 ? uploads : []) {
    if (!projects.some(project => project.sourceId === upload.id)) projects.push({ ...createProject(upload), id: `photo-design-${upload.id}`, name: upload.title });
  }
  let moments = Number(raw.version) >= 4 && Array.isArray(raw.moments) ? unique(raw.moments.map(readMoment).filter((moment): moment is MomentRecord => !!moment)) : defaults.moments;
  // The earliest browser demo had only these two bundled 2026 examples.
  // Refresh that sample-only archive once. Preserve edits, real photos and empty diaries.
  if (raw.sampleArchiveRevision !== 1 && moments.length > 0 && moments.every(moment => moment.isDemo && ['demo-birthday','demo-reset'].includes(moment.id))) {
    const existing = new Set(moments.map(moment => moment.id));
    moments = [...moments, ...defaults.moments.filter(moment => !existing.has(moment.id))];
  }
  // Repair only known bundled model assets. User-uploaded photos always stay intact.
  moments = moments.map(moment => {
    if (!moment.isDemo) return moment;
    const source = defaults.moments.find(sample => sample.id === moment.id);
    const oldModel = /^(?:\/assets\/)?canonical\//.test(moment.photo) || ['my-chrome-look.png','my-french-look.png','/assets/my-chrome-look.png','/assets/my-french-look.png'].includes(moment.photo);
    return source && oldModel ? { ...moment, photo: source.photo, ...(moment.id === 'demo-reset' && moment.title === 'Everyday French' ? {title: source.title} : {}) } : moment;
  });
  return {
    version: 7, sampleArchiveRevision: 1, folders, membership, savedIds, uploads, savedLooks, hand,
    tryOnPhotos: Array.isArray(raw.tryOnPhotos) ? unique(raw.tryOnPhotos.flatMap(photo => record(photo) && nonempty(photo.id) && nonempty(photo.title) && imageValue(photo.image) && calendarDate(photo.date) ? [{id: photo.id, title: photo.title, image: photo.image, date: photo.date, ...(Array.isArray(photo.palette) ? {palette: photo.palette.filter(isColor)} : {})}] : [])) : [],
    projects,
    draft: Number(raw.version) >= 3 ? readProject(raw.draft) : null,
    onboardingCompleted: Number(raw.version) >= 4 && raw.onboardingCompleted === true,
    moments,
  };
}

/** Only explicitly personal photos belong here. Model previews and bundled samples stay elsewhere. */
export function personalTryOns(data: StudioData): TryOnPhoto[] {
  const photos: TryOnPhoto[] = [...data.tryOnPhotos,
    ...data.moments.filter(moment => !moment.isDemo).map(moment => ({ id: `memory-photo-${moment.id}`, title: moment.title, image: moment.photo, date: moment.date })),
    ...data.savedLooks.filter(look => !['chrome-look','french-look'].includes(look.id)).map(look => ({ id: look.id, title: look.title, image: look.image, date: look.date })),
  ];
  return photos.filter((photo, index) => photos.findIndex(item => item.image === photo.image) === index);
}

export function photoSrc(image: string): string {
  return /^(?:data:|blob:|\/)/i.test(image) ? image : `/assets/${image}`;
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("This photo couldn’t be read. Please choose another image."));
    reader.onerror = () => reject(new Error("This photo couldn’t be read. Please choose another image."));
    reader.onabort = () => reject(new Error("Photo selection was interrupted. Please try again."));
    reader.readAsDataURL(file);
  });
}

function decodeImage(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve(image) : reject(new Error("This image has no visible pixels. Please choose another photo."));
    image.onerror = () => reject(new Error("This image couldn’t be opened. Try a JPG, PNG, or WebP photo."));
    image.src = data;
  });
}

/** Dominant image colors, not nail detection or an AI-generated interpretation. */
function dominantColors(image: HTMLCanvasElement): string[] {
  const sample = document.createElement("canvas");
  sample.width = 120;
  sample.height = Math.max(1, Math.round(120 * image.height / image.width));
  if (sample.height > 120) { sample.width = Math.max(1, Math.round(120 * image.width / image.height)); sample.height = 120; }
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Photo colors couldn’t be read in this browser. Please try another image.");
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b; buckets.set(key, bucket);
  }
  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count).map(bucket => [bucket.r, bucket.g, bucket.b].map(channel => Math.round(channel / bucket.count)));
  const selected: number[][] = [];
  for (const color of ranked) {
    if (selected.every(previous => Math.hypot(...color.map((channel, index) => channel - previous[index])) >= 42)) selected.push(color);
    if (selected.length === 3) break;
  }
  // A one-color image legitimately produces one color; do not invent extra swatches.
  return selected.map(color => `#${color.map(channel => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`);
}

export async function readImageFile(file: File): Promise<{ data: string; palette: string[]; name: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo or screenshot.");
  if (!file.size) throw new Error("This image is empty. Please choose another photo.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose an image smaller than 15 MB.");
  const image = await decodeImage(await readFile(file));
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photos aren’t supported in this browser. Please try another browser.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const palette = dominantColors(canvas);
  return {
    data: canvas.toDataURL("image/jpeg", .9), palette,
    name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim().slice(0, 60) || "My inspiration",
  };
}
