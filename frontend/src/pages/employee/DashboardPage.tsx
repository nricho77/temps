import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { timesheetsAPI, periodesAPI } from '../../services/api';
import { StatCard, PageHeader, Card, StatusBadge, TypeBadge, Spinner, Button } from '../../components/common/UI';
import type { EntreeTemps, Periode } from '../../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function ClockIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function HoursIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>; }
function PendingIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function CheckIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function SuppIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>; }

export default function DashboardPage() {
  const { user, isAdmin, isManager } = useAuth();
  const [entries, setEntries] = useState<EntreeTemps[]>([]);
  const [periode, setPeriode] = useState<Periode | null>(null);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ents, periods] = await Promise.all([
          timesheetsAPI.list(),
          periodesAPI.list({ statut: 'ouverte' }),
        ]);
        setEntries(ents);
        if (periods.length > 0) setPeriode(periods[0]);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const periodEntries = periode
    ? entries.filter(e => e.periodeID === periode.periodeID)
    : entries.slice(0, 14);

  const stats = {
    ht: periodEntries.reduce((s, e) => s + (e.heuresTravaillees || 0), 0),
    hs: periodEntries.reduce((s, e) => s + (e.heuresSupplementaires || 0), 0),
    enAttente: periodEntries.filter(e => e.statut === 'soumis').length,
    approuves: periodEntries.filter(e => e.statut === 'approuve').length,
  };

  const todayEntry = entries.find(e => e.dateJournee?.toString().startsWith(today));
  const recentEntries = entries.slice(0, 8);

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${user?.prenom} 👋`}
        subtitle={`${format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}`}
        action={
          <Link to="/saisie">
            <Button variant="gold">
              <ClockIcon /> Saisir mes heures
            </Button>
          </Link>
        }
      />

      {/* Periode info */}
      {periode && (
        <div className="mb-6 bg-brand-dark rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-brand-goldLight text-xs font-medium uppercase tracking-wide mb-1">Période en cours</div>
            <div className="text-white font-semibold">{periode.nomPeriode}</div>
            <div className="text-white/60 text-sm mt-0.5">
              {format(parseISO(periode.dateDebut), 'd MMM', { locale: fr })} → {format(parseISO(periode.dateFin), 'd MMM yyyy', { locale: fr })}
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${periode.statut === 'ouverte' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            {periode.statut === 'ouverte' ? '● Ouverte' : '● Clôturée'}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Heures travaillées" value={`${stats.ht.toFixed(1)}h`} icon={<HoursIcon/>} color="blue" sub={periode ? 'cette période' : '14 derniers jours'} />
        <StatCard label="Heures supplémentaires" value={`${stats.hs.toFixed(1)}h`} icon={<SuppIcon/>} color="gold" />
        <StatCard label="En attente d'approbation" value={stats.enAttente} icon={<PendingIcon/>} color="orange" />
        <StatCard label="Entrées approuvées" value={stats.approuves} icon={<CheckIcon/>} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's entry */}
        <div className="lg:col-span-1">
          <Card>
            <h2 className="font-semibold text-brand-dark mb-4 flex items-center gap-2">
              <ClockIcon /> Aujourd'hui
            </h2>
            {todayEntry ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Statut</span>
                  <StatusBadge statut={todayEntry.statut} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Type</span>
                  <TypeBadge type={todayEntry.typeJournee} />
                </div>
                {todayEntry.heureArrivee && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Arrivée</span>
                    <span className="text-sm font-medium text-gray-800">{todayEntry.heureArrivee?.substring(0, 5)}</span>
                  </div>
                )}
                {todayEntry.heureDepart && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Départ</span>
                    <span className="text-sm font-medium text-gray-800">{todayEntry.heureDepart?.substring(0, 5)}</span>
                  </div>
                )}
                {todayEntry.heuresTravaillees > 0 && (
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-gray-500">Heures</span>
                    <span className="text-lg font-bold text-brand-dark">{todayEntry.heuresTravaillees.toFixed(2)}h</span>
                  </div>
                )}
                {todayEntry.statut === 'brouillon' && (
                  <Link to={`/mes-feuilles`}>
                    <Button variant="primary" size="sm" className="w-full mt-2">Modifier / Soumettre</Button>
                  </Link>
                )}
                {todayEntry.statut === 'refuse' && todayEntry.commentaireGestion && (
                  <div className="mt-3 p-3 bg-red-50 rounded-xl">
                    <p className="text-xs text-red-600 font-medium">Motif du refus :</p>
                    <p className="text-xs text-red-500 mt-1">{todayEntry.commentaireGestion}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-300 text-4xl mb-3">⏱</div>
                <p className="text-sm text-gray-400 mb-4">Aucune entrée pour aujourd'hui</p>
                <Link to="/saisie">
                  <Button variant="gold" size="sm">Commencer la saisie</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Recent entries */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-brand-dark">Entrées récentes</h2>
              <Link to="/mes-feuilles" className="text-xs text-brand-gold hover:text-brand-goldDark font-medium">Voir tout →</Link>
            </div>
            {recentEntries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune entrée enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {recentEntries.map(entry => (
                  <div key={entry.entreeID} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-dark/5 flex items-center justify-center text-xs font-bold text-brand-dark">
                        {entry.dateJournee ? format(parseISO(entry.dateJournee.toString()), 'dd', { locale: fr }) : '—'}
                        <br/>
                        <span className="text-brand-gold">{entry.dateJournee ? format(parseISO(entry.dateJournee.toString()), 'MMM', { locale: fr }) : ''}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {entry.dateJournee ? format(parseISO(entry.dateJournee.toString()), 'EEEE d MMMM', { locale: fr }) : ''}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                          <TypeBadge type={entry.typeJournee} />
                          {entry.nomSite && <span className="text-gray-400">{entry.nomSite}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-brand-dark">
                        {entry.heuresTravaillees > 0 ? `${entry.heuresTravaillees.toFixed(1)}h` : '—'}
                      </span>
                      <StatusBadge statut={entry.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
