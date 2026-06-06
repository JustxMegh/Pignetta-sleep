const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadTempRoles, saveTempRoles } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('temprole')
        .setDescription('Assegna un ruolo temporaneo a un utente')
        .addUserOption(opt => opt.setName('utente').setDescription('L\'utente a cui assegnare il ruolo').setRequired(true))
        .addRoleOption(opt => opt.setName('ruolo').setDescription('Il ruolo da assegnare').setRequired(true))
        .addIntegerOption(opt => opt.setName('giorni').setDescription('Durata in giorni').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const targetUser = interaction.options.getMember('utente');
        const role = interaction.options.getRole('ruolo');
        const days = interaction.options.getInteger('giorni');

        if (!targetUser || !role) {
            return interaction.editReply({ content: 'Utente o ruolo non valido.' });
        }

        try {
            await targetUser.roles.add(role);
            
            const expireAt = Date.now() + (days * 24 * 60 * 60 * 1000);
            const tempRoles = loadTempRoles();
            
            tempRoles.push({
                guildId: interaction.guild.id,
                userId: targetUser.id,
                roleId: role.id,
                expireAt: expireAt
            });
            
            saveTempRoles(tempRoles);

            return interaction.editReply({ 
                content: `Assegnato il ruolo ${role} a ${targetUser} per **${days} giorni**. Verrà rimosso il <t:${Math.floor(expireAt / 1000)}:F>.` 
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: 'Non ho i permessi necessari per gestire questo ruolo o utente.' });
        }
    }
};
