const express = require('express');
const {
  getAllUsers,
  updateUserRole,
  deleteUser,
  findUserById,
  updateUserAccount,
  countAdminsByClub,
} = require('../models/userModel');
const { getPlayersByTeam } = require('../models/playerModel');
const { getTeamsByClub } = require('../models/clubTeamModel');

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

// Listado de usuarios registrados
router.get('/', ensureAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.session.user.role === 'superadmin';
    const clubFilter = isSuperAdmin ? null : req.session.user.default_club || null;
    const users = await getAllUsers(clubFilter);
    return res.render('users/list', { users, currentUser: req.session.user });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al obtener usuarios:', err);
    req.flash('error', 'Ha ocurrido un error al cargar los usuarios.');
    return res.redirect('/');
  }
});

// Cambiar rol de un usuario
router.post('/:id/role', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const isSuperAdmin = req.session.user.role === 'superadmin';
  const validRoles = isSuperAdmin ? ['user', 'admin', 'superadmin'] : ['user', 'admin'];

  if (!validRoles.includes(role)) {
    req.flash('error', 'Rol no válido.');
    return res.redirect('/admin/users');
  }

  try {
    const targetUser = await findUserById(id);

    if (!targetUser) {
      req.flash('error', 'Usuario no encontrado.');
      return res.redirect('/admin/users');
    }

    // Garantizar que no se queda el club sin admins
    if (
      targetUser.role === 'admin'
      && role !== 'admin'
      && targetUser.default_club
    ) {
      const totalAdmins = await countAdminsByClub(targetUser.default_club);
      if (totalAdmins <= 1) {
        req.flash(
          'error',
          'No puedes cambiar el rol de este usuario porque dejarías al club sin ningún administrador.',
        );
        return res.redirect('/admin/users');
      }
    }

    if (!isSuperAdmin) {
      if (targetUser.role === 'superadmin') {
        req.flash('error', 'No puedes modificar un usuario superadmin.');
        return res.redirect('/admin/users');
      }

      if (
        req.session.user.default_club
        && targetUser.default_club
        && targetUser.default_club !== req.session.user.default_club
      ) {
        req.flash('error', 'No puedes modificar usuarios de otro club.');
        return res.redirect('/admin/users');
      }
    }

    // Evitar que un admin se quite a sí mismo todos los permisos por accidente
    if (Number(id) === req.session.user.id && role !== 'admin') {
      req.flash(
        'error',
        'No puedes cambiar tu propio rol a un perfil sin permisos de administrador.',
      );
      return res.redirect('/admin/users');
    }

    await updateUserRole(id, role);
    req.flash('success', 'Rol actualizado correctamente.');
    return res.redirect('/admin/users');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al actualizar rol de usuario:', err);
    req.flash('error', 'Ha ocurrido un error al actualizar el rol.');
    return res.redirect('/admin/users');
  }
});

// Borrar usuario
router.post('/:id/delete', ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const isSuperAdmin = req.session.user.role === 'superadmin';
    const targetUser = await findUserById(id);

    if (!targetUser) {
      req.flash('error', 'Usuario no encontrado.');
      return res.redirect('/admin/users');
    }

    if (!isSuperAdmin) {
      if (targetUser.role === 'superadmin') {
        req.flash('error', 'No puedes borrar un usuario superadmin.');
        return res.redirect('/admin/users');
      }

      if (
        req.session.user.default_club
        && targetUser.default_club
        && targetUser.default_club !== req.session.user.default_club
      ) {
        req.flash('error', 'No puedes borrar usuarios de otro club.');
        return res.redirect('/admin/users');
      }
    }

    // Garantizar que no se queda el club sin admins
    if (targetUser.role === 'admin' && targetUser.default_club) {
      const totalAdmins = await countAdminsByClub(targetUser.default_club);
      if (totalAdmins <= 1) {
        req.flash(
          'error',
          'No puedes borrar este usuario porque dejarías al club sin ningún administrador.',
        );
        return res.redirect('/admin/users');
      }
    }
    if (Number(id) === req.session.user.id) {
      req.flash('error', 'No puedes borrar tu propio usuario.');
      return res.redirect('/admin/users');
    }

    await deleteUser(id);
    req.flash('success', 'Usuario borrado correctamente.');
    return res.redirect('/admin/users');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al borrar usuario:', err);
    req.flash('error', 'Ha ocurrido un error al borrar el usuario.');
    return res.redirect('/admin/users');
  }
});

