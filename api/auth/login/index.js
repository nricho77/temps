const { getPool, sql } = require('../shared/db');
const { respond } = require('../shared/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async function (context, req) {
  if (req.method !== 'POST') return respond(context, 405, { message: 'Méthode non autorisée.' });

  const { email, motDePasse } = req.body || {};
  if (!email || !motDePasse) return respond(context, 400, { message: 'Email et mot de passe requis.' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .query(`SELECT u.*, STRING_AGG(us.SiteID, ',') AS sites
              FROM Utilisateurs u
              LEFT JOIN UtilisateurSites us ON u.UtilisateurID = us.UtilisateurID
              WHERE u.Email = @email AND u.Actif = 1
              GROUP BY u.UtilisateurID, u.NumeroEmploye, u.Prenom, u.Nom, u.Email,
                       u.MotDePasseHash, u.Role, u.Statut, u.TauxHoraire, u.HeuresStdJour,
                       u.ModePaiement, u.BadgeToken, u.Actif, u.MustChangePwd,
                       u.DateCreation, u.DateModification`);

    if (result.recordset.length === 0) return respond(context, 401, { message: 'Identifiants incorrects.' });

    const user = result.recordset[0];
    const valid = await bcrypt.compare(motDePasse, user.MotDePasseHash);
    if (!valid) return respond(context, 401, { message: 'Identifiants incorrects.' });

    const payload = {
      id: user.UtilisateurID,
      email: user.Email,
      prenom: user.Prenom,
      nom: user.Nom,
      role: user.Role,
      sites: user.sites ? user.sites.split(',') : [],
      mustChangePwd: user.MustChangePwd === true || user.MustChangePwd === 1,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

    respond(context, 200, {
      token,
      user: {
        id: user.UtilisateurID,
        numeroEmploye: user.NumeroEmploye,
        prenom: user.Prenom,
        nom: user.Nom,
        email: user.Email,
        role: user.Role,
        statut: user.Statut,
        sites: user.sites ? user.sites.split(',') : [],
        mustChangePwd: user.MustChangePwd === true || user.MustChangePwd === 1,
        heuresStdJour: user.HeuresStdJour,
        tauxHoraire: user.TauxHoraire,
      },
    });
  } catch (err) {
    context.log.error('Login error:', err);
    respond(context, 500, { message: 'Erreur serveur.' });
  }
};
