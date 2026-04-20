import React, { useEffect, useState } from 'react';
import { timesheetsAPI, periodesAPI, employeesAPI } from '../../services/api';
import { PageHeader, Card, StatusBadge, TypeBadge, Button, Table, Tr, Td, Spinner, Select, Input, EmptyState } from '../../components/common/UI';
import type { EntreeTemps, Periode } from '../../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AllEntriesPage() {
  const [entries, setEntries] = useState<EntreeTemps[]>([]);
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ periodeId: '', statut: '', siteId: '', search: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [e, p] = await Promise.all([timesheetsAPI.list(), periodesAPI.list()]);
        setEntries(e);
        setPeriodes(p);
        if (p.length > 0) setFilters(f => ({ ...f, periodeId: String(p[0].periodeID) }));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const sites = [...new Set(entries.map(e => e.siteID))];

  const filtered = entries.filter(e => {
    if (filters.periodeId && String(e.periodeID) !== filters.periodeId) return false;
    if (filters.statut && e.statut !== filters.statut) return false;
    if (filters.siteId && e.siteID !== filters.siteId) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!(`${e.nom} ${e.prenom} ${e.email}`).toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const totals = {
    ht: filtered.reduce((s, e) => s + (e.heuresTravaillees || 0), 0),
    hs: filtered.reduce((s, e) => s + (e.heuresSupplementaires || 0), 0),
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <PageHeader title="Toutes les entrées" subtitle={`${filtered.length} entrée(s) — ${totals.ht.toFixed(1)}h travaillées`} />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Input placeholder="Rechercher un employé..." value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="w-52" />
        <Select value={filters.periodeId} onChange={e => setFilters(f => ({ ...f, periodeId: e.target.value }))} className="w-52">
          <option value="">Toutes les périodes</option>
          {periodes.map(p => <option key={p.periodeID} value={p.periodeID}>{p.nomPeriode}</option>)}
        </Select>
        <Select value={filters.statut} onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))} className="w-44">
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="soumis">Soumis</option>
          <option value="approuve">Approuvé</option>
          <option value="refuse">Refusé</option>
        </Select>
        <Select value={filters.siteId} onChange={e => setFilters(f => ({ ...f, siteId: e.target.value }))} className="w-40">
          <option value="">Tous les sites</option>
          {sites.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card className="!p-3 text-center">
          <div className="text-xl font-bold text-brand-dark">{totals.ht.toFixed(1)}h</div>
          <div className="text-xs text-gray-500">Heures travaillées</div>
        </Card>
        <Card className="!p-3 text-center">
          <div className="text-xl font-bold text-brand-gold">{totals.hs.toFixed(1)}h</div>
          <div className="text-xs text-gray-500">Heures supp.</div>
        </Card>
        <Card className="!p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{filtered.filter(e => e.statut === 'soumis').length}</div>
          <div className="text-xs text-gray-500">En attente</div>
        </Card>
        <Card className="!p-3 text-center">
          <div className="text-xl font-bold text-emerald-600">{filtered.filter(e => e.statut === 'approuve').length}</div>
          <div className="text-xs text-gray-500">Approuvées</div>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState title="Aucune entrée trouvée" subtitle="Modifiez vos filtres pour afficher des résultats." /></Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <Table headers={['Employé', 'Site', 'Date', 'Type', 'Arrivée', 'Départ', 'Heures', 'Supp.', 'Statut', 'Période']}>
            {filtered.map(entry => {
              const dateStr = entry.dateJournee?.toString();
              const date = dateStr ? parseISO(dateStr) : null;
              return (
                <Tr key={entry.entreeID}>
                  <Td>
                    <div className="font-medium text-gray-900 text-sm">{entry.nom}, {entry.prenom}</div>
                    {entry.numeroEmploye && <div className="text-xs text-gray-400">#{entry.numeroEmploye}</div>}
                  </Td>
                  <Td><span className="text-xs bg-brand-dark/10 text-brand-dark px-2 py-0.5 rounded-lg font-bold">{entry.siteID}</span></Td>
                  <Td>
                    <div className="text-sm font-medium">{date ? format(date, 'dd MMM yyyy', { locale: fr }) : '—'}</div>
                    <div className="text-xs text-gray-400">{date ? format(date, 'EEE', { locale: fr }) : ''}</div>
                  </Td>
                  <Td><TypeBadge type={entry.typeJournee} /></Td>
                  <Td className="text-gray-600">{entry.heureArrivee?.substring(0, 5) || '—'}</Td>
                  <Td className="text-gray-600">{entry.heureDepart?.substring(0, 5) || '—'}</Td>
                  <Td><span className="font-bold text-brand-dark">{entry.heuresTravaillees > 0 ? `${entry.heuresTravaillees.toFixed(2)}h` : '—'}</span></Td>
                  <Td>{entry.heuresSupplementaires > 0 ? <span className="text-brand-gold font-semibold">+{entry.heuresSupplementaires.toFixed(2)}h</span> : '—'}</Td>
                  <Td>
                    <StatusBadge statut={entry.statut} />
                    {entry.statut === 'approuve' && entry.approbPrenom && (
                      <div className="text-xs text-gray-400 mt-0.5">{entry.approbPrenom} {entry.approbNom}</div>
                    )}
                  </Td>
                  <Td><span className="text-xs text-gray-400">{entry.nomPeriode || '—'}</span></Td>
                </Tr>
              );
            })}
          </Table>
        </Card>
      )}
    </div>
  );
}
