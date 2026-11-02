function initMongoDB(db) {

    const resenas = db.collection('resenas');
    const usuarios = db.collection('usuarios');
    const eventos = db.collection('eventos');

    return {
        resenas,
        usuarios,
        eventos
    };
}

module.exports = initMongoDB;