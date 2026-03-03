const db = require('../db');

async function createClubRecommendationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS club_recommendations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      club VARCHAR(150) NOT NULL,
      year INT NOT NULL,
      options TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_club_year (club, year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await db.query(sql);

  // Pre-cargar configuración por defecto (club genérico "DEFAULT")
  const defaults = [
    { year: 2008, options: 'JUVENIL A,JUVENIL B' },
    { year: 2009, options: 'JUVENIL A,JUVENIL B' },
    { year: 2010, options: 'JUVENIL A,JUVENIL B' },
    { year: 2011, options: 'CADETE A,CADETE B,CADETE C' },
    { year: 2012, options: 'CADETE A,CADETE B,CADETE C' },
    { year: 2013, options: 'INFANTIL A,INFANTIL B,INFANTIL C' },
    { year: 2014, options: 'INFANTIL A,INFANTIL B,INFANTIL C' },
    { year: 2015, options: 'ALEVIN A,ALEVIN B,ALEVIN C' },
    { year: 2016, options: 'ALEVIN A,ALEVIN B,ALEVIN C' },
    { year: 2017, options: 'BENJAMIN A,BENJAMIN B,BENJAMIN C' },
    { year: 2018, options: 'BENJAMIN A,BENJAMIN B,BENJAMIN C' },
    { year: 2019, options: 'PREBENJAMIN' },
  ];

  // eslint-disable-next-line no-restricted-syntax
  for (const def of defaults) {
    // eslint-disable-next-line no-await-in-loop
    await db.query(
      `
        INSERT IGNORE INTO club_recommendations (club, year, options)
        VALUES ('DEFAULT', ?, ?)
      `,
      [def.year, def.options],
    );
  }
}

async function getRecommendationsByClub(club) {
  const [rows] = await db.query(
    'SELECT id, club, year, options FROM club_recommendations WHERE club = ? ORDER BY year ASC',
    [club],
  );
  return rows;
}

async function upsertRecommendation({ club, year, options }) {
  const [result] = await db.query(
    `
      INSERT INTO club_recommendations (club, year, options)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE options = VALUES(options)
    `,
    [club, year, options],
  );
  return result.affectedRows;
}

async function updateRecommendation(id, club, { year, options }) {
  const [result] = await db.query(
    'UPDATE club_recommendations SET year = ?, options = ? WHERE id = ? AND club = ?',
    [year, options, id, club],
  );
  return result.affectedRows;
}

async function deleteRecommendation(id, club) {
  const [result] = await db.query(
    'DELETE FROM club_recommendations WHERE id = ? AND club = ?',
    [id, club],
  );
  return result.affectedRows;
}

module.exports = {
  createClubRecommendationsTable,
  getRecommendationsByClub,
  upsertRecommendation,
  updateRecommendation,
  deleteRecommendation,
};
