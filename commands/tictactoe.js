const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'tictactoe',
  execute: async (message) => {
    const players = [];
    let currentTurn = 0;
    let board = Array(3).fill().map(() => Array(3).fill(null));

    const joinButton = new ButtonBuilder()
      .setCustomId('join')
      .setLabel('Join')
      .setStyle(ButtonStyle.Success);

    const startEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎮 Tic Tac Toe 🎮')
      .setDescription('Click the "Join" button to participate! (2 players needed)');

    const startMsg = await message.channel.send({
      embeds: [startEmbed],
      components: [new ActionRowBuilder().addComponents(joinButton)]
    });

    const joinCollector = startMsg.createMessageComponentCollector({
      time: 30000
    });

    joinCollector.on('collect', async (interaction) => {
      if (players.includes(interaction.user.id)) {
        return interaction.reply({ content: 'You have already joined!', ephemeral: true });
      }

      players.push(interaction.user.id);
      await interaction.reply({ content: `**${interaction.user.username}** has joined the game!`, ephemeral: true });

      if (players.length === 2) {
        joinCollector.stop();
      }
    });

    joinCollector.on('end', async () => {
      if (players.length < 2) {
        return startMsg.edit({ content: '❌ Not enough players joined. Game canceled.', components: [] });
      }

      await startMsg.edit({ content: `✅ Game starting between <@${players[0]}> and <@${players[1]}>!`, components: [] });
      startGame();
    });

    async function startGame() {
      function createBoardButtons() {
        return board.map((row, r) => new ActionRowBuilder().addComponents(
          row.map((cell, c) => new ButtonBuilder()
            .setCustomId(`${r}-${c}`)
            .setLabel(cell || '⬜')
            .setStyle(ButtonStyle.Secondary)
          )
        ));
      }

      function checkWinner() {
        const lines = [
          // Rows
          [board[0][0], board[0][1], board[0][2]],
          [board[1][0], board[1][1], board[1][2]],
          [board[2][0], board[2][1], board[2][2]],
          // Columns
          [board[0][0], board[1][0], board[2][0]],
          [board[0][1], board[1][1], board[2][1]],
          [board[0][2], board[1][2], board[2][2]],
          // Diagonals
          [board[0][0], board[1][1], board[2][2]],
          [board[0][2], board[1][1], board[2][0]],
        ];

        for (const line of lines) {
          if (line.every(cell => cell === '❌')) return 0;
          if (line.every(cell => cell === '⭕')) return 1;
        }

        if (board.flat().every(cell => cell !== null)) return 'draw';

        return null;
      }

      const gameEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎮 Tic Tac Toe 🎮')
        .setDescription(`**Current Turn:** <@${players[currentTurn]}>\n\n**❌ = ${message.client.users.cache.get(players[0])?.username}**\n**⭕ = ${message.client.users.cache.get(players[1])?.username}**`);

      const gameMsg = await message.channel.send({
        embeds: [gameEmbed],
        components: createBoardButtons()
      });

      const gameCollector = gameMsg.createMessageComponentCollector({
        time: 60000
      });

      gameCollector.on('collect', async (interaction) => {
        if (!players.includes(interaction.user.id)) {
          return interaction.reply({ content: 'You are not a part of this game!', ephemeral: true });
        }

        if (interaction.user.id !== players[currentTurn]) {
          return interaction.reply({ content: "It's not your turn!", ephemeral: true });
        }

        const [r, c] = interaction.customId.split('-').map(Number);
        if (board[r][c] !== null) {
          return interaction.reply({ content: 'This spot is already taken!', ephemeral: true });
        }

        board[r][c] = currentTurn === 0 ? '❌' : '⭕';
        currentTurn = 1 - currentTurn;

        const winner = checkWinner();
        if (winner !== null) {
          gameCollector.stop();
          const resultEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎉 Game Over! 🎉');

          if (winner === 'draw') {
            resultEmbed.setDescription('It\'s a **draw**! 😲');
          } else {
            resultEmbed.setDescription(`🏆 **Winner:** <@${players[winner]}>! 🎊`);
          }

          return gameMsg.edit({
            embeds: [resultEmbed],
            components: createBoardButtons()
          });
        }

        await gameMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('🎮 Tic Tac Toe 🎮')
              .setDescription(`**Current Turn:** <@${players[currentTurn]}>\n\n**❌ = ${message.client.users.cache.get(players[0])?.username}**\n**⭕ = ${message.client.users.cache.get(players[1])?.username}**`)
          ],
          components: createBoardButtons()
        });

        await interaction.deferUpdate();
      });

      gameCollector.on('end', async () => {
        if (checkWinner() === null) {
          await gameMsg.edit({ content: '⏳ Time ran out! Game over.', components: [] });
        }
      });
    }
  }
};
