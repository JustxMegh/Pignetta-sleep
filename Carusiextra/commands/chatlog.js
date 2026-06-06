const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { loadConfig, saveConfig } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chatlog')
        .setDescription('Imposta il canale dove inviare i backup delle chat svuotate')
        .addChannelOption(opt => opt.setName('canale').setDescription('Il canale di log').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const logChannel = interaction.options.getChannel('canale');
        const config = loadConfig();
        
        config.logChannelId = logChannel.id;
        saveConfig(config);
        
        return interaction.reply({ content: `Canale di log impostato su ${logChannel}`, ephemeral: true });
    }
};
