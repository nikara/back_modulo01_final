require('dotenv').config();

const sequelize = require('./config/postgres');

const { conectarMongoDB, cerrarMongoDB } = require('./config/mongodb');

const iniciarMenu = require('./app');

const initDatabase = require('./modelos/postgres_models');
const initMongoDB = require('./modelos/mongodb_models');

async function main() {

    //Booleanos para verificar si las bases de datos están conectadas
    let postgresConectado = false;
    let mongoConectado = false;

    try {

        // Conexion a PostgreSQL
        await sequelize.authenticate();
        postgresConectado = true;

        console.log('PostgreSQL conectado correctamente');

        //Inicializar modelos de PostgreSQL
        const postgres = initDatabase(sequelize);

        // Conexion a MongoDB
        const db = await conectarMongoDB();
        mongoConectado = true;

        // Inicializar modelos de MongoDB
        const mongo = initMongoDB(db);

        console.log('Bases de datos conectadas correctamente');

        //Pasamos al menu de app.js los modelos de postgres y mongo para que se puedan usar en las consultas
        await iniciarMenu({ postgres, mongo });

    } catch (error) {

        console.error('Error en la aplicación:', error);

    } finally {

        if (mongoConectado) {
            await cerrarMongoDB();
            console.log('MongoDB desconectado');
        }

        if (postgresConectado) {
            await sequelize.close();
            console.log('PostgreSQL desconectado');
        }
    }
}

main();