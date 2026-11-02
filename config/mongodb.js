const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);

const conectarMongoDB = async () => {
    try {
        await client.connect();

        console.log('MongoDB conectado correctamente');

        return client.db(process.env.MONGO_DB);

    } catch (error) {
        console.error('Error al conectar con MongoDB:', error);
        throw error;
    }
};

const cerrarMongoDB = async () => {
    await client.close();
};

module.exports = {
    conectarMongoDB,
    cerrarMongoDB
};