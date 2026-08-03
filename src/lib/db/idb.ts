import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { VenuePack, VisitSession } from "../types";

interface WeVisitDB extends DBSchema {
  packs: {
    key: string;
    value: VenuePack;
    indexes: { "by-updated": string };
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbPromise: Promise<IDBPDatabase<WeVisitDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<WeVisitDB>("we-visit", 1, {
      upgrade(db) {
        const packs = db.createObjectStore("packs", { keyPath: "session.id" });
        packs.createIndex("by-updated", "session.updatedAt");
        db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export async function savePack(pack: VenuePack): Promise<void> {
  const db = await getDb();
  pack.session.updatedAt = new Date().toISOString();
  await db.put("packs", pack);
}

export async function getPack(sessionId: string): Promise<VenuePack | undefined> {
  const db = await getDb();
  return db.get("packs", sessionId);
}

export async function deletePack(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.delete("packs", sessionId);
}

export async function listRecentSessions(limit = 8): Promise<VisitSession[]> {
  const db = await getDb();
  const all = await db.getAll("packs");
  return all
    .map((p) => p.session)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
