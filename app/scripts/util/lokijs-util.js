// libraries
const fs = require('fs');
const loki = require('lokijs');
const lfsa = require('lokijs/src/loki-fs-structured-adapter');
const path = require('path');

// modules

// constants

const LOG_DB_OPEN_CLOSE = false;

const LOG_DB_SET_GET = false;

const LOG_DB_SAVE = false;

const LOG_DB_BACKUP = false;

// variables
let db;

let getBackupFileName;

let deleteOldBackups;

// functions
const loadDb = (config) => {
  if (config === undefined) {
    throw new Error('Undefined config');
  }
  if (config.dbFileName === undefined) {
    throw new Error('Undefined config.dbFileName');
  }
  if (config.tableIndexes === undefined) {
    throw new Error('Undefined config.tableIndexes');
  }
  if (db !== undefined) {
    throw new Error('Defined db');
  }
  if (LOG_DB_OPEN_CLOSE) {
    console.log('loadDb');
  }

  const tableNames = Object.keys(config.tableIndexes);
  const tableIndexes = config.tableIndexes;

  getBackupFileName = () => {
    const prefix = config.dbBackupFileName;
    const date = new Date().toISOString();
    return `${prefix}_${date}`;
  }

  deleteOldBackups = () => {
    const prefix = path.join(config.dbBackupFileName);
    const dir = path.join(prefix, '..');
    if (LOG_DB_BACKUP) {
      console.log('deleteOldBackups prefix', prefix);
      console.log('deleteOldBackups dir', dir);
      console.log('deleteOldBackups maxCount', config.dbBackupFileMaxCount);
    }
    var files = fs.readdirSync(dir);
    files.sort(function(a, b) {
      return fs.statSync(path.join(dir, b)).mtime.getTime() -
        fs.statSync(path.join(dir, a)).mtime.getTime();
    });
    let sparedCount = 0;
    for (var i in files) {
      const file = files[i];
      const fullFile = path.join(dir, file);
      if (fullFile.startsWith(prefix)) {
        sparedCount++;
        if (sparedCount > config.dbBackupFileMaxCount) {
          if (LOG_DB_BACKUP) {
            console.log('remove file', sparedCount, fullFile);
          }
          fs.unlinkSync(fullFile);
        } else {
          if (LOG_DB_BACKUP) {
            console.log('spared file', sparedCount, fullFile);
          }
        }
      }
    }
  }

  const FileStore = {
    mode: 'reference',
    saveDatabase: async (name, data, callback) => {
      if (LOG_DB_SAVE) {
        console.log('STARTED dbSave');
      }
      try {
        fs.writeFileSync(getBackupFileName(), data, 'utf-8');
        const tempName = name + '.tmp';
        fs.writeFileSync(tempName, data, 'utf-8');
        if (fs.existsSync(tempName)) {
          if (fs.existsSync(name)) {
            fs.unlinkSync(name);
          }
          fs.renameSync(tempName, name);
        }
        deleteOldBackups();
      } catch (error) {
        console.trace(error);
      }
      if (LOG_DB_SAVE) {
        console.log('SUCCESS dbSave');
      }
      await callback(data);
    },
    loadDatabase: async (name, callback) => {
      if (LOG_DB_SAVE) {
        console.log('STARTED dbLoad');
      }
      if (fs.existsSync(name)) {
        const data = JSON.parse(fs.readFileSync(name, 'utf8'));
        await callback(data);
      } else {
        await callback({});
      }
      if (LOG_DB_SAVE) {
        console.log('SUCCESS dbLoad');
      }
    }
  }
  db = new loki(config.dbFileName, {
    adapter: FileStore,
    autosave: true,
    autosaveInterval: config.dbAutosaveInterval
  })
  db.loadDatabase();
  tableNames.forEach((tableName) => {
    if (db.getCollection(tableName) === null) {
      db.addCollection(tableName, {
        indices: tableIndexes[tableName],
        clone: false
      });
    }
  });
  db.saveDatabase();
}

const loadDbCloseBinding = () => {
  // console.log('STARTED loadDbCloseBinding.');
  process.on('SIGINT', () => {
    console.log('STARTED SIGINT flushing database.');
    closeDB();
    console.log(`SUCCESS SIGINT flushing database.`);
    process.exit(0);
  });
  // console.log('SUCCESS loadDbCloseBinding.');
}

const closeDB = () => {
  if (LOG_DB_OPEN_CLOSE) {
    console.log('closeDB');
  }
  // if (db !== undefined) {
  db.close();
  // }
}

const deleteDB = (config) => {
  if (config === undefined) {
    throw new Error('Undefined config');
  }
  if (config.dbFileName === undefined) {
    throw new Error('Undefined config.dbFileName');
  }

  if (fs.existsSync(config.dbFileName)) {
    fs.unlinkSync(config.dbFileName);
  }
  db = undefined;
  if (LOG_DB_OPEN_CLOSE) {
    console.log('deleteDB');
  }
}

