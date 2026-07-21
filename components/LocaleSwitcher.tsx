'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { localizePath, type Locale } from '@/lib/i18n';
import { useI18n } from './I18nProvider';

export function LocaleSwitcher() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const changeLocale = (nextLocale: Locale) => {
    if (nextLocale === locale) return;

    const query = searchParams.toString();
    const destination = `${localizePath(pathname, nextLocale)}${query ? `?${query}` : ''}`;

    document.cookie = `bbox-locale=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.assign(destination);
  };

  return (
    <select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)} aria-label="Language" className="h-7 rounded border border-white/15 bg-black px-1 text-xs text-white">
      <option value="en">EN</option><option value="es">ES</option><option value="pt">PT</option>
    </select>
  );
}
