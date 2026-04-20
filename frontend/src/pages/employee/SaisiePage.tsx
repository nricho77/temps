import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { timesheetsAPI, periodesAPI, sitesAPI } from '../../services/api';
import { PageHeader, Card, Button, FormField, Input, Select, Spinner } from '../../components/common/UI';
import type { Periode, Site } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_OPTIONS = [
  { value: 'regulier',  label: '☀️  Journée régulière' },
  { value: 'ferie',     label: '🏳️  Jour férié' },
  { value: 'weekend',   label: '🌙  Week-end' },
  { value: 'maladie',   label: '🤒  Maladie' },
  { value: 'vacance',   label: '🏖️  Vacances' },
  { value: 'formation', label: '📚  Formation (RAC)' },
];

function calculateHours(arrivee: string, depart: string, pauseMin: number, pausePayee: boolean): { ht: number; hs: number } {
  if (!arrivee || !depart) return { ht: 0, hs: 0 };
  const [ha, ma] = arrivee.split(':').map(Number);
  const [hd, md] = depart.split(':').map(Number);
  const totalMin = (hd * 60 + md) - (ha * 60 + ma);
  if (totalMin <= 0) return { ht: 0, hs: 0 };
  const deduire = pausePayee ? 0 : pauseMin;
  const ht = Math.max(0, (totalMin - deduire) / 60);
  const hs = Math.max(0, ht - 8);
  return { ht: Math.round(ht * 100) / 100, hs: Math.round(hs * 100) / 100 };
}

