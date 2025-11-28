import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Zap, Server, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import astraAvatar from '../images/astra.png';

const features = [
  { icon: Shield, text: 'Secure Discord OAuth2' },
  { icon: Server, text: 'Manage multiple servers' },
  { icon: Zap, text: 'Real-time configuration' },
  { icon: Sparkles, text: 'Modern dashboard' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login } = useAuthStore();
  
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <img src={astraAvatar} alt="Astra" className="w-20 h-20 rounded-2xl mx-auto mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-[var(--color-accent)] border-t-transparent mx-auto" />
          <p className="text-[var(--color-text-muted)] mt-4">Loading...</p>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)] overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-5" />
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px]" 
        />
      </div>
      
      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <img src={astraAvatar} alt="Astra" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-bold text-lg gradient-text">Astra</span>
          </Link>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden md:block"
          >
            <h2 className="text-4xl font-display font-bold mb-4">
              <span className="gradient-text">Dashboard</span>
              <br />
              <span className="text-[var(--color-text)]">Access</span>
            </h2>
            <p className="text-[var(--color-text-muted)] text-lg mb-8">
              Login to configure your Discord servers, manage moderation, leveling, economy, and more.
            </p>
            
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/20 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <span className="text-[var(--color-text)]">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Right side - Login card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/20 to-purple-500/20 rounded-3xl blur-xl" />
            <div className="relative card rounded-3xl p-8 backdrop-blur-xl border border-white/10">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="relative w-24 h-24 mx-auto mb-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)] to-purple-500 rounded-2xl blur-lg opacity-50" />
                <img 
                  src={astraAvatar}
                  alt="Astra"
                  className="relative w-24 h-24 rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-[var(--color-surface)]">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold mb-2">Welcome to Astra</h1>
                <p className="text-[var(--color-text-muted)]">
                  Sign in with Discord to continue
                </p>
              </div>
              
              {/* Login button */}
              <motion.button
                onClick={login}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-4 px-6 rounded-xl flex items-center justify-center gap-3 text-lg font-semibold transition-colors shadow-lg shadow-[#5865F2]/25"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Continue with Discord
              </motion.button>
              
              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-text-muted)]">SECURE LOGIN</span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>
              
              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>We only request necessary permissions</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>Your data is encrypted and secure</span>
                </div>
              </div>
              
              {/* Footer */}
              <p className="text-xs text-[var(--color-text-muted)] text-center mt-6">
                By logging in, you agree to our{' '}
                <a href="#" className="text-[var(--color-accent)] hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-[var(--color-accent)] hover:underline">Privacy Policy</a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 p-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          © 2024 Astra Bot. Made with ❤️ by Novaplex
        </p>
      </footer>
    </div>
  );
}
