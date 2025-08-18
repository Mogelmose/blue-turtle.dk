import { redirect } from 'next/navigation';

export default function RootPage() {
  // Let middleware handle auth; send users to /homepage
  redirect('/homepage');
}