const openDB = (config) => {
  loadDb(config);
  loadDbCloseBinding();
}


const getTableEntries = (table) => {
  if (LOG_DB_SET_GET) {
    console.log('STARTED getTableEntries', table);
  }
  if (table === undefined) {
    throw new Error('table is required.');
  }
  const tableElts = db.getCollection(table);
  const retval = tableElts.chain().data();
  if (LOG_DB_SET_GET) {
    console.log('SUCCESS hasTableEntry', table, retval.length);
  }
  return retval;
}

const hasTableEntry = (table, tablePkCol, tablePK) => {
  if (LOG_DB_SET_GET) {
    console.log('STARTED hasTableEntry', table, tablePK);
  }
  if (table === undefined) {
    throw new Error('table is required.');
  }
  if (tablePkCol === undefined) {
    throw new Error('tablePkCol is required.');
  }
  if (tablePK === undefined) {
    throw new Error(`${tablePkCol} value (tablePK) is required.`);
  }
  const tableElts = db.getCollection(table);
  const tableKey = {};
  tableKey[tablePkCol] = tablePK;

  const tableElt = tableElts.find(tableKey);
  const retval = (tableElt.length > 0);
  if (LOG_DB_SET_GET) {
    console.log('SUCCESS hasTableEntry', table, tablePkCol, tablePK, retval);
  }
  return retval;
}

const getTableEntry = (table, tablePkCol, tablePK, rowInitFn) => {
  if (LOG_DB_SET_GET) {
    console.log('STARTED getTableEntry', table, tablePkCol, tablePK);
  }
  if (table === undefined) {
    throw new Error('table is required.');
  }
  if (tablePkCol === undefined) {
    throw new Error('tablePkCol is required.');
  }
  if (tablePK === undefined) {
    throw new Error(`${tablePkCol} is required.`);
  }
  if (rowInitFn === undefined) {
    throw new Error('rowInitFn is required.');
  }
  const tableElts = db.getCollection(table);
  if ((tableElts === undefined) || (tableElts === null)) {
    throw new Error(`cannot find table '${table}'`);
  }
  const tableKey = {};
  tableKey[tablePkCol] = tablePK;

  const tableElt = tableElts.find(tableKey);
  let retval;
  let logVal;
  if (tableElt.length > 0) {
    retval = tableElt[0];
  } else {
    if (rowInitFn == null) {
      throw Error(`table entry in table '${table}' column '${tablePkCol}' with value '${tablePK}' is undefined`);
    } else {
      rowInitFn(tableKey);
      logVal = tableElts.insert(tableKey);
      retval = tableKey;
    }
  }
  if (LOG_DB_SET_GET) {
    console.log('SUCCESS getTableEntry', table, tablePK, logVal, retval);
  }
  return retval;
}

const setTableEntry = (table, tablePkCol, tableElt) => {
  if (LOG_DB_SET_GET) {
    console.log('STARTED setTableEntry', table, tablePkCol, tableElt[tablePkCol]);
  }
  if (table === undefined) {
    throw new Error('table is required.');
  }
  if (tablePkCol === undefined) {
    throw new Error('tablePkCol is required.');
  }
  if (tableElt === undefined) {
    throw new Error('tableElt is required.');
  }
  const tableElts = db.getCollection(table);

  const logVal = tableElts.update(tableElt);
  if (LOG_DB_SET_GET) {
    console.log('SUCCESS setTableEntry', table, tablePkCol, tableElt[tablePkCol], logVal);
  }
  return logVal;
}

const deleteTableEntry = (table, tablePkCol, tableElt) => {
  if (LOG_DB_SET_GET) {
    console.log('STARTED deleteTableEntry', table, tablePkCol, tableElt[tablePkCol]);
  }
  if (table === undefined) {
    throw new Error('table is required.');
  }
  if (tablePkCol === undefined) {
    throw new Error('tablePkCol is required.');
  }
  if (tableElt === undefined) {
    throw new Error('tableElt is required.');
  }
  const tableElts = db.getCollection(table);

  const logVal = tableElts.remove(tableElt);
  if (LOG_DB_SET_GET) {
    console.log('SUCCESS deleteTableEntry', table, tablePkCol, tableElt[tablePkCol], logVal);
  }
  return logVal;
}

exports.getTableEntries = getTableEntries;
exports.hasTableEntry = hasTableEntry;
exports.getTableEntry = getTableEntry;
exports.setTableEntry = setTableEntry;
exports.deleteTableEntry = deleteTableEntry;
exports.openDB = openDB;
exports.closeDB = closeDB;
exports.deleteDB = deleteDB;
