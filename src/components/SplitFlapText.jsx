import { useEffect, useMemo, useRef, useState } from 'react';
import './SplitFlapText.css';

const DEFAULT_WORDS = ['LAUNCH READY', 'SYNC ONLINE', 'SIGNAL LIVE'];

const CHARSETS = {
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  numeric: '0123456789'
};

const toCssUnit = value => (typeof value === 'number' ? `${value}px` : value);

const resolveCharset = charset => {
  if (CHARSETS[charset]) return CHARSETS[charset];
  return typeof charset === 'string' && charset.length > 0 ? charset : CHARSETS.alphanumeric;
};

const normalizePhrase = (phrase, width) => {
  const safe = String(phrase ?? '');
  return safe.padEnd(width, ' ').slice(0, width);
};

const createTiles = phrase =>
  phrase.split('').map(char => ({
    current: char,
    next: char,
    flipping: false,
    tick: 0
  }));

const sampleChar = charset => charset.charAt(Math.floor(Math.random() * charset.length)) || ' ';

const buildSequence = (target, flips, charset) => {
  const steps = [];
  for (let i = 0; i < flips; i += 1) {
    steps.push(sampleChar(charset));
  }
  steps.push(target);
  return steps;
};

const usePrefersReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReduced(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
};

const SplitFlapText = ({
  words = ['LAUNCH READY', 'SYNC ONLINE', 'SIGNAL LIVE'],
  text,
  autoResize = true,
  flipDuration = 0.12,
  stagger = 0.06,
  cycleDelay = 2400,
  charset = 'alphanumeric',
  flipsPerChar = 8,
  tileColor = '#111827',
  textColor = '#f8fafc',
  tileRadius = 8,
  gap = 6,
  fontSize = 52,
  loop = true,
  padTo,
  className = '',
  style = {},
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const rafRef = useRef(null);
  const cycleTimerRef = useRef(null);
  const currentTextRef = useRef('');

  const sourceWords = Array.isArray(words) && words.length > 0 ? words : DEFAULT_WORDS;
  const phrasesKey = typeof text === 'string' ? text : sourceWords.map(word => String(word ?? '')).join('\u001f');
  const rawPhrases = useMemo(() => phrasesKey.split('\u001f'), [phrasesKey]);

  // Determine normalized phrases based on autoResize or fixed padding
  const phrases = useMemo(() => {
    if (autoResize) {
      // Natural word lengths (e.g. 'HACKDAYS' -> 8, 'LUNCH PASS' -> 10)
      return rawPhrases.map(p => String(p ?? ''));
    }
    const longest = rawPhrases.reduce((max, phrase) => Math.max(max, phrase.length), 1);
    const width = Math.max(1, Math.ceil(Number(padTo) || 0), longest);
    return rawPhrases.map(phrase => normalizePhrase(phrase, width));
  }, [rawPhrases, autoResize, padTo]);

  const [tiles, setTiles] = useState(() => createTiles(phrases[0] || ''));
  const [fadeState, setFadeState] = useState('visible');

  useEffect(() => {
    const clearAnimation = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };

    clearAnimation();

    const firstPhrase = phrases[0] || '';
    currentTextRef.current = firstPhrase;
    setTiles(createTiles(firstPhrase));
    setFadeState('visible');

    if (phrases.length <= 1 || typeof window === 'undefined') {
      return clearAnimation;
    }

    let phraseIndex = 0;
    let cancelled = false;

    const safeCycleDelay = Math.max(800, Number(cycleDelay) || 2800);

    const scheduleNext = (delay) => {
      cycleTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;

        const nextIndex = phraseIndex + 1;
        if (nextIndex >= phrases.length && !loop) return;

        phraseIndex = nextIndex % phrases.length;
        const nextPhrase = phrases[phraseIndex];

        // 1. Smoothly fade out current phrase
        setFadeState('fading');

        // 2. After fade out completes, update phrase tiles and smoothly fade in
        cycleTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          currentTextRef.current = nextPhrase;
          setTiles(createTiles(nextPhrase));
          setFadeState('visible');

          // Schedule next transition
          scheduleNext(safeCycleDelay);
        }, 600); // 600ms graceful fade-out
      }, delay);
    };

    scheduleNext(safeCycleDelay);

    return () => {
      cancelled = true;
      clearAnimation();
    };
  }, [phrases, loop, cycleDelay, flipDuration, stagger, flipsPerChar, charset, prefersReducedMotion]);

  const settledText = tiles
    .map(tile => tile.current)
    .join('')
    .trimEnd();

  const componentStyle = {
    '--split-flap-tile-color': tileColor,
    '--split-flap-text-color': textColor,
    '--split-flap-radius': toCssUnit(tileRadius),
    '--split-flap-gap': toCssUnit(gap),
    '--split-flap-font-size': toCssUnit(fontSize),
    '--split-flap-flip-duration': `${Math.max(0.04, Number(flipDuration) || 0.12)}s`,
    ...style
  };

  return (
    <div
      className={`split-flap-text ${fadeState === 'fading' ? 'split-flap-fade-out' : 'split-flap-fade-in'} ${className}`.trim()}
      style={componentStyle}
      role="text"
      aria-label={settledText || undefined}
      {...props}
    >
      {tiles.map((tile, index) => (
        <span className="split-flap-text__tile" aria-hidden="true" key={`tile-${index}`}>
          <span className="split-flap-text__half split-flap-text__half--top">
            <span className="split-flap-text__char">{tile.current === ' ' ? '\u00A0' : tile.current}</span>
          </span>
          <span className="split-flap-text__half split-flap-text__half--bottom">
            <span className="split-flap-text__char">{tile.flipping ? tile.next : tile.current}</span>
          </span>

          {tile.flipping && (
            <>
              <span className="split-flap-text__flap split-flap-text__flap--front" key={`front-${index}-${tile.tick}`}>
                <span className="split-flap-text__char">{tile.current === ' ' ? '\u00A0' : tile.current}</span>
              </span>
              <span className="split-flap-text__flap split-flap-text__flap--back" key={`back-${index}-${tile.tick}`}>
                <span className="split-flap-text__char">{tile.next === ' ' ? '\u00A0' : tile.next}</span>
              </span>
            </>
          )}
        </span>
      ))}
    </div>
  );
};

export default SplitFlapText;
