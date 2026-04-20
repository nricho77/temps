const { getPool, sql } = require('../shared/db');
const { authMiddleware, requireRole, respond } = require('../shared/auth');

module.exports = async function (context, req) {
  const method = req.method;
  const id = req.params?.id;
  const pool = await getPool();
  const auth = authMiddleware(context, req);
  if (auth.error) return respond(context, auth.status, { message: auth.message });

  if (method === 'GET') {
    try {
      const result = await pool.request().query('SELECT * FROM Sites ORDER BY NomSite');
      return respond(context, 200, result.recordset);
    } catch (err) { context.log.error(err); return respond(context, 500, { message: 'Erreur serveur.' }); }
  }

  if (method === 'POST') {
    const auth2 = requireRole(context, req, 'admin');
    if (auth2.error) return respond(context, auth2.status, { message: auth2.message });
    const { siteID, nomSite, description } = req.body || {};
    if (!siteID || !nomSite) return respond(context, 400, { message: 'SiteID et NomSite requis.' });
    try {
      await pool.request()
        .input('sid', sql.VarChar, siteID.toUpperCase())
        .input('nom', sql.NVarChar, nomSite)
        .input('desc', sql.NVarChar, description || null)
        .query('INSERT INTO Sites (SiteID, NomSite, Description) VALUES (@sid, @nom, @desc)');
      return respond(context, 201, { message: 'Site créé.' });
    } catch (err) {
      if (err.number === 2627) return respond(context, 409, { message: 'Ce code de site existe déjà.' });
      context.log.error(err); return respond(context, 500, { message: 'Erreur serveur.' });
    }
  }

  if (method === 'PUT' && id) {
    const auth2 = requireRole(context, req, 'admin');
    if (auth2.error) return respond(context, auth2.status, { message: auth2.message });
    const { nomSite, description, actif } = req.body || {};
    try {
      await pool.request()
        .input('sid', sql.VarChar, id)
        .input('nom', sql.NVarChar, nomSite)
        .input('desc', sql.NVarChar, description || null)
        .input('actif', sql.Bit, actif !== undefined ? actif : 1)
        .query('UPDATE Sites SET NomSite=@nom, Description=@desc, Actif=@actif WHERE SiteID=@sid');
      return respond(context, 200, { message: 'Site mis à jour.' });
    } catch (err) { context.log.error(err); return respond(context, 500, { message: 'Erreur serveur.' }); }
  }

  respond(context, 405, { message: 'Méthode non autorisée.' });
};
