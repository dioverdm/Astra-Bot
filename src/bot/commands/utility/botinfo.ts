// ===========================================
// ASTRA BOT - Bot Info Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  version as djsVersion
} from 'discord.js';
import { EMBED_COLORS, BOT_VERSION, BOT_LINKS, generateBotInviteUrl } from '../../../shared/constants/index.js';
import type { BotCommand } from '../../../shared/types/index.js';
import os from 'os';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display information about Astra'),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const client = interaction.client;
    
    // Calculate uptime
    const uptime = client.uptime || 0;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    // Get memory usage
    const memUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    const memTotal = os.totalmem() / 1024 / 1024 / 1024;

    // Get statistics
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalChannels = client.channels.cache.size;
    const totalCommands = client.application?.commands.cache.size || 0;

    // Get ping
    const ping = client.ws.ping;
    const pingStatus = ping < 100 ? '🟢' : ping < 200 ? '🟡' : '🔴';

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.primary)
      .setAuthor({ 
        name: 'Astra Bot', 
        iconURL: client.user?.displayAvatarURL() 
      })
      .setThumbnail(client.user?.displayAvatarURL({ size: 256 }) || '')
      .setDescription('A powerful all-in-one Discord bot with moderation, leveling, economy, and much more!')
      .addFields(
        // General Info
        { 
          name: '📊 Statistics', 
          value: 
            `**Servers:** ${client.guilds.cache.size.toLocaleString()}\n` +
            `**Users:** ${totalUsers.toLocaleString()}\n` +
            `**Channels:** ${totalChannels.toLocaleString()}\n` +
            `**Commands:** ${totalCommands}`,
          inline: true 
        },
        { 
          name: '⚙️ System', 
          value: 
            `**Node.js:** ${process.version}\n` +
            `**Discord.js:** v${djsVersion}\n` +
            `**Memory:** ${memUsed.toFixed(1)} MB\n` +
            `**Platform:** ${os.platform()}`,
          inline: true 
        },
        { 
          name: '📡 Connection', 
          value: 
            `**Uptime:** ${uptimeString}\n` +
            `**Ping:** ${pingStatus} ${ping}ms\n` +
            `**Shards:** ${client.ws.shards.size}\n` +
            `**Version:** v${BOT_VERSION}`,
          inline: true 
        },
        {
          name: '🔗 Links',
          value: 
            `[Dashboard](${BOT_LINKS.website}) • ` +
            `[Support Server](${BOT_LINKS.supportServer}) • ` +
            `[GitHub](${BOT_LINKS.github}) • ` +
            `[Invite](${generateBotInviteUrl(client.user?.id || '')})`
        }
      )
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
