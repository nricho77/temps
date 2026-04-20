const { getPool, sql } = require('../shared/db');
const { authMiddleware, requireRole, respond } = require('../shared/auth');

// Calcul automatique des heures
function calculerHeures(heureArrivee, heureDepart, pauseMinutes, pausePayee, heuresStdJour = 8) {
  if (!heureArrivee || !heureDepart) return { heuresTravaillees: 0, heuresSupp: 0 };
  const [ha, ma] = heureArrivee.split(':').map(Number);
  const [hd, md] = heureDepart.split(':').map(Number);
  const totalMin = (hd * 60 + md) - (ha * 60 + ma);
  const pauseDeduire = pausePayee ? 0 : (pauseMinutes || 0);
  const heuresTravaillees = Math.max(0, (totalMin - pauseDeduire) / 60);
  const heuresSupp = Math.max(0, heuresTravaillees - heuresStdJour);
  return {
    heuresTravaillees: Math.round(heuresTravaillees * 100) / 100,
    heuresSupp: Math.round(heuresSupp * 100) / 100,
  };
}

module.exports = async function (context, req) {
  const method = req.method;
  const id = req.params?.id;
  const pool = await getPool();

  // ──────────────────────────────────────────────────────
  // POST /api/timesheets/clock-in  (badge/empreinte)
  // ──────────────────────────────────────────────────────
  if (req.url?.includes('clock-in') && method === 'POST') {
    const { badgeToken, siteID } = req.body || {};
    if (!badgeToken || !siteID) return respond(context, 400, { message: 'Token et site requis.' });
    try {
      const ur = await pool.request()
        .input('token', sql.VarChar, badgeToken)
        .query('SELECT UtilisateurID, HeuresStdJour FROM Utilisateurs WHERE BadgeToken = @token AND Actif = 1');
      if (!ur.recordset.length) return respond(context, 404, { message: 'Badge non reconnu.' });
      const user = ur.recordset[0];
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0].substring(0, 5);

      await pool.request()
        .input('uid', sql.Int, user.UtilisateurID)
        .input('sid', sql.VarChar, siteID)
        .input('date', sql.Date, today)
        .input('heure', sql.Time, now)
        .query(`MERGE EntreesTemps AS t
                USING (VALUES (@uid, @sid, @date)) AS s(uid, sid, date)
                ON t.UtilisateurID=s.uid AND t.SiteID=s.sid AND t.DateJournee=s.date
                WHEN NOT MATCHED THEN
                  INSERT (UtilisateurID,SiteID,DateJournee,HeureArrivee,Statut,SourceSaisie)
                  VALUES (@uid, @sid, @date, @heure, 'brouillon', 'card');`);
      return respond(context, 200, { message: 'Arrivée enregistrée.', heure: now });
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // POST /api/timesheets/clock-out
  if (req.url?.includes('clock-out') && method === 'POST') {
    const { badgeToken, siteID } = req.body || {};
    if (!badgeToken || !siteID) return respond(context, 400, { message: 'Token et site requis.' });
    try {
      const ur = await pool.request()
        .input('token', sql.VarChar, badgeToken)
        .query('SELECT UtilisateurID, HeuresStdJour FROM Utilisateurs WHERE BadgeToken = @token AND Actif = 1');
      if (!ur.recordset.length) return respond(context, 404, { message: 'Badge non reconnu.' });
      const user = ur.recordset[0];
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0].substring(0, 5);

      const er = await pool.request()
        .input('uid', sql.Int, user.UtilisateurID)
        .input('sid', sql.VarChar, siteID)
        .input('date', sql.Date, today)
        .query('SELECT * FROM EntreesTemps WHERE UtilisateurID=@uid AND SiteID=@sid AND DateJournee=@date');

      if (!er.recordset.length) return respond(context, 404, { message: 'Aucune arrivée enregistrée.' });
      const entry = er.recordset[0];
      const { heuresTravaillees, heuresSupp } = calculerHeures(entry.HeureArrivee, now, entry.PauseMinutes, entry.PausePayee, user.HeuresStdJour);

      await pool.request()
        .input('uid', sql.Int, user.UtilisateurID)
        .input('sid', sql.VarChar, siteID)
        .input('date', sql.Date, today)
        .input('heure', sql.Time, now)
        .input('ht', sql.Decimal(5, 2), heuresTravaillees)
        .input('hs', sql.Decimal(5, 2), heuresSupp)
        .query(`UPDATE EntreesTemps SET HeureDepart=@heure, HeuresTravaillees=@ht,
                HeuresSupplementaires=@hs, DateModification=GETDATE()
                WHERE UtilisateurID=@uid AND SiteID=@sid AND DateJournee=@date`);
      return respond(context, 200, { message: 'Départ enregistré.', heure: now, heuresTravaillees });
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // ──────────────────────────────────────────────────────
  // AUTH requise pour tout le reste
  // ──────────────────────────────────────────────────────
  const auth = authMiddleware(context, req);
  if (auth.error) return respond(context, auth.status, { message: auth.message });

  // GET /api/timesheets - liste
  if (method === 'GET' && !id) {
    try {
      const { periodeId, siteId, userId, statut, dateDebut, dateFin } = req.query || {};
      let where = [];
      const request = pool.request();

      if (auth.user.role === 'employe') {
        where.push('e.UtilisateurID = @uid');
        request.input('uid', sql.Int, auth.user.id);
      } else if (auth.user.role === 'gestionnaire') {
        where.push(`e.SiteID IN (SELECT SiteID FROM UtilisateurSites WHERE UtilisateurID = ${auth.user.id} AND EstGestionnaire = 1)`);
        if (userId) { where.push('e.UtilisateurID = @uid'); request.input('uid', sql.Int, parseInt(userId)); }
      } else if (auth.user.role === 'admin') {
        if (userId) { where.push('e.UtilisateurID = @uid'); request.input('uid', sql.Int, parseInt(userId)); }
      }

      if (siteId) { where.push('e.SiteID = @sid'); request.input('sid', sql.VarChar, siteId); }
      if (periodeId) { where.push('e.PeriodeID = @pid'); request.input('pid', sql.Int, parseInt(periodeId)); }
      if (statut) { where.push('e.Statut = @statut'); request.input('statut', sql.VarChar, statut); }
      if (dateDebut) { where.push('e.DateJournee >= @dateDebut'); request.input('dateDebut', sql.Date, dateDebut); }
      if (dateFin) { where.push('e.DateJournee <= @dateFin'); request.input('dateFin', sql.Date, dateFin); }

      const query = `SELECT e.*, u.Prenom, u.Nom, u.NumeroEmploye,
                            s.NomSite, p.NomPeriode,
                            a.Prenom AS ApprobPrenom, a.Nom AS ApprobNom
                     FROM EntreesTemps e
                     JOIN Utilisateurs u ON e.UtilisateurID = u.UtilisateurID
                     JOIN Sites s ON e.SiteID = s.SiteID
                     LEFT JOIN Periodes p ON e.PeriodeID = p.PeriodeID
                     LEFT JOIN Utilisateurs a ON e.ApprobateurID = a.UtilisateurID
                     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                     ORDER BY e.DateJournee DESC`;

      const result = await request.query(query);
      return respond(context, 200, result.recordset);
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // POST /api/timesheets - créer
  if (method === 'POST' && !id) {
    const { siteID, periodeID, dateJournee, typeJournee, heureArrivee, heureDepart,
            pausePayee, pauseMinutes, ajustementBanqueTemps, retraitBanqueMaladie,
            heuresVacancesPrises, formation } = req.body || {};

    if (!siteID || !dateJournee) return respond(context, 400, { message: 'Site et date requis.' });

    try {
      // Vérifier si la période est clôturée
      if (periodeID) {
        const pr = await pool.request().input('pid', sql.Int, periodeID)
          .query('SELECT Statut FROM Periodes WHERE PeriodeID = @pid');
        if (pr.recordset[0]?.Statut === 'cloturee')
          return respond(context, 403, { message: 'Cette période est clôturée.' });
      }

      // Détecter jour férié automatiquement
      const ferieR = await pool.request().input('date', sql.Date, dateJournee)
        .query("SELECT 1 FROM JoursFeries WHERE DateFerie = @date AND Province = 'QC'");
      const estFerie = ferieR.recordset.length > 0;

      // Récupérer HeuresStdJour de l'employé
      const userR = await pool.request().input('uid', sql.Int, auth.user.id)
        .query('SELECT HeuresStdJour FROM Utilisateurs WHERE UtilisateurID = @uid');
      const heuresStd = userR.recordset[0]?.HeuresStdJour || 8;

      const { heuresTravaillees, heuresSupp } = calculerHeures(heureArrivee, heureDepart, pauseMinutes, pausePayee, heuresStd);

      const r = await pool.request()
        .input('uid', sql.Int, auth.user.id)
        .input('sid', sql.VarChar, siteID)
        .input('pid', sql.Int, periodeID || null)
        .input('date', sql.Date, dateJournee)
        .input('type', sql.VarChar, typeJournee || 'regulier')
        .input('arrivee', sql.Time, heureArrivee || null)
        .input('depart', sql.Time, heureDepart || null)
        .input('pausePayee', sql.Bit, pausePayee ? 1 : 0)
        .input('pauseMin', sql.Int, pauseMinutes || 0)
        .input('ht', sql.Decimal(5, 2), heuresTravaillees)
        .input('hs', sql.Decimal(5, 2), heuresSupp)
        .input('ferie', sql.Bit, estFerie ? 1 : 0)
        .input('ajustBanque', sql.Decimal(5, 2), ajustementBanqueTemps || 0)
        .input('retraitMaladie', sql.Decimal(5, 2), retraitBanqueMaladie || 0)
        .input('heuresVac', sql.Decimal(5, 2), heuresVacancesPrises || 0)
        .input('formation', sql.Bit, formation ? 1 : 0)
        .query(`INSERT INTO EntreesTemps
                (UtilisateurID,SiteID,PeriodeID,DateJournee,TypeJournee,HeureArrivee,HeureDepart,
                 PausePayee,PauseMinutes,HeuresTravaillees,HeuresSupplementaires,JourFerie,
                 AjustementBanqueTemps,RetraitBanqueMaladie,HeuresVacancesPrises,Formation)
                OUTPUT INSERTED.EntreeID
                VALUES (@uid,@sid,@pid,@date,@type,@arrivee,@depart,@pausePayee,@pauseMin,
                        @ht,@hs,@ferie,@ajustBanque,@retraitMaladie,@heuresVac,@formation)`);

      return respond(context, 201, { id: r.recordset[0].EntreeID, heuresTravaillees, heuresSupp, estFerie });
    } catch (err) {
      if (err.number === 2627) return respond(context, 409, { message: 'Une entrée existe déjà pour cette date et ce site.' });
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // PUT /api/timesheets/:id
  if (method === 'PUT' && id) {
    try {
      const entryR = await pool.request().input('id', sql.Int, parseInt(id))
        .query('SELECT * FROM EntreesTemps WHERE EntreeID = @id');
      if (!entryR.recordset.length) return respond(context, 404, { message: 'Entrée introuvable.' });
      const entry = entryR.recordset[0];

      // Vérif droits
      if (auth.user.role === 'employe') {
        if (entry.UtilisateurID !== auth.user.id) return respond(context, 403, { message: 'Accès refusé.' });
        if (entry.Statut === 'soumis' || entry.Statut === 'approuve')
          return respond(context, 403, { message: 'Entrée verrouillée.' });
      }

      const { heureArrivee, heureDepart, pausePayee, pauseMinutes, typeJournee,
              ajustementBanqueTemps, retraitBanqueMaladie, heuresVacancesPrises, formation, siteID } = req.body || {};

      const userR = await pool.request().input('uid', sql.Int, entry.UtilisateurID)
        .query('SELECT HeuresStdJour FROM Utilisateurs WHERE UtilisateurID = @uid');
      const heuresStd = userR.recordset[0]?.HeuresStdJour || 8;
      const { heuresTravaillees, heuresSupp } = calculerHeures(heureArrivee, heureDepart, pauseMinutes, pausePayee, heuresStd);

      await pool.request()
        .input('id', sql.Int, parseInt(id))
        .input('type', sql.VarChar, typeJournee || entry.TypeJournee)
        .input('arrivee', sql.Time, heureArrivee || null)
        .input('depart', sql.Time, heureDepart || null)
        .input('pausePayee', sql.Bit, pausePayee ? 1 : 0)
        .input('pauseMin', sql.Int, pauseMinutes || 0)
        .input('ht', sql.Decimal(5, 2), heuresTravaillees)
        .input('hs', sql.Decimal(5, 2), heuresSupp)
        .input('ajustBanque', sql.Decimal(5, 2), ajustementBanqueTemps || 0)
        .input('retraitMaladie', sql.Decimal(5, 2), retraitBanqueMaladie || 0)
        .input('heuresVac', sql.Decimal(5, 2), heuresVacancesPrises || 0)
        .input('formation', sql.Bit, formation ? 1 : 0)
        .query(`UPDATE EntreesTemps SET TypeJournee=@type, HeureArrivee=@arrivee, HeureDepart=@depart,
                PausePayee=@pausePayee, PauseMinutes=@pauseMin, HeuresTravaillees=@ht,
                HeuresSupplementaires=@hs, AjustementBanqueTemps=@ajustBanque,
                RetraitBanqueMaladie=@retraitMaladie, HeuresVacancesPrises=@heuresVac,
                Formation=@formation, DateModification=GETDATE()
                WHERE EntreeID=@id`);
      return respond(context, 200, { message: 'Entrée mise à jour.', heuresTravaillees, heuresSupp });
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // PATCH /api/timesheets/:id/submit
  if (method === 'PATCH' && req.url?.includes('submit')) {
    try {
      const entryR = await pool.request().input('id', sql.Int, parseInt(id))
        .query('SELECT * FROM EntreesTemps WHERE EntreeID = @id');
      if (!entryR.recordset.length) return respond(context, 404, { message: 'Entrée introuvable.' });
      const entry = entryR.recordset[0];

      if (auth.user.role === 'employe' && entry.UtilisateurID !== auth.user.id)
        return respond(context, 403, { message: 'Accès refusé.' });
      if (entry.Statut !== 'brouillon' && entry.Statut !== 'refuse')
        return respond(context, 400, { message: 'Seule une entrée brouillon ou refusée peut être soumise.' });

      await pool.request().input('id', sql.Int, parseInt(id))
        .query("UPDATE EntreesTemps SET Statut='soumis', DateModification=GETDATE() WHERE EntreeID=@id");
      return respond(context, 200, { message: 'Entrée soumise.' });
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  // PATCH /api/timesheets/:id/approve
  if (method === 'PATCH' && req.url?.includes('approve')) {
    const auth2 = requireRole(context, req, 'gestionnaire', 'admin');
    if (auth2.error) return respond(context, auth2.status, { message: auth2.message });
    try {
      const { action, commentaire } = req.body || {};
      if (!['approuve', 'refuse'].includes(action)) return respond(context, 400, { message: 'Action invalide.' });
      if (action === 'refuse' && !commentaire) return respond(context, 400, { message: 'Commentaire obligatoire pour un refus.' });

      await pool.request()
        .input('id', sql.Int, parseInt(id))
        .input('statut', sql.VarChar, action)
        .input('approbateur', sql.Int, auth2.user.id)
        .input('commentaire', sql.NVarChar, commentaire || null)
        .query(`UPDATE EntreesTemps SET Statut=@statut, ApprobateurID=@approbateur,
                DateApprobation=GETDATE(), CommentaireGestion=@commentaire, DateModification=GETDATE()
                WHERE EntreeID=@id AND Statut='soumis'`);
      return respond(context, 200, { message: action === 'approuve' ? 'Entrée approuvée.' : 'Entrée refusée.' });
    } catch (err) {
      context.log.error(err);
      return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  respond(context, 405, { message: 'Méthode non autorisée.' });
};
