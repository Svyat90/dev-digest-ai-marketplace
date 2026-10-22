import { useI18n } from '../i18n';
import { href } from '../lib/route';

export function NotFound({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <main id="main" className="page narrow">
      <div className="empty">
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>{t('notFound.title')}</h1>
        {message && <p>{message}</p>}
        <a className="btn" href={href.home()}>{t('notFound.home')}</a>
      </div>
    </main>
  );
}
