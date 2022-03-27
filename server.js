/* -------------------------------- Modulos -------------------------------- */
const { optionsMySql } = require("./containers/utils/optionsMySql");
const { optionsSqlite } = require("./containers/utils/optionsSqlite");
const { faker } = require("@faker-js/faker");
const express = require("express");
const path = require('path');

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const connectMongo = require("connect-mongo");
const mongoStore = connectMongo.create({
  // mongoUrl: "mongodb://localhost:27017/sesiones",
  mongoUrl: "mongodb+srv://coderhouse:coderhouse@cluster0.m8qjx.mongodb.net/sesiones?retryWrites=true&w=majority",
  ttl: 600,
});

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

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(
  session({
    store: mongoStore,
    secret: "123456789!@#$%^&*()",
    resave: false,
    saveUninitialized: false,
  })
);

const productsApi = new ContainerMemory(optionsMySql);
// const messagesApi = new containerMessage('messages.json')
const messagesApi = new containerMessage(optionsSqlite);

app.get("/", (req, res) => {
  res.render('pages/login.ejs');
});

/*==================== Autenticacion ====================*/

app.post("/login", (req, res) => {
  req.session.nameUser = req.body.nameUser;
  const nameUser = req.session?.nameUser;

  if (!nameUser) {
    res.redirect("/");
  } else {
    res.render(path.join(process.cwd(), '/views/pages/logout.ejs'), { nameUser })
  }
});

app.get("/logout", (req, res) => {
  const nameUser = req.session?.nameUser;
  if (nameUser) {
    req.session.destroy((err) => {
      if (!err) {
        res.render(path.join(process.cwd(), '/views/pages/chau.ejs'), { nameUser })
      } else {
        res.redirect("/");
      }
    });
  } else {
    res.redirect("/");
  }
});

app.get('/info', (req, res)=> {
  res.send(req.sessionID);
});

/*==================== Data Mocks====================*/

function generarRandomObjeto() {
  return {
    nombre: faker.name.findName(),
    precio: faker.finance.amount(),
    imagen: faker.image.sports(),
  };
}

app.get("/api/productos-test", (req, res) => {
  let objs = [];

  for (let index = 0; index < 5; index++) {
    objs.push(generarRandomObjeto());
  }

  res.json(objs);
});

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