export default function SaisiePage() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    dateJournee: today,
    siteID: user?.sites?.[0] || '',
    periodeID: '',
    typeJournee: 'regulier',
    heureArrivee: '',
    heureDepart: '',
    pausePayee: false,
    pauseMinutes: 0,
    ajustementBanqueTemps: 0,
    retraitBanqueMaladie: 0,
    heuresVacancesPrises: 0,
    formation: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([periodesAPI.list({ statut: 'ouverte' }), sitesAPI.list()]);
        setPeriodes(p);
        // Filtrer sites autorisés pour l'utilisateur
        const allowed = s.filter((site: Site) => user?.sites?.includes(site.siteID) || user?.role === 'admin');
        setSites(allowed);
        if (p.length > 0) setForm(f => ({ ...f, periodeID: String(p[0].periodeID) }));
        if (allowed.length > 0 && !form.siteID) setForm(f => ({ ...f, siteID: allowed[0].siteID }));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const { ht, hs } = calculateHours(form.heureArrivee, form.heureDepart, form.pauseMinutes, form.pausePayee);
  const needsHours = !['maladie', 'vacance'].includes(form.typeJournee);

  const handleSubmit = async (e: React.FormEvent, submitAfter = false) => {
    e.preventDefault();
    if (needsHours && form.heureArrivee && form.heureDepart && ht <= 0)
      return toast.error("L'heure de départ doit être après l'heure d'arrivée.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        periodeID: form.periodeID ? parseInt(form.periodeID) : null,
        pauseMinutes: Number(form.pauseMinutes),
        ajustementBanqueTemps: Number(form.ajustementBanqueTemps),
        retraitBanqueMaladie: Number(form.retraitBanqueMaladie),
        heuresVacancesPrises: Number(form.heuresVacancesPrises),
        heureArrivee: needsHours ? form.heureArrivee || null : null,
        heureDepart: needsHours ? form.heureDepart || null : null,
      };
      const result = await timesheetsAPI.create(payload);

      if (submitAfter) {
        await timesheetsAPI.submit(result.id);
        toast.success('Entrée créée et soumise pour approbation !');
      } else {
        toast.success('Entrée enregistrée en brouillon.');
      }

      // Reset form to today blank
      setForm(f => ({
        ...f,
        heureArrivee: '', heureDepart: '', pausePayee: false, pauseMinutes: 0,
        ajustementBanqueTemps: 0, retraitBanqueMaladie: 0, heuresVacancesPrises: 0, formation: false,
        typeJournee: 'regulier',
      }));
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <PageHeader
        title="Saisie des heures"
        subtitle={format(new Date(form.dateJournee), "EEEE d MMMM yyyy", { locale: fr })}
      />

      <div className="max-w-2xl">
        <form onSubmit={e => handleSubmit(e, false)}>
          <Card className="space-y-5">
            {/* Date et Site */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Date" required>
                <Input type="date" value={form.dateJournee} max={today}
                  onChange={e => setForm(f => ({ ...f, dateJournee: e.target.value }))} />
              </FormField>
              <FormField label="Site" required>
                <Select value={form.siteID} onChange={e => setForm(f => ({ ...f, siteID: e.target.value }))}>
                  {sites.map(s => <option key={s.siteID} value={s.siteID}>{s.nomSite}</option>)}
                </Select>
              </FormField>
            </div>

            {/* Période */}
            {periodes.length > 0 && (
              <FormField label="Période de paie">
                <Select value={form.periodeID} onChange={e => setForm(f => ({ ...f, periodeID: e.target.value }))}>
                  <option value="">— Aucune période —</option>
                  {periodes.map(p => (
                    <option key={p.periodeID} value={p.periodeID}>{p.nomPeriode} ({p.dateDebut} → {p.dateFin})</option>
                  ))}
                </Select>
              </FormField>
            )}

            {/* Type de journée */}
            <FormField label="Type de journée" required>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TYPE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(f => ({ ...f, typeJournee: opt.value }))}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      form.typeJournee === opt.value
                        ? 'border-brand-gold bg-brand-gold/10 text-brand-dark ring-2 ring-brand-gold/30'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </FormField>

            {/* Heures (si pas maladie/vacances) */}
            {needsHours && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Heure d'arrivée">
                    <Input type="time" value={form.heureArrivee}
                      onChange={e => setForm(f => ({ ...f, heureArrivee: e.target.value }))} />
                  </FormField>
                  <FormField label="Heure de départ">
                    <Input type="time" value={form.heureDepart}
                      onChange={e => setForm(f => ({ ...f, heureDepart: e.target.value }))} />
                  </FormField>
                </div>

                {/* Pause */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Pause</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Durée (minutes)">
                      <Input type="number" min="0" max="120" value={form.pauseMinutes}
                        onChange={e => setForm(f => ({ ...f, pauseMinutes: parseInt(e.target.value) || 0 }))} />
                    </FormField>
                    <FormField label="Pause payée ?">
                      <div className="flex gap-2 mt-1">
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, pausePayee: true }))}
                          className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${form.pausePayee ? 'bg-brand-gold text-white border-brand-gold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          Oui
                        </button>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, pausePayee: false }))}
                          className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${!form.pausePayee ? 'bg-brand-dark text-white border-brand-dark' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          Non
                        </button>
                      </div>
                    </FormField>
                  </div>
                </div>

                {/* Calcul temps réel */}
                {form.heureArrivee && form.heureDepart && ht > 0 && (
                  <div className="bg-brand-dark rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-white/70 text-xs">Heures travaillées</div>
                      <div className="text-white text-2xl font-bold">{ht.toFixed(2)}h</div>
                    </div>
                    {hs > 0 && (
                      <div className="text-right">
                        <div className="text-brand-goldLight text-xs">dont heures supp.</div>
                        <div className="text-brand-gold text-xl font-bold">+{hs.toFixed(2)}h</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Champs absence */}
            {form.typeJournee === 'maladie' && (
              <FormField label="Retrait banque de maladie (heures)" hint="Heures prises dans la banque de maladie">
                <Input type="number" min="0" step="0.5" value={form.retraitBanqueMaladie}
                  onChange={e => setForm(f => ({ ...f, retraitBanqueMaladie: parseFloat(e.target.value) || 0 }))} />
              </FormField>
            )}
            {form.typeJournee === 'vacance' && (
              <FormField label="Heures de vacances prises">
                <Input type="number" min="0" step="0.5" value={form.heuresVacancesPrises}
                  onChange={e => setForm(f => ({ ...f, heuresVacancesPrises: parseFloat(e.target.value) || 0 }))} />
              </FormField>
            )}
            {form.typeJournee === 'formation' && (
              <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-xl">
                <input type="checkbox" id="formation" checked={form.formation}
                  onChange={e => setForm(f => ({ ...f, formation: e.target.checked }))}
                  className="w-4 h-4 accent-purple-600" />
                <label htmlFor="formation" className="text-sm text-purple-700 font-medium cursor-pointer">Formation RAC confirmée</label>
              </div>
            )}

            {/* Ajustement banque de temps */}
            <FormField label="Ajustement banque de temps (heures)" hint="Valeur négative = ajout, positive = retrait">
              <Input type="number" step="0.5" value={form.ajustementBanqueTemps}
                onChange={e => setForm(f => ({ ...f, ajustementBanqueTemps: parseFloat(e.target.value) || 0 }))} />
            </FormField>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" variant="secondary" loading={saving} className="flex-1">
                Enregistrer (brouillon)
              </Button>
              <Button type="button" variant="gold" loading={saving} className="flex-1"
                onClick={e => handleSubmit(e as any, true)}>
                Enregistrer et soumettre
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
