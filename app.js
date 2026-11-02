
const readline = require('readline');

const {
    obtenerTodosLosLibros,
    obtenerMasPopulares,
    obtenerMenosPopulares,
    obtenerLibrosSinResenas
} = require('./consultas/libros');

const {
    obtenerTodosLosAutores,
    obtenerAutoresMasValorados,
    obtenerAutoresMasPopulares,
} = require('./consultas/autores');


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para preguntar y esperar la respuesta
function preguntar(mensaje) {
    return new Promise(resolve => {
        rl.question(mensaje, resolve);
    });
}

// MENÚ PRINCIPAL
async function iniciarMenu({ postgres, mongo }) {

    let opcion;

    do {
        console.log('\n===== BIBLIOTECA =====');
        console.log('1. Consultar libros.');
        console.log('2. Consultar autores.');
        console.log('0. Salir');

        opcion = await preguntar('\nSelecciona una opción: ');

        switch (opcion) {
            case '1':

                await menuLibros(postgres, mongo);
                break;
            case '2':
                await menuAutores(postgres, mongo);
                break;

            case '0':
                console.log('\n¡Hasta pronto!');
                rl.close();
                break;

            default:
                console.log('\nOpción no válida');
        }

    } while (opcion !== '0');
}

// SUBMENÚ DE LIBROS
async function menuLibros(postgres, mongo) {

    let opcion;

    do {
        console.log('\n===== CONSULTAR LIBROS =====');
        console.log('1. Libros con sus reseñas, ordenados por título');
        console.log('2. Libros más populares');
        console.log('3. Libros peor valorados');
        console.log('4. Libros sin reseñas');
        console.log('0. Salir al menú principal');

        opcion = await preguntar('\nSelecciona una opción: ');

        switch (opcion) {
            case '1':
                console.log('Mostrando información de todos nuestros libros y sus reseñas.');
                await obtenerTodosLosLibros(postgres, mongo);
                await preguntar('\nPulse cualquier tecla para continuar... ');
                break;

            case '2':
                console.log('Mostrando libros cuya media de califación es de 4 o superior.');
                await obtenerMasPopulares(postgres, mongo);
                await preguntar('\nPulse cualquier tecla para continuar... ');
                break;

            case '3':
                console.log('Mostrando libros cuya media de califación es de 3 o inferior.');
                await obtenerMenosPopulares(postgres, mongo);
                await preguntar('\nPulse cualquier tecla para continuar... ');
                break;

            case '4':
                console.log('Mostrando libros que todavía nadie ha comentado.');
                await obtenerLibrosSinResenas(postgres, mongo);
                await preguntar('\nPulse cualquier tecla para continuar... ');
                break;

            case '0':
                break;

            default:
                console.log('\nOpción no válida');
        }

    } while (opcion !== '0');
}

// SUBMENÚ DE AUTORES
async function menuAutores(postgres, mongo) {

    let opcion;

    do {
        console.log('\n===== CONSULTAR AUTORES =====');
        console.log('1. Todos los autores y sus libros');
        console.log('2. Autores mejor valorados');
        console.log('3. Autores mas populares');
        console.log('0. Salir al menú principal');

        opcion = await preguntar('\nSelecciona una opción: ');

        switch (opcion) {
            case '1':
                console.log('Mostrando información de todos autores, sus libros y reseñas.');
                await obtenerTodosLosAutores(postgres, mongo);
                await preguntar('\nPulse cualquier tecla para continuar... ');
                break;

            case '2':

                console.log('Mostrando a los autores cuya media de califaciones de los libros sea de 4 o superior.');
                await obtenerAutoresMasValorados(postgres, mongo);
                await preguntar('\nPulse cualquier tecla para continuar... ');
                break;

            case '3':

                console.log('Mostrando a los autores con más reseñas, ordenados de mayor a menor. Mínimo 3 reseñas.');
                await obtenerAutoresMasPopulares(postgres, mongo);
                await preguntar('\nPulse cualquier tecla para continuar... ');
                break;

            case '0':
                break;

            default:
                console.log('\nOpción no válida');
        }

    } while (opcion !== '0');
}


module.exports = iniciarMenu;
