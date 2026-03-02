const db = require('../db');

async function createClubTeamsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS club_teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      club VARCHAR(150) NOT NULL,
      name VARCHAR(150) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_club_team (club, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await db.query(sql);
}

async function getTeamsByClub(club) {
  if (!club) {
    return [];
  }
  const [rows] = await db.query(
    'SELECT id, club, name, created_at FROM club_teams WHERE club = ? ORDER BY name ASC',
    [club],
  );
  return rows;
}

async function createTeam({ club, name }) {
  const [result] = await db.query(
    'INSERT INTO club_teams (club, name) VALUES (?, ?)',
    [club, name],
  );
  return result.insertId;
}

async function updateTeamName(id, club, name) {
  const [result] = await db.query(
    'UPDATE club_teams SET name = ? WHERE id = ? AND club = ?',
    [name, id, club],
  );
  return result.affectedRows;
}

async function deleteTeam(id, club) {
  const [result] = await db.query(
    'DELETE FROM club_teams WHERE id = ? AND club = ?',
    [id, club],
  );
  return result.affectedRows;
}

module.exports = {
  createClubTeamsTable,
  getTeamsByClub,
  createTeam,
  updateTeamName,
  deleteTeam,
};

