import { useEffect, useRef } from 'react';
import styles from './ArticleView.module.css';
import '../styles/article.css';

interface Props {
  html: string;
  onNavigate: (title: string) => void;
  disabled?: boolean;
}

const FORBIDDEN_PREFIXES = [
  'File:', 'Wikipedia:', 'Help:', 'Category:', 'Talk:',
  'User:', 'Special:', 'Portal:', 'Template:', 'Draft:',
  'MediaWiki:', 'Module:', 'Book:', 'TimedText:', 'MOS:',
];

const REMOVED_SECTION_IDS = [
  'External_links', 'References', 'Notes', 'Bibliography',
  'Further_reading', 'Footnotes', 'Citations',
];

function cleanHtml(container: HTMLElement) {
  // Remove edit section links
  container.querySelectorAll('.mw-editsection').forEach(el => el.remove());

  // Remove reference/footnote sections
  container.querySelectorAll(
    '.reflist, .references, .mw-references-wrap, sup.reference, .mw-ref'
  ).forEach(el => el.remove());

  // Remove navboxes and category links
  container.querySelectorAll(
    '.navbox, .navbox-inner, .vertical-navbox, .catlinks, .sistersitebox'
  ).forEach(el => el.remove());

  // Remove specific sections by heading ID
    container.querySelectorAll('h2, h3').forEach(heading => {
      const span = heading.querySelector('span[id]');
      if (!span) return;
      const id = span.getAttribute('id') || '';
      if (REMOVED_SECTION_IDS.some(s => id === s || id.startsWith(s + '_'))) {
        let sibling: Element | null = heading;
        while (sibling) {
          const nextSibling: Element | null = sibling.nextElementSibling;
          sibling.remove();
          sibling = nextSibling;
        }
      }
    });

  // Remove table of contents
  container.querySelectorAll('#toc, .toc').forEach(el => el.remove());

  // Remove "This article may need cleanup" / maintenance banners
  container.querySelectorAll('.ambox, .tmbox, .cmbox, .ombox, .fmbox').forEach(el => el.remove());

  // Remove audio/video pronunciations (these show broken icons without Wikipedia's assets)
  container.querySelectorAll('.audio, .audiolink').forEach(el => el.remove());
}

export function ArticleView({ html, onNavigate, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onNavigateRef = useRef(onNavigate);
  const disabledRef = useRef(disabled);

  // Keep refs current without re-running the main effect
  useEffect(() => { onNavigateRef.current = onNavigate; });
  useEffect(() => { disabledRef.current = disabled; });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !html) return;

    container.innerHTML = html;
    cleanHtml(container);

    // Tag internal wiki links as clickable, mark forbidden ones as inert
    container.querySelectorAll<HTMLAnchorElement>('a[href^="/wiki/"]').forEach(link => {
      const href = link.getAttribute('href') || '';
      const path = href.replace('/wiki/', '');
      let decoded: string;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        decoded = path;
      }
      const raw = decoded.replace(/_/g, ' ');

      if (FORBIDDEN_PREFIXES.some(p => raw.startsWith(p))) {
        link.removeAttribute('href');
        return;
      }

      link.setAttribute('data-wiki-title', raw);
      link.removeAttribute('href');
      link.classList.add('wiki-link');
    });

    // Disable all remaining links
    container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => {
      link.removeAttribute('href');
    });

    // Single delegated click listener on the container
    const handleClick = (e: MouseEvent) => {
      if (disabledRef.current) return;
      const target = (e.target as HTMLElement).closest('[data-wiki-title]') as HTMLElement;
      if (!target) return;
      e.preventDefault();
      const title = target.getAttribute('data-wiki-title');
      if (title) onNavigateRef.current(title);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} wiki-content ${disabled ? 'disabled' : ''}`}
    />
  );
}
