import React, { useEffect, useState } from 'react';
import { periodesAPI, sitesAPI, reportsAPI } from '../../services/api';
import { PageHeader, Card, Button, FormField, Select, Spinner } from '../../components/common/UI';
import type { Periode, Site } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function RapportsPage() {
  const { user, isAdmin } = useAuth();
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [form, setForm] = useState({ periodeId: '', siteId: '', format: 'excel', type: 'sommaire' });

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([periodesAPI.list(), sitesAPI.list()]);
        setPeriodes(p);
        const allowedSites = isAdmin ? s : s.filter((site: Site) => user?.sites?.includes(site.siteID));
        setSites(allowedSites);
        if (p.length > 0) setForm(f => ({ ...f, periodeId: String(p[0].periodeID) }));
        if (allowedSites.length > 0) setForm(f => ({ ...f, siteId: allowedSites[0].siteID }));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleExport = async () => {
    if (!form.periodeId) return toast.error('Veuillez sélectionner une période.');
    setExporting(true);
    try {
      await reportsAPI.export({ periodeId: form.periodeId, siteId: form.siteId, format: form.format, type: form.type });
      toast.success('Rapport téléchargé !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'export.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Spinner size="lg" />;

  const selectedPeriode = periodes.find(p => String(p.periodeID) === form.periodeId);

  return (
    <div>
      <PageHeader title="Rapports et exports" subtitle="Générez des rapports pour les périodes de paie" />

      <div className="max-w-2xl space-y-6">
        {/* Rapport principal */}
        <Card>
          <h2 className="font-semibold text-brand-dark mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Rapport de période
          </h2>

          <div className="space-y-4">
            <FormField label="Période" required>
              <Select value={form.periodeId} onChange={e => setForm(f => ({ ...f, periodeId: e.target.value }))}>
                <option value="">— Sélectionner une période —</option>
                {periodes.map(p => (
                  <option key={p.periodeID} value={p.periodeID}>
                    {p.nomPeriode} {p.statut === 'cloturee' ? '(clôturée)' : '(ouverte)'}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Site">
              <Select value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}>
                {isAdmin && <option value="">Tous les sites</option>}
                {sites.map(s => <option key={s.siteID} value={s.siteID}>{s.nomSite}</option>)}
              </Select>
            </FormField>

            <FormField label="Format d'export">
              <div className="flex gap-3">
                {[
                  { value: 'excel', label: '📊 Excel (.xlsx)', desc: 'Sommaire + onglet par employé' },
                  { value: 'csv',   label: '📄 CSV (.csv)',   desc: 'Tableau simple, importable' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(f => ({ ...f, format: opt.value }))}
                    className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                      form.format === opt.value
                        ? 'border-brand-gold bg-brand-gold/10 ring-2 ring-brand-gold/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </FormField>

            {/* Aperçu de ce qui sera exporté */}
            {selectedPeriode && (
              <div className="bg-brand-dark/5 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-brand-dark mb-2">Ce rapport contiendra :</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Onglet Sommaire — tous les employés avec totaux</li>
                  <li>✓ Un onglet par employé — détail journalier complet</li>
                  <li>✓ Période : <strong>{selectedPeriode.nomPeriode}</strong></li>
                  <li>✓ Seulement les entrées <strong>approuvées</strong></li>
                  {form.siteId && <li>✓ Site : <strong>{sites.find(s => s.siteID === form.siteId)?.nomSite}</strong></li>}
                </ul>
              </div>
            )}

            <Button variant="gold" className="w-full" loading={exporting} onClick={handleExport}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Télécharger le rapport
            </Button>
          </div>
        </Card>

        {/* Autres types de rapports */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: '📅', title: 'Rapport mensuel', desc: 'Vue calendrier par mois et par employé', disabled: false },
            { icon: '⏰', title: 'Heures supplémentaires', desc: 'Suivi des heures supp. par période', disabled: false },
            { icon: '🏖', title: 'Absences', desc: 'Maladie, vacances, formation par employé', disabled: false },
            { icon: '🏢', title: 'Comparatif sites', desc: 'Total des heures par site', disabled: false },
          ].map((r, i) => (
            <Card key={i} className="!p-4 cursor-pointer hover:shadow-card-lg transition-shadow">
              <div className="text-2xl mb-2">{r.icon}</div>
              <div className="font-semibold text-gray-800 text-sm">{r.title}</div>
              <div className="text-xs text-gray-400 mt-1">{r.desc}</div>
              <div className="mt-3">
                <span className="text-xs text-brand-gold font-medium">Prochainement →</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
