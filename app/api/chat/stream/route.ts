import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, attachments } = body;

    // --- Attachment Handling (from openrouter.ts) ---
    // This logic correctly prepares multimodal messages for OpenRouter.
    const messagesForApi = JSON.parse(JSON.stringify(messages));
    const isMultimodal = model.includes('gemini-flash') || model.includes('qwen-2.5-vl');
    
    let lastUserMessageIndex = -1;
    for (let i = messagesForApi.length - 1; i >= 0; i--) {
      if (messagesForApi[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex !== -1 && attachments && attachments.length > 0) {
      const lastUserMessage = messagesForApi[lastUserMessageIndex];
      let combinedTextContent = lastUserMessage.content || '';
      const imageAttachments = [];

      for (const att of attachments) {
        if (isMultimodal && att.type === 'image' && att.dataUrl) {
          imageAttachments.push({
            type: 'image_url',
            image_url: { url: att.dataUrl },
          });
        } else if ((att.type === 'text' || att.type === 'document') && att.text) {
          combinedTextContent = `Attached File: "${att.name}"\n\n---\n${att.text}\n---\n\nUser Question: ${combinedTextContent}`;
        }
      }

      if (imageAttachments.length > 0) {
        lastUserMessage.content = [{ type: 'text', text: combinedTextContent }, ...imageAttachments];
      } else {
        lastUserMessage.content = combinedTextContent;
      }
    }
    // --- End Attachment Handling ---

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.get('referer') || 'http://localhost:3000',
        'X-Title': 'Arcanum AI Chat',
      },
      body: JSON.stringify({
        model: model,
        messages: messagesForApi,
        stream: true,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text();
      console.error('OpenRouter Relay Error:', errorBody);
      return new NextResponse(errorBody, {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
      });
    }

    // Return the streaming response back to the client
    return new NextResponse(openRouterResponse.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (e: any) {
    console.error('Relay Error:', e);
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
