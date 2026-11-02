const { Op } = require('sequelize');

async function obtenerTodosLosAutores(postgres, mongo) {
    try {

        //Sacamos autores y libros de PostgreSQL
        const autores = await postgres.autores.findAll({
            include: [
                {
                    model: postgres.libros,
                    through: {
                        attributes: []
                    }
                },

            ],
            order: [['nombre', 'ASC']]
        });

        //Array de iDS de Libros para localizar los que tengan reseñas en mongo
        const idsLibros = autores.flatMap(
            autor => autor.libros.map(libro => libro.id_libro)
        );

        //Obtenemos las reseñas
        const resenas = await mongo.resenas.find({
            libro_id: { $in: idsLibros }
        }).toArray();

        //Sacamos los IDS de usuario para poder obtener los nombres de los usuarios que hacen la reseña.
        const idsUsuarios = [...new Set(
            resenas.map(resena => resena.usuario_id)
        )];

        const usuarios = await postgres.usuarios.findAll({
            where: {
                id_usuario: {
                    [Op.in]: idsUsuarios
                }
            }
        });

        //MAPA: ID usuario + nombre y apellido
        const usuariosPorId = new Map();

        for (const usuario of usuarios) {
            usuariosPorId.set(
                usuario.id_usuario,
                `${usuario.nombre} ${usuario.apellidos}`
            );
        }

        //Agrupamos las reseñas de cada libro 
        const resenasPorLibro = new Map();

        for (const resena of resenas) {

            //Si todavía no existe una entrada para este libro, creamos un array vacío
            if (!resenasPorLibro.has(resena.libro_id)) {
                resenasPorLibro.set(resena.libro_id, []);
            }

            // Añadir el nombre del usuario a la reseña
            const nombreUsuario = usuariosPorId.get(resena.usuario_id);

            resenasPorLibro.get(resena.libro_id).push({
                calificacion: resena.calificacion,
                comentario: resena.comentario,
                fecha_resena: resena.fecha_resena,
                usuario: nombreUsuario || 'Usuario no encontrado'
            });
        }

        //Objeto final: los libros de cada autor se ordenan por fecha de publicacion: del mas viejo al mas nuevo
        const autoresCompletos = autores.map(autor => ({

            id_autor: autor.id_autor,
            nombre: autor.nombre,
            apellidos: autor.apellidos,

            libros: autor.libros
                .sort((a, b) => new Date(a.fecha_publicacion) - new Date(b.fecha_publicacion))
                .map(libro => ({
                    id_libro: libro.id_libro,
                    titulo: libro.titulo,
                    isbn: libro.isbn,
                    fecha_publicacion: libro.fecha_publicacion,
                    resenas: resenasPorLibro.get(libro.id_libro) || []
                }))

        }));

        console.log("Todos los autores y sus libros + reseñas")
        console.log("================================")

        for (const autor of autoresCompletos) {
            console.log("********************************")
            console.log(`Autor:  ${autor.nombre} ${autor.apellidos}`);

            if (autor.libros.length === 0) console.log("Este autor todavía no ha publicado ningún libro");
            else {
                for (const libro of autor.libros) {
                    console.log(`Titulo:  ${libro.titulo}`);

                    if (libro.resenas.length === 0) console.log("Este libro no tiene reseñas todavía. ");

                    for (const resena of libro.resenas) {
                        console.log(`${resena.usuario} lo calificó como ${resena.calificacion}/5:`);
                        console.log(`\"${resena.comentario}\"`);
                        console.log("-------------------------------------------------------------------")

                    }
                }
            }

        }

        return autoresCompletos;

    } catch (error) {
        console.error('Error al obtener los libros:', error);
        throw error;
    }
}

