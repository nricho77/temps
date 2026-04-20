import React, { useEffect, useState } from 'react';
import { sitesAPI } from '../../services/api';
import { PageHeader, Card, Button, Table, Tr, Td, Spinner, Modal, FormField, Input, EmptyState } from '../../components/common/UI';
import type { Site } from '../../types';
import toast from 'react-hot-toast';

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ siteID: '', nomSite: '', description: '' });

  const load = async () => {
    setLoading(true);
    try { setSites(await sitesAPI.list()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm({ siteID: '', nomSite: '', description: '' }); setModal(true); };
  const openEdit = (site: Site) => { setEditId(site.siteID); setForm({ siteID: site.siteID, nomSite: site.nomSite, description: site.description || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.siteID || !form.nomSite) return toast.error('ID et nom du site sont requis.');
    setSaving(true);
    try {
      if (editId) { await sitesAPI.update(editId, form); toast.success('Site mis à jour.'); }
      else { await sitesAPI.create(form); toast.success('Site créé !'); }
      setModal(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <PageHeader title="Gestion des sites" subtitle={`${sites.length} site(s) enregistré(s)`}
        action={<Button variant="gold" onClick={openCreate}>+ Nouveau site</Button>} />

      {sites.length === 0 ? (
        <Card><EmptyState title="Aucun site" subtitle="Créez votre premier site." /></Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <Table headers={['Code', 'Nom du site', 'Description', 'Actif', 'Actions']}>
            {sites.map(site => (
              <Tr key={site.siteID}>
                <Td>
                  <span className="bg-brand-dark text-white px-3 py-1 rounded-xl text-xs font-bold">{site.siteID}</span>
                </Td>
                <Td><span className="font-medium text-gray-900">{site.nomSite}</span></Td>
                <Td><span className="text-sm text-gray-400">{site.description || '—'}</span></Td>
                <Td><span className={`w-2 h-2 rounded-full inline-block ${site.actif ? 'bg-emerald-500' : 'bg-gray-300'}`} /></Td>
                <Td><Button size="sm" variant="ghost" onClick={() => openEdit(site)}>Modifier</Button></Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Modifier le site' : 'Nouveau site'}>
        <div className="space-y-4">
          <FormField label="Code du site (ex: GLPB)" required hint="Identifiant court unique, ne peut pas être modifié après création">
            <Input value={form.siteID} onChange={e => setForm(f => ({ ...f, siteID: e.target.value.toUpperCase() }))}
              disabled={!!editId} maxLength={10} placeholder="GLPB" />
          </FormField>
          <FormField label="Nom du site" required>
            <Input value={form.nomSite} onChange={e => setForm(f => ({ ...f, nomSite: e.target.value }))}
              placeholder="Garderie Les P'tits Bonhommes" />
          </FormField>
          <FormField label="Description">
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Annuler</Button>
            <Button variant="gold" className="flex-1" loading={saving} onClick={handleSave}>
              {editId ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
