import { redirect } from 'next/navigation'
import { isLocale, localizedPath } from '@/i18n/config'
import { notFound } from 'next/navigation'

export default async function LocaleIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  redirect(localizedPath(locale, '/projects'))
}
