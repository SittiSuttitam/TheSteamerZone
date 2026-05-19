import { useEffect, useState } from 'react';
import { connectorUrl, api } from '../lib/connector';

export function RulesPage() {
  const [config, setConfig] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ ok?: boolean }>(`${connectorUrl()}/api/config/gift`)
      .then(setConfig)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">กฎของขวัญ</h1>
      <p className="mb-6 text-sm leading-relaxed text-tsz-muted">
        แม็ปของขวัญและแอ็กชันขั้นสูง อ่านจากไฟล์{' '}
        <code className="rounded bg-tsz-bg px-1">gift-config.json</code> ที่ Local Connector
      </p>
      {err && (
        <p className="mb-4 text-sm text-red-600">
          ยังเชื่อมต่อ Connector ที่ <code className="rounded bg-tsz-bg px-1">{connectorUrl()}</code> ไม่ได้
          — เปิดโปรแกรม Connector หรือตั้งค่า <code className="rounded bg-tsz-bg px-1">VITE_CONNECTOR_URL</code> / บันทึกที่อยู่ในหน้า «เชื่อมต่อ» ({err})
        </p>
      )}
      <pre className="max-h-[480px] overflow-auto rounded-xl border border-tsz-border bg-tsz-surface p-4 text-xs shadow-card">
        {config ? JSON.stringify(config, null, 2) : 'กำลังโหลด…'}
      </pre>
    </div>
  );
}
