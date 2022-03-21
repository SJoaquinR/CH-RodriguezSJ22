const socket = io.connect();

// const { normalize, schema } = require("normalizr");
// const util = require("util");

//------------------------------------------------------------------------------------

const formAddProduct = document.querySelector("#formAddProduct");
formAddProduct.addEventListener("submit", (e) => {
  e.preventDefault();
  const product = {
    title: formAddProduct.querySelector("#title").value,
    price: formAddProduct.querySelector("#price").value,
    image: formAddProduct.querySelector("#image").value,
  };

  socket.emit("addProduct", product);
  formAddProduct.reset();
});

socket.on("products", (products) => {
  makeHtmlTable(products).then((html) => {
    document.querySelector("#products").innerHTML = html;
  });
});

function makeHtmlTable(products) {
  return fetch("pages/products.hbs")
    .then((respuesta) => respuesta.text())
    .then((plantilla) => {
      const template = Handlebars.compile(plantilla);
      const html = template({ products });
      return html;
    });
}

//-------------------------------------------------------------------------------------

const inputAddEmail = document.querySelector("#inputAddEmail");
const inputAddName = document.querySelector("#inputAddName");
const inputAddSurname = document.querySelector("#inputAddSurname");
const inputAddAge = document.querySelector("#inputAddAge");
const inputAddAlias = document.querySelector("#inputAddAlias");
const inputAddAvatar = document.querySelector("#inputAddAvatar");
const inputMessage = document.querySelector("#inputMessage");
const btnSend = document.querySelector("#btnSend");

const formMessage = document.querySelector("#formMessage");
formMessage.addEventListener("submit", (e) => {
  e.preventDefault();

  //const message = { author: inputAddEmail.value, text: inputMessage.value };
  const message = {
    author: inputAddEmail.value,
    name: inputAddName.value,
    surname: inputAddSurname.value,
    age: inputAddAge.value,
    alias: inputAddAlias.value,
    avatar: inputAddAvatar.value,
    text: inputMessage.value,
  };

  socket.emit("newMessage", message);
  formMessage.reset();
  inputMessage.focus();
});

const makeHtmlList = (messages) => {
  return messages
    .map((messages) => {
      const { author, fyh, text } = messages;
      return `
              <div>
                  <b style="color:blue;">${author}</b>
                  [<span style="color:brown;">${fyh}</span>] :
                  <i style="color:green;">${text}</i>
              </div>
          `;
    })
    .join(" ");
};

const makeNormalize = (messages) => {
  return messages.map((messages) => {
    const { author, text, name, surname, age, alias, avatar } = messages;

    return (messageNormalize = {
      author: {
        id: author,
        nombre: name,
        apellido: surname,
        edad: age,
        alias: alias,
        avatar: avatar,
      },
      text: text,
    });
  });
};

// const messageNormalize = {
//   author: {
//     id: "mail del usuario",
//     nombre: "nombre del usuario",
//     apellido: "apellido del usuario",
//     edad: "edad del usuario",
//     alias: "alias del usuario",
//     avatar: "url avatar (foto, logo) del usuario",
//   },
//   text: "mensaje del usuario",
// };

//Definimos la entidad messageEntity
//  const messageEntity = new schema.Entity("messageEntity");

// const organigrama = new schema.Entity("organigrama", {
//   gerente: messageEntity,
//   encargado: messageEntity,
//   empleados: [messageEntity],
// });

function print(obj) {
  console.log("imprime");
  console.log(util.inspect(obj, false, 12, true));
}

socket.on("messages", (messages) => {
  console.log(messages);
  const html = makeHtmlList(messages);

  //----------------------------
   const messagesNormalize = makeNormalize(messages);
   console.log("messagesNormalize"+JSON.stringify(messagesNormalize));
  //  const normalizeMessage = normalize(messagesNormalize, organigrama);
  //  print(normalizeMessage);
  //----------------------------

  document.querySelector("#messages").innerHTML = html;
});

inputAddEmail.addEventListener("input", () => {
  const inputEmail = inputAddEmail.value.length;
  const inputText = inputMessage.value.length;
  inputMessage.disabled = !inputEmail;
  btnSend.disabled = !inputEmail || !inputText;
});

inputMessage.addEventListener("input", () => {
  const inputText = inputMessage.value.length;
  btnSend.disabled = !inputText;
});
