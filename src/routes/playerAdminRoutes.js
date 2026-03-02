const express = require('express');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const {
  getAllPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
  insertPlayer,
} = require('../models/playerModel');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

function ensureAdmin(req, res, next) {
  if (
    !req.session.user
    || (req.session.user.role !== 'admin'
      && req.session.user.role !== 'superadmin')
  ) {
    req.flash('error', 'No tienes permisos para acceder a esta sección.');
    return res.redirect('/');
  }
  return next();
}

// Listado de jugadores
router.get('/', ensureAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.session.user.role === 'superadmin';
    const clubFilter = isSuperAdmin ? null : req.session.user.default_club || null;
    const players = await getAllPlayers(clubFilter);
    return res.render('players/list', { players });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al obtener jugadores:', err);
    req.flash('error', 'Ha ocurrido un error al cargar los jugadores.');
    return res.redirect('/');
  }
});

// Descargar plantilla de jugadores en Excel
router.get('/template', ensureAdmin, (req, res) => {
  const wb = XLSX.utils.book_new();
  const header = [
    ['first_name', 'last_name', 'team', 'birth_date', 'birth_year', 'laterality'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(header);
  XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="plantilla_jugadores.xlsx"',
  );
  return res.send(buffer);
});

// Formulario de importación masiva
router.get('/import', ensureAdmin, (req, res) => {
  res.render('players/import');
});

// Importación masiva desde Excel
router.post(
  '/import',
  ensureAdmin,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      req.flash('error', 'Debes seleccionar un fichero Excel.');
      return res.redirect('/admin/players/import');
    }

    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        req.flash('error', 'El fichero no contiene hojas válidas.');
        return res.redirect('/admin/players/import');
      }

      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows || rows.length < 2) {
        req.flash('error', 'La plantilla no contiene datos para importar.');
        return res.redirect('/admin/players/import');
      }

      // Saltamos la fila de cabecera
      const dataRows = rows.slice(1);

      const { user } = req.session;
      const club =
        user && user.default_club
          ? user.default_club
          : null;

      let imported = 0;

      // eslint-disable-next-line no-restricted-syntax
      for (const row of dataRows) {
        const [
          firstName,
          lastName,
          team,
          birthDate,
          birthYear,
          laterality,
        ] = row;

        if (!firstName || !lastName) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        await insertPlayer({
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          club,
          team: team ? String(team).trim() : null,
          birthDate: birthDate || null,
          birthYear: birthYear ? Number(birthYear) : null,
          laterality: laterality ? String(laterality).trim() : null,
        });
        imported += 1;
      }

      if (!imported) {
        req.flash(
          'error',
          'No se ha importado ningún jugador. Revisa que la plantilla contenga nombres y apellidos.',
        );
      } else {
        req.flash(
          'success',
          `Se han importado ${imported} jugadores correctamente.`,
        );
      }

      return res.redirect('/admin/players');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error al importar jugadores desde Excel:', err);
      req.flash(
        'error',
        'Ha ocurrido un error al procesar el fichero. Asegúrate de usar la plantilla descargada.',
      );
      return res.redirect('/admin/players/import');
    }
  },
);

// Formulario de nuevo jugador
router.get('/new', ensureAdmin, (req, res) => {
  res.render('players/new');
});

router.post('/new', ensureAdmin, async (req, res) => {
  const {
    first_name,
    last_name,
    team,
    birth_date,
    birth_year,
    laterality,
  } = req.body;

  if (!first_name || !last_name) {
    req.flash('error', 'Nombre y apellidos son obligatorios.');
    return res.redirect('/admin/players/new');
  }

  try {
    const { user } = req.session;
    const club =
      user && user.role === 'admin'
        ? user.default_club || null
        : (user && user.default_club) || null;

    await insertPlayer({
      firstName: first_name,
      lastName: last_name,
      club,
      team: team || null,
      birthDate: birth_date || null,
      birthYear: birth_year || null,
      laterality: laterality || null,
    });

    req.flash('success', 'Jugador creado correctamente.');
    return res.redirect('/admin/players');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al crear jugador:', err);
    req.flash('error', 'Ha ocurrido un error al crear el jugador.');
    return res.redirect('/admin/players/new');
  }
});

