# AI Chat Assistant

A modern, feature-rich AI chat interface with support for multiple AI providers, built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Multi-Provider Support**: Works with OpenAI, Anthropic, Google Gemini, Mistral, Groq, and OpenRouter
- **Chat History**: Persistent conversation history with search, rename, duplicate, and export
- **File Attachments**: Support for images, text files, code, and PDFs with preview
- **Canvas Mode**: Pin and edit AI responses with markdown support
- **Voice Input**: Speech-to-text with real-time transcription
- **Dark/Light Theme**: System-aware theme switching
- **Secure Storage**: Encrypted API key storage with optional passphrase
- **Responsive Design**: Works on desktop, tablet, and mobile

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-chat-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local` (optional - can also be managed via Settings UI):
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
# ... etc
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Getting Started Without API Keys

You can immediately try the app using the **Mock Echo** provider, which doesn't require any API keys. This is perfect for testing the interface and features.

1. Start a new chat
2. The default model selector will be set to "Mock Echo"
3. Send a message to see the mock responses

### Adding API Keys

#### Option 1: Through Settings UI
1. Click the Settings gear icon in the bottom-left sidebar
2. Go to the "Providers" tab
3. Enter your API keys for the providers you want to use
4. Test the connection using the "Test" button

#### Option 2: Import from File
1. Go to Settings → Import/Export tab
2. Choose your configuration format (JSON, YAML, or HTML)
3. Upload a file or paste your configuration
4. The app will automatically parse and import your keys

#### Option 3: Environment Variables
Add keys to your `.env.local` file using the format shown in `.env.example`.

### Key Features

#### Chat Management
- **New Chat**: Click the "New Chat" button to start a fresh conversation
- **Search**: Use the search bar to find specific conversations
- **Organize**: Rename, duplicate, delete, or export conversations via the menu

#### File Attachments
- Click the "+" button in the chat input
- Drag and drop files directly into the input area
- Supported formats: Images (PNG, JPG, WebP), Text/Code files, PDFs
- View and manage attachments in the "Files" panel

#### Canvas Mode
- Click the "Canvas" button in the top bar
- Pin any AI response to edit and work with it
- Export as Markdown or PNG
- Insert images from the conversation

#### Voice Input
- Click the microphone icon in the chat input
- Speak naturally - the app will transcribe in real-time
- Works in supported browsers (Chrome, Edge, Safari)

### Security Features

#### API Key Encryption
- Enable encryption in Settings → Security
- Your keys are encrypted with AES using your passphrase
- Without a passphrase, keys are stored in plain text (localStorage)

#### Data Storage
- All data is stored locally in your browser
- Chat history uses IndexedDB for efficient storage
- No data is sent to external servers except for AI API calls

## Technical Details

### Architecture
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Storage**: IndexedDB (idb-keyval) for chats, localStorage for settings
- **AI Integration**: Provider adapters with streaming support

### Supported Providers
- **OpenAI**: GPT-4, GPT-3.5 Turbo
- **Anthropic**: Claude 3 (Opus, Sonnet, Haiku)
- **Google Gemini**: Gemini Pro, Gemini Pro Vision
- **Mistral**: Mistral Large, Medium, Small
- **Groq**: Mixtral, Llama2, Gemma
- **OpenRouter**: Access to multiple models via one API
- **Mock Echo**: No API key required, for testing

### File Support
- **Images**: PNG, JPEG, WebP, GIF
- **Text/Code**: TXT, MD, JSON, YAML, JS, TS, Python, Java, C/C++, HTML, CSS
- **Documents**: PDF (with first-page preview)
- **Limits**: 10 files max, 20MB total per conversation

## Development

### Project Structure
```
├── app/                 # Next.js App Router
│   ├── api/relay/      # API route handlers for AI providers
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main chat interface
├── components/         # React components
├── lib/               # Utilities and providers
│   ├── providers/     # AI provider adapters
│   ├── db.ts          # IndexedDB helpers
│   ├── storage.ts     # localStorage helpers
│   └── ...
└── types/             # TypeScript type definitions
```

### Adding New Providers

1. Create a new adapter in `lib/providers/`:
```typescript
export class NewProviderAdapter implements ProviderAdapter {
  id = 'newprovider';
  displayName = 'New Provider';
  needsKey = true;
  models = [{ id: 'model-1', label: 'Model 1' }];
  
  async sendChat(opts) {
    // Implementation
  }
}
```

2. Add API route handler in `app/api/relay/newprovider/route.ts`
3. Register the provider in `app/page.tsx`

### Building for Production

```bash
npm run build
npm start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.