import { useEffect, useState } from 'react';
import { GiftRulesEditor, type GiftConfig } from '../components/GiftRulesEditor';
import { connectorUrl, api } from '../lib/connector';

export function RulesPage() {
  const [config, setConfig] = useState<GiftConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api<GiftConfig>(`${connectorUrl()}/api/config/gift`)
      .then((data) => {
        setConfig(data);
        setErr(null);
      })
      .catch((e: Error) => {
        setErr(e.message);
        setConfig(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">กฎของขวัญ</h1>
      <p className="mb-6 text-sm leading-relaxed text-tsz-muted">
        ตั้งว่าเมื่อมีคนส่งของขวัญบน TikTok Live จะเพิ่มหรือลด WIN เท่าไร — ไม่ต้องแก้ไฟล์ JSON เอง
      </p>
      {err && !loading && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ยังเชื่อม Connector ไม่ได้ — แสดงค่าเริ่มต้นให้แก้ได้ แต่ต้องเปิด Connector ก่อนบันทึก ({err})
        </p>
      )}
      {status && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {status}
        </p>
      )}
      <GiftRulesEditor
        initial={config}
        loading={loading}
        loadFailed={!!err}
        onSaved={setStatus}
      />
    </div>
  );
}
