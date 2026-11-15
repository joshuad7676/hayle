const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Create / manage roles')
    .addSubcommand(s => s.setName('create').setDescription('Create a role')
      .addStringOption(o => o.setName('name').setDescription('Role name').setRequired(true))
      .addStringOption(o => o.setName('color').setDescription('Hex color e.g. #5865F2'))
      .addBooleanOption(o => o.setName('mentionable').setDescription('Mentionable?'))
      .addBooleanOption(o => o.setName('hoist').setDescription('Show separately?')))
    .addSubcommand(s => s.setName('give').setDescription('Give role to member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove role from member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(s => s.setName('delete').setDescription('Delete a role')
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  async execute(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'create') {
      const role = await i.guild.roles.create({
        name: i.options.getString('name'),
        color: i.options.getString('color') || undefined,
        mentionable: i.options.getBoolean('mentionable') ?? false,
        hoist: i.options.getBoolean('hoist') ?? false,
      });
      return i.reply({ embeds: [embed({ title: '✅ Role created', description: `${role} \`${role.id}\`` })] });
    }
    if (sub === 'give') {
      const m = await i.guild.members.fetch(i.options.getUser('user').id);
      await m.roles.add(i.options.getRole('role'));
      return i.reply({ embeds: [embed({ title: '✅ Role added', description: `${i.options.getRole('role')} → ${m}` })] });
    }
    if (sub === 'remove') {
      const m = await i.guild.members.fetch(i.options.getUser('user').id);
      await m.roles.remove(i.options.getRole('role'));
      return i.reply({ embeds: [embed({ title: '✅ Role removed', description: `${i.options.getRole('role')} ✕ ${m}` })] });
    }
    if (sub === 'delete') {
      await i.options.getRole('role').delete();
      return i.reply({ embeds: [embed({ title: '🗑️ Role deleted' })] });
    }
  }
};
