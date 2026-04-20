import React, { useEffect, useState } from 'react';
import { timesheetsAPI, periodesAPI, sitesAPI, employeesAPI } from '../../services/api';
import { PageHeader, Card, StatCard, Spinner, Select } from '../../components/common/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { EntreeTemps, Periode, Site } from '../../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#0D1B4B', '#C9A84C', '#10b981', '#ef4444', '#8b5cf6', '#f97316'];

function HoursIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function UsersIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>; }
function PendingIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function SuppIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>; }

export default function StatistiquesPage() {
  const [entries, setEntries] = useState<EntreeTemps[]>([]);
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [selectedPeriode, setSelectedPeriode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [e, p, s, emp] = await Promise.all([
          timesheetsAPI.list(),
          periodesAPI.list(),
          sitesAPI.list(),
          employeesAPI.list(),
        ]);
        setEntries(e);
        setPeriodes(p);
        setSites(s);
        setEmployes(emp);
        if (p.length > 0) setSelectedPeriode(String(p[0].periodeID));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const filtered = selectedPeriode ? entries.filter(e => String(e.periodeID) === selectedPeriode) : entries;

  // Statistiques globales
  const stats = {
    totalHT:  filtered.reduce((s, e) => s + (e.heuresTravaillees || 0), 0),
    totalHS:  filtered.reduce((s, e) => s + (e.heuresSupplementaires || 0), 0),
    enAttente: filtered.filter(e => e.statut === 'soumis').length,
    nbEmployes: [...new Set(filtered.map(e => e.utilisateurID))].length,
  };

  // Heures par site
  const bySite = sites.map(site => ({
    name: site.siteID,
    heures: filtered.filter(e => e.siteID === site.siteID).reduce((s, e) => s + (e.heuresTravaillees || 0), 0),
    supp: filtered.filter(e => e.siteID === site.siteID).reduce((s, e) => s + (e.heuresSupplementaires || 0), 0),
  })).filter(s => s.heures > 0);

  // Répartition types journée
  const byType = [
    { name: 'Régulier',  value: filtered.filter(e => e.typeJournee === 'regulier').length },
    { name: 'Maladie',   value: filtered.filter(e => e.typeJournee === 'maladie').length },
    { name: 'Vacances',  value: filtered.filter(e => e.typeJournee === 'vacance').length },
    { name: 'Férié',     value: filtered.filter(e => e.typeJournee === 'ferie').length },
    { name: 'Formation', value: filtered.filter(e => e.typeJournee === 'formation').length },
    { name: 'Week-end',  value: filtered.filter(e => e.typeJournee === 'weekend').length },
  ].filter(t => t.value > 0);

  // Top 10 employés par heures
  const byEmployee = Object.values(
    filtered.reduce((acc: any, e) => {
      const key = e.utilisateurID;
      if (!acc[key]) acc[key] = { name: `${e.nom}, ${e.prenom}`, heures: 0, supp: 0 };
      acc[key].heures += e.heuresTravaillees || 0;
      acc[key].supp += e.heuresSupplementaires || 0;
      return acc;
    }, {})
  ).sort((a: any, b: any) => b.heures - a.heures).slice(0, 10);

  // Répartition statuts
  const statutData = [
    { name: 'Approuvés',  value: filtered.filter(e => e.statut === 'approuve').length,  color: '#10b981' },
    { name: 'Soumis',     value: filtered.filter(e => e.statut === 'soumis').length,    color: '#3b82f6' },
    { name: 'Brouillons', value: filtered.filter(e => e.statut === 'brouillon').length, color: '#9ca3af' },
    { name: 'Refusés',    value: filtered.filter(e => e.statut === 'refuse').length,    color: '#ef4444' },
  ].filter(s => s.value > 0);

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <PageHeader title="Statistiques globales" subtitle="Vue d'ensemble de toutes les garderies" />

      {/* Filtre période */}
      <div className="flex gap-3 mb-6">
        <div className="w-72">
          <Select value={selectedPeriode} onChange={e => setSelectedPeriode(e.target.value)}>
            <option value="">Toutes les périodes</option>
            {periodes.map(p => <option key={p.periodeID} value={p.periodeID}>{p.nomPeriode}</option>)}
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Heures travaillées" value={`${stats.totalHT.toFixed(0)}h`} icon={<HoursIcon/>} color="blue" />
        <StatCard label="Heures supplémentaires" value={`${stats.totalHS.toFixed(0)}h`} icon={<SuppIcon/>} color="gold" />
        <StatCard label="En attente d'approbation" value={stats.enAttente} icon={<PendingIcon/>} color="orange" />
        <StatCard label="Employés actifs" value={`${stats.nbEmployes} / ${employes.filter(e => e.actif).length}`} icon={<UsersIcon/>} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Heures par site */}
        <Card>
          <h3 className="font-semibold text-brand-dark mb-4">Heures par site</h3>
          {bySite.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bySite} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`]} />
                <Bar dataKey="heures" fill="#0D1B4B" radius={[6, 6, 0, 0]} name="Heures" />
                <Bar dataKey="supp" fill="#C9A84C" radius={[6, 6, 0, 0]} name="Supp." />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Répartition statuts */}
        <Card>
          <h3 className="font-semibold text-brand-dark mb-4">Répartition des statuts</h3>
          {statutData.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {statutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number, name) => [v, name]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top employés */}
        <Card>
          <h3 className="font-semibold text-brand-dark mb-4">Top employés (heures)</h3>
          {byEmployee.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p> : (
            <div className="space-y-2">
              {byEmployee.map((emp: any, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">{emp.name}</span>
                      <span className="text-sm font-bold text-brand-dark ml-2">{emp.heures.toFixed(1)}h</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-dark rounded-full transition-all"
                        style={{ width: `${Math.min(100, (emp.heures / (byEmployee[0] as any).heures) * 100)}%` }} />
                    </div>
                  </div>
                  {emp.supp > 0 && (
                    <span className="text-xs text-brand-gold font-semibold">+{emp.supp.toFixed(1)}h</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Types journées */}
        <Card>
          <h3 className="font-semibold text-brand-dark mb-4">Types de journées</h3>
          {byType.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byType} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
