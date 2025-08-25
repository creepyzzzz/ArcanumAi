import { NextRequest, NextResponse } from 'next/server';
import { Attachment } from '@/types';

function createStreamParser() {
  const decoder = new TextDecoder();
  let buffer = '';

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data: ')) continue;
        
        const jsonStr = line.substring('data: '.length);
        if (jsonStr.trim() === '[DONE]') {
          controller.terminate();
          return;
        }
        try {
          const json = JSON.parse(jsonStr);
          const text = json.choices?.[0]?.delta?.content;
          if (text) {
            controller.enqueue(new TextEncoder().encode(text));
          }
        } catch (error) {
          console.warn('Skipping malformed JSON chunk in stream:', jsonStr);
        }
      }
    },
  });
}

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { model, messages, attachments = [] } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY is not set on the server.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const messagesForApi = [...messages];
    let hasIgnoredImages = false; 

    if (attachments.length > 0) {
      let lastUserMessageIndex = -1;
      for (let i = messagesForApi.length - 1; i >= 0; i--) {
        if (messagesForApi[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }
      
      if (lastUserMessageIndex !== -1) {
        let combinedTextContent = messagesForApi[lastUserMessageIndex].content;

        for (const att of attachments as Attachment[]) {
          if ((att.type === 'text' || att.type === 'document') && att.text) {
            combinedTextContent = `Attached File: "${att.name}"\n\n---\n${att.text}\n---\n\nUser Question: ${combinedTextContent}`;
          } else if (att.type === 'image') {
            hasIgnoredImages = true;
          }
        }
        messagesForApi[lastUserMessageIndex].content = combinedTextContent;
      }
    }

    // --- MODIFICATION START ---
    // All special logic for handling free-tier models has been removed.
    // The model ID is now passed directly to the API without any changes.
    // This correctly handles all models, and the API will determine
    // if payment is required based on the user's account.
    const finalModelId = model;
    // --- MODIFICATION END ---

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: finalModelId,
        messages: messagesForApi,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `API Error: ${errorText}` }, { status: response.status });
    }

    if (response.body) {
      if (hasIgnoredImages) {
        const warningText = "*Note: The current model does not support image attachments, and they have been ignored.*\n\n";
        const warningStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(warningText));
            controller.close();
          }
        });
        
        const combinedStream = new ReadableStream({
          async start(controller) {
            for await (const chunk of warningStream as any) {
              controller.enqueue(chunk);
            }
            for await (const chunk of response.body!.pipeThrough(createStreamParser()) as any) {
              controller.enqueue(chunk);
            }
            controller.close();
          }
        });
        
        return new NextResponse(combinedStream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

      } else {
        const stream = response.body.pipeThrough(createStreamParser());
        return new NextResponse(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    } else {
      return NextResponse.json({ error: 'No response body from API' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in built-in chat relay:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
