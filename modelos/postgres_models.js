const { DataTypes, Sequelize } = require('sequelize');

/**
 * 
 * @param {sequelize} sequelize

 */


// timestamps: false: se usa en todos los modelos porque no quiero que se creen las columnas createdAt y updatedAt en la base de datos, ya que no las necesito para este proyecto.
function initDatabase(sequelize) {
    //siguiendo el esquema que tengo ya creado
    const autores = sequelize.define('autores', {
        id_autor: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        apellidos: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        fecha_nacimiento: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        timestamps: false
    });

    const libros = sequelize.define('libros', {
        id_libro: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        //es un identificador unico pero hay libros viejos que no tienen isbn, por eso lo pongo como allowNull: true
        isbn: {
            type: DataTypes.STRING(20),
            allowNull: true,
            unique: true
        },
        titulo: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        //debería de hacer lo mismo que con ISBN y ponerlo como allowNull: true pero en el diseño original 
        //de la base de datos lo puse como NOT NULL, así que lo dejo así
        fecha_publicacion: {
            type: DataTypes.DATE,
            allowNull: false
        }
      }, {
        timestamps: false
    });

    const categorias = sequelize.define('categorias', {
        id_categoria: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        descripcion: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
      }, {
        timestamps: false
    });

    const usuarios = sequelize.define('usuarios', {
        //en mi diseñor de BBDD original, lo puse como un GUIDD por seguridad, así que así lo dejamos
        id_usuario: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()')
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        apellidos: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        //no es obligatorio, pero si lo ponen, que sea único, por eso lo pongo como allowNull: true y unique: true
        telefono: {
            type: DataTypes.STRING(20),
            allowNull: true,
            unique: true
        },
      }, {
        timestamps: false
    });

    const autores_libros = sequelize.define('autores_libros', {
        id_autor: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: autores,
                key: 'id_autor'
            }
        },
        id_libro: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: libros,
                key: 'id_libro'
            }
        }
    }, {
        tableName: 'autores_libros',
        timestamps: false
      }, {
        timestamps: false
    });

    const categorias_libros = sequelize.define('categorias_libros', {
        id_categoria: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: categorias,
                key: 'id_categoria'
            }
        },
        id_libro: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: libros,
                key: 'id_libro'
            }
        }
    }, {
        tableName: 'categorias_libros',
        timestamps: false
      }, {
        timestamps: false
    });

    const prestamos = sequelize.define('prestamos', {
        id_prestamo: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_usuario: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: usuarios,
                key: 'id_usuario'
            }
        },
        id_libro: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: libros,
                key: 'id_libro'
            }
        },
        fecha_inicio: {
            type: DataTypes.DATE,
            allowNull: false
        },
        fecha_fin: {
            type: DataTypes.DATE,
            allowNull: true
        },
        fecha_devolucion: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        timestamps: false
    });

    //Relaciones entre las tablas

    //autores_libros N:M, un autor puede tener muchos libros y un libro puede tener varios autores.

    autores.belongsToMany(libros, {
        through: autores_libros,
        foreignKey: 'id_autor',
        otherKey: 'id_libro'
    });

    libros.belongsToMany(autores, {
        through: autores_libros,
        foreignKey: 'id_libro',
        otherKey: 'id_autor'
    });

    //categorias_libros N:M, una categoría puede tener muchos libros y un libro puede tener varias categorías.
    categorias.belongsToMany(libros, {
        through: categorias_libros,
        foreignKey: 'id_categoria',
        otherKey: 'id_libro'
    });

    libros.belongsToMany(categorias, {
        through: categorias_libros,
        foreignKey: 'id_libro',
        otherKey: 'id_categoria'
    });


    //prestamos N:1, un usuario puede tener muchos préstamos, pero un préstamo solo puede pertenecer a un usuario.

    usuarios.hasMany(prestamos, {
        foreignKey: 'id_usuario'
    });

    prestamos.belongsTo(usuarios, {
        foreignKey: 'id_usuario'
    });

    //prestamos N:1, un libro puede tener muchos préstamos, pero un préstamo solo puede pertenecer a un libro.

    libros.hasMany(prestamos, {
        foreignKey: 'id_libro'
    });

    prestamos.belongsTo(libros, {
        foreignKey: 'id_libro'
    });



    return {
        autores,
        libros,
        categorias,
        usuarios,
        autores_libros,
        categorias_libros,
        prestamos
    };
}

module.exports = initDatabase;
