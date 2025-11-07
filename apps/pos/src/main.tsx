import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import './styles.css';
import { Sale } from './screens/Sale';
import { Settings } from './screens/Settings';
import { Orders } from './screens/Orders';
import { Kitchen } from './screens/Kitchen';
import { PinLock } from './screens/PinLock';
import { Button } from '@kasse/ui';

function Guard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);
  React.useEffect(() => {
    try {
      const v = localStorage.getItem('pos_unlocked');
      setUnlocked(v === 'true');
    } catch {}
    setReady(true);
  }, []);
  if (!ready) return null;
  if (!unlocked) {
    window.location.replace('/pin');
    return null;
  }
  return <>{children}</>;
}

function RootLayout() {
  return (
    <div className="h-full flex flex-col">
      <header className="flex gap-2 p-2 border-b bg-background sticky top-0 z-10">
        <Button asChild variant="secondary" size="sm"><Link to="/sale">Sale</Link></Button>
        <Button asChild variant="secondary" size="sm"><Link to="/orders">Orders</Link></Button>
        <Button asChild variant="secondary" size="sm"><Link to="/kitchen">Kitchen</Link></Button>
        <Button asChild variant="secondary" size="sm"><Link to="/settings">Settings</Link></Button>
      </header>
      <main className="flex-1 overflow-auto">
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
