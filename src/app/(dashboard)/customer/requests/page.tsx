import { redirect } from 'next/navigation';

export default function LegacyCustomerRequestsRedirect() {
  redirect('/dashboard/history');
}
