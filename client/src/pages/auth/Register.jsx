import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Package, BarChart3, Boxes, Warehouse } from "lucide-react";
import { motion } from "motion/react";
import { GoogleLogin } from '@react-oauth/google';

const ROLES = [
  { value: 'WORKER', label: 'Worker', desc: 'Floor operations, receipts, deliveries & physical counts' },
  { value: 'MANAGER', label: 'Manager', desc: 'Logistics review, replenishment & transfer approvals' },
  { value: 'COMPANY_ADMIN', label: 'Admin', desc: 'Executive control: hubs, team members & settings' },
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('WORKER');
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      await googleLogin(credentialResponse.credential);
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Google registration failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setError('Please agree to the Terms of Service to continue.'); return; }
    try {
      setLoading(true);
      setError(null);
      await register(name, email, password, role);
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Left panel: form ── */}
      <div className="flex flex-1 flex-col px-6 py-8 lg:px-16 xl:px-24 bg-white shadow-xl z-10 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm my-auto py-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">StockSense</span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h1>
            <p className="mt-1 text-sm text-gray-500">Join your team and start managing inventory.</p>
            <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
              <span className="font-bold shrink-0">🔑 Invited by Admin?</span>
              <span className="text-indigo-700">Register with your invited email. You'll enter your single-use invite code on the next screen.</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          {/* Google */}
          <div className="flex justify-center mb-5 w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign up failed')}
              shape="rectangular"
              size="large"
              text="signup_with"
              width="384"
            />
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or register with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField label="Full Name" type="text" value={name} onChange={setName} placeholder="Jane Doe" required />
            <InputField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="jane@company.com" required />
            <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters" required />

            {/* Compact Role selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Intended Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`py-2 px-1 text-center rounded-xl border text-xs transition-all ${
                      role === r.value
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 font-bold ring-1 ring-indigo-600 shadow-sm'
                        : 'border-gray-200 bg-gray-50/60 text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {ROLES.find(r => r.value === role)?.desc}
              </p>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 transition-colors"
                />
                <svg
                  viewBox="0 0 12 12"
                  className="pointer-events-none absolute inset-0 hidden h-4 w-4 p-0.5 text-white peer-checked:block"
                  fill="none"
                >
                  <path d="M3 6.2 5 8.1 9 3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 leading-5">
                By signing up, I agree to the{' '}
                <a href="#" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500">Privacy Policy</a>.
              </span>
            </label>

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
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right panel: branding ── */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 px-14 py-16 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-violet-700/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-16 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

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
              Built for teams that<br />move fast.
            </h2>
            <p className="mt-4 text-base text-indigo-200 max-w-md">
              StockSense gives your whole warehouse team — from staff to managers — the tools they need to operate with confidence.
            </p>
          </motion.div>

          <div className="mt-10 space-y-5">
            {[
              { icon: Boxes, title: "Role-based Access", desc: "Workers and managers each see exactly what they need." },
              { icon: Warehouse, title: "Multi-site Operations", desc: "Manage all your warehouse locations from one account." },
              { icon: BarChart3, title: "Instant Reporting", desc: "Get stock aging, valuation and audit reports on demand." },
            ].map((f, i) => (
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
            "Our onboarding took less than an afternoon. The role system means every team member can get started without extra training."
          </p>
          <div className="mt-4 flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&q=80"
              alt="Sarah Jenkins"
              className="h-9 w-9 rounded-full object-cover border border-white/20"
            />
            <div>
              <p className="text-sm font-semibold text-white">Sarah Jenkins</p>
              <p className="text-xs text-indigo-300">Warehouse Operations Manager</p>
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
