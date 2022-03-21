/* -------------------------------- Modulos -------------------------------- */
const { optionsMySql } = require("./containers/utils/optionsMySql");
const { optionsSqlite } = require("./containers/utils/optionsSqlite");
const {faker} = require('@faker-js/faker');
const express = require("express");

const { Server: HttpServer } = require("http");
const { Server: Socket } = require("socket.io");

// const ContainerMemory = require('./containers/memory.js')
// const containerMessage = require('./containers/message.js')

const ContainerMemory = require("./containers/memoryDB.js");
const containerMessage = require("./containers/messageDB.js");

/* -------------------------------- Instancia de Express ------------------------ */
const app = express();
const httpServer = new HttpServer(app);
const io = new Socket(httpServer);

const productsApi = new ContainerMemory(optionsMySql);
// const messagesApi = new containerMessage('messages.json')
const messagesApi = new containerMessage(optionsSqlite);

/*==================== Data Mocks====================*/

function generarRandomObjeto() {
  return {
    nombre: faker.name.findName(),
    precio: faker.finance.amount(),
    imagen: faker.image.sports()
}
}

app.get('/api/productos-test', (req, res)=>{
    let objs = []

    for (let index = 0; index < 5; index++) {
        objs.push(generarRandomObjeto());
    }

    res.json(objs)
})

/* ---------------------- Socket ----------------------*/
io.on("connection", async (socket) => {
  console.log(`Nuevo cliente conectado! ${socket.id}`);

  // // Listar productos
  let responseProducts = await productsApi.listAll();
  socket.emit("products", responseProducts);

  // // Agrego productos
  socket.on("addProduct", async (product) => {
    await productsApi.save(product);

    let responseProducts = await productsApi.listAll();
    io.sockets.emit("products", responseProducts);
  });

  // Listar mensajes
  socket.emit("messages", await messagesApi.listAll());

  // Agrego mensaje
  socket.on("newMessage", async (mensaje) => {
    mensaje.fyh = new Date().toLocaleString();
    await messagesApi.save(mensaje);
    io.sockets.emit("messages", await messagesApi.listAll());
  });
});

/* -------------------------------- Middlewares -------------------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* -------------------------------- Server -------------------------------- */

const PORT = 8080;
const server = httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${server.address().port}`);
});
server.on("error", (error) => console.log(`Error en el servidor ${error}`));

/*
https://www.iconfinder.com/free_icons
    npm init -y 
    npm install express body-parser express-handlebars socket.io
        "dev": "nodemon server.js"

*/
