import { GameRecord } from '@/app/api/records';

interface RecordHandlerProps {
  bValue: number;
  target: string;
  result: string;
}

interface StatsData {
  totalRows: number;
  uniqueBValues: number;
  uniqueTargets: number;
  uniqueResults: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  bValueCounts: Record<number, number>;
  targetCounts: Record<string, number>;
  resultCounts: Record<string, number>;
}

interface TargetStats {
  target: string;
  totalGames: number;
  bValueFrequency: Record<number, number>;
  bValueSuccessRate: Record<number, number>;
  overallSuccessRate: number;
}

// Save record to both localStorage and disk
const recordHandler = async ({ bValue, target, result }: RecordHandlerProps) => {
  try {
    const timestamp = new Date().toISOString();
    const newRecord: GameRecord = { bValue, target, result, timestamp };

    // Save to localStorage (immediate access)
    const existingRecordsJson = localStorage.getItem('game_records');
    const existingRecords: GameRecord[] = existingRecordsJson ? JSON.parse(existingRecordsJson) : [];
    existingRecords.push(newRecord);
    localStorage.setItem('game_records', JSON.stringify(existingRecords));

    // Save to disk (persistent storage)
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bValue, target, result }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
      }

      const responseData = await response.json();
      console.log('Record saved to disk:', responseData.message);
    } catch (diskError) {
      console.warn('Failed to save to disk, but saved to localStorage:', diskError);
    }

    console.log('Record saved successfully');
  } catch (error) {
    console.error('Error saving record:', error);
  }
};

// Extract records from both localStorage and disk, preferring disk data
const recordExtractor = async (): Promise<StatsData> => {
  try {
    let records: GameRecord[] = [];

    // Try to get records from disk first
    try {
      const response = await fetch('/api/records');
      if (response.ok) {
        const data = await response.json();
        records = data.records || [];
        console.log('Records loaded from disk:', records.length);
      }
    } catch (diskError) {
      console.warn('Failed to load from disk, falling back to localStorage:', diskError);
    }

    // If no disk records, fall back to localStorage
    if (records.length === 0) {
      const existingRecordsJson = localStorage.getItem('game_records');
      records = existingRecordsJson ? JSON.parse(existingRecordsJson) : [];
      console.log('Records loaded from localStorage:', records.length);
    }

    // Count total rows
    const totalRows = records.length;

    // Extract unique values
    const bValues = new Set<number>();
    const targets = new Set<string>();
    const results = new Set<string>();

    // Initialize count objects with all possible values
    const bValueCounts: Record<number, number> = {
      [-3]: 0, [-2]: 0, [-1]: 0, 0: 0, 1: 0, 2: 0, 3: 0
    };
    const targetCounts: Record<string, number> = {
      'A': 0, 'B': 0, 'C': 0, 'D': 0
    };
    const resultCounts: Record<string, number> = {
      'hit': 0, 'miss': 0
    };

    // Count hits and misses
    let hitCount = 0;
    let missCount = 0;

    records.forEach(record => {
      bValues.add(record.bValue);
      targets.add(record.target);
      results.add(record.result);

      // Count b values
      bValueCounts[record.bValue] = (bValueCounts[record.bValue] || 0) + 1;

      // Count targets
      targetCounts[record.target] = (targetCounts[record.target] || 0) + 1;

      // Count results
      resultCounts[record.result] = (resultCounts[record.result] || 0) + 1;

      if (record.result === 'hit') {
        hitCount++;
      } else if (record.result === 'miss') {
        missCount++;
      }
    });

    // Calculate hit rate
    const hitRate = totalRows > 0 ? (hitCount / totalRows) * 100 : 0;

    return {
      totalRows,
      uniqueBValues: bValues.size,
      uniqueTargets: targets.size,
      uniqueResults: results.size,
      hitCount,
      missCount,
      hitRate,
      bValueCounts,
      targetCounts,
      resultCounts
    };
  } catch (error) {
    console.error('Error reading records:', error);
    return {
      totalRows: 0,
      uniqueBValues: 0,
      uniqueTargets: 0,
      uniqueResults: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      bValueCounts: { [7]: 0, [6]: 0, [5]: 0, [4]: 0, [3]: 0, [2]: 0, [1]: 0 },
      targetCounts: { 'A': 0, 'B': 0, 'C': 0, 'D': 0 },
      resultCounts: { 'hit': 0, 'miss': 0 }
    };
  }
};

