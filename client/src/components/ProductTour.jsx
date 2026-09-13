import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { productTourSteps } from './product-tour-steps.js';
import { useI18n } from '../i18n/context.js';

export default function ProductTour({ active, onNavigate, onFinish }) {
  const { formatNumber, t } = useI18n();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const layerRef = useRef(null);
  const cardRef = useRef(null);
  const spotlightRef = useRef(null);
  const nextRef = useRef(null);
  const previousFocusRef = useRef(null);
  const step = productTourSteps[index];

  const position = useCallback(() => {
    if (!active || !cardRef.current || !layerRef.current || !spotlightRef.current) return;
    const layer = layerRef.current;
    const card = cardRef.current;
    const spotlight = spotlightRef.current;
    const target = step.target ? document.querySelector(step.target) : null;
    const rect = target?.getBoundingClientRect();
    const visibleTarget = target && rect && rect.width > 0 && rect.height > 0;

    Object.assign(card.style, { left: '', top: '', right: '', bottom: '', transform: '' });
    if (!visibleTarget) {
      layer.classList.add('no-target');
      card.classList.add('centered');
      return;
    }

    layer.classList.remove('no-target');
    card.classList.remove('centered');
    const padding = 8;
    const left = Math.max(8, rect.left - padding);
    const top = Math.max(8, rect.top - padding);
    Object.assign(spotlight.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.min(window.innerWidth - left - 8, rect.width + padding * 2)}px`,
      height: `${Math.min(window.innerHeight - top - 8, rect.height + padding * 2)}px`
    });

    if (window.innerWidth <= 680) return;
    const margin = 18;
    const cardRect = card.getBoundingClientRect();
    const maxLeft = Math.max(14, window.innerWidth - cardRect.width - 14);
    let cardLeft = Math.min(Math.max(rect.left, 14), maxLeft);
    let cardTop;
    if (rect.bottom + margin + cardRect.height <= window.innerHeight - 14) {
      cardTop = rect.bottom + margin;
    } else if (rect.top - margin - cardRect.height >= 14) {
      cardTop = rect.top - margin - cardRect.height;
    } else {
      cardTop = Math.max(14, Math.min(window.innerHeight - cardRect.height - 14, rect.top));
      if (rect.right + margin + cardRect.width <= window.innerWidth - 14) cardLeft = rect.right + margin;
    }
    card.style.left = `${cardLeft}px`;
    card.style.top = `${cardTop}px`;
  }, [active, step]);

  useEffect(() => {
    if (!active) return undefined;
    previousFocusRef.current = document.activeElement;
    nextRef.current?.focus();
    return () => previousFocusRef.current?.focus?.();
  }, [active]);

  useLayoutEffect(() => {
    if (!active) return undefined;
    if (step.view) onNavigate(step.view);
    const target = step.target ? document.querySelector(step.target) : null;
    const rect = target?.getBoundingClientRect();
    if (target && rect && (rect.top < 12 || rect.bottom > window.innerHeight - 12)) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(position));
    return () => window.cancelAnimationFrame(frame);
  }, [active, step, onNavigate, position]);

  useEffect(() => {
    if (!active) return undefined;
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [active, position]);

  const finish = useCallback(
    async (skipped = false) => {
      if (busy) return;
      setBusy(true);
      await onFinish(skipped);
      setBusy(false);
    },
    [busy, onFinish]
  );

  useEffect(() => {
    if (!active) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(true);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (index === productTourSteps.length - 1) finish(false);
        else setIndex((current) => current + 1);
        return;
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        setIndex((current) => current - 1);
        return;
      }
      if (event.key !== 'Tab' || !cardRef.current) return;
      const focusable = [...cardRef.current.querySelectorAll('button:not(:disabled)')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!cardRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [active, finish, index]);

  if (!active) return null;
  return (
    <section className="tour-layer no-target" id="product-tour" aria-hidden="false" ref={layerRef}>
      <div className="tour-spotlight" id="tour-spotlight" aria-hidden="true" ref={spotlightRef} />
      <div
        className="tour-card centered"
        id="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-copy"
        ref={cardRef}
      >
        <div className="tour-topline">
          <span className="tour-step-label" id="tour-step-label">
            {t('Step {current} of {total}', {
              current: formatNumber(index + 1),
              total: formatNumber(productTourSteps.length)
            })}
          </span>
          <button
            className="tour-skip"
            id="tour-skip"
            type="button"
            disabled={busy}
            onClick={() => finish(true)}
          >
            {t('Skip tour')}
          </button>
        </div>
        <h2 className="tour-title" id="tour-title">
          {t(step.title)}
        </h2>
        <p className="tour-copy" id="tour-copy">
          {t(step.copy)}
        </p>
        <div className="tour-progress" id="tour-progress" aria-hidden="true">
          {productTourSteps.map((item, dotIndex) => (
            <span className={`tour-dot${dotIndex === index ? ' active' : ''}`} key={item.title} />
          ))}
        </div>
        <div className="tour-actions">
          <button
            className="tour-button"
            id="tour-back"
            type="button"
            disabled={index === 0 || busy}
            onClick={() => setIndex((current) => current - 1)}
          >
            {t('Back')}
          </button>
          <button
            className="tour-button primary"
            id="tour-next"
            type="button"
            disabled={busy}
            ref={nextRef}
            onClick={() =>
              index === productTourSteps.length - 1 ? finish(false) : setIndex((current) => current + 1)
            }
          >
            {index === productTourSteps.length - 1 ? (busy ? t('Finishing…') : t('Finish')) : t('Next')}
          </button>
        </div>
      </div>
    </section>
  );
}
