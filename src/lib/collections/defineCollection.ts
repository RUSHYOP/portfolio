import mongoose, { Schema, type Model, type SchemaDefinition, type SchemaDefinitionProperty } from "mongoose";
import dbConnect from "@/lib/mongodb";
import { validate, type CollectionDef, type FieldSpec, type FieldValue, type ValidationResult } from "./fieldSpec";

export type Item = { id: string; order: number; createdAt: string } & Record<string, FieldValue>;

export class DuplicateSlugError extends Error {
  constructor() {
    super("slug already exists");
    this.name = "DuplicateSlugError";
  }
}

export interface Collection {
  def: CollectionDef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents are spec-shaped, typed at the DTO boundary
  model: Model<any>;
  validate(body: unknown, mode: "create" | "update"): ValidationResult;
  toDto(doc: Record<string, unknown>, opts?: { includeInternal?: boolean }): Item;
  list(opts?: { publishedOnly?: boolean; includeInternal?: boolean; sort?: "order" | "newest" }): Promise<Item[]>;
  getById(id: string, opts?: { includeInternal?: boolean }): Promise<Item | null>;
  getBySlug(slug: string, opts?: { publishedOnly?: boolean }): Promise<Item | null>;
  create(value: Record<string, FieldValue>, internal?: Record<string, FieldValue>): Promise<Item>;
  update(id: string, value: Record<string, FieldValue>): Promise<Item | null>;
  remove(id: string): Promise<boolean>;
  reorder(ids: string[]): Promise<boolean>;
}

// Maps one field spec onto its Mongoose path definition. `unique` is set only on
// the slug field (itemId gets it in buildSchema); everything else is a plain path.
// Typed with Mongoose's own SchemaDefinitionProperty (not Record<string, unknown>)
// so `new Schema(shape)` typechecks under strict mode without a cast.
function schemaTypeFor(spec: FieldSpec): SchemaDefinitionProperty {
  switch (spec.type) {
    case "chips":
      return { type: [String], default: [] };
    case "toggle":
      return { type: Boolean, default: typeof spec.default === "boolean" ? spec.default : false };
    case "number":
      return { type: Number, default: typeof spec.default === "number" ? spec.default : 0 };
    case "select":
      return { type: String, enum: (spec.options ?? []).map((o) => o.value), default: typeof spec.default === "string" ? spec.default : undefined };
    case "slug":
      return { type: String, trim: true, unique: true, index: true };
    default:
      return { type: String, trim: true, default: typeof spec.default === "string" ? spec.default : "" };
  }
}

// Builds the Mongoose schema for a def: itemId + one path per field, plus the
// order/published bookkeeping paths the def opts into. Exported for tests.
export function buildSchema(def: CollectionDef): Schema {
  const shape: SchemaDefinition = { itemId: { type: String, required: true, unique: true, index: true } };
  for (const [key, spec] of Object.entries(def.fields)) shape[key] = schemaTypeFor(spec);
  if (def.orderable) shape.order = { type: Number, default: 0, index: true };
  if (def.publishable) shape.published = { type: Boolean, default: false, index: true };
  return new Schema(shape, { timestamps: true, collection: def.collection });
}

// DTO fallback for a field absent from the stored document.
function emptyFor(spec: FieldSpec): FieldValue {
  if (spec.default !== undefined) return spec.default;
  switch (spec.type) {
    case "chips": return [];
    case "toggle": return false;
    case "number": return 0;
    default: return "";
  }
}

const isDuplicateKey = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

