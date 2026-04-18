'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const ML  = process.env.NEXT_PUBLIC_ML_URL  || 'http://localhost:8000';

const CSV_TEMPLATE = `id,user_id,amount,currency,country,device,payment_method,gateway,status,failure_reason,retry_count,risk_score,created_at
,user_001,150.00,USD,TR,mobile,credit_card,iyzico,failed,insufficient_funds,1,0.82,2024-01-15T10:30:00Z
,user_002,89.99,USD,US,desktop,debit_card,stripe,success,,0,0.12,2024-01-15T11:00:00Z
,user_003,499.00,USD,DE,tablet,bank_transfer,paytr,failed,network_error,2,0.71,2024-01-15T12:15:00Z`;

type Stats = { total: number; failed: number; success: number; failureRate: string };
type UserRole = 'admin' | 'analyst' | 'operator';
type PanelUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
};

export default function AdminPage() {
  const { user, token, logout, loading } = useAuth();
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [stats, setStats]         = useState<Stats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ inserted: number; errors: string[] } | null>(null);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<string>('');
  const [clearing, setClearing]   = useState(false);
  const [seeding, setSeeding]     = useState(false);
  const [msg, setMsg]             = useState('');
  const [users, setUsers]         = useState<PanelUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    role: 'analyst' as UserRole,
    password: '',
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (token) fetchStats();
  }, [token]);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      fetchUsers();
    }
  }, [token, user?.role]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/transactions/summary`);
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const fetchUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API}/auth/users`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error('Kullanıcı listesi alınamadı');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setMsg('❌ Kullanıcı listesi alınamadı');
    } finally {
      setLoadingUsers(false);
    }
  };

  const authHeader = () => ({ Authorization: `Bearer ${token}` });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setCreatingUser(true);
    try {
      const res = await fetch(`${API}/auth/users`, {
        method: 'POST',
        headers: {
          ...authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Kullanıcı oluşturulamadı');

      setMsg(`✅ Yeni kullanıcı oluşturuldu: ${data.email}`);
      setNewUser({
        fullName: '',
        email: '',
        role: 'analyst',
        password: '',
      });
      fetchUsers();
    } catch (err: unknown) {
      setMsg(`❌ ${err instanceof Error ? err.message : 'Kullanıcı oluşturma hatası'}`);
    } finally {
      setCreatingUser(false);
    }
  };

  // ── CSV Upload ──────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/transactions/upload`, {
        method: 'POST',
        headers: authHeader(),
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setUploadResult(data);
      fetchStats();
      setMsg(`✅ ${data.inserted} kayıt başarıyla yüklendi!`);
    } catch (err: unknown) {
      setMsg(`❌ ${err instanceof Error ? err.message : 'Upload hatası'}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Retrain ─────────────────────────────────────────────────────────────────
  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult('');
    try {
      const res = await fetch(`${ML}/model/retrain`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Retrain failed');
      setRetrainResult(`✅ Model eğitildi! Doğruluk: ${(data.metrics?.accuracy * 100).toFixed(1)}% — Versiyon: ${data.model_version}`);
    } catch (err: unknown) {
      setRetrainResult(`❌ ${err instanceof Error ? err.message : 'Eğitim hatası'}`);
    } finally {
      setRetraining(false);
    }
  };

  // ── Seed ────────────────────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res  = await fetch(`${API}/transactions/seed`, { method: 'POST' });
      const data = await res.json();
      setMsg(`✅ ${data.inserted > 0 ? `${data.inserted} sentetik kayıt eklendi!` : 'Veritabanı zaten dolu.'}`);
      fetchStats();
    } catch {
      setMsg('❌ Seed başarısız');
    } finally {
      setSeeding(false);
    }
  };

  // ── Clear ───────────────────────────────────────────────────────────────────
  const handleClear = async () => {
    if (!confirm('Tüm veriler silinecek. Emin misiniz?')) return;
    setClearing(true);
    try {
      const res  = await fetch(`${API}/transactions/clear`, { method: 'DELETE', headers: authHeader() });
      const data = await res.json();
      setMsg(`🗑️ ${data.deleted} kayıt silindi.`);
      setStats(null);
      fetchStats();
    } catch {
      setMsg('❌ Silme başarısız');
    } finally {
      setClearing(false);
    }
  };

  // ── CSV Download ────────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'pfis_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !user) return null;

  const card = (title: string, value: string | number, sub?: string, color = '#6366f1') => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', flex: 1 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const section = (title: string, icon: string, children: React.ReactNode) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );

  const btn = (label: string, onClick: () => void, disabled = false, danger = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? 'var(--border)' : danger ? 'rgba(239,68,68,0.12)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      color: disabled ? 'var(--text-muted)' : danger ? '#f87171' : '#fff',
      border: danger ? '1px solid rgba(239,68,68,0.3)' : 'none', transition: 'opacity 0.2s',
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 36px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>PFIS Admin Paneli</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            Dashboard →
          </button>
          <button onClick={logout} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
            Çıkış Yap
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Global message */}
        {msg && (
          <div style={{ padding: '12px 18px', borderRadius: 10, marginBottom: 24, background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : msg.startsWith('🗑️') ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : msg.startsWith('🗑️') ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`, color: 'var(--text-primary)', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{msg}</span>
            <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        )}

        {/* KPI Cards */}
        {stats && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
            {card('Toplam İşlem', stats.total.toLocaleString(), 'veritabanında')}
            {card('Başarısız', stats.failed.toLocaleString(), `%${stats.failureRate} oran`, '#ef4444')}
            {card('Başarılı', stats.success.toLocaleString(), 'tamamlanan', '#22c55e')}
          </div>
        )}

        {/* CSV Upload */}
        {section('Kendi Verilerinizi Yükleyin', '📤', (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 0, lineHeight: 1.6 }}>
              Şirketinizin gerçek ödeme verilerini CSV formatında yükleyin. Veriler anında analize dahil edilir.
            </p>

            {/* Template info */}
            <div style={{ background: 'var(--bg-base)', borderRadius: 10, padding: '16px 18px', marginBottom: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desteklenen Sütunlar</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['amount *(zorunlu)', 'status', 'failure_reason', 'country', 'device', 'payment_method', 'gateway', 'currency', 'risk_score', 'user_id', 'retry_count', 'created_at'].map(col => (
                  <code key={col} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: col.includes('*') ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: col.includes('*') ? '#818cf8' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {col}
                  </code>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={downloadTemplate} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⬇️ Örnek CSV Şablonu İndir
              </button>
              <label style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: uploading ? 'var(--border)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: uploading ? 'var(--text-muted)' : '#fff', cursor: uploading ? 'not-allowed' : 'pointer' }}>
                {uploading ? '⏳ Yükleniyor...' : '📂 CSV Dosyası Seç & Yükle'}
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
              </label>
            </div>

            {uploadResult && (
              <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <div style={{ color: '#4ade80', fontWeight: 600, fontSize: 14, marginBottom: uploadResult.errors.length ? 8 : 0 }}>
                  ✅ {uploadResult.inserted} kayıt başarıyla eklendi
                </div>
                {uploadResult.errors.length > 0 && (
                  <div style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>
                    ⚠️ {uploadResult.errors.length} satırda hata: {uploadResult.errors.slice(0, 3).join(' | ')}
                    {uploadResult.errors.length > 3 && ` ... +${uploadResult.errors.length - 3} daha`}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* ML Model */}
        {section('ML Modeli Yönetimi', '🤖', (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 0, lineHeight: 1.6 }}>
              Yeni veri yükledikten sonra ML modelini güncel verilerle yeniden eğitin. Eğitim 30–60 saniye sürer.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {btn(retraining ? '⏳ Eğitiliyor...' : '🔄 Modeli Yeniden Eğit', handleRetrain, retraining)}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Verileri yükledikten sonra çalıştırmanızı öneririz
              </span>
            </div>
            {retrainResult && (
              <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, fontSize: 13, background: retrainResult.startsWith('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${retrainResult.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: retrainResult.startsWith('✅') ? '#4ade80' : '#f87171' }}>
                {retrainResult}
              </div>
            )}
          </div>
        ))}

        {/* Data Management */}
        {section('Veri Yönetimi', '⚙️', (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280, padding: '18px 20px', borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>Sentetik Veri Ekle</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Demo için 5.000 sentetik işlem oluşturur. Veritabanı doluysa atlanır.
              </p>
              {btn(seeding ? '⏳ Ekleniyor...' : '🌱 Demo Verisi Ekle', handleSeed, seeding)}
            </div>
            <div style={{ flex: 1, minWidth: 280, padding: '18px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f87171', marginBottom: 8 }}>Tüm Verileri Sil</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Veritabanındaki tüm işlem kayıtlarını kalıcı olarak siler. Bu işlem geri alınamaz!
              </p>
              {btn(clearing ? '⏳ Siliniyor...' : '🗑️ Tüm Veriyi Temizle', handleClear, clearing, true)}
            </div>
          </div>
        ))}

        {/* User Management */}
        {user.role === 'admin' && section('Kullanıcı Yönetimi', '👥', (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Çok kullanıcılı sistem için yeni kullanıcı oluşturabilir ve mevcut kullanıcıları görüntüleyebilirsiniz.
            </p>

            <form onSubmit={handleCreateUser} style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.2fr 0.8fr 1fr auto',
              gap: 10,
              alignItems: 'end',
            }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Ad Soyad</label>
                <input
                  value={newUser.fullName}
                  onChange={(e) => setNewUser((p) => ({ ...p, fullName: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>E-posta</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as UserRole }))}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                >
                  <option value="admin">admin</option>
                  <option value="analyst">analyst</option>
                  <option value="operator">operator</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Şifre</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                />
              </div>

              <button
                type="submit"
                disabled={creatingUser}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: creatingUser ? 'var(--border)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: creatingUser ? 'not-allowed' : 'pointer',
                }}
              >
                {creatingUser ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
              </button>
            </form>

            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                Mevcut Kullanıcılar
              </div>
              <div style={{ maxHeight: 220, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Ad Soyad', 'E-posta', 'Rol', 'Durum'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 10, color: 'var(--text-muted)' }}>Yükleniyor...</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 10, color: 'var(--text-muted)' }}>Kullanıcı bulunamadı.</td>
                      </tr>
                    ) : users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>{u.fullName}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ padding: '8px 10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{u.role}</td>
                        <td style={{ padding: '8px 10px', color: u.isActive ? '#22c55e' : '#ef4444' }}>{u.isActive ? 'Aktif' : 'Pasif'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

        {/* Instructions */}
        {section('Şirketinizin Verisini Nasıl Yüklersiniz?', '📖', (
          <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 2.2 }}>
            <li>Mevcut demo verilerini temizlemek isterseniz <strong style={{ color: 'var(--text-primary)' }}>"Tüm Veriyi Temizle"</strong> butonunu kullanın</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>"Örnek CSV Şablonu İndir"</strong> ile boş şablonu indirin ve kendi verilerinizle doldurun</li>
            <li><code style={{ background: 'var(--bg-base)', padding: '1px 6px', borderRadius: 4 }}>status</code> alanına <code style={{ background: 'var(--bg-base)', padding: '1px 6px', borderRadius: 4 }}>success</code>, <code style={{ background: 'var(--bg-base)', padding: '1px 6px', borderRadius: 4 }}>failed</code> veya <code style={{ background: 'var(--bg-base)', padding: '1px 6px', borderRadius: 4 }}>pending</code> yazın</li>
            <li>Başarısız işlemler için <code style={{ background: 'var(--bg-base)', padding: '1px 6px', borderRadius: 4 }}>failure_reason</code> alanına nedeni belirtin</li>
            <li>Doldurduğunuz CSV dosyasını <strong style={{ color: 'var(--text-primary)' }}>"CSV Dosyası Seç & Yükle"</strong> ile yükleyin</li>
            <li>Yükleme tamamlandıktan sonra <strong style={{ color: 'var(--text-primary)' }}>"Modeli Yeniden Eğit"</strong> ile ML modelini güncelleyin</li>
            <li>Dashboard'a dönerek gerçek verilerinizi analiz edin 🎉</li>
          </ol>
        ))}
      </div>
    </div>
  );
}
