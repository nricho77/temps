import React, { useEffect, useState } from 'react';
import { periodesAPI, sitesAPI } from '../../services/api';
import { PageHeader, Card, Button, Table, Tr, Td, Spinner, Modal, FormField, Input, Select, EmptyState } from '../../components/common/UI';
import type { Periode, Site } from '../../types';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PeriodesPage() {
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState<number | null>(null);
  const [form, setForm] = useState({ nomPeriode: '', dateDebut: '', dateFin: '', siteId: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([periodesAPI.list(), sitesAPI.list()]);
      setPeriodes(p);
      setSites(s);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-générer le nom de la période
  useEffect(() => {
    if (form.dateDebut && form.dateFin) {
      const debut = parseISO(form.dateDebut);
      const fin = parseISO(form.dateFin);
      const nom = `Paie ${format(debut, 'd MMM', { locale: fr })} - ${format(fin, 'd MMM yyyy', { locale: fr })}`;
      setForm(f => ({ ...f, nomPeriode: nom }));
    }
  }, [form.dateDebut, form.dateFin]);

  const handleCreate = async () => {
    if (!form.nomPeriode || !form.dateDebut || !form.dateFin) return toast.error('Tous les champs sont requis.');
    setSaving(true);
    try {
      await periodesAPI.create(form);
      toast.success('Période créée !');
      setModal(false);
      setForm({ nomPeriode: '', dateDebut: '', dateFin: '', siteId: '' });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleClose = async (id: number) => {
    if (!confirm('Clôturer cette période ? Aucune modification ne sera possible après.')) return;
    setClosing(id);
    try {
      await periodesAPI.close(id);
      toast.success('Période clôturée.');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setClosing(null); }
  };

  // Générer rapidement les 2 périodes du mois courant
  const genererPeriodesMois = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const p1debut = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const p1fin = `${y}-${String(m + 1).padStart(2, '0')}-14`;
    const p2debut = `${y}-${String(m + 1).padStart(2, '0')}-15`;
    const p2fin = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
    setForm(f => ({ ...f, dateDebut: p1debut, dateFin: p1fin }));
    setModal(true);
  };

  if (loading) return <Spinner size="lg" />;

  const ouvertes = periodes.filter(p => p.statut === 'ouverte');
  const cloturees = periodes.filter(p => p.statut === 'cloturee');

  return (
    <div>
      <PageHeader title="Gestion des périodes" subtitle="Définissez et gérez les périodes de paie"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={genererPeriodesMois}>Générer mois courant</Button>
            <Button variant="gold" onClick={() => setModal(true)}>+ Nouvelle période</Button>
          </div>
        }
      />

      {/* Périodes ouvertes */}
      <h2 className="text-base font-semibold text-brand-dark mb-3">Périodes ouvertes ({ouvertes.length})</h2>
      {ouvertes.length === 0 ? (
        <Card className="mb-6">
          <EmptyState title="Aucune période ouverte" subtitle="Créez une période pour permettre la saisie des heures." />
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden mb-6">
          <Table headers={['Nom de la période', 'Site', 'Début', 'Fin', 'Statut', 'Actions']}>
            {ouvertes.map(p => (
              <Tr key={p.periodeID}>
                <Td><span className="font-medium text-gray-900">{p.nomPeriode}</span></Td>
                <Td><span className="text-xs text-gray-500">{p.siteID || 'Tous les sites'}</span></Td>
                <Td>{format(parseISO(p.dateDebut), 'd MMM yyyy', { locale: fr })}</Td>
                <Td>{format(parseISO(p.dateFin), 'd MMM yyyy', { locale: fr })}</Td>
                <Td><span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">● Ouverte</span></Td>
                <Td>
                  <Button size="sm" variant="danger" loading={closing === p.periodeID}
                    onClick={() => handleClose(p.periodeID)}>
                    Clôturer
                  </Button>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Périodes clôturées */}
      {cloturees.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-gray-500 mb-3">Périodes clôturées ({cloturees.length})</h2>
          <Card className="!p-0 overflow-hidden">
            <Table headers={['Nom de la période', 'Site', 'Début', 'Fin', 'Clôturée le', 'Statut']}>
              {cloturees.slice(0, 10).map(p => (
                <Tr key={p.periodeID} className="opacity-75">
                  <Td><span className="font-medium text-gray-600">{p.nomPeriode}</span></Td>
                  <Td><span className="text-xs text-gray-400">{p.siteID || 'Tous'}</span></Td>
                  <Td className="text-gray-500">{format(parseISO(p.dateDebut), 'd MMM yyyy', { locale: fr })}</Td>
                  <Td className="text-gray-500">{format(parseISO(p.dateFin), 'd MMM yyyy', { locale: fr })}</Td>
                  <Td className="text-gray-400 text-xs">{p.dateCloture ? format(parseISO(p.dateCloture), 'd MMM yyyy', { locale: fr }) : '—'}</Td>
                  <Td><span className="bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-semibold">Clôturée</span></Td>
                </Tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle période de paie">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date de début" required>
              <Input type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} />
            </FormField>
            <FormField label="Date de fin" required>
              <Input type="date" value={form.dateFin} onChange={e => setForm(f => ({ ...f, dateFin: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Nom de la période" required hint="Généré automatiquement, modifiable">
            <Input value={form.nomPeriode} onChange={e => setForm(f => ({ ...f, nomPeriode: e.target.value }))} />
          </FormField>
          <FormField label="Site (optionnel)" hint="Laissez vide pour appliquer à tous les sites">
            <Select value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}>
              <option value="">Tous les sites</option>
              {sites.map(s => <option key={s.siteID} value={s.siteID}>{s.nomSite}</option>)}
            </Select>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Annuler</Button>
            <Button variant="gold" className="flex-1" loading={saving} onClick={handleCreate}>Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
