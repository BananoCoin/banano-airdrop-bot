// libraries
const Discord = require('discord.js');

const bananojs = require('bananojs');

// modules
const databaseUtil = require('./util/database-util.js');

// global settings.
const config = require('../../config.json');

// constants
const client = new Discord.Client();


bananojs.bananodeApi.setUrl(config.wallets.bananodeUrl);

databaseUtil.openDB(config.db);

const processAirdrop = async (toAccount, authorData, author) => {
  const bananoUtil = bananojs.bananoUtil;
  const bananodeApi = bananojs.bananodeApi;
  const callback = async (hash) => {
    let actionResponseMessage;
    if (hash === undefined) {
      actionResponseMessage = `${author.tag} failure, undefined hash, try again later.`;
      authorData.paid = false;
    } else {
      actionResponseMessage = `${author.tag} success https://creeper.banano.cc/explorer/block/${hash}`;
      authorData.paid = true;
      authorData.account = toAccount;
    }
    databaseUtil.setAuthor(authorData);
    console.trace(actionResponseMessage);
    await author.send(actionResponseMessage);
  }
  const errorCallback = async (error) => {
    let errorMessage = error.toString();
    if (error.error !== undefined) {
      errorMessage = error.error;
    }
    if (error.message !== undefined) {
      errorMessage = error.message;
    }
    console.trace('FAILURE bananoUtil.send', error);
    console.log('processAirdrop error', errorMessage);
    authorData.paid = false;
    databaseUtil.setAuthor(authorData);
    await author.send(errorMessage);
  }

  const serverWalletSeed = config.wallets.serverSeed;
  const toAddress = authorData.account;
  const amountRaw = bananoUtil.getRawStrFromBananoStr(config.airdrop.bananos.toString());
  await bananoUtil.send(bananodeApi, serverWalletSeed, 0, toAccount, amountRaw, callback, errorCallback).catch(errorCallback);
}


// functions
client.on('ready', async () => {
  const guilds = [];

  client.guilds.forEach((guild) => {
    guilds.push(guild);
  });
  console.log('guild count', guilds.length);

  for (let ix = 0; ix < guilds.length; ix++) {
    const guild = guilds[ix];

    console.log('checking guild ', guild.id, guild.name);
    if (databaseUtil.hasGuild(guild.id)) {
      const guildData = databaseUtil.getGuild(guild.id);
      console.log('existing guild found, skipping', guild.id, guild.name);
      databaseUtil.setGuild(guildData);
    } else {
      await guild.fetchMembers();
      const members = guild.members;

      console.log('new guild found, adding member snapshot', guild.id, guild.name);
      const addMemberAsAuthor = (member, memberId, members) => {
        const user = member.user;
        console.log('checking user', user.id, user.tag);
        if (databaseUtil.hasAuthorById(user.id)) {
          console.log('existing user found, skipping', user.id, user.tag);
        } else {
          const authorData = databaseUtil.getAuthorById(user.id);
          console.log('new user found, skipping', user.id, user.tag);
          databaseUtil.setAuthor(authorData);
        }
      }

      members.forEach(addMemberAsAuthor);
    }
  }

  const serverRepresentative = config.wallets.serverRepresentative;

  const repValidation = bananojs.bananoUtil.getAccountValidationInfo(serverRepresentative);
  if (!repValidation.valid) {
    console.log(`Representative Validation for ${serverRepresentative} Failed: ${repValidation.message}`);
    process.exit();
  }
  console.log(`Representative Validation Succeeded:`, serverRepresentative);

  const serverWalletSeed = config.wallets.serverSeed;
  const serverPrivateKey = bananojs.bananoUtil.getPrivateKey(serverWalletSeed, 0);
  const serverPublicKey = bananojs.bananoUtil.getPublicKey(serverPrivateKey);
  const serverAccount = bananojs.bananoUtil.getAccount(serverPublicKey);

  console.log(`Server Account`, serverAccount);

  const actionResponse = await bananojs.depositUtil.receive(bananojs.loggingUtil, bananojs, serverAccount, serverPrivateKey, serverRepresentative);

  console.log(`Pending:${actionResponse.pendingCount} ` +
    `${actionResponse.pendingMessage} ` + `Receive:${actionResponse.receiveCount} ` +
    `${actionResponse.receiveMessage}`);


  const balanceRaw = await bananojs.bananodeApi.getAccountBalanceRaw(serverAccount);
  const bananoParts = bananojs.bananoUtil.getBananoPartsFromRaw(balanceRaw);
  console.log('Server Balance:', bananoParts.banano + '.' + bananoParts.banoshi);

  console.log('Banano Airdrop bot ready');
});

client.on('error', console.error);

client.on('messageReactionAdd', (reaction, user) => {});

client.on('message', async (message) => {
  if (message.channel.type != 'dm') {
    if (message.isMentioned(client.user)) {
      if (message.deletable) {
        message.delete().catch((error) => {
          console.trace('message.delete error:' + error);
        });
      }
      return await message.author.send('send me a banano address here as a private message.')
    }
    return;
  }
  if (message.author.bot) {
    return;
  }
  if (databaseUtil.hasAuthorById(message.author.id)) {
    const account = message.content;
    const accountValidtionInfo = bananojs.bananoUtil.getAccountValidationInfo(account);
    if (accountValidtionInfo.valid) {
      if (databaseUtil.hasAuthorByAccount(account)) {
        return await message.author.send(`${message.author.tag} Error: Account '${account}' is already registered`);
      } else {
        const authorData = databaseUtil.getAuthorById(message.author.id);
        if (authorData.paid) {
          return await message.author.send(`${message.author.tag}account is valid. but you were already paid.`);
        } else {
          return await processAirdrop(account, authorData, message.author);
        }
      }
    } else {
      return await message.author.send(`${message.author.tag} Error: ${accountValidtionInfo.message}`);
    }
  }
});

// start the discord bot.
console.log('Banano Airdrop bot login');
client.login(config.server.token).catch((error) => {
  console.trace('login error' + error);
});
