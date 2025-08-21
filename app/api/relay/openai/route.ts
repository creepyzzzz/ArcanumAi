import { NextRequest, NextResponse } from 'next/server';

// This is a custom parser for the OpenAI Server-Sent Events (SSE) format.
function createOpenAIStreamParser() {
  const decoder = new TextDecoder();
  let buffer = '';

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });

      // Process all complete lines in the buffer
      while (true) {
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex === -1) {
          break; // Incomplete line, wait for more data
        }

        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.trim() === '' || !line.startsWith('data: ')) {
          continue; // Skip empty lines or non-data lines
        }

        const jsonStr = line.substring('data: '.length);

        // The stream is finished when it sends the message [DONE]
        if (jsonStr.trim() === '[DONE]') {
          controller.terminate();
          return;
        }

        try {
          const json = JSON.parse(jsonStr);
          const text = json.choices?.[0]?.delta?.content;
          if (text) {
            // If we find a text chunk, send it to the client
            controller.enqueue(new TextEncoder().encode(text));
          }
        } catch (error) {
          console.warn('Skipping malformed JSON chunk in OpenAI stream:', jsonStr);
        }
      }
    },
  });
}

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, providerConfig } = await req.json();
    
    // --- DEBUGGING: Log the received provider configuration ---
    console.log('--- RECEIVED PROVIDER CONFIG ---');
    console.log(JSON.stringify(providerConfig, null, 2));
    console.log('--- END PROVIDER CONFIG ---');

    if (!providerConfig || !providerConfig.url || !providerConfig.headers || !providerConfig.body) {
      return NextResponse.json({ error: 'Missing or invalid provider configuration' }, { status: 400 });
    }
    
    const requestBody = {
      ...providerConfig.body, // This includes model, max_tokens, temp, etc.
      messages,              // The current conversation history
      stream: true,          // Always enable streaming for the chat UI
    };

    // --- DEBUGGING: Log the final request body being sent to the upstream API ---
    console.log('--- SENDING REQUEST BODY TO UPSTREAM API ---');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('--- END REQUEST BODY ---');

    const response = await fetch(providerConfig.url, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Custom API error: ${response.status}`, errorText);
        return NextResponse.json({ error: `Upstream API error: ${errorText}` }, { status: response.status });
    }

    if (response.body) {
      // Pipe the response through our custom parser
      const stream = response.body.pipeThrough(createOpenAIStreamParser());
      // Return the processed stream as the response
      return new NextResponse(stream, {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff'
        },
      });
    } else {
       console.error('No response body from custom provider.');
       return NextResponse.json({ error: 'No response body from custom provider' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('--- ERROR IN OPENAI RELAY ---');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('--- END ERROR DETAILS ---');
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
