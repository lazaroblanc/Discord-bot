console.log("Bot is starting up...");

const fs = require('fs');
const webp = require('webp-converter');
const path = require("path");
const canvas = require('canvas');

const botConfig = require(`${__dirname}/config/config.json`);
const botActivities = fs.readFileSync(`${__dirname}/config/activities`, { encoding: "utf8" }).split("\n");
const botUtils = require(`${__dirname}/modules/botUtils.js`);
const EventEmitter = require('events');
const botEvents = new EventEmitter();
const talks = new Map();
let notificationChannel;

// Create Client for Bot and login
const discord = require('discord.js');
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
client.on('ready', async () => { console.log("Bot is ready!"); });
client.on('ready', async () => {
    notificationChannel = await client.channels.fetch(botConfig.talkNotificationChannelId);
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

client.on('voiceStateUpdate', async (oldState, newState) => {

    if (newState.member.user.bot) return;
    if (oldState.channel == newState.channel) return;

    if (newState.channel) {

        if (!talks.has(newState.channel.id)) {
            console.log("Talk started in Channel: " + newState.channel.name);
            talks.set(newState.channel.id, new Map());
            talks.get(newState.channel.id).set('channelId', newState.channel.id);
            talks.get(newState.channel.id).set('channelName', newState.channel.name);
            talks.get(newState.channel.id).set('participants', new Array());
        }

        let previousParticipantCount = talks.get(newState.channel.id).get('participants').length;

        if (!talks.get(newState.channel.id).get('participants').includes(newState.member)) {
            console.log("Added " + newState.member.displayName + " to talk in Channel " + newState.channel.name);
            talks.get(newState.channel.id).get('participants').push(newState.member);
        }

        if (
            previousParticipantCount == 1
            && talks.get(newState.channel.id).get('participants').length == 2
        ) {
            talks.get(newState.channel.id).set('startTime', new Date());
        }

    }

    if (oldState.channel) {

        if (!talks.has(oldState.channel.id)) return;

        if (
            talks.get(oldState.channel.id).get('participants').length >= 2
            && oldState.channel.members.filter(m => m.user.bot == false).size == 0
        ) {
            // Talk finished

            talks.get(oldState.channel.id).set('endTime', new Date());
            talks.get(oldState.channel.id).set('duration', ((talks.get(oldState.channel.id).get('endTime') - talks.get(oldState.channel.id).get('startTime')) / 1000));

            // Create talk carousell graphic
            const height = 32;
            const avatarPadding = 5;
            const leftPadding = 0;
            const rightPadding = 1;
            const width = talks.get(oldState.channel.id).get('participants').length * (height + avatarPadding) - avatarPadding + leftPadding + rightPadding;

            const image = canvas.createCanvas(width, height);
            const context = image.getContext('2d');

            // Draw avatar circles on carousell image for all participants of the talk
            let i = width - height - rightPadding;
            for (let member of talks.get(oldState.channel.id).get('participants')) {
                await Promise.resolve(new Promise(async (resolve, reject) => {

                    // Download avatar
                    // Convert avatar webp to jpeg
                    let avatarURL = member.user.displayAvatarURL()
                    console.log(">>>> " + member.user.username + "'s Avatar URL: " + avatarURL);

                    let avatarnameOriginal = path.basename(avatarURL);
                    let avatarnamePNG = avatarnameOriginal.endsWith(".webp") ? avatarnameOriginal.replace("\.webp", ".png") : avatarnameOriginal;

                    await botUtils.asyncHttpsDownloadToFile(avatarURL, avatarnameOriginal);

                    if (avatarnameOriginal.endsWith(".webp")) {
                        await webp.dwebp(avatarnameOriginal, avatarnamePNG, "-o");
                        console.log("Avatar converted from webp");
                    }

                    await canvas.loadImage(avatarnamePNG).then(image => {
                        console.log("Drawing avatar to image");
                        context.save();
                        context.beginPath();
                        context.arc(i + height / 2, height / 2, height / 2, 0, 2 * Math.PI)
                        context.closePath();
                        context.clip();
                        context.drawImage(image, i, 0, height, height);
                        context.restore();
                        i -= height + avatarPadding;

                        console.log("Cleaning-up avatar file");
                        fs.unlinkSync(avatarnameOriginal);
                        if (avatarnamePNG != avatarnameOriginal) {
                            fs.unlinkSync(avatarnamePNG);
                        }

                        resolve();
                    })
                })) // END OF AVATAR PROMISE
            } // END OF PARTICIPANTS LOOP

            // Write carousell image to disk
            carousellOutputPath = `${__dirname}/carousell.png`;
            const buffer = image.toBuffer('image/png')
            fs.writeFileSync(carousellOutputPath, buffer);

            // Create embed
            const attachment = new discord.MessageAttachment(carousellOutputPath, path.basename(carousellOutputPath));
            let talkEndedEmbed = new discord.MessageEmbed()
                .attachFiles(attachment)
                .setImage(`attachment://${path.basename(carousellOutputPath)}`)
                .setColor((await (await client.guilds.fetch(oldState.guild.id)).members.fetch(client.user.id)).displayHexColor)
                .setTitle(`:loud_sound: ${talks.get(oldState.channel.id).get('channelName')} beendet: ${botUtils.formatSeconds(talks.get(oldState.channel.id).get('duration'))}`);

            await notificationChannel.send(talkEndedEmbed);

            talks.delete(oldState.channel.id);

            console.log("Cleaning-up files");
            fs.unlinkSync("carousell.png");
            console.log("Finished cleaning up files");
        }

    }

});