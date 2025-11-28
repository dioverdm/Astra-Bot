// ===========================================
// ASTRA BOT - Ticket Command
// ===========================================

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  TextChannel
} from 'discord.js';
import { EMBED_COLORS } from '../../../shared/constants/index.js';
import { errorEmbed } from '../../../shared/utils/index.js';
import { GuildConfig } from '../../../database/models/GuildConfig.js';
import type { BotCommand } from '../../../shared/types/index.js';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system commands')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a new support ticket')
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for the ticket').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for closing').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a user to the ticket')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to add').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the ticket')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to remove').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('claim')
        .setDescription('Claim this ticket as staff')
    )
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Setup the ticket system (Admin)')
        .addChannelOption(opt =>
          opt
            .setName('category')
            .setDescription('Category for ticket channels')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addRoleOption(opt =>
          opt.setName('support_role').setDescription('Support team role').setRequired(true)
        )
    ),
    
  cooldown: 10,
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        await handleCreate(interaction);
        break;
      case 'close':
        await handleClose(interaction);
        break;
      case 'add':
        await handleAdd(interaction);
        break;
      case 'remove':
        await handleRemove(interaction);
        break;
      case 'claim':
        await handleClaim(interaction);
        break;
      case 'setup':
        await handleSetup(interaction);
        break;
    }
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction) {
  // Check admin permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ embeds: [errorEmbed('You need Administrator permissions to setup tickets.')], ephemeral: true });
    return;
  }

  const category = interaction.options.getChannel('category', true);
  const supportRole = interaction.options.getRole('support_role', true);

  await GuildConfig.findOneAndUpdate(
    { guildId: interaction.guild!.id },
    { 
      $set: { 
        'tickets.categoryId': category.id,
        'tickets.supportRoleId': supportRole.id,
        'tickets.enabled': true
      } 
    },
    { upsert: true }
  );

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('🎫 Ticket System Setup')
    .setDescription('Ticket system has been configured!')
    .addFields(
      { name: '📁 Category', value: `${category.name}`, inline: true },
      { name: '👥 Support Role', value: `${supportRole}`, inline: true }
    )
    .setFooter({ text: 'Users can now create tickets with /ticket create' });

  await interaction.reply({ embeds: [embed] });
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guildId = interaction.guild!.id;

  // Get config
  const config = await GuildConfig.findOne({ guildId }) as any;
  if (!config?.tickets?.enabled || !config?.tickets?.categoryId) {
    await interaction.reply({ 
      embeds: [errorEmbed('Ticket system is not configured! Ask an admin to run `/ticket setup`.')], 
      ephemeral: true 
    });
    return;
  }

  // Check if user already has a ticket
  const existingTicket = interaction.guild!.channels.cache.find(
    c => c.name === `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  );
  
  if (existingTicket) {
    await interaction.reply({ 
      embeds: [errorEmbed(`You already have an open ticket: ${existingTicket}`)], 
      ephemeral: true 
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Create ticket channel
    const ticketName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    
    const ticketChannel = await interaction.guild!.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: config.tickets.categoryId,
      permissionOverwrites: [
        {
          id: interaction.guild!.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: config.tickets.supportRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    });

    // Send welcome message in ticket
    const welcomeEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.primary)
      .setTitle('🎫 Support Ticket')
      .setDescription(`Welcome ${interaction.user}!\n\nA support team member will be with you shortly.\n\n**Reason:** ${reason}`)
      .addFields(
        { name: '📋 Ticket Info', value: `Created by: ${interaction.user.tag}\nChannel: ${ticketChannel.name}` }
      )
      .setFooter({ text: 'Use /ticket close to close this ticket' })
      .setTimestamp();

    const closeButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✋')
      );

    await ticketChannel.send({ 
      content: `${interaction.user} <@&${config.tickets.supportRoleId}>`,
      embeds: [welcomeEmbed], 
      components: [closeButton] 
    });

    await interaction.editReply({ 
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.success)
          .setDescription(`✅ Your ticket has been created: ${ticketChannel}`)
      ] 
    });

  } catch (error: any) {
    await interaction.editReply({ embeds: [errorEmbed(`Failed to create ticket: ${error.message}`)] });
  }
}

async function handleClose(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel as TextChannel;
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!channel.name.startsWith('ticket-')) {
    await interaction.reply({ embeds: [errorEmbed('This command can only be used in a ticket channel!')], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.warning)
    .setTitle('🔒 Ticket Closing')
    .setDescription(`This ticket will be closed in 5 seconds...\n\n**Closed by:** ${interaction.user}\n**Reason:** ${reason}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Wait 5 seconds then delete
  setTimeout(async () => {
    try {
      await channel.delete(`Ticket closed by ${interaction.user.tag}: ${reason}`);
    } catch {}
  }, 5000);
}

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel as TextChannel;
  const user = interaction.options.getUser('user', true);

  if (!channel.name.startsWith('ticket-')) {
    await interaction.reply({ embeds: [errorEmbed('This command can only be used in a ticket channel!')], ephemeral: true });
    return;
  }

  try {
    await channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setDescription(`✅ ${user} has been added to the ticket.`);

    await interaction.reply({ embeds: [embed] });

  } catch (error: any) {
    await interaction.reply({ embeds: [errorEmbed(`Failed to add user: ${error.message}`)], ephemeral: true });
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel as TextChannel;
  const user = interaction.options.getUser('user', true);

  if (!channel.name.startsWith('ticket-')) {
    await interaction.reply({ embeds: [errorEmbed('This command can only be used in a ticket channel!')], ephemeral: true });
    return;
  }

  try {
    await channel.permissionOverwrites.delete(user.id);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setDescription(`✅ ${user} has been removed from the ticket.`);

    await interaction.reply({ embeds: [embed] });

  } catch (error: any) {
    await interaction.reply({ embeds: [errorEmbed(`Failed to remove user: ${error.message}`)], ephemeral: true });
  }
}

async function handleClaim(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel as TextChannel;

  if (!channel.name.startsWith('ticket-')) {
    await interaction.reply({ embeds: [errorEmbed('This command can only be used in a ticket channel!')], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle('✋ Ticket Claimed')
    .setDescription(`This ticket has been claimed by ${interaction.user}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Rename channel to show claimed
  try {
    if (!channel.name.includes('-claimed')) {
      await channel.setName(`${channel.name}-claimed`);
    }
  } catch {}
}

export default command;
