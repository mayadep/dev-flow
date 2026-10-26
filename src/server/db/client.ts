import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

let cached: Database | null | undefined;

/** DATABASE_URL이 없으면 null: 앱은 기기 로컬 저장만으로 동작한다. */
export function getDb(): Database | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  cached = url ? drizzle(neon(url), { schema }) : null;
  return cached;
}
