const express = require('express');
const {
  getAllClubs,
  createClub,
  deleteClub,
} = require('../models/clubModel');

const router = express.Router();

function ensureSuperAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'superadmin') {
    req.flash('error', 'No tienes permisos para acceder a esta sección.');
    return res.redirect('/');
  }
  return next();
}

// Listado de clubes
router.get('/', ensureSuperAdmin, async (req, res) => {
  try {
    const clubs = await getAllClubs();
    return res.render('clubs/list', { clubs });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al obtener clubes:', err);
    req.flash('error', 'Ha ocurrido un error al cargar los clubes.');
    return res.redirect('/');
  }
});

// Formulario nuevo club
router.get('/new', ensureSuperAdmin, (req, res) => {
  res.render('clubs/new');
});

router.post('/new', ensureSuperAdmin, async (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    req.flash('error', 'Nombre y código son obligatorios.');
    return res.redirect('/admin/clubs/new');
  }

  try {
    await createClub({ name, code });
    req.flash('success', 'Club creado correctamente.');
    return res.redirect('/admin/clubs');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al crear club:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al crear el club. Revisa que el código no esté duplicado.',
    );
    return res.redirect('/admin/clubs/new');
  }
});

// Borrar club
router.post('/:id/delete', ensureSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const affected = await deleteClub(id);
    if (!affected) {
      req.flash('error', 'No se ha podido borrar el club.');
    } else {
      req.flash('success', 'Club borrado correctamente.');
    }
    return res.redirect('/admin/clubs');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al borrar club:', err);
    req.flash('error', 'Ha ocurrido un error al borrar el club.');
    return res.redirect('/admin/clubs');
  }
});

module.exports = router;

