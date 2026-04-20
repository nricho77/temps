// ============================================================
// API: Périodes
// ============================================================
const { getPool, sql } = require('../shared/db');
const { authMiddleware, requireRole, respond } = require('../shared/auth');

const periodesHandler = async function (context, req) {
  const method = req.method;
  const id = req.params?.id;
  const pool = await getPool();
  const auth = authMiddleware(context, req);
  if (auth.error) return respond(context, auth.status, { message: auth.message });

  if (method === 'GET' && !id) {
    try {
      const { siteId, statut } = req.query || {};
      let where = [];
      const request = pool.request();
      if (siteId) { where.push('(p.SiteID = @sid OR p.SiteID IS NULL)'); request.input('sid', sql.VarChar, siteId); }
      if (statut) { where.push('p.Statut = @statut'); request.input('statut', sql.VarChar, statut); }
      const result = await request.query(
        `SELECT p.*, u.Prenom AS ClotPrenom, u.Nom AS ClotNom
         FROM Periodes p LEFT JOIN Utilisateurs u ON p.ClotureePar = u.UtilisateurID
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY p.DateDebut DESC`
      );
      return respond(context, 200, result.recordset);
    } catch (err) { context.log.error(err); return respond(context, 500, { message: 'Erreur serveur.' }); }
  }

  if (method === 'POST') {
    const auth2 = requireRole(context, req, 'admin');
    if (auth2.error) return respond(context, auth2.status, { message: auth2.message });
    const { nomPeriode, dateDebut, dateFin, siteId } = req.body || {};
    if (!nomPeriode || !dateDebut || !dateFin) return respond(context, 400, { message: 'Champs obligatoires manquants.' });
    try {
      const r = await pool.request()
        .input('nom', sql.NVarChar, nomPeriode)
        .input('debut', sql.Date, dateDebut)
        .input('fin', sql.Date, dateFin)
        .input('sid', sql.VarChar, siteId || null)
        .query(`INSERT INTO Periodes (NomPeriode, DateDebut, DateFin, SiteID) OUTPUT INSERTED.PeriodeID
                VALUES (@nom, @debut, @fin, @sid)`);
      return respond(context, 201, { id: r.recordset[0].PeriodeID });
    } catch (err) { context.log.error(err); return respond(context, 500, { message: 'Erreur serveur.' }); }
  }

  if (method === 'PATCH' && id && req.url?.includes('close')) {
    const auth2 = requireRole(context, req, 'admin');
    if (auth2.error) return respond(context, auth2.status, { message: auth2.message });
    try {
      await pool.request()
        .input('id', sql.Int, parseInt(id))
        .input('uid', sql.Int, auth2.user.id)
        .query(`UPDATE Periodes SET Statut='cloturee', DateCloture=GETDATE(), ClotureePar=@uid
                WHERE PeriodeID=@id AND Statut='ouverte'`);
      return respond(context, 200, { message: 'Période clôturée.' });
    } catch (err) { context.log.error(err); return respond(context, 500, { message: 'Erreur serveur.' }); }
  }

  respond(context, 405, { message: 'Méthode non autorisée.' });
};

module.exports = periodesHandler;
