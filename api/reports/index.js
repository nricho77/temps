const { getPool, sql } = require('../shared/db');
const { requireRole, respond } = require('../shared/auth');
const ExcelJS = require('exceljs');

const DARK_BLUE = '0D1B4B';
const GOLD = 'C9A84C';
const LIGHT_GREY = 'F5F5F5';

module.exports = async function (context, req) {
  if (req.method !== 'GET') return respond(context, 405, { message: 'Méthode non autorisée.' });

  const auth = requireRole(context, req, 'admin', 'gestionnaire');
  if (auth.error) return respond(context, auth.status, { message: auth.message });

  const { periodeId, siteId, format = 'excel', type = 'sommaire' } = req.query || {};
  if (!periodeId) return respond(context, 400, { message: 'PeriodeID requis.' });

  try {
    const pool = await getPool();

    // Récupérer infos période
    const periodeR = await pool.request()
      .input('pid', sql.Int, parseInt(periodeId))
      .query('SELECT * FROM Periodes WHERE PeriodeID = @pid');
    if (!periodeR.recordset.length) return respond(context, 404, { message: 'Période introuvable.' });
    const periode = periodeR.recordset[0];

    // Récupérer site
    let siteInfo = null;
    if (siteId) {
      const sr = await pool.request().input('sid', sql.VarChar, siteId)
        .query('SELECT * FROM Sites WHERE SiteID = @sid');
      siteInfo = sr.recordset[0];
    }

    // Construire WHERE
    let siteWhere = siteId ? `AND e.SiteID = '${siteId}'` : '';
    if (auth.user.role === 'gestionnaire') {
      siteWhere = `AND e.SiteID IN (SELECT SiteID FROM UtilisateurSites WHERE UtilisateurID = ${auth.user.id} AND EstGestionnaire = 1)`;
    }

    // Récupérer toutes les entrées
    const entriesR = await pool.request()
      .input('pid', sql.Int, parseInt(periodeId))
      .query(`SELECT e.*, u.Prenom, u.Nom, u.NumeroEmploye, u.TauxHoraire, u.HeuresStdJour,
                     u.Statut AS StatutEmploye, u.ModePaiement, s.NomSite
              FROM EntreesTemps e
              JOIN Utilisateurs u ON e.UtilisateurID = u.UtilisateurID
              JOIN Sites s ON e.SiteID = s.SiteID
              WHERE e.PeriodeID = @pid ${siteWhere} AND e.Statut = 'approuve'
              ORDER BY u.Nom, u.Prenom, e.DateJournee`);

    const entries = entriesR.recordset;

    // CSV simple
    if (format === 'csv') {
      const headers = ['Numero','Nom','Prénom','Heures Travaillées','Heures Féries','Ajust. Banque Temps','Retrait Maladie','Formation','Heures Vacances','Total Heures'];
      const byEmployee = {};
      for (const e of entries) {
        if (!byEmployee[e.UtilisateurID]) byEmployee[e.UtilisateurID] = { ...e, rows: [] };
        byEmployee[e.UtilisateurID].rows.push(e);
      }

      let csv = headers.join(',') + '\n';
      for (const uid of Object.keys(byEmployee)) {
        const emp = byEmployee[uid];
        const rows = emp.rows;
        const totals = rows.reduce((acc, r) => ({
          ht: acc.ht + (r.HeuresTravaillees || 0),
          hf: acc.hf + (r.HeuresFerieesPayees || 0),
          ajust: acc.ajust + (r.AjustementBanqueTemps || 0),
          maladie: acc.maladie + (r.RetraitBanqueMaladie || 0),
          formation: acc.formation + (r.Formation ? 1 : 0),
          vac: acc.vac + (r.HeuresVacancesPrises || 0),
        }), { ht: 0, hf: 0, ajust: 0, maladie: 0, formation: 0, vac: 0 });
        csv += `${emp.NumeroEmploye},"${emp.Nom}, ${emp.Prenom}","${emp.Prenom}",${totals.ht.toFixed(2)},${totals.hf.toFixed(2)},${totals.ajust.toFixed(2)},${totals.maladie.toFixed(2)},${totals.formation},${totals.vac.toFixed(2)},${(totals.ht + totals.hf).toFixed(2)}\n`;
      }

      context.res = {
        status: 200,
        body: csv,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rapport_${periode.NomPeriode.replace(/\s/g, '_')}.csv"`,
        },
      };
      return;
    }

    // EXCEL - Format identique au template GLPN
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sankofa Education';
    workbook.created = new Date();

    const titleStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK_BLUE } }, alignment: { horizontal: 'center', vertical: 'middle' } };
    const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK_BLUE } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: { bottom: { style: 'thin', color: { argb: 'FF' + GOLD } } } };
    const goldStyle = { font: { bold: true, color: { argb: 'FF' + GOLD }, size: 10 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK_BLUE } } };

    // ── ONGLET SOMMAIRE ──
    const summarySheet = workbook.addWorksheet('Sommaire');
    summarySheet.mergeCells('A1:V1');
    summarySheet.getCell('A1').value = siteInfo?.NomSite || 'Toutes les garderies';
    Object.assign(summarySheet.getCell('A1'), titleStyle);
    summarySheet.getRow(1).height = 30;

    summarySheet.mergeCells('A2:V2');
    summarySheet.getCell('A2').value = 'Fiche d\'heures travaillées';
    Object.assign(summarySheet.getCell('A2'), { font: { bold: true, size: 12, color: { argb: 'FF' + GOLD } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK_BLUE } }, alignment: { horizontal: 'center' } });

    summarySheet.mergeCells('A3:V3');
    summarySheet.getCell('A3').value = 'Sommaire';
    Object.assign(summarySheet.getCell('A3'), goldStyle);
    summarySheet.getRow(3).height = 20;

    summarySheet.getCell('A5').value = 'Début';
    summarySheet.getCell('B5').value = periode.DateDebut;
    summarySheet.getCell('B5').numFmt = 'yyyy-mm-dd';
    summarySheet.getCell('A6').value = 'Fin';
    summarySheet.getCell('B6').value = periode.DateFin;
    summarySheet.getCell('B6').numFmt = 'yyyy-mm-dd';

    const summaryHeaders = [
      'Numéro Employé', 'Nom, Prénom', 'Prénom', 'Nom',
      'Heures Travaillées', 'Heures Fériées Payées', 'Ajust. Banque Temps',
      'Retrait Banque Maladie', 'Formation', 'Heures Vacances',
      'Total Heures', 'Statut Employé', 'Mode Paiement'
    ];

    const summaryHeaderRow = summarySheet.addRow([]);
    summaryHeaderRow.height = 40;
    summaryHeaders.forEach((h, i) => {
      const cell = summaryHeaderRow.getCell(i + 1);
      cell.value = h;
      Object.assign(cell, headerStyle);
    });
    summarySheet.getRow(summarySheet.lastRow.number - 1).number;

    // Grouper par employé
    const byEmployee = {};
    for (const e of entries) {
      if (!byEmployee[e.UtilisateurID]) {
        byEmployee[e.UtilisateurID] = {
          NumeroEmploye: e.NumeroEmploye, Prenom: e.Prenom, Nom: e.Nom,
          TauxHoraire: e.TauxHoraire, StatutEmploye: e.StatutEmploye,
          ModePaiement: e.ModePaiement, rows: []
        };
      }
      byEmployee[e.UtilisateurID].rows.push(e);
    }

    for (const uid of Object.keys(byEmployee)) {
      const emp = byEmployee[uid];
      const rows = emp.rows;
      const ht = rows.reduce((s, r) => s + (r.HeuresTravaillees || 0), 0);
      const hf = rows.reduce((s, r) => s + (r.HeuresFerieesPayees || 0), 0);
      const ajust = rows.reduce((s, r) => s + (r.AjustementBanqueTemps || 0), 0);
      const maladie = rows.reduce((s, r) => s + (r.RetraitBanqueMaladie || 0), 0);
      const formation = rows.reduce((s, r) => s + (r.Formation ? 1 : 0), 0);
      const vac = rows.reduce((s, r) => s + (r.HeuresVacancesPrises || 0), 0);

      const dataRow = summarySheet.addRow([
        emp.NumeroEmploye, `${emp.Nom}, ${emp.Prenom}`, emp.Prenom, emp.Nom,
        ht, hf, ajust, maladie, formation, vac,
        ht + hf, emp.StatutEmploye, emp.ModePaiement
      ]);
      dataRow.getCell(5).numFmt = '0.00';
      dataRow.getCell(6).numFmt = '0.00';
      dataRow.getCell(11).numFmt = '0.00';
      if (dataRow.number % 2 === 0) {
        dataRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }; });
      }
    }

    // Largeurs colonnes sommaire
    summarySheet.columns = [
      { width: 12 }, { width: 30 }, { width: 15 }, { width: 20 },
      { width: 16 }, { width: 16 }, { width: 18 }, { width: 18 },
      { width: 12 }, { width: 16 }, { width: 14 }, { width: 22 }, { width: 18 }
    ];

    // ── ONGLET PAR EMPLOYÉ ──
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    for (const uid of Object.keys(byEmployee)) {
      const emp = byEmployee[uid];
      const sheetName = `${emp.Nom}, ${emp.Prenom}`.substring(0, 31);
      const ws = workbook.addWorksheet(sheetName);

      // En-tête fiche individuelle
      ws.mergeCells('A1:R1');
      ws.getCell('A1').value = siteInfo?.NomSite || 'Sankofa Education';
      Object.assign(ws.getCell('A1'), titleStyle);
      ws.getRow(1).height = 28;

      ws.mergeCells('A2:R2');
      ws.getCell('A2').value = 'Fiche d\'heures travaillées';
      Object.assign(ws.getCell('A2'), { font: { bold: true, size: 11, color: { argb: 'FF' + GOLD } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK_BLUE } }, alignment: { horizontal: 'center' } });

      ws.getCell('A4').value = 'Numéro'; ws.getCell('B4').value = emp.NumeroEmploye;
      ws.getCell('A5').value = 'Employé(e)'; ws.getCell('B5').value = `${emp.Nom}, ${emp.Prenom}`;
      ws.getCell('A6').value = 'Prénom'; ws.getCell('B6').value = emp.Prenom;
      ws.getCell('A7').value = 'Nom'; ws.getCell('B7').value = emp.Nom;
      ws.getCell('A8').value = 'Mode de paie'; ws.getCell('B8').value = emp.ModePaiement;
      ws.getCell('A9').value = 'Statut'; ws.getCell('B9').value = emp.StatutEmploye;
      ws.getCell('A10').value = 'Début'; ws.getCell('B10').value = periode.DateDebut; ws.getCell('B10').numFmt = 'yyyy-mm-dd';
      ws.getCell('A11').value = 'Fin'; ws.getCell('B11').value = periode.DateFin; ws.getCell('B11').numFmt = 'yyyy-mm-dd';

      ['A4','A5','A6','A7','A8','A9','A10','A11'].forEach(cell => {
        ws.getCell(cell).font = { bold: true };
      });

      // En-têtes colonnes
      const colHeaders = [
        'N°', 'Date', 'Jour', 'Heure Arrivée', 'Heure Départ',
        'Pause Payée', 'Heures Travaillées', 'Jour Férié', 'Heures Fériées',
        'Ajust. Banque', 'Malade', 'Retrait Maladie', 'Heures Vacances',
        'Banque Vacances', 'Formation', 'H. Supp', 'Source', 'Taux Horaire'
      ];
      const hRow = ws.addRow(colHeaders);
      hRow.height = 35;
      hRow.eachCell(cell => { Object.assign(cell, headerStyle); });

      let rowNum = 1;
      let totHT = 0, totHF = 0, totAjust = 0, totMaladie = 0, totVac = 0, totSupp = 0;

      // Générer toutes les dates de la période
      const startDate = new Date(periode.DateDebut);
      const endDate = new Date(periode.DateFin);
      const entryMap = {};
      for (const e of emp.rows) entryMap[e.DateJournee?.toISOString?.().split('T')[0] || e.DateJournee] = e;

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const entry = entryMap[dateStr];
        const dayName = jours[d.getDay()];
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        const dataRow = ws.addRow([
          rowNum++,
          new Date(dateStr),
          dayName,
          entry?.HeureArrivee || '',
          entry?.HeureDepart || '',
          entry?.PausePayee ? 'Oui' : (entry ? 'Non' : ''),
          entry?.HeuresTravaillees || '',
          entry?.JourFerie ? 'Oui' : '',
          entry?.HeuresFerieesPayees || '',
          entry?.AjustementBanqueTemps || '',
          entry?.RetraitBanqueMaladie ? 'Oui' : '',
          entry?.RetraitBanqueMaladie || '',
          entry?.HeuresVacancesPrises || '',
          '',
          entry?.Formation ? 'Oui' : '',
          entry?.HeuresSupplementaires || '',
          entry?.SourceSaisie || '',
          emp.TauxHoraire || '',
        ]);

        dataRow.getCell(2).numFmt = 'yyyy-mm-dd';
        if (isWeekend) {
          dataRow.eachCell(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
            c.font = { color: { argb: 'FF888888' } };
          });
        } else if (entry?.JourFerie) {
          dataRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }; });
        } else if (entry?.Statut === 'approuve') {
          dataRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }; });
        }

        if (entry) {
          totHT += entry.HeuresTravaillees || 0;
          totHF += entry.HeuresFerieesPayees || 0;
          totAjust += entry.AjustementBanqueTemps || 0;
          totMaladie += entry.RetraitBanqueMaladie || 0;
          totVac += entry.HeuresVacancesPrises || 0;
          totSupp += entry.HeuresSupplementaires || 0;
        }
      }

      // Ligne total
      const totalRow = ws.addRow(['', '', 'TOTAL', '', '', '', totHT.toFixed(2), '', totHF.toFixed(2), totAjust.toFixed(2), '', totMaladie.toFixed(2), totVac.toFixed(2), '', '', totSupp.toFixed(2), '', '']);
      totalRow.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK_BLUE } }; });

      ws.columns = [
        { width: 5 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 },
        { width: 11 }, { width: 14 }, { width: 11 }, { width: 13 }, { width: 13 },
        { width: 9 }, { width: 14 }, { width: 15 }, { width: 14 }, { width: 11 },
        { width: 10 }, { width: 10 }, { width: 12 }
      ];
    }

    // Générer le buffer Excel
    const buffer = await workbook.xlsx.writeBuffer();

    context.res = {
      status: 200,
      body: buffer,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="rapport_${periode.NomPeriode.replace(/\s/g,'_')}.xlsx"`,
        'Content-Length': buffer.length.toString(),
      },
      isRaw: true,
    };
  } catch (err) {
    context.log.error('Report error:', err);
    respond(context, 500, { message: 'Erreur lors de la génération du rapport.' });
  }
};
