import { NextRequest, NextResponse } from 'next/server';

// This is your new secure API route for prompt enhancement.
// It's designed to run on the edge for speed.
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // IMPORTANT: Securely get your API key from environment variables.
    // Never hardcode keys in your code.
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.error('OPENROUTER_API_KEY is not set in environment variables.');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // --- UPDATE: Switched to a fast, free, and high-quality model ---
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free', // Using Mistral 7B Instruct for this task
        messages: [
          {
            role: 'system',
            content: 'You are an expert prompt editor. Your task is to take the user\'s input and refine it. Correct any spelling mistakes, fix grammar, and improve the clarity and structure to make it a perfect, enhanced prompt. Only return the improved prompt itself, with no additional text, commentary, or quotation marks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false, // We want the full response at once for this feature.
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from OpenRouter API:', errorText);
      return NextResponse.json({ error: `API Error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content;

    if (!enhancedPrompt) {
        return NextResponse.json({ error: 'Failed to enhance prompt' }, { status: 500 });
    }

    return NextResponse.json({ enhancedPrompt });

  } catch (error: any) {
    console.error('Error in enhance route:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
