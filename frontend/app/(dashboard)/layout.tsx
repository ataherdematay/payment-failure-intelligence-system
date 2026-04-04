import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          background: 'var(--bg-primary)',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
