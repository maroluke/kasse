import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import './styles.css';
import { Sale } from './screens/Sale';
import { Settings } from './screens/Settings';
import { Orders } from './screens/Orders';
import { Kitchen } from './screens/Kitchen';
import { PinLock } from './screens/PinLock';
import { Onboarding } from './screens/Onboarding';
import { Button } from '@kasse/ui';
import { getSettings } from './settings';

function Guard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);
  
  React.useEffect(() => {
    try {
      const v = localStorage.getItem('pos_unlocked');
      setUnlocked(v === 'true');
      
      // Check if onboarding is needed
      const settings = getSettings();
      if (!settings.printer_ip?.trim()) {
        setNeedsOnboarding(true);
      }
      
      setReady(true);
    } catch {}
  }, []);
  
  if (!ready) return null;
  if (!unlocked) {
    window.location.replace('/pin');
    return null;
  }
  if (needsOnboarding) {
    return <Onboarding onComplete={() => setNeedsOnboarding(false)} />;
  }
  return <>{children}</>;
}

function RootLayout() {
  return (
    <div className="pos-layout">
      <header className="pos-header flex gap-2 p-3 border-b bg-background sticky top-0 z-10">
        <Button asChild variant="secondary" size="sm" className="touch-button"><Link to="/sale">Sale</Link></Button>
        <Button asChild variant="secondary" size="sm" className="touch-button"><Link to="/orders">Orders</Link></Button>
        <Button asChild variant="secondary" size="sm" className="touch-button"><Link to="/kitchen">Kitchen</Link></Button>
        <Button asChild variant="secondary" size="sm" className="touch-button"><Link to="/settings">Settings</Link></Button>
      </header>
      <main className="pos-main">
        <Guard>
          <Outlet />
        </Guard>
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Sale /> },
      { path: 'sale', element: <Sale /> },
      { path: 'orders', element: <Orders /> },
      { path: 'kitchen', element: <Kitchen /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '/pin', element: <PinLock /> },
]);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
