// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

import {ConsumoBot} from "./bot";
import {Configuration} from "./config";

function stopHandler() {
  console.log("Bot exiting: " + new Date().toUTCString());
  bot.stopPolling().then(function() {
    process.exit();
  });
}
process.on("SIGINT", stopHandler);
process.on("SIGTERM", stopHandler);
process.on("exit", stopHandler);

console.log("Bot started: " + new Date().toUTCString());
const bot = new ConsumoBot(Configuration);
