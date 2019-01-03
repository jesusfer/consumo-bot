# consumo-bot

This Telegram bot uses Azure tables to store fuel consumption.

## Commands

The bot has several commands to interact with it:

1. New reading

    Store a new reading. Send the bot a message like:

    ```
    /new mileage volume price [date as 'ddmmyyyy' DayMonthYear] [partial]
    ```

2. Stats

    ```
    /stats
    ```

3. Clear

    ```
    /clear
    ```
