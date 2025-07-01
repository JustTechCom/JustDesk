import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="description" content="JustDesk - Web-based remote desktop solution. No downloads required." />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="JustDesk - Remote Desktop" />
        <meta property="og:description" content="Share your screen instantly with just a web browser" />
        <meta property="og:image" content="/og-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="JustDesk - Remote Desktop" />
        <meta name="twitter:description" content="Share your screen instantly with just a web browser" />
        <meta name="twitter:image" content="/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}