// libraries

// modules
const lokijsUtil = require('./lokijs-util.js');

// constants

// functions
const hasAuthorById = (id) => {
  if (id == undefined) {
    return false;
  }
  return lokijsUtil.hasTableEntry('authors', 'id', id);
}

const hasAuthorByAccount = (account) => {
  if (account == undefined) {
    return false;
  }
  return lokijsUtil.hasTableEntry('authors', 'account', account);
}

const getAuthorById = (id) => {
  const newAuthorFn = (author) => {
    author.id = id;
    author.paid = false;
    author.account = undefined;
  }
  return lokijsUtil.getTableEntry('authors', 'id', id, newAuthorFn);
}

const setAuthor = (author) => {
  return lokijsUtil.setTableEntry('authors', 'author', author);
}

const deleteAuthor = (author) => {
  return lokijsUtil.deleteTableEntry('authors', 'author', author);
}

const getAllAuthors = () => {
  return lokijsUtil.getTableEntries('authors');
}

const hasGuild = (id) => {
  if (id == undefined) {
    return false;
  }
  return lokijsUtil.hasTableEntry('guilds', 'id', id);
}

const getGuild = (id) => {
  const newGuildFn = (guild) => {
    guild.id = id;
  }
  return lokijsUtil.getTableEntry('guilds', 'id', id, newGuildFn);
}

const setGuild = (guild) => {
  return lokijsUtil.setTableEntry('guilds', 'guild', guild);
}

const deleteGuild = (guild) => {
  return lokijsUtil.deleteTableEntry('guilds', 'guild', guild);
}

const getAllGuilds = () => {
  return lokijsUtil.getTableEntries('guilds');
}


const openDB = (config) => {
  lokijsUtil.openDB(config);
}

const closeDB = (config) => {
  lokijsUtil.closeDB();
}

const deleteDB = (config) => {
  lokijsUtil.deleteDB(config);
}

exports.hasGuild = hasGuild;
exports.getGuild = getGuild;
exports.setGuild = setGuild;
exports.deleteGuild = deleteGuild;
exports.getAllGuilds = getAllGuilds;
exports.hasAuthorById = hasAuthorById;
exports.hasAuthorByAccount = hasAuthorByAccount;
exports.getAuthorById = getAuthorById;
exports.setAuthor = setAuthor;
exports.deleteAuthor = deleteAuthor;
exports.getAllAuthors = getAllAuthors;
exports.openDB = openDB;
exports.closeDB = closeDB;
exports.deleteDB = deleteDB;
