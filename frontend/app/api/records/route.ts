import { NextRequest, NextResponse } from 'next/server';
import { readRecordsFromDisk, writeRecordsToDisk, clearRecordsFromDisk, GameRecord } from '@/app/api/records';

// GET /api/records - Retrieve all records
export async function GET() {
  try {
    const records = await readRecordsFromDisk();
    return NextResponse.json({
      status: 'success',
      message: 'Records retrieved successfully',
      records: records
    });
  } catch (error) {
    console.error('Error reading records:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to read records',
        records: []
      },
      { status: 500 }
    );
  }
}

// POST /api/records - Add a new record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bValue, target, result } = body;

    // Validate required fields
    if (bValue === undefined || !target || !result) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required fields: bValue, target, result'
        },
        { status: 400 }
      );
    }

    // Create new record with timestamp
    const newRecord: GameRecord = {
      bValue,
      target,
      result,
      timestamp: new Date().toISOString()
    };

    // Read existing records
    const existingRecords = await readRecordsFromDisk();

    // Add new record
    existingRecords.push(newRecord);

    // Write back to disk
    await writeRecordsToDisk(existingRecords);

    return NextResponse.json({
      status: 'success',
      message: 'Record saved successfully',
      record: newRecord
    });
  } catch (error) {
    console.error('Error saving record:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to save record'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/records - Clear all records
export async function DELETE() {
  try {
    await clearRecordsFromDisk();
    return NextResponse.json({
      status: 'success',
      message: 'All records cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing records:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to clear records'
      },
      { status: 500 }
    );
  }
} 