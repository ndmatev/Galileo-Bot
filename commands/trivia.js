const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'trivia',
  execute: async (message, args) => {
    // Fetch trivia question and answer from OpenTrivia API
    const fetchTrivia = async () => {
      try {
        const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
        const questionData = response.data.results[0];
        
        // Extract the question, correct answer, and all options
        const question = questionData.question;
        const correctAnswer = questionData.correct_answer;
        const incorrectAnswers = questionData.incorrect_answers;

        // Combine correct answer and incorrect answers to form the options
        const options = [...incorrectAnswers, correctAnswer];
        
        // Shuffle options to ensure the correct answer is not always at the end
        options.sort(() => Math.random() - 0.5);

        return { question, correctAnswer, options };
      } catch (error) {
        console.error('Error fetching trivia question:', error);
        message.reply('There was an error fetching the trivia question.');
      }
    };

    // Fetch a trivia question
    const triviaData = await fetchTrivia();

    if (!triviaData) return;

    const { question, correctAnswer, options } = triviaData;
    const emojiOptions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

    // Create the embed message
    const triviaEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Trivia Question')
      .setDescription(`${question}\n\nYou have 30 seconds to answer!\n\n1️⃣ - ${options[0]}\n2️⃣ - ${options[1]}\n3️⃣ - ${options[2]}\n4️⃣ - ${options[3]}`)
      .setTimestamp();

    // Send the trivia question as an embed
    const triviaMessage = await message.channel.send({ embeds: [triviaEmbed] });

    // Add reactions for the options
    for (let emoji of emojiOptions) {
      await triviaMessage.react(emoji);
    }

    // Set up a filter to collect reactions from non-bots
    const filter = (reaction, user) => emojiOptions.includes(reaction.emoji.name) && !user.bot;

    // Collect reactions for 30 seconds
    const collector = triviaMessage.createReactionCollector({
      filter,
      time: 30000,
      dispose: true // Ensure reactions are handled even if removed
    });

    let correctUsers = [];

    collector.on('collect', async (reaction, user) => {
      const index = emojiOptions.indexOf(reaction.emoji.name);
      if (options[index] === correctAnswer) {
        // Add user to correct list if they picked the correct answer
        if (!correctUsers.includes(user.id)) {
          correctUsers.push(user);
        }
      }
    });

    // After the reaction phase ends
    collector.on('end', async () => {
      // Create a new embed with the correct answer and correct users
      const resultEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Trivia Answer')
        .setDescription(`${question}\n\n**The correct answer is**: ${correctAnswer}\n\n**Correct answers**: ${correctUsers.length > 0 ? correctUsers.map(user => user.toString()).join(', ') : "None!"}`)
        .setTimestamp();

      // Edit the trivia message with the correct answer and results
      await triviaMessage.edit({ embeds: [resultEmbed] });

      // Tag everyone who answered correctly
      if (correctUsers.length > 0) {
        triviaMessage.reply({
          content: `Congratulations to ${correctUsers.map(user => user.toString()).join(', ')} for getting the correct answer! 🎉`
        });
      } else {
        triviaMessage.reply("No one got the correct answer this time. Better luck next time!");
      }
    });
  }
};
