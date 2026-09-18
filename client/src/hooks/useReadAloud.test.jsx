import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nContext } from '../i18n/context.js';
import { translate } from '../i18n/messages.js';
import { api } from '../api/client.js';
import useReadAloud from './useReadAloud.js';

vi.mock('../api/client.js', () => ({ api: vi.fn() }));

const english = { name: 'English', lang: 'en-US', default: true };
const banglaIndia = { name: 'Bangla India', lang: 'bn-IN' };
const banglaBangladesh = { name: 'Bangla Bangladesh', lang: 'bn-BD' };
const banglaMessage = { id: 'bangla', content: 'পর্যাপ্ত বিশ্রাম নিন। Temperature লিখে রাখুন।' };

describe('read-aloud voice selection and lifecycle', () => {
  let synthesis;
  let voices;
  let onError;

  beforeEach(() => {
    vi.useFakeTimers();
    api.mockReset();
    voices = [english, banglaIndia, banglaBangladesh];
    synthesis = new EventTarget();
    synthesis.getVoices = vi.fn(() => voices);
    synthesis.speak = vi.fn();
    synthesis.cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        constructor(text) {
          this.text = text;
        }
      }
    );
    onError = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete window.URL.createObjectURL;
    delete window.URL.revokeObjectURL;
  });

  it('selects a Bangladesh Bangla voice for Bangla text in English interface mode', () => {
    const { result } = renderHook(() => useReadAloud({ active: true, onError }));
    act(() => result.current.readMessage(banglaMessage));
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(synthesis.speak.mock.calls[0][0]).toMatchObject({
      voice: banglaBangladesh,
      lang: 'bn-BD',
      text: banglaMessage.content
    });
  });

  it('uses an Indian Bangla voice when a Bangladesh voice is unavailable', () => {
    voices = [english, banglaIndia];
    const { result } = renderHook(() => useReadAloud({ active: true, onError }));
    act(() => result.current.readMessage(banglaMessage));
    expect(synthesis.speak.mock.calls[0][0].voice).toBe(banglaIndia);
    expect(synthesis.speak.mock.calls[0][0].lang).toBe('bn-IN');
  });

  it('reads a saved English response in English even when the interface is Bangla', () => {
    const { result } = renderHook(() => useReadAloud({ active: true, onError }), {
      wrapper: ({ children }) => (
        <I18nContext.Provider value={{ language: 'bn', t: (key) => translate('bn', key) }}>
          {children}
        </I18nContext.Provider>
      )
    });
    act(() => result.current.readMessage({ id: 'english', content: 'Monitor changes.' }));
    expect(synthesis.speak.mock.calls[0][0].voice).toBe(english);
  });

  it('waits for asynchronously loaded Bangla voices and speaks only once', () => {
    voices = [english];
    const { result } = renderHook(() => useReadAloud({ active: true, onError }));
    act(() => result.current.readMessage(banglaMessage));
    expect(synthesis.speak).not.toHaveBeenCalled();
    act(() => {
      voices = [english, banglaBangladesh];
      synthesis.dispatchEvent(new Event('voiceschanged'));
      synthesis.dispatchEvent(new Event('voiceschanged'));
      vi.advanceTimersByTime(2000);
    });
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(synthesis.speak.mock.calls[0][0].voice).toBe(banglaBangladesh);
    expect(onError).not.toHaveBeenCalled();
  });

  it('uses generated Bangla audio instead of the English default when no device voice exists', async () => {
    voices = [english];
    const audio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      removeAttribute: vi.fn(),
      onended: null,
      onerror: null
    };
    api.mockResolvedValue(new Blob(['generated-audio'], { type: 'audio/mpeg' }));
    vi.stubGlobal(
      'Audio',
      vi.fn(function AudioMock() {
        return audio;
      })
    );
    window.URL.createObjectURL = vi.fn(() => 'blob:generated-bangla');
    window.URL.revokeObjectURL = vi.fn();
    const { result } = renderHook(() => useReadAloud({ active: true, onError }));
    act(() => result.current.readMessage(banglaMessage));
    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith('/api/speech', {
      method: 'POST',
      signal: expect.any(AbortSignal),
      responseType: 'audio',
      body: JSON.stringify({ text: banglaMessage.content })
    });
    expect(window.Audio).toHaveBeenCalledWith('blob:generated-bangla');
    expect(audio.play).toHaveBeenCalledOnce();
    expect(result.current.speakingId).toBe(banglaMessage.id);
    act(() => audio.onended());
    expect(result.current.speakingId).toBeNull();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:generated-bangla');
    expect(onError).not.toHaveBeenCalled();
  });

  it('cancels a pending read when the same response is clicked again', () => {
    voices = [];
    const { result } = renderHook(() => useReadAloud({ active: true, onError }));
    act(() => result.current.readMessage(banglaMessage));
    act(() => result.current.readMessage(banglaMessage));
    act(() => {
      voices = [banglaBangladesh];
      synthesis.dispatchEvent(new Event('voiceschanged'));
      vi.advanceTimersByTime(2000);
    });
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.speakingId).toBeNull();
  });

  it('stops playback on leaving the chat and ignores completion from an older read', () => {
    const { result, rerender } = renderHook(({ active }) => useReadAloud({ active, onError }), {
      initialProps: { active: true }
    });
    act(() => result.current.readMessage(banglaMessage));
    const previousEnd = synthesis.speak.mock.calls[0][0].onend;
    act(() => result.current.stopSpeaking());
    act(() => result.current.readMessage(banglaMessage));
    act(() => previousEnd());
    expect(result.current.speakingId).toBe(banglaMessage.id);
    rerender({ active: false });
    expect(result.current.speakingId).toBeNull();
    expect(synthesis.cancel).toHaveBeenCalled();
  });

  it('removes pending callbacks on unmount and reports speech-engine failures', () => {
    const { result, unmount } = renderHook(() => useReadAloud({ active: true, onError }));
    act(() => result.current.readMessage(banglaMessage));
    act(() => synthesis.speak.mock.calls[0][0].onerror());
    expect(onError).toHaveBeenCalledWith('The response could not be read aloud. Please try again.');
    voices = [];
    act(() => result.current.readMessage(banglaMessage));
    unmount();
    act(() => {
      voices = [banglaBangladesh];
      synthesis.dispatchEvent(new Event('voiceschanged'));
      vi.advanceTimersByTime(2000);
    });
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
  });
});
