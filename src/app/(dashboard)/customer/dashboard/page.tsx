import { redirect } from 'next/navigation';

export default function LegacyCustomerDashboardRedirect() {
  redirect('/dashboard');
}
