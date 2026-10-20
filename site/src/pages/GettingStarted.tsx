import { useState } from 'react';
import { useI18n } from '../i18n';
import { useCatalog } from '../context';
import { href } from '../lib/route';
import { Terminal } from '../components/ui';

export function GettingStarted() {
  const { t } = useI18n();
  const { index } = useCatalog();
  const [plugin, setPlugin] = useState(index.plugins[0]?.name ?? '<plugin>');
  const id = `${plugin}@${index.marketplace}`;
  const steps = [
    { title: t('start.add.title'), text: t('start.add.text'), commands: [index.addCommand] },
    { title: t('start.install.title'), text: t('start.install.text'), commands: [`/plugin install ${id}`], pick: true },
    {
      title: t('start.update.title'),
      text: t('start.update.text'),
      commands: [`claude plugin marketplace update ${index.marketplace}`, `claude plugin update ${id}`],
    },
  ];
  return (
    <main id="main" className="page feed">
      <a className="back" href={href.home()}>{t('start.home')}</a>
      <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>{t('start.title')}</h1>
      <p className="dim" style={{ margin: '0 0 32px', maxWidth: 560 }}>{t('start.lead')}</p>
      <ol className="steps" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {steps.map((s, i) => (
          <li key={s.title} className="step">
            <div className="step-n" aria-hidden="true">{i + 1}</div>
            <div className="grow">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              {s.pick && index.plugins.length > 0 && (
                <label className="inline-select">
                  {t('start.install.pick')}
                  <select value={plugin} onChange={(e) => setPlugin(e.target.value)}>
                    {index.plugins.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </label>
              )}
              {s.commands.map((c, j) => <Terminal key={c} command={c} id={`step:${i}:${j}`} inlineCopy />)}
            </div>
          </li>
        ))}
      </ol>
      <div className="note"><strong>{t('start.diff.title')}</strong> {t('start.diff.text')}</div>
      <div className="note"><strong>{t('start.auto.title')}</strong> {t('start.auto.text', { marketplace: index.marketplace })}</div>
    </main>
  );
}