async function obtenerAutoresMasValorados(postgres, mongo) {
    try {

        //Sacamos las reseñas de MongoDB
        const resenas = await mongo.resenas.find().toArray();

        //Las agrupamos por libro para poder hacer la media
        const puntuacionesPorLibro = new Map();

        for (const resena of resenas) {

            if (!puntuacionesPorLibro.has(resena.libro_id)) {
                puntuacionesPorLibro.set(resena.libro_id, {
                    suma: 0,
                    cantidad: 0
                });
            }

            const puntuaciones = puntuacionesPorLibro.get(resena.libro_id);

            puntuaciones.suma += Number(resena.calificacion);
            puntuaciones.cantidad++;
        }

        //Sacamos autores y libros de postgress
        const autores = await postgres.autores.findAll({
            include: [
                {
                    model: postgres.libros,
                    through: {
                        attributes: []
                    }
                }
            ],
            order: [['nombre', 'ASC']]
        });

        //Sacamos la media de calificaciones de cada autor
        const autoresValorados = [];

        for (const autor of autores) {

            let sumaCalificaciones = 0;
            let totalResenas = 0;

            for (const libro of autor.libros) {

                const puntuaciones = puntuacionesPorLibro.get(libro.id_libro);

                if (puntuaciones) {
                    sumaCalificaciones += puntuaciones.suma;
                    totalResenas += puntuaciones.cantidad;
                }
            }

            //Comprobar que alguno de sus libros tenga reseñas para hacer la media
            if (totalResenas > 0) {

                const media = sumaCalificaciones / totalResenas;

                if (media >= 4) {
                    autoresValorados.push({
                        id_autor: autor.id_autor,
                        nombre: autor.nombre,
                        apellidos: autor.apellidos,
                        media: media,
                        numResenas: totalResenas
                    });
                }
            }
        }

        autoresValorados.sort((a, b) => b.media - a.media);

        console.log("Autores mejor valorados")
        console.log("================================")

        if (autoresValorados.length === 0) console.log("No hay autores con una media de 4 o superior.");
        else {
            for (const autor of autoresValorados) {
                console.log("********************************")
                console.log(`Autor: ${autor.nombre} ${autor.apellidos}`);
                console.log(`Valoración: (${autor.media.toFixed(2)}/5)`);
                console.log(`Número de reseñas: ${autor.numResenas}`);
                console.log("-------------------------------------------------------------------")

            }
        }


        return autoresValorados;

    } catch (error) {
        console.error('Error al obtener los autores mejor valorados:', error);
        throw error;
    }
}

async function obtenerAutoresMasPopulares(postgres, mongo) {
    try {

        //Sacamos las reseñas de MongoDB
        const resenas = await mongo.resenas.find().toArray();

        //Las agrupamos por libro para poder hacer la suma de reseñas
        const puntuacionesPorLibro = new Map();

        for (const resena of resenas) {

            if (!puntuacionesPorLibro.has(resena.libro_id)) {
                puntuacionesPorLibro.set(resena.libro_id, {
                    cantidad: 0
                });
            }

            const puntuaciones = puntuacionesPorLibro.get(resena.libro_id);

            puntuaciones.cantidad++;
        }

        //Sacamos autores y libros de postgress
        const autores = await postgres.autores.findAll({
            include: [
                {
                    model: postgres.libros,
                    through: {
                        attributes: []
                    }
                }
            ],
            order: [['nombre', 'ASC']]
        });

        //Sacamos la suma de reseñas de cada autor
        const autoresValorados = [];

        for (const autor of autores) {

            let totalResenas = 0;

            for (const libro of autor.libros) {

                const puntuaciones = puntuacionesPorLibro.get(libro.id_libro);

                if (puntuaciones) {
                    totalResenas += puntuaciones.cantidad;
                }
            }

            autoresValorados.push({
                id_autor: autor.id_autor,
                nombre: autor.nombre,
                apellidos: autor.apellidos,
                numResenas: totalResenas
            });

        }

        const autoresMasPopulares = autoresValorados
    .filter(autor => autor.numResenas >= 3)
    .sort((a, b) => b.numResenas - a.numResenas);

        console.log("Autores mas populares")
        console.log("================================")

        if (autoresMasPopulares.length === 0) console.log("No hay autores con 3 o más reseñas.");
        else {
            for (const autor of autoresMasPopulares) {
                console.log("********************************")
                console.log(`Autor: ${autor.nombre} ${autor.apellidos}`);
                console.log(`Número de reseñas: ${autor.numResenas}`);
                console.log("-------------------------------------------------------------------")

            }
        }

        return autoresValorados;

    } catch (error) {
        console.error('Error al obtener los autores mejor valorados:', error);
        throw error;
    }

}

module.exports = {
    obtenerTodosLosAutores,
    obtenerAutoresMasValorados,
    obtenerAutoresMasPopulares,
};