// Formulario de edición de jugador
router.get('/:id/edit', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const isSuperAdmin = req.session.user.role === 'superadmin';
    const clubFilter = isSuperAdmin ? null : req.session.user.default_club || null;
    const player = await getPlayerById(id, clubFilter);
    if (!player) {
      req.flash('error', 'Jugador no encontrado.');
      return res.redirect('/admin/players');
    }
    return res.render('players/edit', { player });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al cargar jugador para edición:', err);
    req.flash('error', 'Ha ocurrido un error al cargar el jugador.');
    return res.redirect('/admin/players');
  }
});

router.post('/:id/edit', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    team,
    birth_date,
    birth_year,
    laterality,
  } = req.body;

  if (!first_name || !last_name) {
    req.flash('error', 'Nombre y apellidos son obligatorios.');
    return res.redirect(`/admin/players/${id}/edit`);
  }

  try {
    const affected = await updatePlayer(id, {
      firstName: first_name,
      lastName: last_name,
      team: team || null,
      birthDate: birth_date || null,
      birthYear: birth_year || null,
      laterality: laterality || null,
    });

    if (!affected) {
      req.flash('error', 'No se ha podido actualizar el jugador.');
      return res.redirect(`/admin/players/${id}/edit`);
    }

    req.flash('success', 'Jugador actualizado correctamente.');
    return res.redirect('/admin/players');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al actualizar jugador:', err);
    req.flash('error', 'Ha ocurrido un error al actualizar el jugador.');
    return res.redirect(`/admin/players/${id}/edit`);
  }
});

// Borrado individual de jugador
router.post('/:id/delete', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const isSuperAdmin = req.session.user.role === 'superadmin';
    const clubFilter = isSuperAdmin ? null : req.session.user.default_club || null;

    if (!isSuperAdmin) {
      const player = await getPlayerById(id, clubFilter);
      if (!player) {
        req.flash('error', 'No se ha podido borrar el jugador.');
        return res.redirect('/admin/players');
      }
    }

    const affected = await deletePlayer(id);
    if (!affected) {
      req.flash('error', 'No se ha podido borrar el jugador.');
    } else {
      req.flash('success', 'Jugador borrado correctamente.');
    }
    return res.redirect('/admin/players');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al borrar jugador:', err);
    req.flash('error', 'Ha ocurrido un error al borrar el jugador.');
    return res.redirect('/admin/players');
  }
});

// Borrado múltiple de jugadores
router.post('/bulk-delete', ensureAdmin, async (req, res) => {
  let { playerIds } = req.body;

  if (!playerIds) {
    req.flash('error', 'No has seleccionado ningún jugador para borrar.');
    return res.redirect('/admin/players');
  }

  if (!Array.isArray(playerIds)) {
    playerIds = [playerIds];
  }

  try {
    const isSuperAdmin = req.session.user.role === 'superadmin';
    const clubFilter = isSuperAdmin ? null : req.session.user.default_club || null;

    const idsToDelete = [];

    playerIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id))
      .forEach((id) => {
        if (isSuperAdmin) {
          idsToDelete.push(id);
        } else {
          idsToDelete.push(id);
        }
      });

    // eslint-disable-next-line no-restricted-syntax
    for (const id of idsToDelete) {
      // eslint-disable-next-line no-await-in-loop
      await deletePlayer(id);
    }

    if (idsToDelete.length) {
      req.flash('success', 'Jugadores seleccionados borrados correctamente.');
    } else {
      req.flash('error', 'No se ha borrado ningún jugador.');
    }

    return res.redirect('/admin/players');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en borrado múltiple de jugadores:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al borrar los jugadores seleccionados.',
    );
    return res.redirect('/admin/players');
  }
});

module.exports = router;
