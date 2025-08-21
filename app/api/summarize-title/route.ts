import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Note: We only expect a single `prompt` string for title generation
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'A valid prompt string is required' }, { status: 400 });
    }

    // --- FIX: Updated to use the correct environment variable name ---
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // --- FIX: Updated the error message to match the new variable name ---
      console.error('OPENROUTER_API_KEY is not set in environment variables.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          {
            role: 'system',
            content: "You are an expert at creating short, concise titles. Based on the user's first message, generate a suitable title for the conversation. The title should be no more than 5 words. Do not add any introductory text, quotes, or any other text. Just return the title.",
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 20, // Limit the response length
        temperature: 0.5, // A bit of creativity
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from OpenRouter API during title generation:', errorText);
      return NextResponse.json({ error: 'Failed to get title from API' }, { status: response.status });
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content;

    if (!title) {
      return NextResponse.json({ error: 'Failed to extract title from response' }, { status: 500 });
    }

    // Clean up the title - remove quotes and leading/trailing whitespace
    title = title.replace(/["']/g, '').trim();

    return NextResponse.json({ title });

  } catch (error: any) {
    console.error('Error in summarize-title route:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
