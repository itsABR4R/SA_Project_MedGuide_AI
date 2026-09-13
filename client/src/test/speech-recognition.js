import { vi } from 'vitest';

export class FakeSpeechRecognition {
  static instances = [];

  constructor() {
    FakeSpeechRecognition.instances.push(this);
    this.start = vi.fn();
    this.stop = vi.fn();
    this.abort = vi.fn();
  }

  emitTranscript(transcript) {
    const result = [{ transcript }];
    result.isFinal = true;
    this.onresult?.({ results: [result] });
  }
}

export function installSpeechRecognition() {
  FakeSpeechRecognition.instances = [];
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true,
    value: FakeSpeechRecognition
  });
}

export function removeSpeechRecognition() {
  delete window.SpeechRecognition;
}
