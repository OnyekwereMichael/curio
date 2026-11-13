import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Footer } from './Footer';
import { SITE } from '../lib/siteConfig';

export type LegalBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

/** Renders text, highlighting any [[placeholder]] that still needs to be filled in. */
function LegalText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[\[.*?\]\])/g).map((part, i) =>
        part.startsWith('[[') ? (
          <mark key={i} className="rounded-tag bg-gold-50 px-1 py-0.5 font-semibold text-gold-700">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

interface LegalPageProps {
  title: string;
  intro: string;
  sections: LegalSection[];
}

/** Shared layout for the Privacy Policy and Terms of Service: title, last-updated date, sticky contents list, readable body. */
export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui text-ink-900">
      <header className="border-b border-line bg-paper/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display font-semibold text-xl text-ink-900 tracking-tight">
            {SITE.name}
          </Link>
          <Link to="/" className="flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">
            <ChevronLeft size={16} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-grow px-6 py-14">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[16rem_1fr] gap-12">
          <aside className="hidden lg:block">
            <nav aria-label="Contents" className="sticky top-24 flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-900 mb-2">Contents</p>
              {sections.map((s, i) => (
                <a key={s.id} href={`#${s.id}`} className="text-sm text-ink-500 hover:text-ink-900 transition-colors py-1">
                  {i + 1}. {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="max-w-3xl">
            <h1 className="font-display text-display sm:text-[2.5rem] font-bold text-ink-900 leading-tight">{title}</h1>
            <p className="text-sm text-ink-500 mt-2">Last updated: {SITE.legal.lastUpdated}</p>
            <p className="text-base text-ink-600 leading-relaxed mt-6">
              <LegalText text={intro} />
            </p>

            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 mt-10">
                <h2 className="font-display text-title font-bold text-ink-900 mb-3">
                  {i + 1}. {s.title}
                </h2>
                <div className="flex flex-col gap-3 text-base text-ink-600 leading-relaxed">
                  {s.blocks.map((b, j) =>
                    b.type === 'p' ? (
                      <p key={j}>
                        <LegalText text={b.text} />
                      </p>
                    ) : (
                      <ul key={j} className="list-disc pl-6 flex flex-col gap-1.5">
                        {b.items.map((item) => (
                          <li key={item}>
                            <LegalText text={item} />
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
