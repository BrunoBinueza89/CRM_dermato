const app = require("./app");

const port = Number.parseInt(process.env.PORT, 10) || 3001;

app.listen(port, () => {
  console.log(`Clinica Dermato CRM API rodando na porta ${port}`);
});
