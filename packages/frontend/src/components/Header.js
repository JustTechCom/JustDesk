import Link from 'next/link';
import { useRouter } from 'next/router';
import { Monitor, Github, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-white/10 fixed w-full top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">JustDesk</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-gray-300 hover:text-white transition-colors ${
                router.pathname === '/' ? 'text-white' : ''
              }`}
            >
              Home
            </Link>
            <Link 
              href="/documentation" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Documentation
            </Link>
            <Link 
              href="/pricing" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <a 
              href="https://github.com/yourusername/JustDesk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </header>
  );
}