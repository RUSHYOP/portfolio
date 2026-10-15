import mongoose, { Schema, type Model, type SchemaDefinition, type SchemaDefinitionProperty } from "mongoose";
import dbConnect from "@/lib/mongodb";
import { validate, type CollectionDef, type FieldSpec, type FieldSpecs, type FieldValue, type ValidationResult } from "./fieldSpec";

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

// `order` and `itemId` are bookkeeping paths this module owns; a def that declares
// them would silently shadow them. `published` is synthesized below, so a def may
// only declare it as the toggle it is.
function assertNoReservedFields(def: CollectionDef): void {
  for (const k of Object.keys(def.fields)) {
    if (k === "itemId" || k === "order") throw new Error(`${def.name}: field name "${k}" is reserved`);
    if (k === "published" && def.fields[k].type !== "toggle") throw new Error(`${def.name}: field "published" must be a toggle`);
  }
}

/**
 * The def's fields plus the synthesized `published` toggle for a publishable def.
 * Single source of truth for schema paths, validation, DTO shape and DTO empties —
 * without it `published` is unvalidatable and nothing can ever be published.
 */
export function effectiveFields(def: CollectionDef): FieldSpecs {
  assertNoReservedFields(def);
  if (!def.publishable || def.fields.published) return def.fields;
  return { ...def.fields, published: { type: "toggle", label: "Published", default: false } };
}

// One default-resolution helper so schema defaults and DTO empties can never drift.
// Returns undefined only for a select with no declared default: the schema then omits
// `default` entirely and the DTO falls back to the first option (see emptyFor).
function defaultFor(spec: FieldSpec): FieldValue | undefined {
  switch (spec.type) {
    case "chips": return Array.isArray(spec.default) ? spec.default : [];
    case "toggle": return typeof spec.default === "boolean" ? spec.default : false;
    case "number": return typeof spec.default === "number" ? spec.default : 0;
    case "select": return typeof spec.default === "string" ? spec.default : undefined;
    default: return typeof spec.default === "string" ? spec.default : "";
  }
}

// Maps one field spec onto its Mongoose path definition. `unique` is set only on
// the slug field (itemId gets it in buildSchema); everything else is a plain path.
// `key` is passed so the synthesized `published` toggle keeps its index.
// Typed with Mongoose's own SchemaDefinitionProperty (not Record<string, unknown>)
// so `new Schema(shape)` typechecks under strict mode without a cast.
function schemaTypeFor(spec: FieldSpec, key: string): SchemaDefinitionProperty {
  const d = defaultFor(spec);
  const withDefault = d !== undefined ? { default: d } : {};
  const indexed = key === "published" ? { index: true } : {};
  switch (spec.type) {
    case "chips":
      return { type: [String], ...withDefault };
    case "toggle":
      return { type: Boolean, ...withDefault, ...indexed };
    case "number":
      return { type: Number, ...withDefault };
    case "select":
      return { type: String, enum: (spec.options ?? []).map((o) => o.value), ...withDefault };
    case "slug":
      return { type: String, trim: true, unique: true, index: true };
    default:
      return { type: String, trim: true, ...withDefault };
  }
}

// Builds the Mongoose schema for a def: itemId + one path per effective field
// (including the synthesized `published` toggle), plus the `order` bookkeeping path.
// Exported for tests.
export function buildSchema(def: CollectionDef): Schema {
  const shape: SchemaDefinition = { itemId: { type: String, required: true, unique: true, index: true } };
  for (const [key, spec] of Object.entries(effectiveFields(def))) shape[key] = schemaTypeFor(spec, key);
  if (def.orderable) shape.order = { type: Number, default: 0, index: true };
  return new Schema(shape, { timestamps: true, collection: def.collection });
}

// DTO fallback for a field absent from the stored document. Shares defaultFor with
// the schema; a select with no declared default reads back as its first option.
function emptyFor(spec: FieldSpec): FieldValue {
  return defaultFor(spec) ?? spec.options?.[0]?.value ?? "";
}

const isDuplicateKey = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

export function defineCollection(def: CollectionDef): Collection {
  // Resolved before the model-cache lookup: the reserved-name guard must fire even
  // when the model is already registered and buildSchema is skipped.
  const fields = effectiveFields(def);
  // Model names are unique per process: reuse the registered model on re-entry.
  const model: Model<unknown> = mongoose.models[def.name] ?? mongoose.model(def.name, buildSchema(def));
  const hasSlug = Object.values(fields).some((f) => f.type === "slug");
  const slugKey = Object.entries(fields).find(([, f]) => f.type === "slug")?.[0];

  // Maps a raw document to the public DTO: itemId → id, internals dropped unless
  // asked, _id/__v/updatedAt never copied because only spec'd keys are read.
  const toDto: Collection["toDto"] = (doc, opts) => {
    const out: Record<string, FieldValue> = {};
    for (const [key, spec] of Object.entries(fields)) {
      if (spec.internal && !opts?.includeInternal) continue;
      const v = doc[key];
      out[key] = (v === undefined || v === null ? emptyFor(spec) : v) as FieldValue;
    }
    // A document written before `timestamps` existed still needs a valid ISO string.
    const createdAt =
      doc.createdAt instanceof Date ? doc.createdAt.toISOString()
      : typeof doc.createdAt === "string" && doc.createdAt.length > 0 ? doc.createdAt
      : new Date(0).toISOString();
    return { ...out, id: String(doc.itemId), order: typeof doc.order === "number" ? doc.order : 0, createdAt } as Item;
  };

  const newId = () => `${def.idPrefix}_${globalThis.crypto.randomUUID()}`;

  return {
    def,
    model,
    validate: (body, mode) => validate(fields, body, mode),
    toDto,

    async list(opts) {
      await dbConnect();
      const filter: Record<string, unknown> = {};
      if (opts?.publishedOnly && def.publishable) filter.published = true;
      // createdAt breaks ties so equal orders never shuffle between requests.
      const sort: Record<string, 1 | -1> =
        opts?.sort === "newest" || !def.orderable ? { createdAt: -1 } : { order: 1, createdAt: 1 };
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

    /**
     * Appends a document. `value` must be `validate()` output — the validator is the
     * trust boundary; `internal` is server-set fields that bypass it.
     */
    async create(value, internal) {
      await dbConnect();
      // max(order) + 1, not countDocuments(): after deleting a non-last item the count
      // collides with an order that is still in use.
      let order = 0;
      if (def.orderable) {
        const top = await model.findOne({}, { order: 1 }).sort({ order: -1 }).lean<{ order?: number } | null>();
        order = (top?.order ?? -1) + 1;
      }
      try {
        const doc = await model.create({ ...value, ...(internal ?? {}), itemId: newId(), ...(def.orderable ? { order } : {}) });
        return toDto((doc as { toObject: () => Record<string, unknown> }).toObject(), { includeInternal: true });
      } catch (e) {
        if (isDuplicateKey(e)) throw new DuplicateSlugError();
        throw e;
      }
    },

    /**
     * Patches a document. `value` must be `validate()` output — the validator is the
     * trust boundary; server-set fields never arrive here from a request body.
     */
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
      // bulkWrite rejects an empty op list: an empty collection reordered to [] is a no-op success.
      if (ids.length === 0) return true;
      await model.bulkWrite(ids.map((itemId, order) => ({ updateOne: { filter: { itemId }, update: { $set: { order } } } })));
      return true;
    },
  };
}
