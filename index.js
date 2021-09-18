import discordjs from "discord.js";
import sqlite3 from "better-sqlite3";

export default function CommandBot(token, databasePath) {
  this.cache = { guilds: {} };
  this.token = token;
  this.databasePath = databasePath;
}

CommandBot.prototype.addCommand = function (aliases, callback) {
  if (this.callback !== "function") {
    throw new Error("callback wrong type");
  }
  if (typeof aliases === "string") {
    aliases = [aliases];
  }
  if (typeof aliases !== "array") {
    throw new Error("aliases wrong type");
  }
  for (const alias of aliases) {
    if (alias !== "string") {
      throw new Error("aliases wrong type");
    }
    if (this.commands.some((command) => command.alias === alias)) {
      throw new Error("duplicated alias");
    }
  }
  this.commands = [
    ...this.commands,
    ...aliases.map((alias) => ({ alias, callback })),
  ].sort((command1, command2) => (command2 > command1 ? 1 : -1));
};

CommandBot.prototype.initDiscord = function () {
  this.discordClient = new discordjs.Client({
    intents: [
      discordjs.Intents.FLAGS.GUILDS,
      discordjs.Intents.FLAGS.GUILD_MESSAGES,
      discordjs.Intents.FLAGS.GUILD_VOICE_STATES,
    ],
  });
};

CommandBot.prototype.initCommands = function () {
  client.on("message", async (message) => {
    const reduced = message.content.trim().replace(/\s+/, " ");
    const prefix = await this.getConfig(message.guild.id, "global", "prefix");
    for (let index = 0; index < this.commands.length; index++) {
      if (
        reduced === `${prefix}${this.commands[commandKey].alias}` ||
        reduced.startsWith(`${prefix}${this.commands[commandKey].alias} `)
      ) {
        message.content = message.content
          .replace(`${prefix}${alias}`, "")
          .replace(/\^s+/, "");
        callback(message);
      }
    }
  });
};

CommandBot.prototype.initDb = async function () {
  this.db = new sqlite3(this.databasePath);
  this.db.exec(
    `CREATE TABLE IF NOT EXISTS "global" (guildId TEXT NOT NULL UNIQUE PRIMARY KEY, prefix TEXT DEFAULT "!" NOT NULL);`
  );
};

CommandBot.prototype.getConfig = function (guildId, category, key) {
  let data = this.cache[`${guildId} ${category} ${key}`];
  if (data !== undefined) {
    return data;
  }
  let prepared;
  try {
    prepared = this.db.prepare(
      `SELECT ${key} FROM ${category} WHERE guildId = '${guildId}'`
    );
    data = prepared.get()[key];
  } catch (error) {
    if (error.message.startsWith("no such column: ")) {
      this.db.exec(`INSERT INTO ${category} (guildId) VALUES('${guildId}')`);
      data = prepared.get()[key];
    } else throw error;
  }
  return data;
};

CommandBot.prototype.start = async function () {
  await Promise.all([this.initDiscord(), this.initDb()]);
};

CommandBot.prototype.stop = async function (manualExit) {
  if (manualExit) process.exit();
};
