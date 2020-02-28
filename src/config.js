// Copyright (c) 2018 Jesús Fernández <jesus@nublar.net>
// MIT License

module.exports = {
  token: process.env.TELEGRAM_BOT_TOKEN,
  azureAccount: process.env.AZURE_STORAGE_ACCOUNT,
  azureKey: process.env.AZURE_STORAGE_KEY,
  azureTable: process.env.AZURE_TABLE_NAME,
  allowedUsers: process.env.TELEGRAM_ALLOWED_USERS.split(",").map((t) => parseInt(t)),
};