export function defineCollection(def: CollectionDef): Collection {
  // Model names are unique per process: reuse the registered model on re-entry.
  const model: Model<unknown> = mongoose.models[def.name] ?? mongoose.model(def.name, buildSchema(def));
  const hasSlug = Object.values(def.fields).some((f) => f.type === "slug");
  const slugKey = Object.entries(def.fields).find(([, f]) => f.type === "slug")?.[0];

  // Maps a raw document to the public DTO: itemId → id, internals dropped unless
  // asked, _id/__v/updatedAt never copied because only spec'd keys are read.
  const toDto: Collection["toDto"] = (doc, opts) => {
    const out: Record<string, FieldValue> = {};
    for (const [key, spec] of Object.entries(def.fields)) {
      if (spec.internal && !opts?.includeInternal) continue;
      const v = doc[key];
      out[key] = (v === undefined || v === null ? emptyFor(spec) : v) as FieldValue;
    }
    if (def.publishable) out.published = Boolean(doc.published);
    const createdAt = doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? "");
    return { ...out, id: String(doc.itemId), order: typeof doc.order === "number" ? doc.order : 0, createdAt } as Item;
  };

  const newId = () => `${def.idPrefix}_${globalThis.crypto.randomUUID()}`;

  return {
    def,
    model,
    validate: (body, mode) => validate(def.fields, body, mode),
    toDto,

    async list(opts) {
      await dbConnect();
      const filter: Record<string, unknown> = {};
      if (opts?.publishedOnly && def.publishable) filter.published = true;
      const sort: Record<string, 1 | -1> = opts?.sort === "newest" || !def.orderable ? { createdAt: -1 } : { order: 1 };
      const docs = await model.find(filter).sort(sort).lean<Record<string, unknown>[]>();
      return docs.map((d) => toDto(d, { includeInternal: opts?.includeInternal }));
    },

    async getById(id, opts) {
      await dbConnect();
      const d = await model.findOne({ itemId: id }).lean<Record<string, unknown> | null>();
      return d ? toDto(d, { includeInternal: opts?.includeInternal }) : null;
    },

    async getBySlug(slug, opts) {
      // Guarded before dbConnect: a def without a slug field can never answer this.
      if (!hasSlug || !slugKey) throw new Error(`${def.name} has no slug field`);
      await dbConnect();
      const filter: Record<string, unknown> = { [slugKey]: slug };
      if (opts?.publishedOnly && def.publishable) filter.published = true;
      const d = await model.findOne(filter).lean<Record<string, unknown> | null>();
      return d ? toDto(d) : null;
    },

    async create(value, internal) {
      await dbConnect();
      const order = def.orderable ? await model.countDocuments() : 0;
      try {
        const doc = await model.create({ ...value, ...(internal ?? {}), itemId: newId(), ...(def.orderable ? { order } : {}) });
        return toDto((doc as { toObject: () => Record<string, unknown> }).toObject(), { includeInternal: true });
      } catch (e) {
        if (isDuplicateKey(e)) throw new DuplicateSlugError();
        throw e;
      }
    },

    async update(id, value) {
      await dbConnect();
      try {
        const d = await model
          .findOneAndUpdate({ itemId: id }, { $set: value }, { new: true, runValidators: true })
          .lean<Record<string, unknown> | null>();
        return d ? toDto(d, { includeInternal: true }) : null;
      } catch (e) {
        if (isDuplicateKey(e)) throw new DuplicateSlugError();
        throw e;
      }
    },

    async remove(id) {
      await dbConnect();
      const r = await model.deleteOne({ itemId: id });
      return r.deletedCount > 0;
    },

    async reorder(ids) {
      if (!def.orderable) return false;
      await dbConnect();
      // Reject before writing unless `ids` is exactly the stored id set (duplicates
      // and omissions both fail the sorted comparison).
      const existing = (await model.find({}, { itemId: 1 }).lean<{ itemId: string }[]>()).map((d) => d.itemId).sort();
      const wanted = [...ids].sort();
      if (existing.length !== wanted.length || existing.some((v, i) => v !== wanted[i])) return false;
      await model.bulkWrite(ids.map((itemId, order) => ({ updateOne: { filter: { itemId }, update: { $set: { order } } } })));
      return true;
    },
  };
}
