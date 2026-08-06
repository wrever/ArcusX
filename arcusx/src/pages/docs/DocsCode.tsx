import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';

export default function DocsCode({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="ax-docs__code-wrap">
      <button type="button" className="ax-docs__code-copy" onClick={onCopy}>
        {copied ? t('docs.code.copied') : t('docs.code.copy')}
      </button>
      <pre className="ax-docs__code">
        <code>{text}</code>
      </pre>
    </div>
  );
}
