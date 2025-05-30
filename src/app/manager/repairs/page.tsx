import { redirect } from 'next/navigation'

export default function ManagerRepairsRedirect() {
  // Repairs have been moved to the worker section
  redirect('/worker/repairs')
}