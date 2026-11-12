import { Link } from 'react-router-dom';
import { FOOTER_COLUMNS, SITE } from '../lib/siteConfig';

const linkClass = 'text-sm text-ink-500 hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:underline';

export function Footer() {
  return (
    <footer className="bg-surface border-t border-line font-ui">
      <div className="max-w-6xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3 items-start">
          <span className="font-display font-bold text-xl text-ink-900">{SITE.name}</span>
          <p className="text-sm text-ink-500 max-w-xs">{SITE.tagline}</p>
          <a href={`mailto:${SITE.contactEmail}`} className={linkClass}>
           onyekweremichael55@gmail.com
          </a>
          {SITE.socials.length > 0 && (
            <ul className="flex gap-4 list-none p-0 m-0">
              {SITE.socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-900">{col.title}</h2>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {col.links.map((link) => (
                <li key={link.label}>
                  {'to' in link ? (
                    <Link to={link.to} className={linkClass}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <p className="max-w-6xl mx-auto px-6 py-5 text-xs text-ink-500">
          &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