// Borrado múltiple de usuarios
router.post('/bulk-delete', ensureAdmin, async (req, res) => {
  let { userIds } = req.body;

  if (!userIds) {
    req.flash('error', 'No has seleccionado ningún usuario para borrar.');
    return res.redirect('/admin/users');
  }

  if (!Array.isArray(userIds)) {
    userIds = [userIds];
  }

  try {
    const isSuperAdmin = req.session.user.role === 'superadmin';
    const idsToDelete = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const rawId of userIds) {
      const userId = Number(rawId);
      if (!Number.isInteger(userId) || userId === req.session.user.id) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const targetUser = await findUserById(userId);
      if (!targetUser) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (!isSuperAdmin) {
        if (targetUser.role === 'superadmin') {
          // eslint-disable-next-line no-continue
          continue;
        }

        if (
          req.session.user.default_club
          && targetUser.default_club
          && targetUser.default_club !== req.session.user.default_club
        ) {
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      if (targetUser.role === 'admin' && targetUser.default_club) {
        // eslint-disable-next-line no-await-in-loop
        const totalAdmins = await countAdminsByClub(targetUser.default_club);
        if (totalAdmins <= 1) {
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      idsToDelete.push(userId);
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const id of idsToDelete) {
      // eslint-disable-next-line no-await-in-loop
      await deleteUser(id);
    }

    if (idsToDelete.length) {
      req.flash('success', 'Usuarios seleccionados borrados correctamente.');
    } else {
      req.flash(
        'error',
        'No se ha borrado ningún usuario (no puedes borrar tu propio usuario).',
      );
    }

    return res.redirect('/admin/users');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en borrado múltiple de usuarios:', err);
    req.flash('error', 'Ha ocurrido un error al borrar los usuarios.');
    return res.redirect('/admin/users');
  }
});

// Formulario de edición de usuario (datos básicos y configuraciones)
router.get('/:id/edit', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const isSuperAdmin = req.session.user.role === 'superadmin';
    const user = await findUserById(id);
    if (!user) {
      req.flash('error', 'Usuario no encontrado.');
      return res.redirect('/admin/users');
    }
    if (!isSuperAdmin) {
      if (user.role === 'superadmin') {
        req.flash('error', 'No puedes editar un usuario superadmin.');
        return res.redirect('/admin/users');
      }

      if (
        req.session.user.default_club
        && user.default_club
        && user.default_club !== req.session.user.default_club
      ) {
        req.flash('error', 'No puedes editar usuarios de otro club.');
        return res.redirect('/admin/users');
      }
    }
    let uniqueTeams = [];
    if (user.default_club) {
      const clubTeams = await getTeamsByClub(user.default_club);
      uniqueTeams = clubTeams.map((t) => t.name);
    } else {
      const players = await getPlayersByTeam(null, null);
      uniqueTeams = Array.from(
        new Set(players.map((p) => p.team).filter((t) => t && t.trim())),
      ).sort();
    }

    return res.render('users/edit', { user, teams: uniqueTeams });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al cargar usuario para edición:', err);
    req.flash('error', 'Ha ocurrido un error al cargar el usuario.');
    return res.redirect('/admin/users');
  }
});

router.post('/:id/edit', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, default_club, default_team, new_password } = req.body;

  if (!name || !email) {
    req.flash('error', 'Nombre y email son obligatorios.');
    return res.redirect(`/admin/users/${id}/edit`);
  }

  try {
    let defaultClubValue = default_club && default_club.trim()
      ? default_club.trim()
      : null;
    let defaultTeamValue = default_team && default_team.trim()
      ? default_team.trim()
      : null;

    if (defaultClubValue) {
      const clubTeams = await getTeamsByClub(defaultClubValue);
      const allowedTeams = clubTeams.map((t) => t.name);
      if (defaultTeamValue && !allowedTeams.includes(defaultTeamValue)) {
        req.flash(
          'error',
          'El equipo por defecto debe ser uno de los equipos configurados para el club.',
        );
        return res.redirect(`/admin/users/${id}/edit`);
      }
      if (!defaultTeamValue) {
        defaultTeamValue = null;
      }
    } else if (!defaultTeamValue) {
      defaultTeamValue = '-';
    }

    let passwordHash = null;
    if (new_password && new_password.trim()) {
      if (new_password.length < 8) {
        req.flash(
          'error',
          'La nueva contraseña debe tener al menos 8 caracteres.',
        );
        return res.redirect(`/admin/users/${id}/edit`);
      }
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(new_password, 10);
    }

    const affected = await updateUserAccount(id, {
      name,
      email,
      defaultClub: defaultClubValue,
      defaultTeam: defaultTeamValue,
      passwordHash,
    });
    if (!affected) {
      req.flash('error', 'No se ha podido actualizar el usuario.');
      return res.redirect(`/admin/users/${id}/edit`);
    }

    req.flash('success', 'Usuario actualizado correctamente.');
    return res.redirect('/admin/users');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error al actualizar usuario:', err);
    req.flash('error', 'Ha ocurrido un error al actualizar el usuario.');
    return res.redirect(`/admin/users/${id}/edit`);
  }
});

module.exports = router;