// Extract detailed target-specific statistics
const extractTargetStats = async (): Promise<TargetStats[]> => {
  try {
    let records: GameRecord[] = [];

    // Try to get records from disk first
    try {
      const response = await fetch('/api/records');
      if (response.ok) {
        const data = await response.json();
        records = data.records || [];
      }
    } catch (diskError) {
      console.warn('Failed to load from disk, falling back to localStorage:', diskError);
    }

    // If no disk records, fall back to localStorage
    if (records.length === 0) {
      const existingRecordsJson = localStorage.getItem('game_records');
      records = existingRecordsJson ? JSON.parse(existingRecordsJson) : [];
    }

    const targets = ['A', 'B', 'C', 'D'];
    const targetStats: TargetStats[] = [];

    targets.forEach(target => {
      const targetRecords = records.filter(record => record.target === target);
      const totalGames = targetRecords.length;

      // Initialize B-value frequency and success rate objects
      const bValueFrequency: Record<number, number> = {
        [7]: 0, [6]: 0, [5]: 0, [4]: 0, [3]: 0, [2]: 0, [1]: 0
      };
      const bValueHits: Record<number, number> = {
        [7]: 0, [6]: 0, [5]: 0, [4]: 0, [3]: 0, [2]: 0, [1]: 0
      };
      const bValueSuccessRate: Record<number, number> = {
        [7]: 0, [6]: 0, [5]: 0, [4]: 0, [3]: 0, [2]: 0, [1]: 0
      };

      // Count frequency and hits for each B-value
      targetRecords.forEach(record => {
        bValueFrequency[record.bValue]++;
        if (record.result === 'hit') {
          bValueHits[record.bValue]++;
        }
      });

      // Calculate success rate for each B-value
      Object.keys(bValueFrequency).forEach(bValueStr => {
        const bValue = parseInt(bValueStr);
        const frequency = bValueFrequency[bValue];
        const hits = bValueHits[bValue];
        bValueSuccessRate[bValue] = frequency > 0 ? (hits / frequency) * 100 : 0;
      });

      // Calculate overall success rate for this target
      const totalHits = targetRecords.filter(record => record.result === 'hit').length;
      const overallSuccessRate = totalGames > 0 ? (totalHits / totalGames) * 100 : 0;

      targetStats.push({
        target,
        totalGames,
        bValueFrequency,
        bValueSuccessRate,
        overallSuccessRate
      });
    });

    return targetStats;
  } catch (error) {
    console.error('Error extracting target stats:', error);
    return [];
  }
};

// Clear records from both localStorage and disk (this also clears target stats since they are computed from records)
const clearRecords = async (): Promise<void> => {
  try {
    // Clear localStorage
    localStorage.removeItem('game_records');
    console.log('Records cleared from localStorage');

    // Clear disk storage
    try {
      const response = await fetch('/api/records', {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Records cleared from disk:', result.message);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
      }
    } catch (diskError) {
      console.warn('Failed to clear disk records:', diskError);
    }

    // Target stats are computed dynamically from game records,
    // so clearing the records effectively clears target stats as well
    console.log('Target stats will be cleared when next extracted (no records to process)');
  } catch (error) {
    console.error('Error clearing records:', error);
    throw error; // Re-throw to allow calling code to handle errors
  }
};

export { recordHandler, recordExtractor, clearRecords, extractTargetStats };