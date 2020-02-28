// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

export interface IConfiguration {
  BotToken: string;
  AzureAccount: string;
  AzureKey: string;
  AzureTableName: string;
  AllowedUsers: number[];
}

export const Configuration: IConfiguration = {
  BotToken: process.env.TELEGRAM_BOT_TOKEN,
  AzureAccount: process.env.AZURE_STORAGE_ACCOUNT,
  AzureKey: process.env.AZURE_STORAGE_KEY,
  AzureTableName: process.env.AZURE_TABLE_NAME,
  AllowedUsers: process.env.TELEGRAM_ALLOWED_USERS.split(",").map((t) => parseInt(t)),
};
