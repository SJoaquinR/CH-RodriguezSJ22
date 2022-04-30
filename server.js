//PM2-------------
//pm2 start server.js --name="server" --watch -i max -- 8081 CLUSTER
//pm2 start server.js --name="server" --watch -- 8081 FORK
// ahora ya lo va a hacer mi codigo levantar el cluster
//pm2 start server.js --name="server" --watch -- 8081 CLUSTER


//tasklist /fi "imagename eq node.exe"    //check if node is running lista todos los procesos de node.js activos
 
//taskkill /pid <PID> /f  //kill a specific process by PID
//taskkill /f /im node.exe  //kill all node.js processes mata un proceso por su nombre

//fuser <PORT>/tcp [-k] //kill all processes listening on a port encuentra [y mata] al proceso ocupando el puerto PORT



/* -------------------------------- Modulos -------------------------------- */
const dotenv = require("dotenv");
dotenv.config();

const minimist = require("minimist");
let defaultValues = { alias: { p: "puerto" }, default: { p: 8080 } };
defaultValues = minimist(process.argv.slice(2), defaultValues);

const { optionsMySql } = require("./containers/utils/optionsMySql");
const { optionsSqlite } = require("./containers/utils/optionsSqlite");
const { faker } = require("@faker-js/faker");
const express = require("express");
const path = require("path");

const cluster = require("cluster");
const numCPUs = require("os").cpus().length;;

const modoCluster = process.argv[3] || "CLUSTER";

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
const { log } = require("console");

const compression = require('compression');
const logger = require('./containers/logger.js');

/* -------------------------------- Instancia de Express ------------------------ */
const app = express();
// Comprimir todas las respuestas HTTP
app.use(compression());

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

// const FACEBOOK_APP_ID = "1560866814294385";
// const FACEBOOK_APP_SECRET = "c80ade890236d8cb57e8634a8382e0da";

/*-------- [Conf Passport]*/
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
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

if (modoCluster && cluster.isMaster) {
  console.log(`Numeros de procesadores ${numCPUs}`);
  console.log(`PID Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.log(
      `worker ${worker.process.pid} died`,
      new Date().toLocaleString()
    );
    cluster.fork();
  });
} else {
  app.get("/", (req, res) => {
    logger.info('Ruta Base');
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
    logger.info('Ruta GET Login');
    res.render("pages/login.ejs");
  });

  app.post("/login", (req, res) => {
    const { nameUser, password } = req.body;
    logger.info('Ruta Login POST: Parámetros %s y %s correctos para la suma', nameUser, password);

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
    logger.info('Ruta register GET');
    res.render("pages/register");
  });

  app.post("/register", (req, res) => {
    const { nameUser, password } = req.body;
    logger.info('Ruta Login POST: Parámetros %s y %s correctos para la suma', nameUser, password);
    const newUsuario = usuariosDB.find(
      (usuario) => usuario.nameUser == nameUser
    );

    if (newUsuario) {
      res.render("pages/register-error");
    } else {
      usuariosDB.push({ nameUser, password });
      res.redirect("/login");
    }
  });

  app.get("/datos", (req, res) => {
    logger.info('Ruta datos GET');
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
        console.log("USuario no autentciado");
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
    logger.info('Ruta logout GET');
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
    logger.info('Ruta info GET');
    // res.send(req.sessionID);
    const sistema = [
      `Argumento de entrada: ${process.argv}`,
      `SO: ${process.platform}`,
      `Version Node: ${process.version}`,
      `Uso memoria: ${process.memoryUsage().rss}`,
      `Path Ejecucion: ${process.title}`,
      `Id del proceso: ${process.pid}`,
      `Directorio: ${process.cwd()}`,
      `Numeros de procesadores ${numCPUs}`,
    ];

    const primes = []
    const max = Number(req.query.max) || 1000
    for (let i = 1; i <= max; i++) {
        if (isPrime(i)) primes.push(i)
    }
    //res.json(primes)

    res.send(sistema);
  });

  app.get("/api/randoms", (req, res) => {
    logger.info('Ruta randoms GET');
    console.log(`port: ${PORT}`);
    res.send(`Nginex en ${PORT} - en el PID ${process.pid}`);
  });

  app.get('*', (req, res) => {
    let { url, method } = req
    logger.warn('Ruta %s %s no implementada', url, method)
    res.send(`Ruta ${method} ${url} no está implementada`)
})

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
  // app.use(express.static("public"));   //Lo comento ya que ahora lo uso desde Nginex

  /* -------------------------------- Server -------------------------------- */

  const PORT = defaultValues.p;
  const server = httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${server.address().port} - PID worker ${process.pid}`);
  });
  server.on("error", (error) => console.log(`Error en el servidor ${error}`));

  /*
https://www.iconfinder.com/free_icons
    npm init -y 
    npm install express body-parser express-handlebars socket.io
        "dev": "nodemon server.js"

*/
}

function isPrime(num) {
  if ([2, 3].includes(num)) return true;
  else if ([2, 3].some(n => num % n == 0)) return false;
  else {
      let i = 5, w = 2;
      while ((i ** 2) <= num) {
          if (num % i == 0) return false
          i += w
          w = 6 - w
      }
  }
  return true
}
