import { NextRequest, NextResponse } from 'next/server';
import { Attachment } from '@/types';

function createGroqStreamParser() {
  const decoder = new TextDecoder();
  let buffer = '';

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim() === '[DONE]') {
            controller.terminate();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const reasoning = parsed.choices?.[0]?.delta?.reasoning;
            const content = parsed.choices?.[0]?.delta?.content;

            if (reasoning) {
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'reasoning', data: reasoning }) + '\n'));
            }
            if (content) {
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'content', data: content }) + '\n'));
            }
          } catch (error) {
            console.warn('Skipping malformed JSON chunk:', data);
          }
        }
      }
    },
  });
}


export async function POST(request: NextRequest) {
  try {
    const { apiKey, model, messages, attachments = [], stream } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    const groqMessages = messages.map((msg: any, index: number) => {
      const isLastMessage = index === messages.length - 1;
      
      if (isLastMessage && attachments.length > 0) {
        const content: any[] = [{ type: 'text', text: msg.content }];
        attachments.forEach((att: Attachment) => {
          if (att.type === 'image' && att.dataUrl) {
            content.push({
              type: 'image_url',
              image_url: {
                url: att.dataUrl,
              },
            });
          } else if (att.type === 'text' || att.type === 'document') {
            content[0].text = `Attached File: ${att.name}\n\n---\n${att.text}\n---\n\n` + content[0].text;
          }
        });
        return { role: msg.role, content };
      }

      return {
        role: msg.role,
        content: msg.content,
      };
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        stream: stream || false,
        temperature: 0.7,
        max_tokens: 2048,
        reasoning_format: 'parsed', // Get reasoning in a separate field
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from Groq API:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    if (stream && response.body) {
      const stream = response.body.pipeThrough(createGroqStreamParser());
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff'
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Groq API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}