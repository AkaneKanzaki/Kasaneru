import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useStrings } from '../lib/i18n';

const docs = import.meta.glob('../content/legal/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

// Pembaca dokumen legal: /legal/privacy atau /legal/terms,
// mengikuti bahasa aktif (EN/ID).
export default function Legal() {
  const { S, lang } = useStrings();
  const navigate = useNavigate();
  const { doc } = useParams();
  const [body, setBody] = useState<string | null>(null);

  const key = doc === 'privacy' || doc === 'terms' ? `../content/legal/${doc}.${lang}.md` : null;
  const title = doc === 'privacy' ? S.privacyPolicy : doc === 'terms' ? S.termsOfUse : S.aboutTitle;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!key || !docs[key]) {
        if (alive) setBody(null);
        return;
      }
      try {
        const text = await docs[key]();
        if (alive) setBody(text);
      } catch {
        if (alive) setBody(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  return (
    <div className="page">
      <div className="stack">
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)} style={{ alignSelf: 'flex-start' }}>
          ← {S.back}
        </button>
        <h1 className="page-title">{title}</h1>
        <div className="card">
          {body == null ? <p className="muted">{S.loading}</p> : <ReactMarkdown>{body}</ReactMarkdown>}
        </div>
      </div>
    </div>
  );
}
