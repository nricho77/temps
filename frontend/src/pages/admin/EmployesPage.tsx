import React, { useEffect, useState } from 'react';
import { employeesAPI, sitesAPI } from '../../services/api';
import { PageHeader, Button, Table, Tr, Td, Spinner, Modal, FormField, Input, Select, Card, EmptyState } from '../../components/common/UI';
import type { EmployeComplet, Site } from '../../types';
import toast from 'react-hot-toast';

const defaultForm = {
  prenom: '', nom: '', email: '', role: 'employe' as const, statut: '', tauxHoraire: 0,
  heuresStdJour: 7.5, modePaiement: 'Virement bancaire', numeroEmploye: '', actif: true,
  sites: [] as { siteID: string; estGestionnaire: boolean }[],
};

export default function EmployesPage() {
  const [employes, setEmployes] = useState<EmployeComplet[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [newPwd, setNewPwd] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, sts] = await Promise.all([employeesAPI.list(), sitesAPI.list()]);
      setEmployes(emps);
      setSites(sts);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = employes.filter(e => {
    const matchSearch = !search || `${e.prenom} ${e.nom} ${e.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || e.role === filterRole;
    return matchSearch && matchRole;
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm });
    setModal(true);
  };

  const openEdit = (emp: EmployeComplet) => {
    setEditId(emp.utilisateurID);
    setForm({
      prenom: emp.prenom, nom: emp.nom, email: emp.email,
      role: emp.role as any, statut: emp.statut || '',
      tauxHoraire: emp.tauxHoraire, heuresStdJour: emp.heuresStdJour,
      modePaiement: emp.modePaiement || 'Virement bancaire',
      numeroEmploye: String(emp.numeroEmploye || ''),
      actif: emp.actif, sites: emp.sites || [],
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.prenom || !form.nom || !form.email) return toast.error('Prénom, nom et email sont requis.');
    setSaving(true);
    try {
      const payload = { ...form, numeroEmploye: form.numeroEmploye ? parseInt(form.numeroEmploye) : null };
      if (editId) {
        await employeesAPI.update(editId, payload);
        toast.success('Employé mis à jour.');
        setNewPwd(null);
      } else {
        const result = await employeesAPI.create(payload);
        toast.success('Employé créé !');
        setNewPwd(result.motDePasseTemporaire);
      }
      load();
      if (editId) { setModal(false); setEditId(null); }
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggleSite = (siteID: string) => {
    setForm(f => {
      const exists = f.sites.find(s => s.siteID === siteID);
      if (exists) return { ...f, sites: f.sites.filter(s => s.siteID !== siteID) };
      return { ...f, sites: [...f.sites, { siteID, estGestionnaire: false }] };
    });
  };

  const toggleGestionnaire = (siteID: string) => {
    setForm(f => ({
      ...f, sites: f.sites.map(s => s.siteID === siteID ? { ...s, estGestionnaire: !s.estGestionnaire } : s)
    }));
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <PageHeader title="Gestion des employés" subtitle={`${employes.length} employé(s) enregistré(s)`}
        action={<Button variant="gold" onClick={openCreate}>+ Nouvel employé</Button>} />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
        <Select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-44">
          <option value="">Tous les rôles</option>
          <option value="employe">Employé</option>
          <option value="gestionnaire">Gestionnaire</option>
          <option value="admin">Administrateur</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState title="Aucun employé trouvé" subtitle="Modifiez votre recherche ou créez un nouvel employé." /></Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <Table headers={['#', 'Nom', 'Email', 'Rôle', 'Statut', 'Sites', 'Taux/h', 'Actif', 'Actions']}>
            {filtered.map(emp => (
              <Tr key={emp.utilisateurID}>
                <Td><span className="text-xs text-gray-400">#{emp.numeroEmploye}</span></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-dark flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {emp.prenom[0]}{emp.nom[0]}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{emp.prenom} {emp.nom}</div>
                      {emp.mustChangePwd && <span className="text-xs text-amber-600">⚠ Doit changer MDP</span>}
                    </div>
                  </div>
                </Td>
                <Td><span className="text-sm text-gray-500">{emp.email}</span></Td>
                <Td>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    emp.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    emp.role === 'gestionnaire' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{emp.role}</span>
                </Td>
                <Td><span className="text-xs text-gray-500">{emp.statut || '—'}</span></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {(emp.sites || []).map(s => (
                      <span key={s.siteID} className="text-xs bg-brand-dark/10 text-brand-dark px-1.5 py-0.5 rounded font-medium">
                        {s.siteID}{s.estGestionnaire ? ' ⚙' : ''}
                      </span>
                    ))}
                    {(!emp.sites || emp.sites.length === 0) && <span className="text-xs text-gray-400">—</span>}
                  </div>
                </Td>
                <Td><span className="font-medium">{emp.tauxHoraire > 0 ? `${emp.tauxHoraire}$/h` : '—'}</span></Td>
                <Td>
                  <span className={`w-2 h-2 rounded-full inline-block ${emp.actif ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                </Td>
                <Td>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(emp)}>Modifier</Button>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Modal création/édition */}
      <Modal open={modal} onClose={() => { setModal(false); setEditId(null); setNewPwd(null); }}
        title={editId ? 'Modifier l\'employé' : 'Nouvel employé'} size="lg">
        <div className="space-y-4">
          {newPwd && (
            <div className="bg-brand-gold/10 border border-brand-gold rounded-xl p-4">
              <p className="text-sm font-semibold text-brand-goldDark mb-1">✓ Employé créé avec succès</p>
              <p className="text-xs text-gray-600 mb-2">Mot de passe temporaire à communiquer à l'employé :</p>
              <code className="bg-white px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-brand-dark border border-brand-gold/30 block">
                {newPwd}
              </code>
              <p className="text-xs text-gray-400 mt-2">L'employé devra le changer à sa première connexion.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prénom" required>
              <Input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
            </FormField>
            <FormField label="Nom" required>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Adresse courriel" required>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Rôle" required>
              <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
                <option value="employe">Employé</option>
                <option value="gestionnaire">Gestionnaire</option>
                <option value="admin">Administrateur</option>
              </Select>
            </FormField>
            <FormField label="Numéro d'employé">
              <Input type="number" value={form.numeroEmploye} onChange={e => setForm(f => ({ ...f, numeroEmploye: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Taux horaire ($/h)">
              <Input type="number" step="0.01" value={form.tauxHoraire} onChange={e => setForm(f => ({ ...f, tauxHoraire: parseFloat(e.target.value) || 0 }))} />
            </FormField>
            <FormField label="Heures std/jour">
              <Input type="number" step="0.5" value={form.heuresStdJour} onChange={e => setForm(f => ({ ...f, heuresStdJour: parseFloat(e.target.value) || 7.5 }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Statut">
              <Select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                <option value="">—</option>
                <option>Temps partiel</option>
                <option>Responsable de groupe</option>
                <option>Cuisinière</option>
                <option>Temps plein</option>
              </Select>
            </FormField>
            <FormField label="Mode de paiement">
              <Select value={form.modePaiement} onChange={e => setForm(f => ({ ...f, modePaiement: e.target.value }))}>
                <option>Virement bancaire</option>
                <option>Interac</option>
                <option>Chèque</option>
              </Select>
            </FormField>
          </div>

          {/* Sites */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sites autorisés</label>
            <div className="space-y-2">
              {sites.map(site => {
                const assigned = form.sites.find(s => s.siteID === site.siteID);
                return (
                  <div key={site.siteID} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${assigned ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={!!assigned} onChange={() => toggleSite(site.siteID)}
                        className="w-4 h-4 accent-brand-gold" id={`site-${site.siteID}`} />
                      <label htmlFor={`site-${site.siteID}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                        <span className="bg-brand-dark/10 text-brand-dark px-2 py-0.5 rounded text-xs font-bold mr-2">{site.siteID}</span>
                        {site.nomSite}
                      </label>
                    </div>
                    {assigned && form.role !== 'employe' && (
                      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={assigned.estGestionnaire} onChange={() => toggleGestionnaire(site.siteID)}
                          className="w-3.5 h-3.5 accent-brand-dark" />
                        Gestionnaire
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {editId && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <input type="checkbox" id="actif" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                className="w-4 h-4 accent-brand-dark" />
              <label htmlFor="actif" className="text-sm text-gray-700 cursor-pointer">Employé actif</label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setModal(false); setNewPwd(null); }}>Annuler</Button>
            <Button variant="gold" className="flex-1" loading={saving} onClick={handleSave}>
              {editId ? 'Enregistrer' : 'Créer l\'employé'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
