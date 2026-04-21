# 🕐 Gestion des Feuilles de Temps — Sankofa Education

Application web complète de gestion  des  feuilles de temps pour les garderies
**GLPB**, **GLPN** et **GLNA**,  hébergée  sur  Azure Static Web Apps.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│           Azure Static Web App                    │
│                                                   │
│  ┌─────────────────┐   ┌──────────────────────┐  │
│  │  React (Vite)   │◄─►│  Azure Functions     │  │
│  │  TypeScript     │   │  Node.js 18 (API)    │  │
│  │  TailwindCSS    │   └──────────┬───────────┘  │
│  └─────────────────┘              │               │
│                                   ▼               │
│                         ┌─────────────────┐       │
│                         │  Azure SQL DB   │       │
│                         └─────────────────┘       │
└──────────────────────────────────────────────────┘
```

**Stack :**
- **Frontend** : React 18 + TypeScript + Vite + TailwindCSS + Recharts
- **Backend** : Azure Functions (Node.js 18) — REST API
- **Base de données** : Azure SQL (SQL Server)
- **Auth** : JWT (bcrypt + jsonwebtoken) géré par l'application
- **Export** : ExcelJS (Excel .xlsx) + CSV natif
- **Déploiement** : Azure Static Web Apps + GitHub Actions CI/CD

---

## 📁 Structure du projet

```
timesheet-app/
├── frontend/                 ← Application React
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/UI.tsx       ← Composants UI réutilisables
│   │   │   └── layout/Layout.tsx   ← Sidebar + navigation
│   │   ├── pages/
│   │   │   ├── auth/               ← Login, changement MDP
│   │   │   ├── employee/           ← Dashboard, saisie, mes feuilles
│   │   │   ├── manager/            ← Approbation, rapports
│   │   │   └── admin/              ← Stats, employés, sites, périodes
│   │   ├── context/AuthContext.tsx ← Gestion authentification
│   │   ├── services/api.ts         ← Appels API centralisés
│   │   ├── types/index.ts          ← Types TypeScript
│   │   └── App.tsx                 ← Routes protégées
│   └── package.json
│
├── api/                      ← Azure Functions (Backend)
│   ├── auth/login/           ← POST /api/auth/login
│   ├── auth/change-password/ ← POST /api/auth/change-password
│   ├── employees/            ← CRUD /api/employees
│   ├── sites/                ← CRUD /api/sites
│   ├── periods/              ← CRUD /api/periods
│   ├── timesheets/           ← CRUD + submit/approve /api/timesheets
│   ├── reports/              ← GET /api/reports (Excel/CSV)
│   └── shared/               ← db.js (pool SQL) + auth.js (JWT)
│
├── database/
│   ├── schema.sql            ← Création de toutes les tables
│   └── seed.sql              ← Données initiales (sites + jours fériés)
│
├── .github/workflows/
│   └── deploy.yml            ← CI/CD GitHub Actions
│
└── staticwebapp.config.json  ← Config routing Azure SWA
```

---

## 🚀 Déploiement — Guide étape par étape

### Prérequis
- Compte Azure avec abonnement actif
- Azure SQL Database créée et accessible
- Compte GitHub
- Node.js 18+ installé localement (pour les tests)

---

### Étape 1 — Préparer la base de données Azure SQL

1. Connectez-vous à votre Azure SQL via **Azure Data Studio** ou **SQL Server Management Studio**
2. Exécutez le script de création :
   ```sql
   -- Exécuter database/schema.sql
   ```
3. Exécutez les données initiales :
   ```sql
   -- Exécuter database/seed.sql
   ```
4. **Credentials administrateur initial :**
   - Email : `samuelprovost@sankofaeducation.ca`
   - Mot de passe temporaire : `Admin@1234` *(à changer au premier login)*

> ⚠️ **Important** : Le hash dans seed.sql est pour `Admin@1234`. En production, après le premier login, l'admin devra définir un nouveau mot de passe sécurisé.

---

### Étape 2 — Créer l'Azure Static Web App

1. Dans le portail Azure → **Créer une ressource** → **Static Web Apps**
2. **Paramètres :**
   - **Name** : `timesheet-sankofa` (ou votre choix)
   - **Plan type** : Standard (pour les Azure Functions custom)
   - **Region** : Canada Central (recommandé)
   - **Source** : GitHub → sélectionner votre dépôt
   - **Branch** : `main`
   - **Build Presets** : Custom
   - **App location** : `frontend`
   - **Api location** : `api`
   - **Output location** : `build`

3. Azure crée automatiquement le secret `AZURE_STATIC_WEB_APPS_API_TOKEN` dans vos GitHub Secrets.

---

### Étape 3 — Configurer les variables d'environnement

Dans le portail Azure → votre Static Web App → **Configuration** → **Application settings**, ajouter :

| Nom | Valeur |
|-----|--------|
| `AZURE_SQL_SERVER` | `votre-serveur.database.windows.net` |
| `AZURE_SQL_DATABASE` | `timesheet_db` |
| `AZURE_SQL_USER` | `adminuser` |
| `AZURE_SQL_PASSWORD` | `VotreMotDePasse!` |
| `JWT_SECRET` | une chaîne aléatoire de 64+ caractères |
| `JWT_EXPIRES_IN` | `8h` |

---

### Étape 4 — Pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit — Application Feuilles de Temps"
git remote add origin https://github.com/VOTRE-USER/timesheet-sankofa.git
git push -u origin main
```

