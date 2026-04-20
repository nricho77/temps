// ============================================================
// Types TypeScript - Gestion Feuilles de Temps
// ============================================================

export type Role = 'employe' | 'gestionnaire' | 'admin';
export type Statut = 'brouillon' | 'soumis' | 'approuve' | 'refuse';
export type TypeJournee = 'regulier' | 'ferie' | 'weekend' | 'maladie' | 'vacance' | 'formation';
export type StatutPeriode = 'ouverte' | 'cloturee';

export interface User {
  id: number;
  numeroEmploye?: number;
  prenom: string;
  nom: string;
  email: string;
  role: Role;
  statut?: string;
  sites: string[];
  mustChangePwd: boolean;
  heuresStdJour?: number;
  tauxHoraire?: number;
}

export interface Site {
  siteID: string;
  nomSite: string;
  description?: string;
  actif: boolean;
}

export interface Periode {
  periodeID: number;
  nomPeriode: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutPeriode;
  dateCloture?: string;
  siteID?: string;
}

export interface EntreeTemps {
  entreeID: number;
  utilisateurID: number;
  siteID: string;
  periodeID?: number;
  dateJournee: string;
  typeJournee: TypeJournee;
  heureArrivee?: string;
  heureDepart?: string;
  pausePayee: boolean;
  pauseMinutes: number;
  heuresTravaillees: number;
  heuresSupplementaires: number;
  jourFerie: boolean;
  heuresFerieesPayees: number;
  ajustementBanqueTemps: number;
  retraitBanqueMaladie: number;
  heuresVacancesPrises: number;
  formation: boolean;
  statut: Statut;
  approbateurID?: number;
  dateApprobation?: string;
  commentaireGestion?: string;
  sourceGestion?: string;
  // Joins
  prenom?: string;
  nom?: string;
  numeroEmploye?: number;
  nomSite?: string;
  nomPeriode?: string;
  approbPrenom?: string;
  approbNom?: string;
}

export interface EmployeComplet {
  utilisateurID: number;
  numeroEmploye?: number;
  prenom: string;
  nom: string;
  email: string;
  role: Role;
  statut?: string;
  tauxHoraire: number;
  heuresStdJour: number;
  modePaiement?: string;
  actif: boolean;
  mustChangePwd: boolean;
  sites: { siteID: string; estGestionnaire: boolean }[];
}

export interface StatsSommaire {
  heuresTravaillees: number;
  heuresSupplementaires: number;
  heuresFerie: number;
  heuresMaladie: number;
  heuresVacances: number;
  heuresFormation: number;
  joursEnAttente: number;
  joursApprouves: number;
}
