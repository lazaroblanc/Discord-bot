const fs = require("fs");
const path = require("path");
const events = require("events");
var pjson = require('./package.json');
console.log("Discord bot v" + pjson.version);

const discord = require("discord.js");

const botConfig = require(`${__dirname}/config/config.json`);
const botActivities = fs.readFileSync(`${__dirname}/config/activities`, { encoding: "utf8" }).split("\n");
const botUtils = require(`${__dirname}/modules/botUtils.js`);
const botEvents = new events.EventEmitter();
const talks = new discord.Collection();
let notificationChannel;
let clientUser;

// Create Client for Bot and login
const client = new discord.Client({
    "presence": {
        "status": "online",
        "activity": {
            "name": botActivities[Math.floor(Math.random() * botActivities.length)],
            "type": "PLAYING"
        }
    }
});

client.login(botConfig.token);
client.on("ready", async () => {

    console.log(`Bot is ready as ${client.user.tag} runnning on guilds:`);
    client.guilds.cache
        .forEach(async guild => {
            let guildUser = await (await client.guilds.fetch(guild.id)).members.fetch(client.user.id);
            console.log(`- ${guild.name} (${guild.id}) as ${guildUser.displayName}`);
        });
    notificationChannel = await client.channels.fetch(botConfig.talkNotificationChannelId);
    clientUser = await (await client.guilds.fetch(notificationChannel.guild.id)).members.fetch(client.user.id);
});

// Handle process termination
let signals = ["SIGINT", "SIGHUP", "SIGTERM"];
for (let signal of signals) {
    process.on(signal, () => {
        console.log(signal + " received");
        console.log("Shutting down ...");
        client.destroy();
        process.exit(0);
    });
}

// Rotating activity messages
if (botActivities.length >= 2) {
    let activityChangeIntervalMins = 10;
    client.setInterval(async () => {
        let currentActivity = botActivities[Math.floor(Math.random() * botActivities.length)];
        console.log("Changing activity to: " + currentActivity);
        client.user.setPresence({
            "activity": {
                "name": currentActivity,
                "type": "PLAYING"
            }
        });
    }, activityChangeIntervalMins * 60 * 1000);
}

client.on("voiceStateUpdate", async (oldState, newState) => {
    // Ignore Voice State changes from Bots for now
    if (newState.member.user.bot) return;

    // Connected
    if (!oldState.channel) {
        botEvents.emit("memberJoinedVoiceChannel", newState.member, newState.channel)
    }

    // Disconnected
    if (!newState.channel) {
        botEvents.emit("memberLeftVoiceChannel", newState.member, oldState.channel)
    }

    // Switched channels
    if (newState.channel && oldState.channel && newState.channel != oldState.channel) {
        botEvents.emit("memberLeftVoiceChannel", newState.member, oldState.channel)
        botEvents.emit("memberJoinedVoiceChannel", newState.member, newState.channel)
    }
});

botEvents.on("memberJoinedVoiceChannel", (member, channel) => {
    console.log(member.displayName + " connected to channel " + channel.name + " (" + channel.id + ")");
    botUtils.logChannelMembersToConsole(channel.members);

    if (channel.members.filter(member => member.user.bot == false).size == 1) {
        botEvents.emit("talkCreated", member, channel);
    }
    else if (channel.members.filter(member => member.user.bot == false).size == 2) {
        botEvents.emit("talkStarted", member, channel);
    }
    else {
        botEvents.emit("talkJoined", member, channel);
    }
});

botEvents.on("memberLeftVoiceChannel", (member, channel) => {
    console.log(member.displayName + " disconnected from channel " + channel.name + " (" + channel.id + ")");
    botUtils.logChannelMembersToConsole(channel.members);

    if (channel.members.filter(member => member.user.bot == false).size == 0) {
        botEvents.emit("talkDeleted", channel);
    }
    else if (channel.members.filter(member => member.user.bot == false).size == 1) {
        botEvents.emit("talkEnded", channel);
    }
    else {
        botEvents.emit("talkLeft", member, channel);
    }
});

