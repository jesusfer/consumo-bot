// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

const d = require("debug")("bot-bot");
import {IConfiguration} from "./config";
import TelegramBot, {Message} from "node-telegram-bot-api";
import {AzureStorage} from "./azure";
import {BotStorage} from "./storage";

export class ConsumoBot extends TelegramBot {
  private configuration: IConfiguration;
  private storage: BotStorage;
  private helpText = "This bot stores fuel consumption";

  constructor(configuration: IConfiguration) {
    super(configuration.BotToken, {polling: true});
    this.configuration = configuration;
    const serviceOptions = {
      storageAccount: process.env.AZURE_STORAGE_ACCOUNT,
      storageKey: process.env.AZURE_STORAGE_KEY,
      tableName: process.env.AZURE_TABLE_NAME,
    };
    let service = new AzureStorage().WithOptions(serviceOptions);
    this.storage = new BotStorage().WithService(service);
    d(`Allowed users: ${configuration.AllowedUsers}`);
    d(`Using storage: ${service.serviceName}`);
    this.SetupCommands();
  }

  private IsAllowedUser(message: Message): boolean {
    if (!this.configuration.AllowedUsers.includes(message.from.id)) {
      this.sendMessage(message.from.id, "Sorry, you are not allowed to use this service");
      d(`User ${message.from.id} tried to use the service.`);
      return false;
    }
    return true;
  }

  private messageRE = new RegExp("^/new (\\d+) (\\d*.?\\d*) (\\d*.?\\d*)( partial)?( \\d{8})?");
  private dateRE = new RegExp("(\\d{2})(\\d{2})(\\d{4})");
  private SetupCommands(): void {
    /**
     * Available commands:
     * - start: register a new user
     * - new: store a new reading
     * - stats: print summary stats
     * - clear: clear all info from the user
     */
    this.onText(/\/start/, (message: Message) => {
      if (!this.IsAllowedUser(message)) {
        return;
      }
      this.sendMessage(message.from.id, this.helpText);
    });
    this.onText(/\/new .*/, (message: Message) => this.HandleNewMessage(message));
    this.onText(/\/stats/, (message: Message) => {
      // TODO: Handle /stats command
    });

    this.onText(/\/clear/, (message: Message) => {
      // TODO: Handle /clear command
    });
  }

  private async HandleNewMessage(message: Message): Promise<void> {
    if (!this.IsAllowedUser(message)) {
      return;
    }
    let match = this.messageRE.exec(message.text);
    if (!match) {
      this.sendMessage(message.from.id, "I did not understand your message");
      d(`Message parsing error (User:${message.from.id}) Message:${message.text}`);
      return;
    }
    let [, distance, volume, price, partialString, dateString] = match;
    let partial = partialString != undefined;
    let dateNow = new Date(Date.now());
    if (dateString != undefined) {
      let [, day, month, year] = this.dateRE.exec(dateString.trim());
      dateNow = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    }
    try {
      let reading = {
        User: message.from.id,
        Volume: parseInt(volume),
        Price: parseInt(price),
        Distance: parseInt(distance),
        Partial: partial,
        Date: dateNow,
      };
      let readingId = await this.storage.NewReading(reading);
      let msg = `Reading #${readingId}: ${distance} km, ${volume} l at ${price} €/l on ${dateNow.toDateString()}`;
      this.sendMessage(message.from.id, msg);
      d(`${msg} (User: ${message.from.id})`);
    } catch (error) {
      d(`There was an error saving the reading: ${error}`);
    }
  }
}
// FUTURE: Handle updating last message -> update last reading?
