import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Video, Image as ImageIcon, Music, Layout, 
  Coins, User, LogOut, History, Shield, Play, Pause, 
  Download, Trash2, CheckCircle2, AlertCircle, Plus, 
  ChevronRight, ArrowRight, Settings, Menu, X, Lock, Mail, Key
} from 'lucide-react';

// Types
type ViewMode = 'home' | 'video' | 'image' | 'audio' | 'history' | 'admin';

interface UserProfile {
  id: string;
  email: string;
  credits: number;
  role: 'USER' | 'ADMIN';
}

interface CreationItem {
  id: string;
  type: 'VIDEO' | 'IMAGE' | 'AUDIO';
  prompt: string;
  resultUrl: string;
  cost: number;
  createdAt: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Video Generator States
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState<'5' | '10'>('5');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);

  // History & Creations
  const [creations, setCreations] = useState<CreationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Check active session on load
  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        fetchCreations();
      }
    } catch (err) {
      console.error('Session check failed', err);
    }
  };

  const fetchCreations = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/creations');
      if (res.ok) {
        const data = await res.json();
        setCreations(data.creations);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setUser(data.user);
      setEmail('');
      setPassword('');
      fetchCreations();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setCurrentView('home');
      setCreations([]);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim()) return;

    setIsGeneratingVideo(true);
    setVideoResult(null);

    const cost = videoDuration === '5' ? 10 : 20;

    if (user && user.credits < cost) {
      alert('Insufficient credits! Please upgrade or check your balance.');
      setIsGeneratingVideo(false);
      return;
    }

    try {
      const res = await fetch('/api/creations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'VIDEO',
          prompt: `${videoPrompt} (${videoDuration}s)`,
          cost
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setVideoResult(data.creation.resultUrl);
      setUser(prev => prev ? { ...prev, credits: data.remainingCredits } : null);
      fetchCreations();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            Aivora AI
          </span>
        </div>

        {user ? (
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 shadow-inner">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">{user.credits} Credits</span>
            </div>
            <button 
              onClick={() => setCurrentView('history')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${currentView === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">History</span>
            </button>
            {user.role === 'ADMIN' && (
              <button 
                onClick={() => setCurrentView('admin')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${currentView === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setAuthMode('login')}
              className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5"
            >
              Sign In
            </button>
            <button 
              onClick={() => setAuthMode('signup')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/30 transition"
            >
              Get 50 Free Credits
            </button>
          </div>
        )}
      </header>
      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {!user ? (
          // Landing & Auth View
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-12">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-indigo-400 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Next-Gen Cinematic AI Generation</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
                Transform Ideas Into <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Cinematic Video</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-xl mx-auto lg:mx-0">
                Experience high-performance AI video generation powered by state-of-the-art models. Sign up now and receive 50 free credits instantly.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
                <button 
                  onClick={() => setAuthMode('signup')}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium px-6 py-3 rounded-xl shadow-xl shadow-indigo-600/20 flex items-center space-x-2 transition"
                >
                  <span>Start Creating Free</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Auth Card */}
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="flex border-b border-slate-800 mb-6">
                <button 
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 ${authMode === 'login' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 ${authMode === 'signup' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-sm flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{authMode === 'login' ? 'Sign In' : 'Claim 50 Free Credits'}</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          // Logged In Views
          <div className="space-y-8">
            {currentView === 'home' && (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/40 border border-indigo-500/20 p-8 rounded-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4 max-w-2xl">
                    <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user.email}</h2>
                    <p className="text-slate-300 text-sm sm:text-base">
                      You currently have <span className="font-semibold text-amber-400">{user.credits} credits</span> available. Choose a studio tool below to start creating amazing AI media.
                    </p>
                    <button 
                      onClick={() => setCurrentView('video')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center space-x-2"
                    >
                      <Video className="w-4 h-4" />
                      <span>Launch Video Studio</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div 
                    onClick={() => setCurrentView('video')}
                    className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl cursor-pointer transition group"
                  >
                    <div className="bg-indigo-600/10 text-indigo-400 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Video className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">AI Video Generator</h3>
                    <p className="text-sm text-slate-400">Generate stunning high-definition videos from text prompts with customizable durations.</p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl opacity-60 cursor-not-allowed">
                    <div className="bg-purple-600/10 text-purple-400 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">AI Image Studio <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 ml-1">Soon</span></h3>
                    <p className="text-sm text-slate-400">Create photorealistic images and digital art using advanced generative models.</p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl opacity-60 cursor-not-allowed">
                    <div className="bg-pink-600/10 text-pink-400 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                      <Music className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">AI Audio & Voice <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 ml-1">Soon</span></h3>
                    <p className="text-sm text-slate-400">Synthesize realistic voiceovers and compose background music instantly.</p>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'video' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center space-x-2">
                      <Video className="w-5 h-5 text-indigo-400" />
                      <span>Video Generation Studio</span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Describe the cinematic scene you want to create.</p>
                  </div>

                  <form onSubmit={handleGenerateVideo} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Prompt</label>
                      <textarea 
                        rows={4}
                        required
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder="A cinematic drone shot over a misty neon cyber city at night, 4k resolution..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Duration & Pricing</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setVideoDuration('5')}
                          className={`p-3 rounded-xl border text-left transition ${videoDuration === '5' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                        >
                          <div className="font-semibold text-sm">5 Seconds</div>
                          <div className="text-xs text-amber-400 mt-0.5">10 Credits</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoDuration('10')}
                          className={`p-3 rounded-xl border text-left transition ${videoDuration === '10' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                        >
                          <div className="font-semibold text-sm">10 Seconds</div>
                          <div className="text-xs text-amber-400 mt-0.5">20 Credits</div>
                        </button>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isGeneratingVideo}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {isGeneratingVideo ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating Video...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Video</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
                  {isGeneratingVideo ? (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <h3 className="text-lg font-medium text-slate-200">AI is rendering your video...</h3>
                      <p className="text-sm text-slate-400 max-w-xs mx-auto">This usually takes between 15 to 30 seconds depending on server load.</p>
                    </div>
                  ) : videoResult ? (
                    <div className="w-full space-y-4">
                      <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative group">
                        <video 
                          src={videoResult} 
                          controls 
                          autoPlay 
                          loop 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-emerald-400 flex items-center space-x-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Video generated successfully!</span>
                        </span>
                        <a 
                          href={videoResult} 
                          download="aivora-video.mp4"
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition flex items-center space-x-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                        <Video className="w-8 h-8" />
                      </div>
                      <h3 className="text-slate-300 font-medium">No video generated yet</h3>
                      <p className="text-slate-500 text-sm max-w-xs">Enter your prompt on the left and click generate to create your cinematic video.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Creation History</h2>
                <p className="text-sm text-slate-400 mt-1">Review and download all your previous AI generations.</p>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : creations.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <History className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-slate-300 font-medium">No creations found</h3>
                  <p className="text-slate-500 text-sm">Start generating videos or images to see your history here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {creations.map((item) => (
                    <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                      <div className="aspect-video bg-slate-950 relative">
                        {item.type === 'VIDEO' ? (
                          <video src={item.resultUrl} className="w-full h-full object-cover" controls />
                        ) : (
                          <img src={item.resultUrl} alt={item.prompt} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span className="font-semibold text-indigo-400">{item.type}</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-300 line-clamp-2">{item.prompt}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                          <span className="text-xs text-amber-400 font-medium">Cost: {item.cost} Credits</span>
                          <a 
                            href={item.resultUrl} 
                            download 
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition flex items-center space-x-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'admin' && user?.role === 'ADMIN' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <Shield className="w-6 h-6 text-indigo-400" />
                  <span>Admin Dashboard</span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">Platform overview and user management controls.</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold mb-2">System Status</h3>
                <p className="text-sm text-slate-400">All AI generation workers and database connections are operating normally.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </main>

    {/* Footer */}
    <footer className="border-t border-slate-800 bg-slate-900/40 py-6 px-4 text-center text-xs text-slate-500">
      <p>&copy; {new Date().getFullYear()} Aivora AI. All rights reserved. Powered by advanced generative models.</p>
    </footer>
  </div>
);
}
      
