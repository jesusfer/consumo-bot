// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

import {bot} from "./bot";

console.log("Bot started: " + new Date().toUTCString());

function handler() {
  console.log("Bot exiting: " + new Date().toUTCString());
  bot.stopPolling().then(function() {
    process.exit();
  });
}

process.on("SIGINT", handler);
process.on("SIGTERM", handler);
process.on("exit", handler);
