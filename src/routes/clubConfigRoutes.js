const express = require('express');

const { getAllUsers } = require('../models/userModel');
const { getAllPlayers } = require('../models/playerModel');
const { getAllReports } = require('../models/reportModel');
const {
  getTeamsByClub,
  createTeam,
  updateTeamName,
  deleteTeam,
} = require('../models/clubTeamModel');
const {
  getRecommendationsByClub,
  upsertRecommendation,
  updateRecommendation,
  deleteRecommendation,
} = require('../models/clubRecommendationModel');

const router = express.Router();

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

function getCurrentClubFromSession(req) {
  const { user } = req.session;
  if (!user || !user.default_club) {
    return null;
  }
  return user.default_club;
}

router.get('/', ensureAdmin, async (req, res) => {
  const club = getCurrentClubFromSession(req);
  if (!club) {
    req.flash(
      'error',
      'Debes configurar primero el club por defecto en tu cuenta para acceder a la configuración del club.',
    );
    return res.redirect('/account');
  }

  try {
    const [users, players, reports, teams, recommendations] = await Promise.all([
      getAllUsers(club),
      getAllPlayers(club),
      getAllReports(club),
      getTeamsByClub(club),
      getRecommendationsByClub(club),
    ]);

    return res.render('club/config', {
      club,
      users,
      players,
      reports,
      teams,
      recommendations,
      recommendations: [],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al cargar configuración de club:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al cargar la configuración del club.',
    );
    return res.redirect('/dashboard');
  }
});

router.post('/teams', ensureAdmin, async (req, res) => {
  const club = getCurrentClubFromSession(req);
  if (!club) {
    req.flash(
      'error',
      'Debes configurar primero el club por defecto en tu cuenta.',
    );
    return res.redirect('/account');
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    req.flash('error', 'El nombre de equipo es obligatorio.');
    return res.redirect('/admin/club');
  }

  try {
    await createTeam({ club, name: name.trim() });
    req.flash('success', 'Equipo creado correctamente.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al crear equipo de club:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al crear el equipo. Revisa que no esté duplicado.',
    );
  }
  return res.redirect('/admin/club');
});

router.post('/teams/:id/rename', ensureAdmin, async (req, res) => {
  const club = getCurrentClubFromSession(req);
  if (!club) {
    req.flash(
      'error',
      'Debes configurar primero el club por defecto en tu cuenta.',
    );
    return res.redirect('/account');
  }

  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    req.flash('error', 'El nombre de equipo es obligatorio.');
    return res.redirect('/admin/club');
  }

  try {
    const affected = await updateTeamName(id, club, name.trim());
    if (!affected) {
      req.flash('error', 'No se ha podido actualizar el equipo.');
    } else {
      req.flash('success', 'Equipo actualizado correctamente.');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al renombrar equipo de club:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al actualizar el equipo. Revisa que no esté duplicado.',
    );
  }

  return res.redirect('/admin/club');
});

router.post('/teams/:id/delete', ensureAdmin, async (req, res) => {
  const club = getCurrentClubFromSession(req);
  if (!club) {
    req.flash(
      'error',
      'Debes configurar primero el club por defecto en tu cuenta.',
    );
    return res.redirect('/account');
  }

  const { id } = req.params;

  try {
    const affected = await deleteTeam(id, club);
    if (!affected) {
      req.flash('error', 'No se ha podido borrar el equipo.');
    } else {
      req.flash('success', 'Equipo borrado correctamente.');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al borrar equipo de club:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al borrar el equipo del club.',
    );
  }

  return res.redirect('/admin/club');
});

router.post('/recommendations', ensureAdmin, async (req, res) => {
  const club = getCurrentClubFromSession(req);
  if (!club) {
    req.flash(
      'error',
      'Debes configurar primero el club por defecto en tu cuenta.',
    );
    return res.redirect('/account');
  }

  const { year, options } = req.body;
  const yearNum = Number(year);
  if (!yearNum || Number.isNaN(yearNum)) {
    req.flash('error', 'El año debe ser un número válido.');
    return res.redirect('/admin/club');
  }

  const optionsText = (options || '').trim();
  if (!optionsText) {
    req.flash('error', 'Debes indicar al menos una opción de recomendación.');
    return res.redirect('/admin/club');
  }

  try {
    await upsertRecommendation({
      club,
      year: yearNum,
      options: optionsText,
    });
    req.flash('success', 'Recomendaciones actualizadas correctamente para ese año.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al guardar recomendaciones de club:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al guardar las recomendaciones.',
    );
  }

  return res.redirect('/admin/club');
});

router.post('/recommendations/:id/edit', ensureAdmin, async (req, res) => {
  const club = getCurrentClubFromSession(req);
  if (!club) {
    req.flash(
      'error',
      'Debes configurar primero el club por defecto en tu cuenta.',
    );
    return res.redirect('/account');
  }

  const { id } = req.params;
  const { year, options } = req.body;
  const yearNum = Number(year);
  if (!yearNum || Number.isNaN(yearNum)) {
    req.flash('error', 'El año debe ser un número válido.');
    return res.redirect('/admin/club');
  }

  const optionsText = (options || '').trim();
  if (!optionsText) {
    req.flash('error', 'Debes indicar al menos una opción de recomendación.');
    return res.redirect('/admin/club');
  }

  try {
    const affected = await updateRecommendation(id, club, {
      year: yearNum,
      options: optionsText,
    });
    if (!affected) {
      req.flash('error', 'No se ha podido actualizar la fila de recomendaciones.');
    } else {
      req.flash('success', 'Recomendaciones actualizadas correctamente.');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al actualizar recomendaciones de club:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al actualizar las recomendaciones.',
    );
  }

  return res.redirect('/admin/club');
});

router.post('/recommendations/:id/delete', ensureAdmin, async (req, res) => {
  const club = getCurrentClubFromSession(req);
  if (!club) {
    req.flash(
      'error',
      'Debes configurar primero el club por defecto en tu cuenta.',
    );
    return res.redirect('/account');
  }

  const { id } = req.params;

  try {
    const affected = await deleteRecommendation(id, club);
    if (!affected) {
      req.flash('error', 'No se ha podido borrar la fila de recomendaciones.');
    } else {
      req.flash('success', 'Fila de recomendaciones borrada correctamente.');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al borrar recomendaciones de club:', err);
    req.flash(
      'error',
      'Ha ocurrido un error al borrar las recomendaciones.',
    );
  }

  return res.redirect('/admin/club');
});

module.exports = router;
