// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

const d = require("debug")("bot-bot");
import {config} from "./config";
import TelegramBot from "node-telegram-bot-api";
import {AzStorage} from "./azure";

const storage = new AzStorage({
  storageAccount: config.AzureAccount,
  storageKey: config.AzureKey,
  tableName: config.AzureTableName,
});

d(`Allowed users: ${config.AllowedUsers}`);
d(`Table name: ${config.AzureTableName}`);

export const bot = new TelegramBot(config.BotToken, {
  polling: true,
});

const helpText = "This bot stores fuel consumption";
function isAllowedUser(message) {
  if (!config.AllowedUsers.includes(message.from.id)) {
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
    let [, distance, volume, price, partialString, dateString] = match;
    let partial = partialString != undefined;
    let date = new Date(Date.now());
    if (dateString != undefined) {
      let [, day, month, year] = dateRE.exec(dateString.trim());
      date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    }
    storage
      .NewReading(
        message.from.id,
        parseInt(volume),
        parseInt(price),
        parseInt(distance),
        partial,
        date
      )
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
  // TODO:
});

bot.onText(/\/clear/, (message) => {
  // TODO:
});

// FUTURE: Handle updating last message -> update last reading?
