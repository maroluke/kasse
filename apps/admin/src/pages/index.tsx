import Link from 'next/link';
import { Button } from '@kasse/ui';

export default function Home() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Admin Home</h1>
      <div className="mt-3 grid gap-2 w-full max-w-[340px]">
        <Button asChild variant="secondary"><Link href="/products">Products</Link></Button>
        <Button asChild variant="secondary"><Link href="/categories">Categories</Link></Button>
        <Button asChild variant="secondary"><Link href="/outlet-pricing">Outlet Pricing</Link></Button>
        <Button asChild variant="secondary"><Link href="/settings/vat">VAT Settings</Link></Button>
        <Button asChild variant="secondary"><Link href="/reports/daily">Daily Report</Link></Button>
        <Button asChild variant="secondary"><Link href="/reports/overview">Reports Overview</Link></Button>
      </div>
    </div>
  );
}
