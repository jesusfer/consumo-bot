// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

export interface IConfiguration {
  BotToken: string;
  AllowedUsers: number[];
}

function loadConfiguration(): IConfiguration {
  if (
    !process.env.hasOwnProperty("TELEGRAM_BOT_TOKEN") ||
    !process.env.hasOwnProperty("TELEGRAM_ALLOWED_USERS")
  ) {
    throw new Error("The bot needs environment variables to work");
  }
  let config = {
    BotToken: process.env.TELEGRAM_BOT_TOKEN,
    AllowedUsers: process.env.TELEGRAM_ALLOWED_USERS.split(",").map((t) => parseInt(t)),
  };
  return config;
}

export const Configuration: IConfiguration = loadConfiguration();
