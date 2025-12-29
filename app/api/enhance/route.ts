import { NextRequest, NextResponse } from 'next/server';

// This is your new secure API route for prompt enhancement.
// It's designed to run on the edge for speed.
export const runtime = 'edge';

// Helper function to clean the response from special tokens and formatting
function cleanEnhancedPrompt(text: string): string {
  if (!text) return '';
  
  // Remove common special tokens and formatting
  let cleaned = text
    // Remove [BOT] tags
    .replace(/\[BOT\]/gi, '')
    // Remove <s> and </s> tokens
    .replace(/<\/?s>/g, '')
    // Remove other common special tokens
    .replace(/<\|.*?\|>/g, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    // Remove leading/trailing quotes if the entire response is quoted
    .replace(/^["']|["']$/g, '')
    // Trim whitespace
    .trim();
  
  // If the cleaned text is empty or just special characters, return original
  if (!cleaned || cleaned.length < 3) {
    return text.trim();
  }
  
  return cleaned;
}

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

    // Using a more reliable free model for prompt enhancement
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2-flash:free', // Using a more reliable free model
        messages: [
          {
            role: 'system',
            content: 'You are an expert prompt editor. Your task is to take the user\'s input and refine it. Correct any spelling mistakes, fix grammar, and improve the clarity and structure to make it a perfect, enhanced prompt. Return ONLY the improved prompt text itself. Do not include any prefixes, suffixes, explanations, commentary, quotation marks, or special formatting. Just return the clean, enhanced prompt.',
          },
          {
            role: 'user',
            content: `Please enhance and refine this prompt: ${prompt}`,
          },
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from OpenRouter API:', errorText);
      return NextResponse.json({ error: `API Error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    let enhancedPrompt = data.choices?.[0]?.message?.content;

    if (!enhancedPrompt) {
        console.error('No content in API response:', JSON.stringify(data, null, 2));
        return NextResponse.json({ error: 'Failed to enhance prompt - no content received' }, { status: 500 });
    }

    // Clean the response from special tokens
    enhancedPrompt = cleanEnhancedPrompt(enhancedPrompt);

    // Validate that we got a meaningful response
    if (!enhancedPrompt || enhancedPrompt.length < 3) {
      console.error('Enhanced prompt is too short or empty:', enhancedPrompt);
      return NextResponse.json({ error: 'Failed to enhance prompt - invalid response' }, { status: 500 });
    }

    return NextResponse.json({ enhancedPrompt });

  } catch (error: any) {
    console.error('Error in enhance route:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
