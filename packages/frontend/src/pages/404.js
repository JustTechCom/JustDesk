import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Sayfa Bulunamadı</title>
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-8">Aradığınız sayfa bulunamadı.</p>
        <Link href="/" className="text-blue-400 hover:underline">
          Ana sayfaya dön
        </Link>
      </div>
    </>
  );
}
