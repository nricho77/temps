import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.mustChangePwd) {
        navigate('/changer-mot-de-passe');
      } else {
        navigate('/tableau-de-bord');
      }
    } catch (err: any) {
      toast.error(err.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-darker via-brand-dark to-brand-light flex flex-col justify-center items-center px-4">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold shadow-lg mb-4">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Feuilles de Temps</h1>
        <p className="text-brand-goldLight text-sm mt-1">Sankofa Education</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card-lg p-8">
        <h2 className="text-xl font-semibold text-brand-dark mb-6">Connexion</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse courriel</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="votre@courriel.ca"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition text-sm"
            />
          </div>
          <div className="flex justify-end">
            <a href="/mot-de-passe-oublie" className="text-xs text-brand-gold hover:text-brand-goldDark transition">
              Mot de passe oublié ?
            </a>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-light active:scale-95 transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : null}
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>

      <p className="text-xs text-brand-goldLight mt-6 opacity-60">
        © {new Date().getFullYear()} Sankofa Education — Tous droits réservés
      </p>
    </div>
  );
}
