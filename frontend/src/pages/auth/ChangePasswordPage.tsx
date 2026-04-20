import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const isMustChange = user?.mustChangePwd;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nouveau !== confirm) return toast.error('Les mots de passe ne correspondent pas.');
    if (nouveau.length < 8) return toast.error('Le mot de passe doit contenir au moins 8 caractères.');
    setLoading(true);
    try {
      await changePassword(ancien, nouveau);
      toast.success('Mot de passe modifié avec succès !');
      navigate('/tableau-de-bord');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du changement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-darker via-brand-dark to-brand-light flex flex-col justify-center items-center px-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold shadow-lg mb-4">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {isMustChange ? 'Définir votre mot de passe' : 'Changer le mot de passe'}
        </h1>
        {isMustChange && (
          <p className="text-brand-goldLight text-sm mt-2 max-w-xs mx-auto">
            Pour des raisons de sécurité, veuillez définir un nouveau mot de passe avant de continuer.
          </p>
        )}
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-card-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel (temporaire)</label>
            <input type="password" value={ancien} onChange={e => setAncien(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input type="password" value={nouveau} onChange={e => setNouveau(e.target.value)} required minLength={8}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold text-sm" />
            <p className="text-xs text-gray-400 mt-1">Minimum 8 caractères</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-gold text-sm ${confirm && confirm !== nouveau ? 'border-red-400' : 'border-gray-200'}`} />
            {confirm && confirm !== nouveau && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>}
          </div>
          <button type="submit" disabled={loading || (!!confirm && confirm !== nouveau)}
            className="w-full py-3 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-light transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
            {loading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
            {loading ? 'Modification...' : 'Confirmer'}
          </button>
        </form>
      </div>
    </div>
  );
}
