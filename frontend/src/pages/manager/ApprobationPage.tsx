import React, { useEffect, useState } from 'react';
import { timesheetsAPI } from '../../services/api';
import { PageHeader, Card, StatusBadge, TypeBadge, Button, Table, Tr, Td, Spinner, Modal, FormField, Textarea, EmptyState, Select } from '../../components/common/UI';
import type { EntreeTemps } from '../../types';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ApprobationPage() {
  const [entries, setEntries] = useState<EntreeTemps[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [refusModal, setRefusModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [commentaire, setCommentaire] = useState('');
  const [filterSite, setFilterSite] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await timesheetsAPI.list({ statut: 'soumis' });
      setEntries(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sites = [...new Set(entries.map(e => e.siteID))];
  const filtered = filterSite ? entries.filter(e => e.siteID === filterSite) : entries;

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await timesheetsAPI.approve(id, 'approuve');
      toast.success('Entrée approuvée !');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  const handleRefuse = async () => {
    if (!refusModal.id) return;
    if (!commentaire.trim()) return toast.error('Le commentaire est obligatoire pour un refus.');
    setActionLoading(refusModal.id);
    try {
      await timesheetsAPI.approve(refusModal.id, 'refuse', commentaire);
      toast.success('Entrée refusée.');
      setRefusModal({ open: false, id: null });
      setCommentaire('');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  const handleApproveAll = async () => {
    const toApprove = filtered.map(e => e.entreeID);
    if (!toApprove.length) return;
    setActionLoading(-1);
    try {
      await Promise.all(toApprove.map(id => timesheetsAPI.approve(id, 'approuve')));
      toast.success(`${toApprove.length} entrées approuvées !`);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <PageHeader
        title="Approbation des heures"
        subtitle={`${filtered.length} entrée(s) en attente d'approbation`}
        action={
          filtered.length > 0 ? (
            <Button variant="gold" loading={actionLoading === -1} onClick={handleApproveAll}>
              ✓ Tout approuver ({filtered.length})
            </Button>
          ) : undefined
        }
      />

      {/* Filtres */}
      {sites.length > 1 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="w-52">
            <Select value={filterSite} onChange={e => setFilterSite(e.target.value)}>
              <option value="">Tous les sites</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<svg className="w-16 h-16 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            title="Aucune entrée en attente"
            subtitle="Toutes les feuilles de temps ont été traitées. Revenez plus tard !"
          />
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <Table headers={['Employé', 'Matricule', 'Site', 'Date', 'Type', 'Arrivée', 'Départ', 'Heures', 'Supp.', 'Actions']}>
            {filtered.map(entry => {
              const dateStr = entry.dateJournee?.toString();
              const date = dateStr ? parseISO(dateStr) : null;
              return (
                <Tr key={entry.entreeID}>
                  <Td>
                    <div className="font-medium text-gray-900">{entry.nom}, {entry.prenom}</div>
                    <div className="text-xs text-gray-400">{entry.nomSite}</div>
                  </Td>
                  <Td><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">#{entry.numeroEmploye}</span></Td>
                  <Td><span className="text-xs bg-brand-dark/10 text-brand-dark px-2 py-0.5 rounded-lg font-medium">{entry.siteID}</span></Td>
                  <Td>
                    <div className="font-medium">{date ? format(date, 'dd MMM yyyy', { locale: fr }) : '—'}</div>
                    <div className="text-xs text-gray-400">{date ? format(date, 'EEEE', { locale: fr }) : ''}</div>
                  </Td>
                  <Td><TypeBadge type={entry.typeJournee} /></Td>
                  <Td>{entry.heureArrivee?.substring(0, 5) || '—'}</Td>
                  <Td>{entry.heureDepart?.substring(0, 5) || '—'}</Td>
                  <Td>
                    <span className="font-bold text-brand-dark text-base">
                      {entry.heuresTravaillees > 0 ? `${entry.heuresTravaillees.toFixed(2)}h` : '—'}
                    </span>
                    {entry.pauseMinutes > 0 && (
                      <div className="text-xs text-gray-400">Pause: {entry.pauseMinutes}min {entry.pausePayee ? '(payée)' : ''}</div>
                    )}
                  </Td>
                  <Td>
                    {entry.heuresSupplementaires > 0
                      ? <span className="text-brand-gold font-semibold">+{entry.heuresSupplementaires.toFixed(2)}h</span>
                      : '—'}
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="gold"
                        loading={actionLoading === entry.entreeID}
                        onClick={() => handleApprove(entry.entreeID)}>
                        ✓ Approuver
                      </Button>
                      <Button size="sm" variant="danger"
                        onClick={() => { setRefusModal({ open: true, id: entry.entreeID }); setCommentaire(''); }}>
                        ✗ Refuser
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        </Card>
      )}

      {/* Modal refus */}
      <Modal open={refusModal.open} onClose={() => setRefusModal({ open: false, id: null })} title="Motif du refus">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Veuillez indiquer la raison du refus. L'employé sera notifié et pourra corriger son entrée.</p>
          <FormField label="Commentaire" required>
            <Textarea rows={4} value={commentaire} onChange={e => setCommentaire(e.target.value)}
              placeholder="Ex: Heures incorrectes, veuillez vérifier..." />
          </FormField>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setRefusModal({ open: false, id: null })}>Annuler</Button>
            <Button variant="danger" className="flex-1" loading={!!actionLoading} onClick={handleRefuse}>Confirmer le refus</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
