// ===========================================
// ASTRA BOT - Ping Command (Enhanced)
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  version as djsVersion
} from 'discord.js';
import mongoose from 'mongoose';
import os from 'os';
import { EMBED_COLORS, EMOJIS } from '../../../shared/constants/index.js';
import type { BotCommand } from '../../../shared/types/index.js';

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format uptime to human readable
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0 && days === 0) parts.push(`${seconds % 60}s`);
  
  return parts.join(' ') || '0s';
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency, uptime, and system status'),
    
  cooldown: 5,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const sent = await interaction.reply({ 
      content: `${EMOJIS.loading} Measuring latency...`, 
      fetchReply: true 
    });
    
    // Measure latencies
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;
    
    // Measure database latency
    const dbStart = Date.now();
    let dbLatency = -1;
    let dbStatus = '❌ Disconnected';
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db?.admin().ping();
        dbLatency = Date.now() - dbStart;
        dbStatus = `${getLatencyEmoji(dbLatency)} \`${dbLatency}ms\``;
      }
    } catch {
      dbStatus = '⚠️ Error';
    }
    
    // System stats
    const memUsage = process.memoryUsage();
    const usedMem = memUsage.heapUsed;
    const totalMem = memUsage.heapTotal;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    
    const cpuUsage = os.loadavg()[0].toFixed(2);
    const uptime = interaction.client.uptime || 0;
    
    // Get overall status
    const avgLatency = (roundtrip + wsLatency + (dbLatency > 0 ? dbLatency : 0)) / (dbLatency > 0 ? 3 : 2);
    const overallStatus = avgLatency < 100 ? '🟢 Excellent' : avgLatency < 200 ? '🟡 Good' : avgLatency < 400 ? '🟠 Fair' : '🔴 Poor';
    
    const embed = new EmbedBuilder()
      .setColor(avgLatency < 100 ? 0x57F287 : avgLatency < 200 ? 0xFEE75C : avgLatency < 400 ? 0xE67E22 : 0xED4245)
      .setAuthor({ 
        name: '🏓 Pong! System Status', 
        iconURL: interaction.client.user?.displayAvatarURL() 
      })
      .setDescription(`**Overall Status:** ${overallStatus}`)
      .addFields(
        { 
          name: '� Latency', 
          value: [
            `${getLatencyEmoji(roundtrip)} **API:** \`${roundtrip}ms\``,
            `${getLatencyEmoji(wsLatency)} **WebSocket:** \`${wsLatency}ms\``,
            `🗄️ **Database:** ${dbStatus}`,
          ].join('\n'),
          inline: true 
        },
        { 
          name: '💾 Memory', 
          value: [
            `**Used:** ${formatBytes(usedMem)}`,
            `**Total:** ${formatBytes(totalMem)}`,
            `**Usage:** ${memPercent}%`,
          ].join('\n'),
          inline: true 
        },
        { 
          name: '⚙️ System', 
          value: [
            `**Uptime:** ${formatUptime(uptime)}`,
            `**CPU Load:** ${cpuUsage}`,
            `**Node.js:** ${process.version}`,
          ].join('\n'),
          inline: true 
        }
      )
      .addFields({
        name: '📊 Bot Stats',
        value: [
          `**Servers:** ${interaction.client.guilds.cache.size.toLocaleString()}`,
          `**Users:** ${interaction.client.users.cache.size.toLocaleString()}`,
          `**Channels:** ${interaction.client.channels.cache.size.toLocaleString()}`,
          `**Discord.js:** v${djsVersion}`,
        ].join(' • '),
        inline: false
      })
      .setFooter({ 
        text: `Shard ${interaction.guild?.shardId ?? 0} • Requested by ${interaction.user.username}` 
      })
      .setTimestamp();
    
    // Add refresh button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ping_refresh')
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄'),
        new ButtonBuilder()
          .setLabel('Status Page')
          .setStyle(ButtonStyle.Link)
          .setURL('https://astra.novaplex.xyz/status')
          .setEmoji('📊')
      );
    
    const response = await interaction.editReply({ 
      content: null, 
      embeds: [embed], 
      components: [row] 
    });
    
    // Handle refresh button
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId === 'ping_refresh' && i.user.id === interaction.user.id,
      time: 60000,
    });
    
    collector.on('collect', async (i) => {
      const newRoundtrip = Date.now() - i.createdTimestamp;
      const newWsLatency = interaction.client.ws.ping;
      
      // Re-measure DB
      const newDbStart = Date.now();
      let newDbLatency = -1;
      let newDbStatus = '❌ Disconnected';
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db?.admin().ping();
          newDbLatency = Date.now() - newDbStart;
          newDbStatus = `${getLatencyEmoji(newDbLatency)} \`${newDbLatency}ms\``;
        }
      } catch {
        newDbStatus = '⚠️ Error';
      }
      
      const newMemUsage = process.memoryUsage();
      const newUsedMem = newMemUsage.heapUsed;
      const newTotalMem = newMemUsage.heapTotal;
      const newMemPercent = ((newUsedMem / newTotalMem) * 100).toFixed(1);
      
      const newAvgLatency = (newRoundtrip + newWsLatency + (newDbLatency > 0 ? newDbLatency : 0)) / (newDbLatency > 0 ? 3 : 2);
      const newOverallStatus = newAvgLatency < 100 ? '🟢 Excellent' : newAvgLatency < 200 ? '🟡 Good' : newAvgLatency < 400 ? '🟠 Fair' : '🔴 Poor';
      
      const newEmbed = new EmbedBuilder()
        .setColor(newAvgLatency < 100 ? 0x57F287 : newAvgLatency < 200 ? 0xFEE75C : newAvgLatency < 400 ? 0xE67E22 : 0xED4245)
        .setAuthor({ 
          name: '🏓 Pong! System Status', 
          iconURL: interaction.client.user?.displayAvatarURL() 
        })
        .setDescription(`**Overall Status:** ${newOverallStatus}`)
        .addFields(
          { 
            name: '📡 Latency', 
            value: [
              `${getLatencyEmoji(newRoundtrip)} **API:** \`${newRoundtrip}ms\``,
              `${getLatencyEmoji(newWsLatency)} **WebSocket:** \`${newWsLatency}ms\``,
              `🗄️ **Database:** ${newDbStatus}`,
            ].join('\n'),
            inline: true 
          },
          { 
            name: '💾 Memory', 
            value: [
              `**Used:** ${formatBytes(newUsedMem)}`,
              `**Total:** ${formatBytes(newTotalMem)}`,
              `**Usage:** ${newMemPercent}%`,
            ].join('\n'),
            inline: true 
          },
          { 
            name: '⚙️ System', 
            value: [
              `**Uptime:** ${formatUptime(interaction.client.uptime || 0)}`,
              `**CPU Load:** ${os.loadavg()[0].toFixed(2)}`,
              `**Node.js:** ${process.version}`,
            ].join('\n'),
            inline: true 
          }
        )
        .addFields({
          name: '📊 Bot Stats',
          value: [
            `**Servers:** ${interaction.client.guilds.cache.size.toLocaleString()}`,
            `**Users:** ${interaction.client.users.cache.size.toLocaleString()}`,
            `**Channels:** ${interaction.client.channels.cache.size.toLocaleString()}`,
            `**Discord.js:** v${djsVersion}`,
          ].join(' • '),
          inline: false
        })
        .setFooter({ 
          text: `Shard ${interaction.guild?.shardId ?? 0} • Last updated` 
        })
        .setTimestamp();
      
      await i.update({ embeds: [newEmbed] });
    });
    
    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('ping_refresh')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄')
            .setDisabled(true),
          new ButtonBuilder()
            .setLabel('Status Page')
            .setStyle(ButtonStyle.Link)
            .setURL('https://astra.novaplex.xyz/status')
            .setEmoji('📊')
        );
      
      await interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  },
};

// Helper function
function getLatencyEmoji(ms: number): string {
  if (ms < 100) return '🟢';
  if (ms < 200) return '🟡';
  if (ms < 400) return '🟠';
  return '🔴';
}

export default command;
