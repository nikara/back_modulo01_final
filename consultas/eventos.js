const { Op } = require('sequelize');

async function obtenerTodosLosEvento(postgres, mongo) {

    try {

        //Sacamos todos los eventos de mongo
        const eventos = await mongo.eventos.find().toArray();

        //Es un array en vez de un mapa porque no necesitamos agrupar datos por clave valor
        const eventosUsuarios = [];

        for (const evento of eventos) {

            //Por cada id de participante, buscamos su usario en postgres y lo añadimos a un array
            //con nombre + email
            let participantes = [];

            for (const participante of evento.participantes) {
                const usuario = await postgres.usuarios.findOne({
                    attributes: ['id_usuario', 'nombre', 'apellidos', 'email'],
                    where: {
                        id_usuario: participante

                    }
                });

                participantes.push({
                    nombre: usuario
                        ? `${usuario.nombre} ${usuario.apellidos}`
                        : 'Usuario no encontrado',
                    email: usuario
                        ? `${usuario.email}`
                        : 'Usuario no encontrado'
                });
            }

            //Añadimos lo generado al objeto final para iterar
            eventosUsuarios.push({
                nombre: evento.nombre_evento,
                tipo: evento.tipo_evento,
                fecha_inicio: evento.fecha_evento,
                ubicacion: `${evento.ubicacion.nombre}, ${evento.ubicacion.direccion}`,
                participantes: participantes
            });
        }

        eventosUsuarios.sort((a, b) =>
            new Date(a.fecha_inicio) - new Date(b.fecha_inicio)
        );

        for (const evento of eventosUsuarios) {

            const eventoPasado = new Date(evento.fecha_inicio) < new Date();
            console.log("********************************")
            console.log(`Evento:  ${evento.nombre} - ${evento.tipo}`);
            if(eventoPasado) console.log(`Evento terminado. El evento se celebró el día ${evento.fecha_inicio.toLocaleString('es-ES')}`);
            else console.log(`\t¿Cuándo?: ${evento.fecha_inicio.toLocaleString('es-ES')}`);
            console.log(`\t¿Dónde?:  ${evento.ubicacion}`);
            console.log(`\t¿Quién va?:`);

            let numParticipante = 1;
            for (const participante of evento.participantes) {
                console.log(`\t\t${numParticipante}. ${participante.nombre}, ${participante.email}`);
                numParticipante++;
            }
            console.log("-------------------------------------------------------------------")

        }

        return eventosUsuarios;

    } catch (error) {
        console.error('Error al obtener los todos eventos:', error);
        throw error;
    }
}

async function obtenerUsuariosEnEventos(postgres, mongo) {
    try {

        //Sacamos todos los usuarios
        const usuarios = await postgres.usuarios.findAll({
            attributes: ['id_usuario', 'nombre', 'apellidos', 'email'],
        });

        //Agrupamos las eventos de cada usuario 
        const eventosPorUsuario = new Map();

        for (const usuario of usuarios) {

            //Si todavía no existe una entrada para este usuario, creamos un array vacío
            if (!eventosPorUsuario.has(usuario.id_usuario)) {
                eventosPorUsuario.set(usuario.id_usuario, []);
            }

            //Buscamos los eventos en los que participa nuestro
            const eventos = await mongo.eventos.find({
                participantes: usuario.id_usuario
            }).toArray();

            let eventosUsuario = [];
            for (const evento of eventos) {

                eventosUsuario.push({
                    nombre: `${evento.nombre_evento} - ${evento.tipo_evento}`,
                    fecha_evento: evento.fecha_evento,
                });
            }

            eventosPorUsuario.set(usuario.id_usuario, {
                nombre: `${usuario.nombre} ${usuario.apellidos}`,
                email: usuario.email,
                eventos: eventosUsuario
            });
        }

        //Objeto final
        const usuariosCompletos = usuarios.map(usuario => ({
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            email: usuario.email,
            eventos: eventosPorUsuario.get(usuario.id_usuario).eventos
        }));


        console.log("Todos los usuarios y sus eventos")
        console.log("================================")

        for (const usuario of usuariosCompletos) {
            console.log(`Usuario: ${usuario.nombre} ${usuario.apellidos}`);
            console.log(`Email: ${usuario.email}`);
            console.log("\tEventos:");

            if (usuario.eventos.length === 0) {
                console.log("Este usuario todavía no se ha apuntado a ningún evento.");
            } else {
                let numEventos = 1;
                for (const evento of usuario.eventos) {
                    console.log(`\t${numEventos}. ${evento.nombre} - ${evento.fecha_evento.toLocaleString('es-ES')}`);
                    numEventos++;
                }
            }
        }
        return usuariosCompletos;

    } catch (error) {
        console.error('Error al obtener los todos usuarios y sus eventos:', error);
        throw error;
    }
}

async function obtenerUsuariosEnMasEventos(postgres, mongo) {
    try {

        //Sacamos todos los usuarios
        const usuarios = await postgres.usuarios.findAll({
            attributes: ['id_usuario', 'nombre', 'apellidos', 'email'],
        });

        //Creamos un nuevo array no hace falta clave valor
        const usuariosMasEventos = [];

        for (const usuario of usuarios) {


            //Buscamos los eventos en los que participa nuestro usuario
            const eventos = await mongo.eventos.find({
                participantes: usuario.id_usuario
            }).toArray();

            if (eventos.length >= 5) {
                usuariosMasEventos.push({
                    nombre: `${usuario.nombre} ${usuario.apellidos}`,
                    email: usuario.email,
                    eventos: eventos.length
                });
            }
        }


        console.log("Usuarios que más participan")
        console.log("================================")

        for (const usuario of usuariosMasEventos) {
            console.log(`Usuario: ${usuario.nombre}`);
            console.log(`\tEmail: ${usuario.email}`);
            console.log(`\tEventos a los que se ha apuntado: ${usuario.eventos}`);

        }
        return usuariosMasEventos;

    } catch (error) {
        console.error('Error al obtener los usuarios con más participaciones:', error);
        throw error;
    }

}

async function obtenerUsuariosSinEventos(postgres, mongo) {
    try {
        //Sacamos todos los usuarios
        const usuarios = await postgres.usuarios.findAll({
            attributes: ['id_usuario', 'nombre', 'apellidos', 'email'],
        });

        //Creamos un nuevo array no hace falta clave valor
        const usuariosMasEventos = [];

        for (const usuario of usuarios) {

            //Buscamos los eventos en los que participa nuestro usuario
            const eventos = await mongo.eventos.find({
                participantes: usuario.id_usuario
            }).toArray();

            if (eventos.length == 0) {
                usuariosMasEventos.push({
                    nombre: `${usuario.nombre} ${usuario.apellidos}`,
                    email: usuario.email,
                });
            }
        }


        console.log("Todos los usuarios que nunca participan.")
        console.log("================================")

        for (const usuario of usuariosMasEventos) {
            console.log(`Usuario: ${usuario.nombre}`);
            console.log(`\tEmail: ${usuario.email}`);

        }
        return usuariosMasEventos;

    } catch (error) {
        console.error('Error al obtener los todos usuarios que nunca participan:', error);
        throw error;
    }
}


module.exports = {
    obtenerTodosLosEvento,
    obtenerUsuariosEnEventos,
    obtenerUsuariosEnMasEventos,
    obtenerUsuariosSinEventos
};