Le workflow GitHub Actions se déclenche automatiquement et déploie l'application.

---

### Étape 5 — Vérifier le déploiement

1. Attendez que l'action GitHub passe au vert (2-5 minutes)
2. Accédez à l'URL fournie par Azure (ex: `https://random-name.azurestaticapps.net`)
3. Connectez-vous avec `samuelprovost@sankofaeducation.ca` / `Admin@1234`
4. **Changez le mot de passe immédiatement**
5. Créez les employés et assignez-les aux sites

---

## 💻 Développement local

```bash
# 1. Cloner le projet
git clone https://github.com/VOTRE-USER/timesheet-sankofa.git
cd timesheet-sankofa

# 2. Frontend
cd frontend
npm install
npm run dev        # Lance sur http://localhost:5173

# 3. Backend (dans un autre terminal)
cd api
npm install
# Configurer api/local.settings.json avec vos credentials SQL
func start         # Lance sur http://localhost:7071
```

---

## 👥 Rôles utilisateur

| Rôle | Accès |
|------|-------|
| **Employé** | Saisie heures, mes feuilles, tableau de bord personnel |
| **Gestionnaire** | + Approbation (son site), rapports (son site) |
| **Admin** | Accès total : employés, sites, périodes, stats globales, tous rapports |

---

## 🔄 Flux de travail

```
[Brouillon] → (Soumettre) → [Soumis] → (Approuver) → [Approuvé]
                                     → (Refuser + commentaire) → [Refusé]
                                                                    ↓
                                               (Corriger + Resoumettre)
[Approuvé] → (Clôturer période) → [Payé] ← prévu pour la comptabilité
```

---

## 📊 Calculs automatiques

- **Heures travaillées** = (Départ − Arrivée) − Pause non payée
- **Heures supplémentaires** = MAX(0, Heures travaillées − 8h)
- **Jour férié** = détecté automatiquement depuis la table `JoursFeries`
- **Pause** : bouton Oui/Non par entrée, durée saisie manuellement

---

## 📋 Export Excel

Format identique au template GLPN fourni :
- **Onglet Sommaire** : tous les employés avec totaux de période
- **Un onglet par employé** : détail journalier complet (colonnes [1] à [18])
- **Couleurs** : Dark Blue (#0D1B4B) / Gold (#C9A84C)
- Seulement les entrées **approuvées** sont incluses

---

## 🔌 API Lecteurs de Cartes / Empreintes

Les terminaux d'entrée/sortie utilisent des endpoints dédiés sans JWT :

```http
POST /api/timesheets/clock-in
Content-Type: application/json

{
  "badgeToken": "TOKEN_UNIQUE_EMPLOYE",
  "siteID": "GLPN"
}
```

```http
POST /api/timesheets/clock-out
Content-Type: application/json

{
  "badgeToken": "TOKEN_UNIQUE_EMPLOYE",
  "siteID": "GLPN"
}
```

Le `badgeToken` est assigné à chaque employé via l'interface admin (champ BadgeToken dans la table Utilisateurs).

---

## 🎨 Design

- **Couleurs primaires** : Dark Blue `#0D1B4B` / Gold `#C9A84C`
- **Fond** : Blanc / Gris léger `#F5F5F5`
- **Police** : Inter (Google Fonts)
- **Responsive** : Mobile, tablette, desktop
- **Composants** : Cards, badges statut/type, modales, tableaux filtrables

---

## 🔐 Sécurité

- Mots de passe hashés bcrypt (12 rounds)
- JWT signé (expiration 8h configurable)
- Changement de mot de passe obligatoire au premier login
- Isolation des données par rôle (l'employé ne voit que ses propres données)
- HTTPS enforced par Azure SWA
- Headers de sécurité configurés dans staticwebapp.config.json

---

## 📌 Prochaines évolutions prévues

- [ ] Notifications email (Azure Communication Services)
- [ ] Module paie (calcul de la paie régulière + vacances)
- [ ] Interface terminal pour lecteurs de cartes/empreintes
- [ ] Rapports mensuels avancés
- [ ] Export PDF des fiches individuelles
- [ ] Application mobile (PWA installable)

---

## 📞 Support

Contact administration : samuelprovost@sankofaeducation.ca
