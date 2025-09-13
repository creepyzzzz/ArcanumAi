export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  static isSupported(): boolean {
    return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  constructor() {
    if (SpeechService.isSupported()) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError?: (error: string) => void,
    onStart?: (() => void) | null,
    onEnd?: (() => void) | null
  ): void {
    if (!this.recognition || this.isListening) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        // When the result is final, we send the full, clean transcript.
        // We also clear any previous interim transcript from the parent component
        // by sending an empty interim result first if needed.
        onResult(transcript, true);
      } else {
        // For interim results, we just send the current partial transcript.
        onResult(transcript, false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      onError?.(event.error);
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      onStart?.();
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.isListening = false;
        onEnd?.();
      }
    };

    try {
      this.recognition.start();
    } catch (error) {
      this.isListening = false;
      onError?.('Failed to start speech recognition');
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

export class WaveformVisualizer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private isActive = false;
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d')!;
  }

  start(): void {
    this.isActive = true;
    this.time = 0;
    this.animate();
  }

  stop(): void {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  private animate(): void {
    if (!this.isActive) return;

    this.time += 0.1;
    this.clear();
    this.drawWaveform();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawWaveform(): void {
    const { width, height } = this.canvas;
    const centerY = height / 2;
    const barWidth = 2;
    const barSpacing = 2;
    const numBars = Math.floor(width / (barWidth + barSpacing));

    this.context.fillStyle = '#ef4444';

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + barSpacing);
      
      const sine = Math.sin(this.time + i * 0.5);
      const randomFactor = Math.random() * 0.2 + 0.8;
      const amplitude = (sine + 1) / 2 * randomFactor;
      
      const barHeight = Math.max(amplitude * height * 0.9, 2);
      const y = centerY - barHeight / 2;

      this.context.fillRect(x, y, barWidth, barHeight);
    }
  }
}
