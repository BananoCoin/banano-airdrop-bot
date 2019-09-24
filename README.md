# banano-airdrop-bot

## create a config.json with the following contents:

    {
    	"token":"discord bot token",
    	"guildId": "discord server guild id",
    	"serverSeed": "random server seed",
    	"bananoSeed": "baano hot wallet seed",
    	"bananoAccount": "baano hot wallet account",
    	"bananoMultiplier": 1,
    	"bananoMillisPerUnlock": 1,
    	"bananoMinUnlock": 1,
    	"bananoMaxUnlock": 9999
    }

## to install, use the command:

    npm install;

## to run, use the command:

    npm start;

## to run in background, use the command:

    screen -dmS bananno_airdrop_bot npm start;

    screen -x bananno_airdrop_bot
