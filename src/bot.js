// Copyright (c) 2018 Jesús Fernández <jesus@nublar.net>
// MIT License

"use strict";

const d = require("debug")("bot-bot");
const config = require("./config");
const TelegramBot = require("node-telegram-bot-api");
const AzAccount = require("./azure");

const storage = new AzAccount(config.azureAccount, config.azureKey, config.azureTable);

d(`Allowed users: ${config.allowedUsers}`);
const bot = new TelegramBot(config.token, {
  polling: true,
});
const helpText = "This bot stores fuel consumption";

function isAllowedUser(message) {
  if (!config.allowedUsers.includes(message.from.id)) {
    bot.sendMessage(message.from.id, "Sorry, you are not allowed to use this service");
    d(`User ${message.from.id} tried to use the service.`);
    return false;
  }
  return true;
}

/**
 * Available commands:
 * - start: register a new user
 * - new: store a new reading
 * - stats: print summary stats
 * - clear: clear all info from the user
 */
bot.onText(/\/start/, (message) => {
  if (!isAllowedUser(message)) {
    return;
  }
  bot.sendMessage(message.from.id, helpText);
});

const messageRE = new RegExp("^/new (\\d+) (\\d*.?\\d*) (\\d*.?\\d*)( partial)?( \\d{8})?");
const dateRE = new RegExp("(\\d{2})(\\d{2})(\\d{4})");

bot.onText(/\/new .*/, (message) => {
  if (!isAllowedUser(message)) {
    return;
  }
  let match = messageRE.exec(message.text);
  if (match) {
    let [, distance, volume, price, partial, dateString] = match;
    partial = partial != undefined;
    let date = new Date(Date.now());
    if (dateString != undefined) {
      let [, day, month, year] = dateRE.exec(dateString.trim());
      date = new Date(Date.UTC(year, month - 1, day));
    }
    storage
      .NewReading(message.from.id, volume, price, distance, partial, date)
      .then((result) => {
        let msg = `Reading #${
          result.ReadingId
        }: ${distance} km, ${volume} l at ${price} €/l on ${date.toDateString()}`;
        bot.sendMessage(message.from.id, msg);
        d(`${msg} (User: ${message.from.id})`);
      })
      .catch((error) => {
        d(`There was an error saving the reading: ${error}`);
      });
  } else {
    bot.sendMessage(message.from.id, "I did not understand your message");
    d(`Message parsing error (User:${message.from.id}) Message:${message.text}`);
  }
});

bot.onText(/\/stats/, (message) => {
  // TODO
});

bot.onText(/\/clear/, (message) => {
  // TODO
});

// FUTURE: Handle updating last message -> update last reading?

module.exports = bot;
