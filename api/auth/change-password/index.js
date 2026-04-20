const { getPool, sql } = require('../shared/db');
const { authMiddleware, respond } = require('../shared/auth');
const bcrypt = require('bcryptjs');

module.exports = async function (context, req) {
  if (req.method !== 'POST') return respond(context, 405, { message: 'Méthode non autorisée.' });
  const auth = authMiddleware(context, req);
  if (auth.error) return respond(context, auth.status, { message: auth.message });

  const { ancienMotDePasse, nouveauMotDePasse } = req.body || {};
  if (!nouveauMotDePasse || nouveauMotDePasse.length < 8)
    return respond(context, 400, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });

  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id', sql.Int, auth.user.id)
      .query('SELECT MotDePasseHash FROM Utilisateurs WHERE UtilisateurID = @id');

    if (!r.recordset.length) return respond(context, 404, { message: 'Utilisateur introuvable.' });

    if (ancienMotDePasse) {
      const valid = await bcrypt.compare(ancienMotDePasse, r.recordset[0].MotDePasseHash);
      if (!valid) return respond(context, 401, { message: 'Ancien mot de passe incorrect.' });
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 12);
    await pool.request()
      .input('id', sql.Int, auth.user.id)
      .input('hash', sql.NVarChar, hash)
      .query('UPDATE Utilisateurs SET MotDePasseHash = @hash, MustChangePwd = 0, DateModification = GETDATE() WHERE UtilisateurID = @id');

    respond(context, 200, { message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    context.log.error('Change pwd error:', err);
    respond(context, 500, { message: 'Erreur serveur.' });
  }
};
