import { NextRequest, NextResponse } from 'next/server';
import { Attachment } from '@/types';

// This is the robust parser that correctly handles Gemini's streaming format.
function createGeminiStreamParser() {
  const decoder = new TextDecoder();
  let buffer = '';

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });

      // The stream sends an array of JSON objects. We need to find and parse them individually.
      while (true) {
        const start = buffer.indexOf('{');
        if (start === -1) {
          break; // No start of a JSON object found, wait for more data.
        }

        // Find the corresponding end of the JSON object by tracking curly braces.
        let braceCount = 0;
        let end = -1;
        for (let i = start; i < buffer.length; i++) {
          if (buffer[i] === '{') {
            braceCount++;
          } else if (buffer[i] === '}') {
            braceCount--;
          }
          if (braceCount === 0) {
            end = i;
            break;
          }
        }

        if (end === -1) {
          break; // The JSON object is incomplete, wait for more data.
        }

        const jsonStr = buffer.substring(start, end + 1);
        buffer = buffer.slice(end + 1); // Remove the processed JSON from the buffer.

        try {
          const json = JSON.parse(jsonStr);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            // If text is found, send it to the client immediately.
            controller.enqueue(new TextEncoder().encode(text));
          }
        } catch (error) {
          // Log any parsing errors but continue processing the stream.
          console.warn('Skipping malformed JSON chunk:', jsonStr);
        }
      }
    },
  });
}


export async function POST(request: NextRequest) {
  try {
    const { apiKey, model, messages, attachments = [] } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    // Transform messages and attachments into Gemini's format
    const geminiMessages = messages.map((msg: any, index: number) => {
      const isLastMessage = index === messages.length - 1;
      const parts: any[] = [{ text: msg.content }];

      // If this is the last message (the user's current prompt), add attachments to it
      if (isLastMessage && attachments.length > 0) {
        let combinedTextContent = msg.content;

        attachments.forEach((att: Attachment) => {
          if (att.type === 'text' || att.type === 'document') {
            // Prepend text from files to the user's prompt
            combinedTextContent = `Attached File: ${att.name}\n\n---\n${att.text}\n---\n\n` + combinedTextContent;
          } else if (att.type === 'image' && att.dataUrl) {
            // Add image parts
            parts.push({
              inline_data: {
                mime_type: att.mime_type,
                // Remove the base64 prefix
                data: att.dataUrl.substring(att.dataUrl.indexOf(',') + 1),
              },
            });
          }
        });
        // Update the text part with the combined content
        parts[0].text = combinedTextContent;
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts
      };
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Error from Google Gemini API:', errorText);
      return NextResponse.json({ error: `Gemini API Error: ${errorText}` }, { status: geminiResponse.status });
    }
    
    if (geminiResponse.body) {
      const stream = geminiResponse.body.pipeThrough(createGeminiStreamParser());
      return new NextResponse(stream, {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff'
        },
      });
    } else {
      return NextResponse.json({ error: 'No response body from Gemini' }, { status: 500 });
    }

  } catch (error) {
    console.error('Internal server error in Gemini relay:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