botEvents.on("talkCreated", (member, channel) => {
    talks.set(channel.id, new Map());
    talks.get(channel.id).set("channel", channel);
    talks.get(channel.id).set("start", null);
    talks.get(channel.id).set("end", null);
    talks.get(channel.id).set("duration", null);
    talks.get(channel.id).set("participants", new discord.Collection());
    talks.get(channel.id).get("participants").set(member.id, member)

    console.log("Talk in channel " + channel.name + " (" + channel.id + ")" + " created by " + member.displayName);
});

botEvents.on("talkStarted", (member, channel) => {
    if (!talks.has(channel.id)) {
        botEvents.emit(
            "talkCreated",
            channel.members
                .filter(member => member.user.bot == false)
                .filter(m => m != member)
                .first(1)[0],
            channel
        );
    }

    talks.get(channel.id).get("participants").set(member.id, member);
    talks.get(channel.id).set("start", new Date());

    console.log("Talk in channel " + channel.name + " (" + channel.id + ")" + " started by " + member.displayName);
});

botEvents.on("talkJoined", (member, channel) => {
    if (!talks.get(channel.id).get("participants").has(member)) {
        talks.get(channel.id).get("participants").set(member.id, member);
    }

    console.log("Talk in channel " + channel.name + " (" + channel.id + ")" + " joined by " + member.displayName);
});

botEvents.on("talkDeleted", (channel) => {
    talks.delete(channel.id);

    console.log("Talk in channel " + channel.name + " (" + channel.id + ")" + " deleted");
});

botEvents.on("talkEnded", async (channel) => {

    if (!talks.has(channel.id)) {
        console.log("No talk found for channel " + channel.id);
        return;
    }

    talks.get(channel.id).set("end", new Date());
    talks.get(channel.id).set("duration", (talks.get(channel.id).get("end") - talks.get(channel.id).get("start")) / 1000);

    console.log("Talk in channel " + channel.name + " (" + channel.id + ")" + " ended with " + talks.get(channel.id).get("participants").size + " participants");

    let avatarFilenames = await Promise.all(botUtils.downloadParticipantsAvatars(talks.get(channel.id).get("participants")));
    let avatarsToConvert = avatarFilenames.filter(filename => filename.endsWith(".webp"));
    await Promise.all(botUtils.convertParticipantsWebpAvatarsToPng(avatarsToConvert));
    botUtils.convertWebpAvatarFilenamesToPng(avatarFilenames);
    let carousellOutputFile = path.join(__dirname, "carousell.png");
    await botUtils.createCarousellImage(talks.get(channel.id).get("participants"), avatarFilenames, carousellOutputFile);

    // Create embed
    console.log("Creating talk ended embed");
    const attachment = new discord.MessageAttachment(carousellOutputFile, path.basename(carousellOutputFile));
    let talkEndedEmbed = new discord.MessageEmbed()
        .attachFiles(attachment)
        .setImage(`attachment://${path.basename(carousellOutputFile)}`)
        .setColor(clientUser.displayHexColor)
        .setTitle(`:loud_sound: ${talks.get(channel.id).get("channel").name} beendet: ${botUtils.formatSeconds(talks.get(channel.id).get("duration"))}`)
        .setDescription(talks.get(channel.id).get("participants").array().join(" "))

    console.log("Posting talk ended embed");
    await notificationChannel.send(talkEndedEmbed);

    botUtils.cleanupCarousselTempfiles(avatarsToConvert, avatarFilenames, carousellOutputFile);
    talks.delete(channel.id);
    botEvents.emit("talkCreated", channel.members.filter(member => member.user.bot == false).first(1)[0], channel);
});

botEvents.on("talkLeft", (member, channel) => {
    console.log("Talk in channel " + channel.name + " (" + channel.id + ")" + " left by " + member.displayName);
});