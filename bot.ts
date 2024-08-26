import { Client, GatewayIntentBits, Message, User, Collection, EmbedBuilder, PermissionsBitField } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = '!';
const queues = new Collection<string, User[]>();
const MAX_QUEUE_SIZE = 6;

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('messageCreate', (message: Message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  switch (command) {
    case 'add':
      handleAddCommand(message, args);
      break;
    case 'remove':
      handleRemoveCommand(message, args);
      break;
    case 'status':
      handleStatusCommand(message, args);
      break;
    default:
      message.reply('Unknown command. Try !add, !remove, or !view');
  }
});

async function handleAddCommand(message: Message, args: string[]) {
  const queueName = args[0]?.toLowerCase();
  if (!queueName) {
    await message.reply('Please specify a queue name. Usage: !add <queue_name>');
    return;
  }

  let queue = queues.get(queueName);
  if (!queue) {
    queue = [];
    queues.set(queueName, queue);
  }

  const user = message.author;
  if (queue.some(queuedUser => queuedUser.id === user.id)) {
    await message.reply(`You are already in the "${queueName}" queue.`);
  } else if (queue.length >= MAX_QUEUE_SIZE) {
    await message.reply(`The "${queueName}" queue is full (max ${MAX_QUEUE_SIZE} users).`);
  } else {
    queue.push(user);
    await message.reply(`Added ${user.username} to the "${queueName}" queue.`);

    if (queue.length === MAX_QUEUE_SIZE) {
      await message.channel.send(`The "${queueName}" queue is now full and will be removed.`);
      queues.delete(queueName);
    }
  }
}

function handleRemoveCommand(message: Message, args: string[]) {
  const queueName = args[0]?.toLowerCase();
  if (!queueName) {
    message.reply('Please specify a queue name. Usage: !remove <queue_name>');
    return;
  }

  const queue = queues.get(queueName);
  if (!queue || queue.length === 0) {
    message.reply(`The "${queueName}" queue is empty or doesn't exist.`);
    return;
  }

  const removed = queue.shift();
  message.reply(`Removed ${removed?.username} from the "${queueName}" queue.`);

  if (queue.length === 0) {
    queues.delete(queueName);
  }
}

async function handleStatusCommand(message: Message, args: string[]) {
  const queueName = args[0]?.toLowerCase();

  if (!queueName) {
    if (queues.size === 0) {
      await message.reply('There are no queues available.');
      return;
    }

    for (const [name, users] of queues) {
      const embed = createQueueEmbed(name, users);
      await message.channel.send({ embeds: [embed] });
    }
    return;
  }

  const queue = queues.get(queueName);
  if (!queue) {
    await message.reply(`The "${queueName}" queue doesn't exist.`);
    return;
  }

  const embed = createQueueEmbed(queueName, queue);
  await message.channel.send({ embeds: [embed] });
}

function createQueueEmbed(queueName: string, users: User[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Queue - ${queueName}`);

  const userIcons = users.map(() => '🟢').join('');
  const emptyIcons = '⚪'.repeat(MAX_QUEUE_SIZE - users.length);

  embed.setDescription(`${userIcons}${emptyIcons}`);

  if (users.length > 0) {
    users.forEach((user, index) => {
      embed.addFields({
        name: `Player ${index + 1}`,
        value: `<@${user.id}>`,
        inline: true
      });
    });
  } else {
    embed.addFields({ name: '\u200B', value: 'Queue is empty', inline: false });
  }

  return embed;
}

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
client.login(process.env.DISCORD_TOKEN);