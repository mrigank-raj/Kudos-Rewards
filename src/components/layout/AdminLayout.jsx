import { Outlet } from 'react-router-dom';
import AppShell from '@/components/shell/AppShell';

export default function AdminLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
