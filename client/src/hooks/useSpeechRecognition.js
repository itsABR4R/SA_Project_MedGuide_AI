import { useCallback, useEffect, useRef, useState } from 'react';

function recognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function recognitionErrorMessage(error) {
  const messages = {
    'audio-capture': 'No working microphone was found. Check your microphone and try again.',
    network: 'Voice recognition could not connect. Check your network and try again.',
    'no-speech': 'No speech was detected. Try again and speak clearly.',
    'not-allowed': 'Microphone access was denied. Allow it in your browser settings and try again.',
    'service-not-allowed':
      'Voice recognition is blocked by this browser. Check its microphone and speech permissions.',
    'language-not-supported': 'Voice recognition does not support your browser language.'
  };
  return messages[error] || 'Voice recognition stopped unexpectedly. Please try again.';
}

function joinTranscript(prefix, transcript, maxLength) {
  const spokenText = String(transcript || '')
    .replace(/\s+/g, ' ')
    .trim();
  const existingText = String(prefix || '').trimEnd();
  return [existingText, spokenText].filter(Boolean).join(' ').slice(0, maxLength);
}

export function useSpeechRecognition({ value, onChange, onError, maxLength, language = 'en' }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  const intentionalStopRef = useRef(false);
  const supported = Boolean(recognitionConstructor());

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    onErrorRef.current = onError;
  }, [onChange, onError, value]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = recognitionConstructor();
    if (!SpeechRecognition) {
      onErrorRef.current?.(
        'Voice typing is not supported by this browser. Try a current Chromium-based browser.'
      );
      return;
    }

    const recognition = new SpeechRecognition();
    const prefix = valueRef.current;
    intentionalStopRef.current = false;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || '')
        .join(' ');
      onChangeRef.current(joinTranscript(prefix, transcript, maxLength));
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'aborted' && intentionalStopRef.current) return;
      onErrorRef.current?.(recognitionErrorMessage(event.error));
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      onErrorRef.current?.('Voice recognition could not start. Wait a moment and try again.');
    }
  }, [language, maxLength]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(
    () => () => {
      intentionalStopRef.current = true;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    []
  );

  return { listening, supported, stop, toggle };
}
