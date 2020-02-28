// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

class Configuration {
  public BotToken: string = process.env.TELEGRAM_BOT_TOKEN;
  public AzureAccount: string = process.env.AZURE_STORAGE_ACCOUNT;
  public AzureKey: string = process.env.AZURE_STORAGE_KEY;
  public AzureTableName: string = process.env.AZURE_TABLE_NAME;
  public AllowedUsers: number[] = process.env.TELEGRAM_ALLOWED_USERS.split(",").map((t) =>
    parseInt(t)
  );
}

export const config = new Configuration();
