const { Op } = require('sequelize');

async function obtenerTodosLosLibros(postgres, mongo) {

    try {
        //Sacamos libros, autores y categorias de PostgreSQL
        const libros = await postgres.libros.findAll({
            include: [
                {
                    model: postgres.autores,
                    through: {
                        attributes: []
                    }
                },
                {
                    model: postgres.categorias,
                    through: {
                        attributes: []
                    }
                }
            ],
            order: [['titulo', 'ASC']]
        });

        //Array de iDS de Libros para localizar los que tengan reseñas en mongo
        const idsLibros = libros.map(libro => libro.id_libro);

        //Obtenemos las reseñas de mongo
        const resenas = await mongo.resenas.find({
            libro_id: { $in: idsLibros }
        }).toArray();

        //Sacamos los IDS de usuario para poder obtener los nombres de los usuarios que hacen la reseña.
        const idsUsuarios = resenas.map(resena => resena.usuario_id);

        //Sacamos de postgress los usuarios de postgress pero solo los datos que nos interesan para despues
        const usuarios = await postgres.usuarios.findAll({
            attributes: ['id_usuario', 'nombre', 'apellidos'],
            where: {
                id_usuario: {
                    [Op.in]: idsUsuarios
                }
            }
        });

        //Agrupamos las reseñas de cada libro 
        const resenasPorLibro = new Map();

        for (const resena of resenas) {

            //Si todavía no existe una entrada para este libro, creamos un array vacío
            if (!resenasPorLibro.has(resena.libro_id)) {
                resenasPorLibro.set(resena.libro_id, []);
            }

            // Añadir el nombre del usuario a la reseña
            const usuario = usuarios.find(u => u.id_usuario === resena.usuario_id);

            resenasPorLibro.get(resena.libro_id).push({
                calificacion: resena.calificacion,
                comentario: resena.comentario,
                fecha_resena: resena.fecha_resena,
                usuario: usuario
                    ? `${usuario.nombre} ${usuario.apellidos}`
                    : 'Usuario no encontrado'
            });
        }

        //Objeto final
        const librosCompletos = libros.map(libro => ({

            id_libro: libro.id_libro,
            titulo: libro.titulo,
            isbn: libro.isbn,

            autores: libro.autores.map(autor => ({
                nombre: autor.nombre,
                apellidos: autor.apellidos
            })),
            categorias: libro.categorias.map(categoria => ({
                nombre: categoria.nombre,
            })),

            resenas: resenasPorLibro.get(libro.id_libro) || []

        }));

        console.log("Todos los libros y sus reseñas")
        console.log("================================")

        for (const libro of librosCompletos) {
            console.log("********************************")

            console.log(`Título: ${libro.titulo}`);
            console.log(`\tAutor/es: ${libro.autores.map(autor => `${autor.nombre} ${autor.apellidos}`).join(', ')}`);
            console.log(`\tCategorías: ${libro.categorias.map(categoria => `${categoria.nombre}`).join(', ')}`);
            console.log(`\tReseñas\n`);

            if (libro.resenas.length === 0) console.log("Este libro todavia no tiene reseñas.");
            else {
                for (const resena of libro.resenas) {
                    console.log(`\t${resena.usuario} lo calificó como ${resena.calificacion}/5:`);
                    console.log(`\t\"${resena.comentario}\"`);
                    console.log("-------------------------------------------------------------------")

                }
            }

        }

        return librosCompletos;

    } catch (error) {
        console.error('Error al obtener los todos libros:', error);
        throw error;
    }
}

async function obtenerMasPopulares(postgres, mongo) {

    try {

        //Sacamos todas las reseñas de mongo
        const resenas = await mongo.resenas.find().toArray();

        //Las agrupamos por el id de libro para poder hacer la media de las calificaciones
        const resenasPorLibro = new Map();

        for (const resena of resenas) {

            if (!resenasPorLibro.has(resena.libro_id)) {
                resenasPorLibro.set(resena.libro_id, []);
            }

            resenasPorLibro.get(resena.libro_id).push(resena);
        }

        //Calculamos la media: Si tiene 4 o más, lo queremos enseñar si no, no.
        const librosPopulares = [];

        for (const [idLibro, resenasLibro] of resenasPorLibro) {

            const suma = resenasLibro.reduce(
                (total, resena) => total + resena.calificacion, 0
            );

            const media = suma / resenasLibro.length;

            if (media >= 4) {
                librosPopulares.push({
                    id_libro: idLibro,
                    media: media,
                    numResenas: resenasLibro.length
                });
            }
        }

        librosPopulares.sort((a, b) => b.media - a.media);

        //Sacamos los datos de los libros y autores y categorias desde postgress
        const idsLibros = librosPopulares.map(libro => libro.id_libro);

        const libros = await postgres.libros.findAll({
            include: [
                {
                    model: postgres.autores,
                    through: {
                        attributes: []
                    }
                },
                {
                    model: postgres.categorias,
                    through: {
                        attributes: []
                    }
                }
            ],
            where: {
                id_libro: {
                    [Op.in]: idsLibros
                }
            }
        });


        console.log("Libros más populares")
        console.log("================================")

        for (const popular of librosPopulares) {

            //Buscamos el id de los libros populares en postgress
            const libro = libros.find(
                libro => libro.id_libro === popular.id_libro
            );

            //Necesitamos comprobar que por mucho que haya una reseña en mongo, postgres tenga ese id_libro
            if (libro) {
                console.log("********************************")
                console.log(`Título: ${libro.titulo}`);
                console.log(`\tAutor/es: ${libro.autores.map(autor => `${autor.nombre} ${autor.apellidos}`).join(', ')}`);
                console.log(`\tCategorías: ${libro.categorias.map(categoria => `${categoria.nombre}`).join(', ')}`);
                console.log(`\tMedia: ${popular.media.toFixed(2)}/5`);
                console.log(`\tNúmero de reseñas: ${popular.numResenas}`);
                console.log("-------------------------------------------------------------------")
            }

        }
        return librosPopulares;

    } catch (error) {
        console.error('Error al obtener los libros populares:', error);
        throw error;
    }
}

