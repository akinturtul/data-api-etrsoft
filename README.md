API Data Synchronization with PostgreSQL
This project is an Express.js application that synchronizes data from an external API into a PostgreSQL database. The application fetches data at regular intervals and provides endpoints for querying the data.

Features
Token Authentication: Retrieves an authentication token from the API.
Data Fetching: Fetches data from the API using the retrieved token.
Database Management: Stores and updates data in a PostgreSQL database.
Endpoints:
/api/data: Provides aggregated data with grouping and calculations.
/api/data-all: Returns all raw data records from the database.
Data Sync: Automatically syncs data every 10 minutes.
Prerequisites
Node.js
PostgreSQL
Installation
Clone the repository:

bash
Kodu kopyala
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
Install dependencies:

bash
Kodu kopyala
npm install
Set up PostgreSQL:

Create a database named api_data.
Update the database configuration in the Client instance in index.js with your PostgreSQL credentials.
Run the application:

bash
Kodu kopyala
node index.js
Database Schema
The data is stored in a PostgreSQL table named data_records with the following structure:

id: Serial primary key.
hesap_kodu: Account code.
hesap_adi: Account name.
tipi: Type (character, e.g., 'A').
ust_hesap_id: Parent account ID.
borc: Debit amount.
alacak: Credit amount.
borc_sistem: System debit.
alacak_sistem: System credit.
borc_doviz: Debit in foreign currency.
alacak_doviz: Credit in foreign currency.
borc_islem_doviz: Transaction debit in foreign currency.
alacak_islem_doviz: Transaction credit in foreign currency.
birim_adi: Unit name.
bakiye_sekli: Balance type.
aktif: Active status.
dovizkod: Currency code.
Usage
Start the server: Run node index.js to start the server.
Access the API:
To get grouped data: http://localhost:3000/api/data
To get all data: http://localhost:3000/api/data-all
Frontend: The application serves a static HTML file located in the public directory. You can customize this file for your specific frontend needs.
Contributing
Feel free to submit issues or pull requests. Contributions are welcome!

License
This project is licensed under the MIT License.

Acknowledgments
Special thanks to the team at TAV Technologies for their support and guidance.
