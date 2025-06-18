import { Inter } from "next/font/google";
import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { MainLayout } from '@/components/layout/main-layout';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import "../globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

const locales = ['bg'];

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className={`${inter.className} antialiased`}>
        <ToastProvider>
          <AuthProvider>
            <MainLayout>
              {children}
            </MainLayout>
            <ServiceWorkerRegistration />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
