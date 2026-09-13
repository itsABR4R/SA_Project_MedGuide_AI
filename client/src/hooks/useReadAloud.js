import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/context.js';
import { responseLanguage, selectSpeechVoice } from '../speech.js';

export default function useReadAloud({ active, onError }) {
  const { language, t } = useI18n();
  const [speakingId, setSpeakingId] = useState(null);
  const jobRef = useRef(null);

  const stopSpeaking = useCallback(() => {
    const job = jobRef.current;
    jobRef.current = null;
    job?.cancelWaiting?.();
    job?.controller?.abort();
    if (job?.utterance) {
      job.utterance.onend = null;
      job.utterance.onerror = null;
    }
    if (job?.audio) {
      job.audio.onended = null;
      job.audio.onerror = null;
      job.audio.pause?.();
      job.audio.removeAttribute?.('src');
    }
    if (job?.audioUrl) window.URL?.revokeObjectURL?.(job.audioUrl);
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
  }, []);

  useEffect(() => {
    // Some browsers populate their voice list asynchronously after this first call.
    if (active) window.speechSynthesis?.getVoices?.();
    return stopSpeaking;
  }, [active, language, stopSpeaking]);

  function readMessage(message) {
    if (jobRef.current?.id === message.id) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    if (!active) return;

    const text = String(message.content || '')
      .replace(/^[ \t]*•[ \t]+/gm, '')
      .trim();
    if (!text) return;
    const speechLanguage = responseLanguage(text, language);
    const job = { id: message.id };
    jobRef.current = job;
    setSpeakingId(message.id);

    function fail(key) {
      if (jobRef.current !== job) return;
      stopSpeaking();
      onError?.(t(key));
    }

    function finish() {
      if (jobRef.current !== job) return;
      job.cancelWaiting?.();
      if (job.audioUrl) window.URL?.revokeObjectURL?.(job.audioUrl);
      jobRef.current = null;
      setSpeakingId(null);
    }

    async function generateSpeech() {
      if (jobRef.current !== job) return;
      if (!window.Audio || !window.URL?.createObjectURL) {
        fail('Read aloud is not supported by this browser.');
        return;
      }
      const controller = new AbortController();
      job.controller = controller;
      try {
        const audioBlob = await api('/api/speech', {
          method: 'POST',
          signal: controller.signal,
          responseType: 'audio',
          body: JSON.stringify({ text })
        });
        if (jobRef.current !== job) return;
        const audioUrl = window.URL.createObjectURL(audioBlob);
        const audio = new window.Audio(audioUrl);
        job.audio = audio;
        job.audioUrl = audioUrl;
        audio.onended = finish;
        audio.onerror = () => fail('The response could not be read aloud. Please try again.');
        await Promise.resolve(audio.play());
      } catch (error) {
        if (controller.signal.aborted || jobRef.current !== job) return;
        fail(error?.message || 'The response could not be read aloud. Please try again.');
      }
    }

    const synthesis = window.speechSynthesis;
    const canUseDeviceVoice = Boolean(synthesis && window.SpeechSynthesisUtterance);

    function trySpeaking() {
      if (jobRef.current !== job) return true;
      if (!canUseDeviceVoice) return false;
      try {
        const voice = selectSpeechVoice(synthesis.getVoices?.() || [], speechLanguage);
        if (!voice) return false;

        job.cancelWaiting?.();
        const utterance = new window.SpeechSynthesisUtterance(text);
        job.utterance = utterance;
        utterance.voice = voice;
        utterance.lang = voice.lang.replaceAll('_', '-');
        utterance.rate = 1;
        utterance.onend = () => {
          if (jobRef.current !== job) return;
          jobRef.current = null;
          setSpeakingId(null);
        };
        utterance.onerror = () => fail('The response could not be read aloud. Please try again.');
        synthesis.speak(utterance);
      } catch {
        fail('The response could not be read aloud. Please try again.');
      }
      return true;
    }

    if (trySpeaking()) return;

    if (!canUseDeviceVoice) {
      generateSpeech();
      return;
    }

    // Wait briefly for delayed device voices. If there is no exact language match,
    // use the server TTS route instead of letting the browser choose the wrong language.
    const onVoicesChanged = () => trySpeaking();
    const timer = window.setTimeout(() => {
      if (trySpeaking()) return;
      job.cancelWaiting?.();
      generateSpeech();
    }, 1500);
    job.cancelWaiting = () => {
      window.clearTimeout(timer);
      synthesis.removeEventListener?.('voiceschanged', onVoicesChanged);
    };
    synthesis.addEventListener?.('voiceschanged', onVoicesChanged);
  }

  return { speakingId, readMessage, stopSpeaking };
}
