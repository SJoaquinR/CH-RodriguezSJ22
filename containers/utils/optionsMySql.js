const path = require('path')

const optionsMySql = {
    client: "mysql",
    connection: {
      host: "localhost",
      user: "root",
      password: "",
      database: "test",
    },
  };

module.exports = { optionsMySql }