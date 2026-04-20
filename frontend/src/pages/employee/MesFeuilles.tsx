import React, { useEffect, useState } from 'react';
import { timesheetsAPI, periodesAPI } from '../../services/api';
import { PageHeader, Card, StatusBadge, TypeBadge, Button, Select, Table, Tr, Td, Spinner, Modal, FormField, Textarea, EmptyState } from '../../components/common/UI';
import type { EntreeTemps, Periode } from '../../types';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function MesFeuilles() {
  const [entries, setEntries] = useState<EntreeTemps[]>([]);
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [selectedPeriode, setSelectedPeriode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ents, pers] = await Promise.all([timesheetsAPI.list(), periodesAPI.list()]);
      setEntries(ents);
      setPeriodes(pers);
      if (pers.length > 0 && !selectedPeriode) setSelectedPeriode(String(pers[0].periodeID));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = selectedPeriode
    ? entries.filter(e => String(e.periodeID) === selectedPeriode)
    : entries;

  const handleSubmit = async (id: number) => {
    setSubmitLoading(id);
    try {
      await timesheetsAPI.submit(id);
      toast.success('Entrée soumise pour approbation.');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitLoading(null); }
  };

  const totals = {
    ht: filtered.reduce((s, e) => s + (e.heuresTravaillees || 0), 0),
    hs: filtered.reduce((s, e) => s + (e.heuresSupplementaires || 0), 0),
    vac: filtered.reduce((s, e) => s + (e.heuresVacancesPrises || 0), 0),
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <PageHeader title="Mes feuilles de temps" subtitle="Historique de toutes vos entrées" />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-64">
          <Select value={selectedPeriode} onChange={e => setSelectedPeriode(e.target.value)}>
            <option value="">Toutes les périodes</option>
            {periodes.map(p => <option key={p.periodeID} value={p.periodeID}>{p.nomPeriode}</option>)}
          </Select>
        </div>
      </div>

      {/* Totaux période */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card className="!p-4 text-center">
            <div className="text-2xl font-bold text-brand-dark">{totals.ht.toFixed(1)}h</div>
            <div className="text-xs text-gray-500">Heures travaillées</div>
          </Card>
          <Card className="!p-4 text-center">
            <div className="text-2xl font-bold text-brand-gold">{totals.hs.toFixed(1)}h</div>
            <div className="text-xs text-gray-500">Heures supp.</div>
          </Card>
          <Card className="!p-4 text-center">
            <div className="text-2xl font-bold text-sky-600">{totals.vac.toFixed(1)}h</div>
            <div className="text-xs text-gray-500">Vacances</div>
          </Card>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
            title="Aucune entrée"
            subtitle="Vous n'avez pas encore de feuilles de temps pour cette période."
          />
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <Table headers={['Date', 'Jour', 'Site', 'Type', 'Arrivée', 'Départ', 'Heures', 'Supp.', 'Statut', 'Actions']}>
            {filtered.map(entry => {
              const dateStr = entry.dateJournee?.toString();
              const date = dateStr ? parseISO(dateStr) : null;
              return (
                <Tr key={entry.entreeID}>
                  <Td><span className="font-medium">{date ? format(date, 'dd MMM yyyy', { locale: fr }) : '—'}</span></Td>
                  <Td className="text-gray-500 text-xs">{date ? format(date, 'EEEE', { locale: fr }) : ''}</Td>
                  <Td><span className="text-xs bg-brand-dark/10 text-brand-dark px-2 py-0.5 rounded-lg font-medium">{entry.siteID}</span></Td>
                  <Td><TypeBadge type={entry.typeJournee} /></Td>
                  <Td>{entry.heureArrivee?.substring(0, 5) || '—'}</Td>
                  <Td>{entry.heureDepart?.substring(0, 5) || '—'}</Td>
                  <Td><span className="font-semibold text-brand-dark">{entry.heuresTravaillees > 0 ? `${entry.heuresTravaillees.toFixed(2)}h` : '—'}</span></Td>
                  <Td>{entry.heuresSupplementaires > 0 ? <span className="text-brand-gold font-semibold">+{entry.heuresSupplementaires.toFixed(2)}h</span> : '—'}</Td>
                  <Td>
                    <div>
                      <StatusBadge statut={entry.statut} />
                      {entry.statut === 'refuse' && entry.commentaireGestion && (
                        <p className="text-xs text-red-500 mt-1 max-w-[180px] truncate" title={entry.commentaireGestion}>
                          ↳ {entry.commentaireGestion}
                        </p>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {(entry.statut === 'brouillon' || entry.statut === 'refuse') && (
                      <Button size="sm" variant="gold" loading={submitLoading === entry.entreeID}
                        onClick={() => handleSubmit(entry.entreeID)}>
                        Soumettre
                      </Button>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Table>
        </Card>
      )}
    </div>
  );
}
