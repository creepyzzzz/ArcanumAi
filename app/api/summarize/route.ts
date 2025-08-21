import { NextRequest, NextResponse } from 'next/server';
import { Message } from '@/types'; // Assuming you have a types file

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Valid messages array is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY is not set in environment variables.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Format the conversation history into a single string for the summarizer.
    const conversationText = messages
      .map((msg: Message) => `${msg.role}: ${msg.text}`)
      .join('\n');

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
            content: 'You are a highly efficient summarization AI. Your task is to read the following conversation and create a concise, neutral, third-person summary. This summary will be used to provide context to another AI model. Capture the main topics, user questions, and key information mentioned. Do not add any introductory or concluding remarks.',
          },
          {
            role: 'user',
            content: conversationText,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from OpenRouter API during summarization:', errorText);
      return NextResponse.json({ error: 'Failed to get summary from API' }, { status: response.status });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      return NextResponse.json({ error: 'Failed to extract summary from response' }, { status: 500 });
    }

    return NextResponse.json({ summary });

  } catch (error: any) {
    console.error('Error in summarize route:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
