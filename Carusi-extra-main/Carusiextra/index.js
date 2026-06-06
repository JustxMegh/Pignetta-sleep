require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadTempRoles, saveTempRoles } = require('./config/database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
const commandsData = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`Bot online come ${client.user.tag}`);
    
    try {
        console.log('Aggiornamento dei comandi applicazione (/) in corso...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsData });
        console.log('Comandi applicazione caricati con successo.');
    } catch (error) {
        console.error('Errore nel caricamento dei comandi:', error);
    }
});

// Controllo ruoli scaduti (ogni 60 secondi)
setInterval(async () => {
    const now = Date.now();
    let tempRoles = loadTempRoles();
    let changed = false;

    for (let i = tempRoles.length - 1; i >= 0; i--) {
        const entry = tempRoles[i];
        if (now >= entry.expireAt) {
            try {
                const guild = await client.guilds.fetch(entry.guildId);
                const member = await guild.members.fetch(entry.userId).catch(() => null);
                
                if (member) {
                    await member.roles.remove(entry.roleId);
                    console.log(`Ruolo rimosso a ${member.user.tag} per scadenza tempo.`);
                }
            } catch (err) {
                console.error(`Impossibile rimuovere il ruolo all'utente ${entry.userId}:`, err);
            }
            tempRoles.splice(i, 1);
            changed = true;
        }
    }

    if (changed) saveTempRoles(tempRoles);
}, 60000);

// Gestore Interazioni
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Errore durante l\'esecuzione del comando!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Errore durante l\'esecuzione del comando!', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
