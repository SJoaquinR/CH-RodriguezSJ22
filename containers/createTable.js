const { optionsMySql } = require("./utils/optionsMySql");
const memoryDB = require("./memoryDB");

const { optionsSqlite } = require("./utils/optionsSqlite");
const MessageDB = require("./messageDB");

const modeloMemoryDB = new memoryDB(optionsMySql);

const batchMemoryDB = async () => {
  try {
    console.log("1) tabla creada");
    await modeloMemoryDB.crearTabla();
  } catch (error) {
    console.error(error);
  } finally {
    modeloMemoryDB.cerrarConexion();
  }
};
batchMemoryDB();

const modeloMessageDB = new MessageDB(optionsSqlite);

// const articulos = [
//   { author: 'Leche', fyh: 'AB-12', precio: 23.60, stock: 24 },
//   { nombre: 'Harina', codigo: 'CD-34', precio: 12.80, stock: 45 },
//   { nombre: 'DDL', codigo: 'EF-56', precio: 32.30, stock: 16 },
//   { nombre: 'Fideos', codigo: 'FG-44', precio: 42.70, stock: 34 },
//   { nombre: 'Crema', codigo: 'CR-77', precio: 67.90, stock: 24 }
// ]

const batchMessageDB = async () => {
  try {
    console.log("1) tabla creada");
    await modeloMessageDB.crearTabla();

    // console.log("2) registros insertados");
    //     await modeloMessageDB.insertar(articulos);

  } catch (error) {
    console.error(error);
  } finally {
    modeloMessageDB.cerrarConexion();
  }
};
batchMessageDB();
