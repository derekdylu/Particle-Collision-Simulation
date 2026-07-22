import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'game_records.json');

export interface GameRecord {
  bValue: number;
  target: string;
  result: string;
  timestamp: string;
}

// Ensure data directory exists
export async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Read records from disk
export async function readRecordsFromDisk(): Promise<GameRecord[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(RECORDS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist or is invalid, return empty array
    return [];
  }
}

// Write records to disk
export async function writeRecordsToDisk(records: GameRecord[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// Clear all records
export async function clearRecordsFromDisk(): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(RECORDS_FILE, JSON.stringify([], null, 2), 'utf-8');
} 