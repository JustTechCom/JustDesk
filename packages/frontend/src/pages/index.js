import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Monitor, Link2, Shield, Zap, Github, Globe } from 'lucide-react';
import Layout from '../components/Layout';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = () => {
    router.push('/share');
  };

  const handleConnect = async () => {
    if (!roomId || !password) return;
    
    setLoading(true);
    router.push(`/view?room=${roomId}&pwd=${password}`);
  };

  return (
    <Layout>
      <Head>
        <title>JustDesk - Web Based Remote Desktop</title>
        <meta name="description" content="Share your screen instantly with just a web browser. No installation required." />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Hero Section */}
        <div className="container mx-auto px-4 pt-20 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl font-bold text-white mb-6 animate-fade-in">
              JustDesk
            </h1>
            <p className="text-2xl text-gray-300 mb-12">
              Remote desktop access directly from your browser.
              <br />
              <span className="text-blue-400">No downloads. No plugins. Just works.</span>
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-16">
            {/* Share Screen Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-blue-600 rounded-2xl">
                  <Monitor className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white ml-4">
                  Share Your Screen
                </h2>
              </div>
              <p className="text-gray-300 mb-8">
                Start sharing your screen in seconds. Get an instant connection ID to share with others.
              </p>
              <button
                onClick={handleShare}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 flex items-center justify-center group"
              >
                Start Sharing
                <Monitor className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Connect Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:border-green-400/50 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-green-600 rounded-2xl">
                  <Link2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white ml-4">
                  Connect to Desktop
                </h2>
              </div>
              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  placeholder="Connection ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors"
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={!roomId || !password || loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition duration-200 flex items-center justify-center group"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Now
                    <Link2 className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-24">
            <div className="text-center group">
              <div className="p-4 bg-white/10 rounded-2xl inline-block mb-4 group-hover:bg-white/20 transition-colors">
                <Shield className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Secure & Encrypted
              </h3>
              <p className="text-gray-400 text-sm">
                End-to-end encrypted connections keep your data safe
              </p>
            </div>
            <div className="text-center group">
              <div className="p-4 bg-white/10 rounded-2xl inline-block mb-4 group-hover:bg-white/20 transition-colors">
                <Zap className="w-10 h-10 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Lightning Fast
              </h3>
              <p className="text-gray-400 text-sm">
                Low latency P2P connections for real-time control
              </p>
            </div>
            <div className="text-center group">
              <div className="p-4 bg-white/10 rounded-2xl inline-block mb-4 group-hover:bg-white/20 transition-colors">
                <Globe className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Works Anywhere
              </h3>
              <p className="text-gray-400 text-sm">
                Compatible with all modern browsers and devices
              </p>
            </div>
            <div className="text-center group">
              <div className="p-4 bg-white/10 rounded-2xl inline-block mb-4 group-hover:bg-white/20 transition-colors">
                <Github className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Open Source
              </h3>
              <p className="text-gray-400 text-sm">
                Free to use and modify under MIT license
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}