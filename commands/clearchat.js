const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { loadConfig } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearchat')
        .setDescription('Svuota la chat attuale e salva i messaggi nel canale di log')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const config = loadConfig();

        if (!config.logChannelId) {
            return interaction.editReply({ content: '❌ Imposta prima un canale di log con il comando `/chatlog`.' });
        }

        const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
        if (!logChannel) {
            return interaction.editReply({ content: '❌ Il canale di log configurato non esiste più.' });
        }

        try {
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
            
            if (fetchedMessages.size === 0) {
                return interaction.editReply({ content: 'La chat è già vuota.' });
            }

            let logData = `--- BACKUP CHAT: #${interaction.channel.name} --- \nData: ${new Date().toLocaleString()}\n\n`;
            const sortedMessages = Array.from(fetchedMessages.values()).reverse();
            
            sortedMessages.forEach(msg => {
                logData += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
            });

            const buffer = Buffer.from(logData, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `log-${interaction.channel.name}-${Date.now()}.txt` });

            await logChannel.send({
                content: `📄 **Backup Chat**\nCanale svuotato: ${interaction.channel}\nEseguito da: ${interaction.user.tag}`,
                files: [attachment]
            });

            await interaction.channel.bulkDelete(fetchedMessages, true);
            return interaction.editReply({ content: 'Chat svuotata e salvata nei log con successo!' });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: 'Si è verificato un errore durante la pulizia (i messaggi più vecchi di 14 giorni non possono essere rimossi in blocco).' });
        }
    }
};
