const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config(); // Ensure you have a .env file with your bot token

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

client.commands = new Collection();

// Load all command files from the 'commands' folder
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.on('ready', () => {
    client.user.setPresence({
      activities: [
        {
            name: '🌠 Exploring the stars one command at a time!',
            type: 4,
        },
      ],
      status: 'online',
    });
    console.log('Galileo is online and exploring the stars!'); 
  });

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('There was an error executing this command!');
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  const { message } = reaction;
  if (!message.embeds.length) return;

  if (message.embeds[0].title && message.embeds[0].title.includes('Trivia Question')) {
    // Trivia reaction logic handled inside trivia.js
    return;
  }

  if (message.embeds[0].title && message.embeds[0].title.includes('Image results for:')) {
    // Image navigation handled inside image.js
    return;
  }
});

client.login(process.env.TOKEN);