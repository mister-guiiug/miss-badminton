import { useI18n } from '../../../i18n';
import { Logo } from '../Logo';
import { MenuContent } from './MenuContent';

/**
 * La barre latérale permanente, à partir de `lg:` — iPad en paysage, bureau.
 *
 * Elle porte EXACTEMENT le même corps que le tiroir mobile (`MenuContent`) :
 * mêmes liens, même choix de langue, même état du réseau. C'est la seule
 * garantie qu'un réglage ne disparaisse pas en tournant l'appareil.
 */
export function PersistentSidebar() {
  const { t } = useI18n();
  return (
    <aside
      aria-label={t('nav.menuLabel')}
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-3 border-r px-3 lg:flex"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        paddingInlineStart: 'max(env(safe-area-inset-left), 0.75rem)',
      }}
    >
      <div
        className="mb-1 inline-flex items-center gap-2 px-1 text-lg font-bold"
        style={{ color: 'var(--primary)' }}
      >
        <Logo size={32} />
        {t('appName')}
      </div>
      <MenuContent />
    </aside>
  );
}
