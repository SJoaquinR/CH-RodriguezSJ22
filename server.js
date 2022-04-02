/* -------------------------------- Modulos -------------------------------- */
const { optionsMySql } = require("./containers/utils/optionsMySql");
const { optionsSqlite } = require("./containers/utils/optionsSqlite");
const { faker } = require("@faker-js/faker");
const express = require("express");
const path = require("path");

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;

const connectMongo = require("connect-mongo");
const mongoStore = connectMongo.create({
  mongoUrl: "mongodb://localhost:27017/sesiones",
  //mongoUrl: "mongodb+srv://coderhouse:coderhouse@cluster0.m8qjx.mongodb.net/sesiones?retryWrites=true&w=majority",
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
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
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

/*============================[Middlewares]============================*/

const FACEBOOK_APP_ID = "1560866814294385";
const FACEBOOK_APP_SECRET = "c80ade890236d8cb57e8634a8382e0da";

/*-------- [Conf Passport]*/
passport.use(
  new FacebookStrategy(
    {
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:8080/auth/facebook/callback",
      profileFields: ["id", "displayName", "photos", "email"],
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log("accessToken: ", accessToken);
      console.log("refreshToken: ", refreshToken);
      console.log(profile);
      cb(null, profile);
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});

/*-------- [Passport]*/
app.use(passport.initialize());
app.use(passport.session());

/*============================[Base de Datos]============================*/
const usuariosDB = [];

app.get("/", (req, res) => {
  if (req.session.nameUser) {
    res.redirect("/datos");
  } else {
    res.redirect("/login");
    //res.redirect("/auth/facebook");
  }
});

// app.get("/", (req, res) => {
//   res.render('pages/login.ejs');
// });

/*==================== Autenticacion ====================*/

/*-------- [Passport facebook]*/
app.get("/auth/facebook", passport.authenticate("facebook"));
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/",
    successRedirect: "/datos",
    authType: "reauthenticate",
  })
);
/*-------- --------------------*/

app.get("/login", (req, res) => {
  res.render("pages/login.ejs");
});

app.post("/login", (req, res) => {
  const { nameUser, password } = req.body;

  const existeUsuario = usuariosDB.find(
    (usuario) => usuario.nameUser == nameUser && usuario.password == password
  );
  //const nameUser = req.session?.nameUser;

  if (!existeUsuario) {
    res.render("pages/login-error");
  } else {
    req.session.nameUser = nameUser;
    req.session.password = password;
    res.redirect("/datos");
    // res.render(path.join(process.cwd(), "/views/pages/logout.ejs"), {
    // nameUser,
    //});
  }

  // if (!nameUser) {
  //   res.redirect("/");
  // } else {
  //   res.render(path.join(process.cwd(), '/views/pages/logout.ejs'), { nameUser })
  // }
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.post("/register", (req, res) => {
  const { nameUser, password } = req.body;
  const newUsuario = usuariosDB.find((usuario) => usuario.nameUser == nameUser);

  if (newUsuario) {
    res.render("pages/register-error");
  } else {
    usuariosDB.push({ nameUser, password });
    res.redirect("/login");
  }
});

app.get("/datos", (req, res) => {
  if (req.isAuthenticated()) {
    const datosUsuario = {
      nombre: req.user.displayName,
      foto: req.user.photos[0].value,
      email: "req.user.email",
    };
    res.render(path.join(process.cwd(), "/views/pages/facebook.ejs"), {
      datos: datosUsuario,
    });
  } else {
    if (req.session.nameUser) {
      const datosUsuario = usuariosDB.find((usuario) => {
        return (
          usuario.nameUser == req.session.nameUser &&
          usuario.password == req.session.password
        );
      });
      res.render(path.join(process.cwd(), "/views/pages/logout.ejs"), {
        datos: datosUsuario,
      });
    } else {
      console.log('USuario no autentciado')
      res.redirect("/login");
    }
  }
  

  // if (req.session.nameUser) {
  //   const datosUsuario = usuariosDB.find((usuario) => {
  //     return (
  //       usuario.nameUser == req.session.nameUser &&
  //       usuario.password == req.session.password
  //     );
  //   });
  //   res.render(path.join(process.cwd(), "/views/pages/logout.ejs"), {
  //     datos: datosUsuario,
  //   });
  // res.render("pages/logout", {
  //   datos: datosUsuario,
  // });
  // } else {
  //   res.redirect("/login");
  // }
});

app.get("/logout", (req, res) => {
  const nameUser = req.session?.nameUser;
  if (nameUser) {
    req.session.destroy((err) => {
      if (!err) {
        res.render(path.join(process.cwd(), "/views/pages/chau.ejs"), {
          nameUser,
        });
      } else {
        res.redirect("/login");
      }
    });
  } else {
    req.logout();
    res.redirect("/login");
  }
});

app.get("/info", (req, res) => {
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
