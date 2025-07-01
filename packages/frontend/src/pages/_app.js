import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Fix body padding for fixed header
    document.body.style.paddingTop = '64px';
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;