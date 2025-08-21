// path: app/api/chat/stream/route.ts

import { NextRequest, NextResponse } from 'next/server';

// This is a mock streaming endpoint. In a real application, you would
// connect to your AI model provider (e.g., Gemini, OpenAI) here.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Simulate a streaming response with a delay
        const fullResponse =
          'Of course! Here is a simple Python script to demonstrate a basic web server. I will place it into a code document for you.\n\n```python\nimport http.server\nimport socketserver\n\nPORT = 8000\n\nHandler = http.server.SimpleHTTPRequestHandler\n\nwith socketserver.TCPServer(("", PORT), Handler) as httpd:\n    print("serving at port", PORT)\n    httpd.serve_forever()\n```\n\nThis script uses Python\'s built-in libraries to create a web server that serves files from the current directory. You can run it from your terminal.';

        for (let i = 0; i < fullResponse.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms delay per character
          controller.enqueue(encoder.encode(fullResponse[i]));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in streaming route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
