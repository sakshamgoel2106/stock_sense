import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Package, BarChart3, Boxes, Warehouse } from "lucide-react";
import { motion } from "motion/react";
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: Boxes, title: "Real-time Stock Tracking", desc: "Monitor inventory levels across every warehouse location instantly." },
  { icon: Warehouse, title: "Multi-Warehouse Support", desc: "Manage receipts, deliveries and transfers across multiple sites." },
  { icon: BarChart3, title: "Smart Analytics", desc: "Forecasting, valuation and aging reports at your fingertips." },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      await googleLogin(credentialResponse.credential);
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Google authentication failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid email or password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Left panel: form ── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-white shadow-xl z-10">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">StockSense</span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sign in to your account</h1>
            <p className="mt-1.5 text-sm text-gray-500">Welcome back — your inventory awaits.</p>
            <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
              <span className="font-bold shrink-0">🔑 Have an Invite Code?</span>
              <span className="text-indigo-700">Sign in with your invited email. You'll be prompted to enter your invite code on the onboarding screen.</span>
            </div>
          </div>



          {/* Google */}
          <div className="flex justify-center mb-5">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign in failed')}
              shape="rectangular"
              size="large"
              text="signin_with"
              width={384}
            />
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
            <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" required />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right panel: branding ── */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 px-14 py-16 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-violet-700/30 blur-3xl" />
        <div className="absolute bottom-0 -left-16 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur mb-10">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Everything you need to<br />run your warehouse.
            </h2>
            <p className="mt-4 text-base text-indigo-200 max-w-md">
              From receipts to deliveries, stock aging to smart audits — StockSense gives your team total control.
            </p>
          </motion.div>

          <div className="mt-10 space-y-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
                className="flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                  <f.icon className="h-5 w-5 text-indigo-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs text-indigo-300">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6"
        >
          <p className="text-sm text-indigo-100 leading-relaxed">
            "Real-time visibility across all our warehouses, finally in one place. StockSense just works."
          </p>
          <div className="mt-4 flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80"
              alt="Marcus Chen"
              className="h-9 w-9 rounded-full object-cover border border-white/20"
            />
            <div>
              <p className="text-sm font-semibold text-white">Marcus Chen</p>
              <p className="text-xs text-indigo-300">Supply Chain Director</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function InputField({ label, placeholder, type = "text", value, onChange, required }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type === "password" ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {type === "password" && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
