const express = require('express');
const sql = require('mssql');
const app = express();
const port = process.env.PORT || 80; // Port 80 dla ruchu HTTP

// Konfiguracja połączenia z bazą danych SQL
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
      encrypt: true, // Ze względu na wymagania Azure
      enableArithAbort: true
  }
};

// Funkcja do pobrania możliwych stref dostaw
async function getDeliveryZones() {
  try {
      await sql.connect(dbConfig);
      const result = await sql.query`SELECT * FROM DeliveryZones ORDER BY CAST(id AS INT);`;
      console.log('Możliwe strefy:', result.recordset);
      return result.recordset;
  } catch (err) {
      console.error('Błąd podczas odczytu stref dostaw:', err);
      throw err; // Rzucenie wyjątku do obsługi błędów
  }
}

// Middleware do parsowania JSON
app.use(express.json());

// Endpoint do pobierania stref dostaw
app.get('/zones', async (req, res) => {
  try {
    const zones = await getDeliveryZones();
    res.json(zones);
  } catch (err) {
    res.status(500).send('Błąd serwera podczas pobierania stref dostaw.');
  }
});

// Endpoint do pobierania aktualnej strefy
app.get('/current-zone', async (req, res) => {
  try {
      await sql.connect(dbConfig);
      const result = await sql.query`SELECT * FROM CurrentZone`;
      if (result.recordset.length > 0) {
          res.json(result.recordset[0]);
      } else {
          res.status(404).send('Aktualna strefa nie została znaleziona.');
      }
  } catch (err) {
      console.error('Błąd podczas odczytu aktualnej strefy:', err);
      res.status(500).send('Błąd serwera podczas pobierania aktualnej strefy.');
  }
});

// Endpoint do ustawiania wybranej strefy
app.post('/set-zone', async (req, res) => {
  try {
      const { zoneId, zoneName } = req.body;
      await sql.connect(dbConfig);

      const checkResult = await sql.query`SELECT COUNT(*) as count FROM SelectedZone`;
      const count = checkResult.recordset[0].count;

      if (count > 0) {
          await sql.query`UPDATE SelectedZone SET id = ${zoneId}, name = ${zoneName} WHERE id = (SELECT TOP 1 id FROM SelectedZone)`;
      } else {
          await sql.query`INSERT INTO SelectedZone (id, name) VALUES (${zoneId}, ${zoneName})`;
      }

      res.json({ message: 'Wybrana strefa została zaktualizowana.' });
  } catch (err) {
      console.error('Błąd podczas aktualizacji wybranej strefy:', err);
      res.status(500).send('Błąd serwera podczas aktualizacji wybranej strefy.');
  }
});

// Start serwera
app.listen(port, () => {
    console.log(`Serwer działa na porcie ${port}`);
});
