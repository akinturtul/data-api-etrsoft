const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const axios = require('axios');
const https = require('https');
const path = require('path');
const app = express();
const port = 3000;

// PostgreSQL bağlantı ayarları
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'api_data',
  password: 'admin',
  port: 5432
});


// PostgreSQL bağlantısını başlat
// PostgreSQL bağlantısını başlat
client.connect()
  .then(() => {
    console.log('PostgreSQL veritabanına bağlanıldı.');
    // Tabloyu kontrol et ve gerekirse oluştur
    return checkAndCreateTable();
    
  })
  .then(() => {
    console.log('Tablo kontrol edildi veritabanında bulunamadığı için otomatik olarak oluşturuldu.');
    syncData();
  })
  .catch((err) => {
    console.error('PostgreSQL bağlantı hatası:', err);
  });

// Tabloyu kontrol et ve gerekirse oluştur
async function checkAndCreateTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS data_records (
      id SERIAL PRIMARY KEY,
      hesap_kodu VARCHAR(255),
      hesap_adi VARCHAR(255),
      tipi CHAR(1),
      ust_hesap_id INTEGER,
      borc NUMERIC,
      alacak NUMERIC,
      borc_sistem NUMERIC,
      alacak_sistem NUMERIC,
      borc_doviz NUMERIC,
      alacak_doviz NUMERIC,
      borc_islem_doviz NUMERIC,
      alacak_islem_doviz NUMERIC,
      birim_adi VARCHAR(255),
      bakiye_sekli VARCHAR(255),
      aktif BOOLEAN,
      dovizkod VARCHAR(10)
    );
  `;

  try {
    await client.query(createTableQuery);
    console.log('Tablo oluşturuldu veya zaten mevcut.');
  } catch (error) {
    console.error('Tablo oluşturma hatası:', error.message);
  }
}
// Express.js middleware
app.use(bodyParser.json());

// Statik dosyalar için yol
app.use(express.static(path.join(__dirname, 'public')));

// Axios ayarları
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Token alma ve veri çekme fonksiyonları
async function fetchToken() {
  try {
    console.log('Token alma isteği gönderiliyor...');
    const response = await axios.post('https://efatura.etrsoft.com/fmi/data/v1/databases/testdb/sessions', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('apitest:test123').toString('base64'),
      },
      httpsAgent: httpsAgent
    });
    console.log('Token yanıtı:', response.data);
    return response.data.response.token;
  } catch (error) {
    console.error('Token alma hatası:', error.message);
    throw error;
  }
}

async function fetchData(token) {
  try {
    console.log('Veri çekme isteği gönderiliyor...');
    const response = await axios.patch('https://efatura.etrsoft.com/fmi/data/v1/databases/testdb/layouts/testdb/records/1', {
      fieldData: {},
      script: 'getData',
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      httpsAgent: httpsAgent
    });
    console.log('Veri yanıtı:', response.data);
    return response.data.response.scriptResult;
  } catch (error) {
    console.error('Veri çekme hatası:', error.message);
    throw error;
  }
}

// Mevcut kayıtları veritabanından çekme
async function fetchExistingRecords() {
  try {
    const result = await client.query('SELECT * FROM data_records');
    return result.rows.reduce((acc, record) => {
      acc[record.id] = record;
      return acc;
    }, {});
  } catch (error) {
    console.error('Mevcut veriler getirme hatası:', error.message);
    throw error;
  }
}

// Veritabanını güncelle
async function updateDatabase(data) {
  try {
    console.log('Veritabanını güncelleyip veri işleme...');
    const parsedData = JSON.parse(data);
    const existingRecords = await fetchExistingRecords();

    for (const record of parsedData) {
      // Boş string değerleri NULL olarak ayarla
      const cleanedRecord = {
        ...record,
        borc: record.borc === '' ? null : parseFloat(record.borc),
        alacak: record.alacak === '' ? null : parseFloat(record.alacak),
        borc_sistem: record.borc_sistem === '' ? null : parseFloat(record.borc_sistem),
        alacak_sistem: record.alacak_sistem === '' ? null : parseFloat(record.alacak_sistem),
        borc_doviz: record.borc_doviz === '' ? null : parseFloat(record.borc_doviz),
        alacak_doviz: record.alacak_doviz === '' ? null : parseFloat(record.alacak_doviz),
        borc_islem_doviz: record.borc_islem_doviz === '' ? null : parseFloat(record.borc_islem_doviz),
        alacak_islem_doviz: record.alacak_islem_doviz === '' ? null : parseFloat(record.alacak_islem_doviz),
      };

      const existingRecord = existingRecords[cleanedRecord.id];
      const hasChanges = !existingRecord || JSON.stringify(existingRecord) !== JSON.stringify(cleanedRecord);

      if (hasChanges) {
        console.log('Veri güncelleniyor:', cleanedRecord);

        await client.query(
          `INSERT INTO data_records (
            id, hesap_kodu, hesap_adi, tipi, ust_hesap_id, borc, alacak, borc_sistem, 
            alacak_sistem, borc_doviz, alacak_doviz, borc_islem_doviz, alacak_islem_doviz, 
            birim_adi, bakiye_sekli, aktif, dovizkod
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
          ON CONFLICT (id) DO UPDATE 
          SET 
            hesap_kodu = EXCLUDED.hesap_kodu,
            hesap_adi = EXCLUDED.hesap_adi,
            tipi = EXCLUDED.tipi,
            ust_hesap_id = EXCLUDED.ust_hesap_id,
            borc = EXCLUDED.borc,
            alacak = EXCLUDED.alacak,
            borc_sistem = EXCLUDED.borc_sistem,
            alacak_sistem = EXCLUDED.alacak_sistem,
            borc_doviz = EXCLUDED.borc_doviz,
            alacak_doviz = EXCLUDED.alacak_doviz,
            borc_islem_doviz = EXCLUDED.borc_islem_doviz,
            alacak_islem_doviz = EXCLUDED.alacak_islem_doviz,
            birim_adi = EXCLUDED.birim_adi,
            bakiye_sekli = EXCLUDED.bakiye_sekli,
            aktif = EXCLUDED.aktif,
            dovizkod = EXCLUDED.dovizkod
          `,
          [
            cleanedRecord.id,
            cleanedRecord.hesap_kodu,
            cleanedRecord.hesap_adi,
            cleanedRecord.tipi,
            cleanedRecord.ust_hesap_id,
            cleanedRecord.borc,
            cleanedRecord.alacak,
            cleanedRecord.borc_sistem,
            cleanedRecord.alacak_sistem,
            cleanedRecord.borc_doviz,
            cleanedRecord.alacak_doviz,
            cleanedRecord.borc_islem_doviz,
            cleanedRecord.alacak_islem_doviz,
            cleanedRecord.birim_adi,
            cleanedRecord.bakiye_sekli,
            cleanedRecord.aktif,
            cleanedRecord.dovizkod
          ]
        );
      }
    }

    console.log('Veritabanı güncellendi.');
  } catch (error) {
    console.error('Veri işleme hatası:', error.message);
    throw error;
  }
}

// API'den veri çekme ve veritabanına yazma
async function syncData() {
  try {
    console.log('Veri senkronizasyonu başlatılıyor...');
    const token = await fetchToken();
    const data = await fetchData(token);
    await updateDatabase(data);
  } catch (error) {
    console.error('Veri senkronizasyon hatası:', error.message);
  }
}


// Belirli aralıklarla veri senkronizasyonu
setInterval(syncData, 600000); // Her 10 dakikada bir


// HTTP istekleri için route
app.get('/api/data', async (req, res) => {
  try {
    const result = await client.query(`
      WITH hesap_gruplari AS (
          SELECT DISTINCT 
              LEFT(hesap_kodu, 3) as grup_kodu,
              LEFT(hesap_kodu, 3) || ' HESAP GRUBU' as grup_adi
          FROM data_records
      ),
      hesap_toplamlari AS (
          SELECT 
              LEFT(hesap_kodu, 3) as grup_kodu,
              SUM(CASE WHEN tipi = 'A' THEN borc ELSE 0 END) as toplam_borc,
              SUM(CASE WHEN tipi = 'A' THEN alacak ELSE 0 END) as toplam_alacak
          FROM data_records
          GROUP BY LEFT(hesap_kodu, 3)
      ),
      birlesik_veriler AS (
          SELECT 
              hg.grup_kodu as hesap_kodu,
              hg.grup_adi as hesap_adi,
              'G' as tipi,
              NULL::integer as ust_hesap_id,
              ht.toplam_borc as borc,
              ht.toplam_alacak as alacak,
              0 as seviye
          FROM hesap_gruplari hg
          LEFT JOIN hesap_toplamlari ht ON hg.grup_kodu = ht.grup_kodu
          
          UNION ALL
          
          SELECT 
              hesap_kodu,
              hesap_adi,
              tipi,
              ust_hesap_id,
              borc,
              alacak,
              CASE 
                  WHEN tipi = 'A' THEN 1
                  ELSE 2
              END as seviye
          FROM data_records
      )
      SELECT 
          hesap_kodu,
          hesap_adi,
          tipi,
          ust_hesap_id,
          borc,
          alacak,
          (borc - alacak) as bakiye,
          seviye
      FROM birlesik_veriler
      ORDER BY 
          LEFT(hesap_kodu, 3),
          seviye,
          hesap_kodu;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Veri getirme hatası:', error.message);
    res.status(500).json({ error: 'Veri getirme hatası' });
  }
});


// HTTP istekleri için route
app.get('/api/data-all', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT * FROM data_records
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Veri getirme hatası:', error.message);
    res.status(500).json({ error: 'Veri getirme hatası' });
  }
});

// Kök URL için yanıt
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // index.html dosyasının yolu
});

// Sunucu başlatma
app.listen(port, () => {
  console.log(`Sunucu ${port} portunda başlatıldı.`);
});