async function obtenerMenosPopulares(postgres, mongo) {
    try {

        //Sacamos todas las reseñas de mongo
        const resenas = await mongo.resenas.find().toArray();

        //Las agrupamos por el id de libro para poder hacer la media de las calificaciones
        const resenasPorLibro = new Map();

        for (const resena of resenas) {

            if (!resenasPorLibro.has(resena.libro_id)) {
                resenasPorLibro.set(resena.libro_id, []);
            }

            resenasPorLibro.get(resena.libro_id).push(resena);
        }

        //Calculamos la media: Si tiene 3 o menos, lo queremos enseñar si no,a no.
        const librosPopulares = [];

        for (const [idLibro, resenasLibro] of resenasPorLibro) {

            const suma = resenasLibro.reduce(
                (total, resena) => total + resena.calificacion, 0
            );

            const media = suma / resenasLibro.length;

            if (media <= 3) {
                librosPopulares.push({
                    id_libro: idLibro,
                    media: media,
                    numResenas: resenasLibro.length
                });
            }
        }

        librosPopulares.sort((a, b) => b.media + a.media);

        //Sacamos los datos de los libros y autores y categorias desde postgress
        const idsLibros = librosPopulares.map(libro => libro.id_libro);

        const libros = await postgres.libros.findAll({
            include: [
                {
                    model: postgres.autores,
                    through: {
                        attributes: []
                    }
                },
                {
                    model: postgres.categorias,
                    through: {
                        attributes: []
                    }
                }
            ],
            where: {
                id_libro: {
                    [Op.in]: idsLibros
                }
            }
        });


        console.log("Libros menos populares")
        console.log("================================")

        for (const popular of librosPopulares) {

            //Buscamos el id de los libros populares en postgress
            const libro = libros.find(
                libro => libro.id_libro === popular.id_libro
            );

            //Necesitamos comprobar que por mucho que haya una reseña en mongo, postgres tenga ese id_libro
            if (libro) {
                console.log("********************************")
                console.log(`Título: ${libro.titulo}`);
                console.log(`\tAutor/es: ${libro.autores.map(autor => `${autor.nombre} ${autor.apellidos}`).join(', ')}`);
                console.log(`\tCategorías: ${libro.categorias.map(categoria => `${categoria.nombre}`).join(', ')}`);
                console.log(`\tMedia: ${popular.media.toFixed(2)}/5`);
                console.log(`\tNúmero de reseñas: ${popular.numResenas}`);
                console.log("-------------------------------------------------------------------")
            }

        }
        return librosPopulares;

    } catch (error) {
        console.error('Error al obtener los libros menos populares:', error);
        throw error;
    }
}

async function obtenerLibrosSinResenas(postgres, mongo) {
    try {

        //Sacamos solos los id de los libros con reseñas
        const resenas = await mongo.resenas.find(
            {},
            { projection: { libro_id: 1 } }
        ).toArray();

        //Y lo pasamos a un array para poder operar con ellos
        const idsConResenas = [
    ...new Set(resenas.map(resena => resena.libro_id))
];
        //Sacamos libros, autores y categorias de PostgreSQL
        //pero filtramos: queremos los libros que no aparezca en el array de
        //los ids de mongo. Si no estaba en mongo, lo mostramos por pantalla.

        const librosSinResenas = await postgres.libros.findAll({
            include: [
                {
                    model: postgres.autores,
                    through: {
                        attributes: []
                    }
                },
                {
                    model: postgres.categorias,
                    through: {
                        attributes: []
                    }
                }
            ], where: {
                id_libro: {
                    [Op.notIn]: idsConResenas
                }
            },
            order: [['titulo', 'ASC']]
        });

        console.log("Todos los libros sin reseñas")
        console.log("================================")

        for (const libro of librosSinResenas) {
            console.log("********************************")

            console.log(`Título: ${libro.titulo}`);
            console.log(`\tAutor/es: ${libro.autores.map(autor => `${autor.nombre} ${autor.apellidos}`).join(', ')}`);
            console.log(`\tCategorías: ${libro.categorias.map(categoria => `${categoria.nombre}`).join(', ')}`);
            console.log("-------------------------------------------------------------------")

        }

        return librosSinResenas;

    } catch (error) {
        console.error('Error al obtener los libros sin reseñas:', error);
        throw error;
    }
}


module.exports = {
    obtenerTodosLosLibros,
    obtenerMasPopulares,
    obtenerMenosPopulares,
    obtenerLibrosSinResenas
};