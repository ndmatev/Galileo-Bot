const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const gameStates = new Map();  // To store the game state by userId

module.exports = {
  name: '2048',
  execute: async (message) => {
    const userId = message.author.id;

    // Check if the user is already playing
    if (gameStates.has(userId)) {
      return message.reply('You are already playing a game of 2048!');
    }

    // Create a new game state for the user
    let board = Array.from({ length: 4 }, () => Array(4).fill(0));
    let score = 0;

    function addRandomTile() {
      const emptyTiles = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (board[r][c] === 0) emptyTiles.push({ r, c });
        }
      }
      if (emptyTiles.length > 0) {
        const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        board[r][c] = Math.random() < 0.9 ? 2 : 4;
      }
    }

    function isGameOver() {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (board[r][c] === 0) return false;
          if (c < 3 && board[r][c] === board[r][c + 1]) return false;
          if (r < 3 && board[r][c] === board[r + 1][c]) return false;
        }
      }
      return true;
    }

    function move(direction) {
      let moved = false;

      function compress(row) {
        let newRow = row.filter(num => num !== 0);
        while (newRow.length < 4) newRow.push(0);
        return newRow;
      }

      function merge(row) {
        for (let i = 0; i < 3; i++) {
          if (row[i] === row[i + 1] && row[i] !== 0) {
            row[i] *= 2;
            score += row[i];
            row[i + 1] = 0;
          }
        }
        return compress(row);
      }

      if (direction === 'left' || direction === 'right') {
        for (let r = 0; r < 4; r++) {
          let row = board[r].slice();
          if (direction === 'right') row.reverse();
          let mergedRow = merge(compress(row));
          if (direction === 'right') mergedRow.reverse();
          if (mergedRow.toString() !== board[r].toString()) moved = true;
          board[r] = mergedRow;
        }
      } else {
        for (let c = 0; c < 4; c++) {
          let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
          if (direction === 'down') col.reverse();
          let mergedCol = merge(compress(col));
          if (direction === 'down') mergedCol.reverse();
          for (let r = 0; r < 4; r++) {
            if (board[r][c] !== mergedCol[r]) moved = true;
            board[r][c] = mergedCol[r];
          }
        }
      }

      if (moved) addRandomTile();
      return moved;
    }

    function formatBoard() {
      const maxDigits = Math.max(...board.flat()).toString().length;
      return board
        .map(row => row.map(num => num ? num.toString().padStart(maxDigits, ' ') : ' '.repeat(maxDigits)).join(' | '))
        .join('\n');
    }

    addRandomTile();
    addRandomTile();

    const gameEmbed = await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🎮 2048 Game 🎮')
        .setDescription(`\`\`\`\n${formatBoard()}\n\`\`\``)
        .addFields({ name: 'Score', value: `${score}`, inline: true })
        .addFields({ name: 'Player', value: `${message.author.username}`, inline: true })
        .setFooter({ text: 'Move using the buttons below' })
      ],
      components: createButtons()
    });

    gameStates.set(userId, { gameEmbed, board, score });

    function createButtons() {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('empty1').setLabel('\u200b').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('up').setLabel('⬆️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('empty2').setLabel('\u200b').setStyle(ButtonStyle.Secondary).setDisabled(true)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('left').setLabel('⬅️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('down').setLabel('⬇️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('right').setLabel('➡️').setStyle(ButtonStyle.Primary)
        ),
      ];
    }

    const filter = i => i.user.id === userId;
    const collector = gameEmbed.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();

      let moved = move(interaction.customId);
      if (!moved) return;

      if (isGameOver()) {
        gameStates.delete(userId);
        collector.stop();
        return await gameEmbed.edit({
          embeds: [new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Game Over ❌')
            .setDescription(`\`\`\`\n${formatBoard()}\n\`\`\``)
            .addFields({ name: 'Final Score', value: `${score}`, inline: true })
            .setFooter({ text: 'No more moves left!' })
          ],
          components: []
        });
      }

      await gameEmbed.edit({
        embeds: [new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('🎮 Galileos 2048 🎮')
          .setDescription(`\`\`\`\n${formatBoard()}\n\`\`\``)
          .addFields({ name: 'Score', value: `${score}`, inline: true })
          .addFields({ name: 'Player', value: `${message.author.username}`, inline: true })
          .setFooter({ text: 'Move using the buttons below' })
        ]
      });
    });

    collector.on('end', async () => {
      await gameEmbed.edit({ components: [] });
      gameStates.delete(userId);  // Remove the game state once the game ends
    });
  }
};