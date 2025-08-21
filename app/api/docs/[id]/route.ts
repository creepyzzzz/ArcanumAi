// path: app/api/docs/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DocMeta } from '@/types';

// In-memory store as a placeholder for a real database (e.g., Redis, PostgreSQL).
const docStore: Record<string, DocMeta> = {};

/**
 * GET handler to retrieve a specific document by its ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const docId = params.id;
    const doc = docStore[docId];

    if (doc) {
      return NextResponse.json(doc);
    } else {
      return new NextResponse('Document not found', { status: 404 });
    }
  } catch (error) {
    console.error('GET Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * PUT handler to create or update a document.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const docId = params.id;
    const body = (await req.json()) as DocMeta;

    if (docId !== body.id) {
      return new NextResponse('Document ID mismatch', { status: 400 });
    }

    docStore[docId] = body;
    console.log(`Saved document ${docId} to in-memory store.`);

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error('PUT Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
