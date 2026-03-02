const db = require('../db');

async function createPlayersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS players (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(150) NOT NULL,
      club VARCHAR(150),
      team VARCHAR(150),
      birth_date DATE,
      birth_year INT,
      laterality VARCHAR(5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await db.query(sql);

  // Intentar añadir columna club si la tabla ya existía previamente
  try {
    await db.query('ALTER TABLE players ADD COLUMN club VARCHAR(150)');
  } catch (e) {
    if (e && e.code !== 'ER_DUP_FIELDNAME') {
      // eslint-disable-next-line no-console
      console.error('Error altering players table', e);
    }
  }
}

async function insertPlayer({
  firstName,
  lastName,
  club = null,
  team,
  birthDate,
  birthYear,
  laterality,
}) {
  await db.query(
    'INSERT INTO players (first_name, last_name, club, team, birth_date, birth_year, laterality) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [firstName, lastName, club, team, birthDate, birthYear, laterality],
  );
}

async function getPlayersByTeam(team, club = null) {
  if (team) {
    let sql = 'SELECT * FROM players WHERE team = ?';
    const params = [team];

    if (club) {
      sql += ' AND club = ?';
      params.push(club);
    }

    sql += ' ORDER BY last_name, first_name';

    const [rows] = await db.query(sql, params);
    return rows;
  }

  let sql = 'SELECT * FROM players';
  const params = [];

  if (club) {
    sql += ' WHERE club = ?';
    params.push(club);
  }

  sql += ' ORDER BY team, last_name, first_name';

  const [rows] = await db.query(sql, params);
  return rows;
}

async function getAllPlayers(club = null) {
  let sql = 'SELECT * FROM players';
  const params = [];

  if (club) {
    sql += ' WHERE club = ?';
    params.push(club);
  }

  sql += ' ORDER BY team, last_name, first_name';

  const [rows] = await db.query(sql, params);
  return rows;
}

async function getPlayerById(id, club = null) {
  let sql = 'SELECT * FROM players WHERE id = ?';
  const params = [id];

  if (club) {
    sql += ' AND club = ?';
    params.push(club);
  }

  const [rows] = await db.query(sql, params);
  return rows[0];
}

async function updatePlayer(id, {
  firstName,
  lastName,
  team,
  birthDate,
  birthYear,
  laterality,
}) {
  const [result] = await db.query(
    'UPDATE players SET first_name = ?, last_name = ?, team = ?, birth_date = ?, birth_year = ?, laterality = ? WHERE id = ?',
    [firstName, lastName, team, birthDate, birthYear, laterality, id],
  );
  return result.affectedRows;
}

async function deletePlayer(id) {
  const [result] = await db.query('DELETE FROM players WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  createPlayersTable,
  insertPlayer,
  getPlayersByTeam,
  getAllPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
};
