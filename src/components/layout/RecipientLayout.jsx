import { Outlet } from 'react-router-dom';
import AppShell from '@/components/shell/AppShell';

export default function RecipientLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
