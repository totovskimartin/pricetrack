import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirect to Bulgarian locale
  redirect('/bg')
}
