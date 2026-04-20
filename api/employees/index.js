const { getPool, sql } = require('../shared/db');
const { authMiddleware, requireRole, respond } = require('../shared/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = async function (context, req) {
  const method = req.method;
  const id = req.params?.id;

  // GET /api/employees - liste (admin/gestionnaire)
  if (method === 'GET' && !id) {
    const auth = requireRole(context, req, 'admin', 'gestionnaire');
    if (auth.error) return respond(context, auth.status, { message: auth.message });
    try {
      const pool = await getPool();
      let query = `SELECT u.UtilisateurID, u.NumeroEmploye, u.Prenom, u.Nom, u.Email,
                          u.Role, u.Statut, u.TauxHoraire, u.HeuresStdJour,
                          u.ModePaiement, u.Actif, u.MustChangePwd, u.DateCreation,
                          STRING_AGG(us.SiteID, ',') AS sites
                   FROM Utilisateurs u
                   LEFT JOIN UtilisateurSites us ON u.UtilisateurID = us.UtilisateurID`;

      // Gestionnaire voit seulement les employés de ses sites
      if (auth.user.role === 'gestionnaire') {
        query += ` WHERE us.SiteID IN (SELECT SiteID FROM UtilisateurSites WHERE UtilisateurID = ${auth.user.id} AND EstGestionnaire = 1)`;
      }
      query += ` GROUP BY u.UtilisateurID, u.NumeroEmploye, u.Prenom, u.Nom, u.Email,
                           u.Role, u.Statut, u.TauxHoraire, u.HeuresStdJour,
                           u.ModePaiement, u.Actif, u.MustChangePwd, u.DateCreation
                 ORDER BY u.Nom, u.Prenom`;

      const result = await pool.request().query(query);
      return respond(context, 200, result.recordset.map(u => ({
        ...u, sites: u.sites ? u.sites.split(',') : []
      })));
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // GET /api/employees/:id
  if (method === 'GET' && id) {
    const auth = authMiddleware(context, req);
    if (auth.error) return respond(context, auth.status, { message: auth.message });
    const targetId = parseInt(id);
    if (auth.user.role === 'employe' && auth.user.id !== targetId)
      return respond(context, 403, { message: 'Accès refusé.' });
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', sql.Int, targetId)
        .query(`SELECT u.*, STRING_AGG(us.SiteID + ':' + CAST(us.EstGestionnaire AS VARCHAR), ',') AS siteDetails
                FROM Utilisateurs u
                LEFT JOIN UtilisateurSites us ON u.UtilisateurID = us.UtilisateurID
                WHERE u.UtilisateurID = @id
                GROUP BY u.UtilisateurID, u.NumeroEmploye, u.Prenom, u.Nom, u.Email,
                         u.MotDePasseHash, u.Role, u.Statut, u.TauxHoraire, u.HeuresStdJour,
                         u.ModePaiement, u.BadgeToken, u.Actif, u.MustChangePwd,
                         u.DateCreation, u.DateModification`);
      if (!result.recordset.length) return respond(context, 404, { message: 'Employé introuvable.' });
      const u = result.recordset[0];
      const sites = u.siteDetails
        ? u.siteDetails.split(',').map(s => { const [sid, g] = s.split(':'); return { siteID: sid, estGestionnaire: g === '1' }; })
        : [];
      delete u.MotDePasseHash;
      return respond(context, 200, { ...u, sites });
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // POST /api/employees - créer
  if (method === 'POST') {
    const auth = requireRole(context, req, 'admin');
    if (auth.error) return respond(context, auth.status, { message: auth.message });
    const { prenom, nom, email, role, statut, tauxHoraire, heuresStdJour, modePaiement, numeroEmploye, sites } = req.body || {};
    if (!prenom || !nom || !email || !role) return respond(context, 400, { message: 'Champs obligatoires manquants.' });

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 12);

    try {
      const pool = await getPool();
      const r = await pool.request()
        .input('prenom', sql.NVarChar, prenom)
        .input('nom', sql.NVarChar, nom)
        .input('email', sql.NVarChar, email.toLowerCase().trim())
        .input('hash', sql.NVarChar, hash)
        .input('role', sql.VarChar, role)
        .input('statut', sql.NVarChar, statut || null)
        .input('tauxHoraire', sql.Decimal(10, 2), tauxHoraire || 0)
        .input('heuresStdJour', sql.Decimal(5, 2), heuresStdJour || 7.5)
        .input('modePaiement', sql.NVarChar, modePaiement || null)
        .input('numEmp', sql.Int, numeroEmploye || null)
        .query(`INSERT INTO Utilisateurs (Prenom, Nom, Email, MotDePasseHash, Role, Statut, TauxHoraire, HeuresStdJour, ModePaiement, NumeroEmploye, MustChangePwd)
                OUTPUT INSERTED.UtilisateurID
                VALUES (@prenom, @nom, @email, @hash, @role, @statut, @tauxHoraire, @heuresStdJour, @modePaiement, @numEmp, 1)`);

      const newId = r.recordset[0].UtilisateurID;

      if (sites && sites.length > 0) {
        for (const s of sites) {
          await pool.request()
            .input('uid', sql.Int, newId)
            .input('sid', sql.VarChar, s.siteID)
            .input('isGest', sql.Bit, s.estGestionnaire ? 1 : 0)
            .query('INSERT INTO UtilisateurSites (UtilisateurID, SiteID, EstGestionnaire) VALUES (@uid, @sid, @isGest)');
        }
      }

      // TODO: Envoyer email avec tempPassword quand Azure Communication Services configuré
      return respond(context, 201, {
        message: 'Employé créé avec succès.',
        id: newId,
        motDePasseTemporaire: tempPassword, // À envoyer par email en production
      });
    } catch (err) {
      if (err.number === 2627) return respond(context, 409, { message: 'Cet email existe déjà.' });
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // PUT /api/employees/:id
  if (method === 'PUT' && id) {
    const auth = requireRole(context, req, 'admin');
    if (auth.error) return respond(context, auth.status, { message: auth.message });
    const { prenom, nom, email, role, statut, tauxHoraire, heuresStdJour, modePaiement, numeroEmploye, actif, sites } = req.body || {};
    try {
      const pool = await getPool();
      await pool.request()
        .input('id', sql.Int, parseInt(id))
        .input('prenom', sql.NVarChar, prenom)
        .input('nom', sql.NVarChar, nom)
        .input('email', sql.NVarChar, email.toLowerCase().trim())
        .input('role', sql.VarChar, role)
        .input('statut', sql.NVarChar, statut || null)
        .input('tauxHoraire', sql.Decimal(10, 2), tauxHoraire || 0)
        .input('heuresStdJour', sql.Decimal(5, 2), heuresStdJour || 7.5)
        .input('modePaiement', sql.NVarChar, modePaiement || null)
        .input('numEmp', sql.Int, numeroEmploye || null)
        .input('actif', sql.Bit, actif !== undefined ? actif : 1)
        .query(`UPDATE Utilisateurs SET Prenom=@prenom, Nom=@nom, Email=@email, Role=@role,
                Statut=@statut, TauxHoraire=@tauxHoraire, HeuresStdJour=@heuresStdJour,
                ModePaiement=@modePaiement, NumeroEmploye=@numEmp, Actif=@actif,
                DateModification=GETDATE() WHERE UtilisateurID=@id`);

      if (sites !== undefined) {
        await pool.request().input('id', sql.Int, parseInt(id))
          .query('DELETE FROM UtilisateurSites WHERE UtilisateurID = @id');
        for (const s of sites) {
          await pool.request()
            .input('uid', sql.Int, parseInt(id))
            .input('sid', sql.VarChar, s.siteID)
            .input('isGest', sql.Bit, s.estGestionnaire ? 1 : 0)
            .query('INSERT INTO UtilisateurSites (UtilisateurID, SiteID, EstGestionnaire) VALUES (@uid, @sid, @isGest)');
        }
      }
      return respond(context, 200, { message: 'Employé mis à jour.' });
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  respond(context, 405, { message: 'Méthode non autorisée.' });
};
